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