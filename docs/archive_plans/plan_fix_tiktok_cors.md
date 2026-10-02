# Kế hoạch sửa lỗi "Failed to fetch" khi nhập Link TikTok (CORS Issue)

## 1. Phân tích nguyên nhân gốc rễ (Không đoán)

Tôi đã chạy test tự động với link TikTok bạn cung cấp (`https://www.tiktok.com/@u40vapiano/video/7681665512392199432...`) và phát hiện ra **sự thật bất ngờ**:
- Server AI (Modal) **TẢI VÀ PHÂN TÍCH THÀNH CÔNG 100%** video TikTok này. Không hề bị TikTok chặn (nhờ cơ chế mạo danh Chrome của `yt-dlp`).
- Quá trình xử lý (Processing) diễn ra suôn sẻ đến tận lúc đạt 100%.
- Lỗi `Failed to fetch` chỉ xảy ra ở **bước cuối cùng**: Khi Frontend cố gắng lưu kết quả vào Database của bạn!

**Chi tiết lỗi kỹ thuật:**
Khi Frontend (Vercel) gọi API `POST /api/v1/projects` đến Backend Server của bạn (`https://rcusueycsj.execute-api.ap-southeast-1.amazonaws.com`), nó đã bị chặn bởi **CORS Policy** (Chính sách bảo mật chéo miền). 
Trình duyệt của bạn sẽ từ chối kết nối và ném ra lỗi `TypeError: Failed to fetch`. Giao diện web bắt được lỗi này và in thẳng chữ "Failed to fetch" lên màn hình, khiến chúng ta hiểu lầm là lỗi do AI xử lý video.

## 2. Giải pháp (Fix)

Vì Backend của bạn đang nằm trên AWS API Gateway, danh sách các domain được phép truy cập (`cors_allowed_origins`) đang không bao gồm URL Vercel hiện tại của bạn.

Để giải quyết vĩnh viễn và không bao giờ bị lại mỗi khi Vercel đổi URL, tôi sẽ:
1. Sửa file `apps/api/app/main.py` ở Backend.
2. Đổi cấu hình `CORSMiddleware` thành `allow_origins=["*"]` (Cho phép mọi frontend domain gọi vào API).
3. Push code lên Github để Backend tự động cập nhật.

## 3. Các bước thực hiện
- Chỉnh sửa `main.py` -> Push Git.
- Đợi Backend deploy xong.
- Test lại luồng lưu Project.
