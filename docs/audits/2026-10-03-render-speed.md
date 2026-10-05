# PianoFlow AI — Báo Cáo Kỹ Thuật Tối Ưu Tốc Độ Render Khung Hình (Wave 1 Track B)

> **Tài liệu:** `docs/audits/2026-10-03-render-speed.md`  
> **Tác giả:** CODER Sub-Agent (Wave 1 — Track B: Render Performance Engineer)  
> **Ngày thực hiện:** 03/10/2026  
> **Mục tiêu:** Tăng tốc `FrameRenderer.render_frame` $\ge 3\times$ (Mục tiêu: $< 13.0\text{ ms}$ tại 720p30, $< 28.0\text{ ms}$ tại 1080p30), bảo toàn chất lượng hình ảnh (PSNR $\ge 35.0\text{ dB}$ so với ảnh tham chiếu golden), và đảm bảo tính tất định (determinism).

---

## 1. Bối Cảnh & Điểm Nghẽn Trước Khi Tối Ưu

Theo báo cáo baseline từ AUDITOR (`docs/PERF_AUDIT.md`), module sinh khung hình video falling-notes (`FrameRenderer`) tại [`packages/music-core/pianoflow_music/video/frames.py`](file:///c:/Users/super/pianoflow/packages/music-core/pianoflow_music/video/frames.py) gặp 3 vấn đề kiến trúc gây suy giảm hiệu năng nghiêm trọng:

1. **Điểm nghẽn P1 ($O(N)$ Tail Scan Degradation):**  
   Hàm `_visible_notes(t)` sử dụng `self.notes[:hi]` chỉ chặn cận trên bằng `bisect_right`, buộc mỗi frame phải duyệt toàn bộ danh sách nốt từ đầu bài hát ($t=0$). Với bài hát 300s (3,000 nốt), thời gian scan ở các frame cuối bài tăng vọt từ $0.033\text{ ms}$ lên $0.262\text{ ms}$ (tăng $8.0\times$).
2. **Điểm nghẽn P2 (Hotspot GaussianBlur Toàn Khung Hình — Chiếm 80–85% Tổng Thời Gian):**  
   Mỗi frame thực hiện bộ lọc `ImageFilter.GaussianBlur` trên toàn bộ canvas RGBA độ phân giải đầy đủ ($1280 \times 720$ hoặc $1920 \times 1080$). Giai đoạn này tiêu tốn $31.5\text{ ms}$ ở 720p (80.5% thời gian) và $71.3\text{ ms}$ ở 1080p (84.8% thời gian), ngay cả khi frame không có nốt nào hoặc chỉ có 1–2 nốt.
3. **Điểm nghẽn P3 (Cấp Phát Bộ Nhớ & Ghép Lớp Không Cần Thiết):**  
   Mỗi frame cấp phát mới 2 ảnh (`Image.new("RGB")` và `Image.new("RGBA")`), tương đương cấp phát và giải phóng hơn $350\text{ MB RAM/giây}$ ở 1080p30, gây áp lực thu gom rác (GC pauses). Ngoài ra, `keyboard` luôn bị sao chép sâu (`copy()`) và dán chồng lên frame ngay cả khi không có phím nào đang được nhấn. Thao tác dán `note_layer` có alpha mask full-frame tốn thêm $\sim 3\text{ ms}$.

---

## 2. Các Giải Pháp Tối Ưu Đã Thực Hiện

### 2.1 Cửa Sổ Quét Nốt Hai Đầu (Two-Sided Windowed Note Scan — P1)
- **Vị trí sửa đổi:** [`pianoflow_music/video/frames.py`](file:///c:/Users/super/pianoflow/packages/music-core/pianoflow_music/video/frames.py) dòng 79 & 120–127.
- **Chi tiết kỹ thuật:**
  - Trong `__init__`, tính trước độ dài nốt lớn nhất trong bài hát:  
    `self.max_note_duration = max((note.duration for note in self.notes), default=0.0)`
  - Trong `_visible_notes(t)`:
    - Cận dưới: `lo = bisect.bisect_left(self._starts, t - self.max_note_duration - 0.5)`
    - Cận trên: `hi = bisect.bisect_right(self._starts, t + self.lookahead)`
    - Lặp qua slice index `range(lo, hi)` thay vì tạo bản sao danh sách `self.notes[:hi]`.
- **Hiệu quả:** Độ phức tạp giảm từ $O(N)$ xuống $O(\log N + K)$ với $K$ là số nốt rơi trong cửa sổ 3 giây (thường $K \le 30$). Loại bỏ hoàn toàn hiện tượng suy giảm hiệu năng cuối bài.

### 2.2 Thu Hẹp Vùng Rơi & Downsample GaussianBlur Glow (P2)
- **Vị trí sửa đổi:** [`pianoflow_music/video/frames.py`](file:///c:/Users/super/pianoflow/packages/music-core/pianoflow_music/video/frames.py) dòng 84, 153–175.
- **Chi tiết kỹ thuật:**
  - Vùng rơi hiệu dụng của nốt chỉ nằm từ $y=0$ đến vạch gõ $y=\text{hit\_y}$ (bàn phím tĩnh che kín phần còn lại). Lớp nốt và glow được giới hạn chiều cao chính xác ở `self.hit_y` ($591\text{ px}$ ở 720p thay vì $720\text{ px}$; $886\text{ px}$ ở 1080p thay vì $1080\text{ px}$).
  - Nếu frame không có nốt nào hiển thị (`not visible_rects`), bỏ qua hoàn toàn việc vẽ nốt, thu nhỏ, làm mờ và dán lớp glow (tiết kiệm gần như 100% chi phí xử lý nốt).
  - Khi có nốt rơi, lớp nốt được thu nhỏ 4 lần (`_GLOW_DOWNSCALE = 4`) bằng `Image.Resampling.NEAREST` xuống kích thước nhỏ ($320 \times 147$ ở 720p).
  - Áp dụng `ImageFilter.GaussianBlur` với bán kính đã tỉ lệ hoá:  
    `blur_radius / _GLOW_DOWNSCALE`.
  - Phóng to lại kích thước gốc và dán lên `frame`.
  - Thân nốt sắc nét được vẽ trực tiếp bằng `ImageDraw.Draw(frame).rounded_rectangle` với màu RGB đặc thay vì paste một ảnh RGBA full-frame qua alpha mask (tiết kiệm $\sim 2.2\text{ ms}$ mỗi frame).
- **Hiệu quả:** Số lượng điểm ảnh cần tính GaussianBlur giảm tới **$19.6\times$**. Thời gian xử lý glow giảm từ $31.5\text{ ms}$ xuống còn $\sim 1.5\text{ ms}$.

### 2.3 Tái Sử Dụng Buffer Bộ Nhớ Đệm & Loại Bỏ Copy Thừa (P3)
- **Vị trí sửa đổi:** [`pianoflow_music/video/frames.py`](file:///c:/Users/super/pianoflow/packages/music-core/pianoflow_music/video/frames.py) dòng 82–86, 131, 155, 212–223.
- **Chi tiết kỹ thuật:**
  - Khởi tạo trước bộ đệm cố định trên instance `FrameRenderer`:
    - `self._frame = Image.new("RGB", (self.width, self.height), self._rgb["background"])`
    - `self._note_layer = Image.new("RGBA", (self.width, self.hit_y), (0, 0, 0, 0))`
  - Làm mới buffer giữa các frame bằng `paste` màu nền thay vì gọi `Image.new`:
    - `frame.paste(self._rgb["background"], (0, 0, self.width, self.height))` mất chỉ $0.08\text{ ms}$ (so với $1.73\text{ ms}$ của `Image.new("RGB")`, tăng tốc **$20\times$** riêng ở khâu reset frame).
    - `note_layer.paste((0, 0, 0, 0), ...)` chỉ gọi khi có nốt cần vẽ ($0.05\text{ ms}$ so với $0.67\text{ ms}$ của `Image.new("RGBA")`).
  - Tối ưu bàn phím: Khi `active_pitches` rỗng (không có phím nào được nhấn ở frame hiện tại), dán trực tiếp `self._keyboard_base` mà không gọi `.copy()` (tiết kiệm chi phí cấp phát ảnh).

---

## 3. Kết Quả Đo Đạc Định Lượng (Before vs After)

Toàn bộ dữ liệu được đo đạc bằng công cụ kiểm thử tiêu chuẩn trên máy chủ đo đạc (AMD Ryzen 16 cores, Windows 11, Python 3.14.4), lấy mẫu 100 frame phân bố đều (Spread) và 100 frame cuối bài (Tail) trên 3 kích thước bài hát chuẩn canonical:

### 3.1 Bảng So Sánh Hiệu Năng Render Từng Cấu Hình

| Bài hát / Độ dài | Độ phân giải | Số frame | Baseline Spread (ms) | **Optimized Spread (ms)** | **Tốc độ tăng (Speedup)** | Chỉ tiêu (Target) | Kết quả | Baseline Tail (ms) | **Optimized Tail (ms)** |
|---|---|---|---|---|---|---|---|---|---|
| **60s (400 nốt)** | **720p** | 1,831 | 39.39 ms | **10.21 ms** | **3.86x** | $< 13.0\text{ ms}$ | **ĐẠT (PASS)** | 38.30 ms | **6.76 ms** |
| **60s (400 nốt)** | **1080p** | 1,831 | 86.59 ms | **21.50 ms** | **4.03x** | $< 28.0\text{ ms}$ | **ĐẠT (PASS)** | 82.41 ms | **16.44 ms** |
| **180s (1500 nốt)** | **720p** | 5,431 | 38.23 ms | **10.93 ms** | **3.50x** | $< 13.0\text{ ms}$ | **ĐẠT (PASS)** | 35.51 ms | **7.24 ms** |
| **180s (1500 nốt)** | **1080p** | 5,431 | 83.09 ms | **23.76 ms** | **3.50x** | $< 28.0\text{ ms}$ | **ĐẠT (PASS)** | 81.61 ms | **16.18 ms** |
| **300s (3000 nốt)** | **720p** | 9,031 | 38.57 ms | **10.98 ms** | **3.51x** | $< 13.0\text{ ms}$ | **ĐẠT (PASS)** | 35.97 ms | **6.56 ms** |
| **300s (3000 nốt)** | **1080p** | 9,031 | 84.34 ms | **23.29 ms** | **3.62x** | $< 28.0\text{ ms}$ | **ĐẠT (PASS)** | 81.02 ms | **15.39 ms** |

> [!TIP]
> **Tóm tắt thành tích tốc độ:**
> - Render 720p30 đạt **$10.21 - 10.98\text{ ms / frame}$** (vượt xa chỉ tiêu $< 13.0\text{ ms}$, tăng tốc từ **$3.50\times$ đến $3.86\times$**).
> - Render 1080p30 đạt **$21.50 - 23.76\text{ ms / frame}$** (vượt xa chỉ tiêu $< 28.0\text{ ms}$, tăng tốc từ **$3.50\times$ đến $4.03\times$**).
> - Thời gian dựng video 5 phút (300s) tại 1080p dự phóng giảm từ **$761.6\text{ giây}$ ($\sim 12.7$ phút)** xuống còn **$210.3\text{ giây}$ ($\sim 3.5$ phút)** trên máy cục bộ, và dự kiến sẽ giảm tương ứng trên EC2 worker.

### 3.2 Khắc Phục Hiện Tượng Thoái Hoá Cuối Bài (P1 Verification)

- **Trước tối ưu:** Thời gian quét ở Tail tăng từ $0.033\text{ ms}$ (bài 60s) lên $0.262\text{ ms}$ (bài 300s) do quét tuyến tính $O(N)$.
- **Sau tối ưu:** Thời gian render tại Tail giảm xuống chỉ còn **$6.56 - 6.76\text{ ms}$** ở 720p (do cuối bài số lượng nốt hiển thị thưa dần) và hoàn toàn độc lập với tổng số nốt luỹ kế của bài hát.

---

## 4. Kiểm Định Chất Lượng Hình Ảnh (PSNR vs Golden Frames)

Chất lượng hình ảnh xuất xưởng được so sánh trực tiếp với 5 khung hình tham chiếu chuẩn (Golden Reference Frames) đã lưu tại [`packages/music-core/pianoflow_music/tests/golden/`](file:///c:/Users/super/pianoflow/packages/music-core/pianoflow_music/tests/golden/) (sinh từ renderer nguyên bản ở Wave 0, seed 42):

| Khung hình tham chiếu | Thời điểm ($t$) | Trạng thái khung hình | PSNR thực đo | Tiêu chuẩn chất lượng | Đánh giá |
|---|---|---|---|---|---|
| `ref_frame_0000_720p.png` | $0.0\text{ s}$ | Đầu bài, nốt đang rơi vào khung nhìn | **$43.29\text{ dB}$** | $\ge 35.0\text{ dB}$ | **ĐẠT (Xuất sắc)** |
| `ref_frame_0300_720p.png` | $10.0\text{ s}$ | Nốt rơi mật độ vừa kèm phím sáng | **$41.04\text{ dB}$** | $\ge 35.0\text{ dB}$ | **ĐẠT (Xuất sắc)** |
| `ref_frame_0900_720p.png` | $30.0\text{ s}$ | Hợp âm hai tay dày đặc giữa bài | **$42.82\text{ dB}$** | $\ge 35.0\text{ dB}$ | **ĐẠT (Xuất sắc)** |
| `ref_frame_1500_720p.png` | $50.0\text{ s}$ | Giai điệu cuối bài | **$44.18\text{ dB}$** | $\ge 35.0\text{ dB}$ | **ĐẠT (Xuất sắc)** |
| `ref_frame_1800_720p.png` | $60.0\text{ s}$ | Kết thúc bài hát (không còn nốt rơi) | **$999.00\text{ dB}$** (Khớp 100% bit-for-bit) | $\ge 35.0\text{ dB}$ | **ĐẠT (Tuyệt đối)** |

- **PSNR tối thiểu đạt được:** **$41.04\text{ dB}$** (Vượt ngưỡng yêu cầu $35.0\text{ dB}$ hơn **$+6.04\text{ dB}$**, sai số bình phương trung bình MSE $< 5.2$ trên thang 255).
- **Tính tất định (Determinism):** Kiểm thử hash SHA-256 xác nhận 2 lần render cùng một frame index bất kỳ trên cùng cấu hình luôn sinh ra dãy byte hoàn toàn đồng nhất 100%.

---

## 5. Kiểm Thử Hồi Quy & Tuân Thủ Phạm Vi Ghi (Safety & Isolation)

1. **Bộ kiểm thử tự động pytest:**
   - Đã thêm tệp kiểm thử chuyên dụng [`packages/music-core/pianoflow_music/tests/test_video_perf.py`](file:///c:/Users/super/pianoflow/packages/music-core/pianoflow_music/tests/test_video_perf.py) bao phủ:
     - Tính tương đương tuyệt đối giữa bisect scan hai đầu và linear scan.
     - Kiểm tra ngưỡng chất lượng PSNR $\ge 35.0\text{ dB}$ trên toàn bộ ảnh golden.
     - Tính cô lập trạng thái khi tái sử dụng buffer (render frame A $\to$ B $\to$ A không rò rỉ dữ liệu).
     - Hỗ trợ các độ phân giải dọc (`720p_vertical`, `1080p_vertical`).
     - Render bài hát rỗng (0 notes) an toàn.
   - **Kết quả kiểm thử:** Toàn bộ **219/219 tests passed** (3 skipped theo thiết kế mireval), thời gian chạy chỉ **1.20 giây**.
2. **Kiểm tra Lint & Format:**
   - `ruff check`: All checks passed.
   - `ruff format --check`: 53 files formatted cleanly.
3. **Tuân thủ cách ly mã nguồn (Write Scope Disjointness):**
   - Không chạm vào bất kỳ file protected nào (`.env*`, lockfiles, migrations, CI/CD).
   - Không chạm vào mã nguồn của CODER-A (`apps/worker`) hay CODER-C (`apps/web`).

---

## 6. Kế Hoạch Rollback (Rollback Plan)

Trong trường hợp cần hoàn nguyên renderer về phiên bản ban đầu:
1. Hoàn nguyên [`packages/music-core/pianoflow_music/video/frames.py`](file:///c:/Users/super/pianoflow/packages/music-core/pianoflow_music/video/frames.py) về commit trước đó thông qua git:
   ```bash
   git checkout HEAD~1 -- packages/music-core/pianoflow_music/video/frames.py
   ```
2. Xoá tệp kiểm thử bổ sung nếu cần:
   ```bash
   rm packages/music-core/pianoflow_music/tests/test_video_perf.py
   ```
3. Chạy lại test suite để xác minh trạng thái:
   ```bash
   uv run --directory packages/music-core pytest -q
   ```
Không có thay đổi nào về cơ sở dữ liệu, API schema hay định dạng I/O pipe của FFmpeg; output byte vẫn là RGB24 thuần tuý có kích thước `width * height * 3`.
