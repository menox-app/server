# 🚀 Menox Social Platform Server

Menox Server là hệ thống Backend mạnh mẽ, có khả năng mở rộng cao, được xây dựng bằng NestJS. Dự án tập trung vào trải nghiệm người dùng mạng xã hội với Feed cá nhân hóa và hệ thống thông báo thời gian thực (Real-time Notifications).

---

## ✨ Key Features

- 🔐 **Authentication**: Hệ thống Auth bảo mật với JWT, Refresh Token và Multi-device session tracking.
- 📱 **Social Graph**: Hệ thống Follow/Unfollow hiệu quả, tối ưu hóa truy vấn Social Stats.
- 📰 **Personalized Feed**: Thuật toán fetch bài viết theo chế độ "Following" (chỉ thấy người mình quan tâm) và "Discovery".
- 🔔 **Real-time Notifications**: Kiến trúc hướng sự kiện (Event-Driven) thông báo tức thì qua Socket.io.
- 💬 **Interactions**: Hệ thống bình luận đa cấp (Nested Comments).
- ☁️ **Media Management**: Tích hợp Cloudinary để xử lý hình ảnh/video.

---

## 🏗️ Architecture Design

Dự án áp dụng các nguyên lý thiết kế phần mềm tiên tiến:

- **Modular Monolith**: Chia tách các tính năng (Users, Posts, Notifications) thành các module độc lập.
- **Event-Driven Architecture**: Sử dụng `EventEmitter2` để tách rời (decouple) logic nghiệp vụ chính và các side-effects (như gửi thông báo).
- **Dependency Inversion**: Triển khai `NotificationProvider` abstract layer, cho phép dễ dàng chuyển đổi giữa Socket.io, Ably, hoặc Novu.
- **Repository Pattern**: Sử dụng Knex.js với BaseRepository để tối ưu hóa việc tương tác với SQL Database.

---

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Database**: PostgreSQL / MySQL
- **Query Builder**: [Knex.js](https://knexjs.org/)
- **Real-time**: [Socket.io](https://socket.io/)
- **Security**: JWT, Bcrypt, Passport
- **Validation**: Class-validator & Zod
- **Documentation**: [Swagger / OpenAPI 3.0](https://swagger.io/)

---

## 📂 Project Structure

```text
src/
├── common/             # Các hằng số, decorators, filters, guards dùng chung
├── configs/            # Cấu hình môi trường (Environment Config)
├── infrastructure/     # Database (Knex), Migrations, Repositories
└── modules/            # Các module tính năng chính
    ├── auth/           # Login, Register, Session management
    ├── users/          # User profile, Social stats
    ├── posts/          # Feed logic, Post creation
    ├── comments/       # Interaction logic
    └── notifications/  # Event-Driven notification system
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Docker (Optional for DB)
- PostgreSQL / MySQL

### Installation
1. Clone dự án:
   ```bash
   git clone <your-repo-url>
   ```
2. Cài đặt dependencies:
   ```bash
   npm install
   ```
3. Cấu hình môi trường:
   Sao chép `.env.example` thành `.env` và điền các thông tin cần thiết.
4. Khởi tạo Database:
   ```bash
   npm run migrate:latest
   npm run seed:run
   ```
5. Chạy dự án:
   ```bash
   npm run start:dev
   ```

---

## 📑 API Documentation
Sau khi chạy server, bạn có thể truy cập tài liệu API tại:
`http://localhost:3000/api-docs`

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.
