### 2. File `README.md` cho thư mục FRONTEND

```markdown
# ☕ KOI Coffee POS - Frontend Web App

Giao diện (Frontend) chính thức cho hệ thống máy tính tiền (POS) của KOI Coffee. Giao diện được thiết kế tối ưu hóa UX/UI cho thao tác cảm ứng trên iPad, Tablet và điện thoại di động để nhân viên thao tác nhanh nhất có thể.

## 🚀 Công nghệ sử dụng
- **Core:** React.js
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **UI/UX Components:** React Hot Toast
- **Real-time Sync:** WebSocket Hook tuỳ chỉnh

## 🛠️ Yêu cầu hệ thống
- Node.js (phiên bản v16.x trở lên).
- Trình quản lý gói `npm` hoặc `yarn`.

## ⚙️ Cài đặt & Chạy dự án

1. **Clone repository:**
```bash
   git clone [https://github.com/your-username/koi-coffee-frontend.git](https://github.com/your-username/koi-coffee-frontend.git)
   cd koi-coffee-frontend
Cài đặt các gói phụ thuộc (Dependencies):

Bash
   npm install
Cấu hình kết nối API:
Mở file cấu hình API (ví dụ: src/services/apiService.js) và đảm bảo đường dẫn trỏ đúng về Backend Server:

JavaScript
   // Chuyển sang URL của Backend Render khi deploy production
   export const API_BASE_URL = 'http://localhost:8080';
Khởi chạy môi trường Development:

Bash
   npm start
Ứng dụng sẽ tự động mở trên trình duyệt tại địa chỉ http://localhost:3000 hoặc http://localhost:5173.

🌟 Tính năng nổi bật
Giao diện POS thực tế: Thao tác chọn món 1 chạm, trượt mở giỏ hàng, hỗ trợ tính toán chiết khấu (VNĐ và %).

Đồng bộ thời gian thực: Lắng nghe và phản hồi ngay lập tức các sự kiện chốt ca, cập nhật trạng thái đơn hàng, hay thông báo hệ thống mà không cần reload trang.

Responsive Design: Giao diện co giãn thông minh, hoạt động mượt mà trên cả PC, Tablet ngang/dọc và Mobile.

Bảo vệ tài khoản: Cơ chế khoá màn hình chờ 10s khi phát hiện tài khoản bị đăng nhập đè từ thiết bị khác.

Phát triển bởi Nguyễn Duy Khương.