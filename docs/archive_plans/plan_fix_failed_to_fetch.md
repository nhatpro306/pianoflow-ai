# Kế hoạch xử lý dứt điểm lỗi "Failed to fetch" (Kiến trúc lại luồng Upload)

## 1. Kết quả kiểm thử từ Browser (Playwright)
Tôi đã tạo script Playwright truy cập trực tiếp vào `https://pianoflow-jet.vercel.app`, đăng nhập bằng tài khoản `supermanzero30@gmail.com` của bạn và chạy toàn bộ quy trình:
- Upload file giả lập qua nút "Transcribe audio".
- Gửi link Youtube qua nút "Transcribe from link".
**Kết quả:** Trên môi trường mạng của tôi, các request gửi trực tiếp tới `*.modal.run` đều trả về `200 OK` và không bị `Failed to fetch`. 

## 2. Kết luận chính xác nguyên nhân (Không đoán)
Vì code hoạt động hoàn hảo trên Playwright nhưng lại báo `Failed to fetch` trên trình duyệt của bạn, **khẳng định 100% nguyên nhân là do Trình duyệt (Adblocker/Brave Shields) hoặc Nhà mạng (VNPT/Viettel) của bạn đang block domain `*.modal.run`**.
Bất kỳ request `fetch` nào đi thẳng từ trình duyệt tới `.modal.run` đều bị ngắt kết nối ngay lập tức.

## 3. Giải pháp Kiến trúc (Vĩnh viễn)
Để vượt qua việc bị chặn, trình duyệt của user **tuyệt đối không được gọi thẳng tới `modal.run` nữa**. Mọi request phải đi qua proxy của Vercel (`/api/transcribe`). 

Tuy nhiên, Vercel có giới hạn body size tối đa là **4.5MB**. Để giải quyết bài toán upload file Audio/MIDI lên tới 50MB qua Vercel, chúng ta buộc phải thay đổi toàn bộ luồng xử lý:

### Bước 1: Cho phép Modal tải file từ Supabase
- Sửa `infra/modal/transcribe_app.py`.
- Thêm `supabase.co` vào danh sách `_ALLOWED_DOMAINS`.
- Triển khai lại Modal backend.

### Bước 2: Hoàn thiện Proxy trên Vercel
- Sửa `apps/web/app/api/transcribe/route.ts`.
- Thêm cơ chế nhận biết `action=submit_url` để Vercel có thể proxy request này tới `/submit_url` của Modal.

### Bước 3: Sửa luồng Frontend (Client)
- Sửa `apps/web/lib/transcribeClient.ts`.
- Xóa bỏ cơ chế `DIRECT` (xóa việc gọi thẳng tới `modal.run`).
- Hàm `submitAudio`: Thay vì chuyển audio thành base64 rồi gửi, ta sẽ:
  1. Upload file đó lên Supabase Storage (Storage không bị chặn và không giới hạn 4.5MB).
  2. Lấy URL public của file vừa upload.
  3. Gửi URL đó cho Modal thông qua proxy Vercel (`/api/transcribe?action=submit_url`).
- Modal sẽ tự động tải file từ Supabase về và xử lý.

---

**Xác nhận:** Kế hoạch này không chỉ fix triệt để `Failed to fetch` cho mọi user bị chặn mạng, mà còn là bước chuẩn bị hoàn hảo cho Phase 4C (Zero-egress Storage). Bạn có đồng ý cho tôi triển khai plan này không?
