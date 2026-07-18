# RentalMS - Hệ thống Quản lý Phòng Trọ

Ứng dụng Java Spring Boot cho hệ thống quản lý phòng trọ, thiết kế theo kiến trúc J2EE.

---

## ⚡ Chạy nhanh trong VSCode

### Yêu cầu
- **Java 17+** (JDK, không phải JRE)
- **Maven 3.9+**
- **VSCode** với Extension Pack:
  - `Extension Pack for Java` (vscjava.vscode-java-pack)
  - `Spring Boot Dashboard` (vscjava.vscode-spring-boot-dashboard)

### Bước 1: Mở project
```
File → Open Folder → chọn thư mục rentalms
```

### Bước 2: Cài extensions (VSCode sẽ tự gợi ý)
Nhấn "Install All" khi VSCode hỏi cài recommended extensions.

### Bước 3: Chạy ứng dụng
**Cách 1 - Spring Boot Dashboard:**
- Mở panel `Spring Boot Dashboard` (icon lá)
- Click ▶️ bên cạnh `rentalms`

**Cách 2 - Terminal:**
```bash
mvn spring-boot:run
```

**Cách 3 - F5 (Debug mode)**

### Bước 4: Truy cập
- **API:** http://localhost:8080
- **H2 Console:** http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:mem:rentalms`
  - Username: `sa` | Password: _(để trống)_

---

## 🔑 Tài khoản Demo

| Role    | Email                    | Password   |
|---------|--------------------------|------------|
| Admin   | admin@rentalms.com       | admin123   |
| Owner   | owner@rentalms.com       | owner123   |
| Manager | manager@rentalms.com     | manager123 |
| Tenant  | tenant1@rentalms.com     | tenant123  |
| Tenant  | tenant2@rentalms.com     | tenant123  |

---

## 🧪 Test API

Dùng file `api-tests.http` với extension **REST Client** (`humao.rest-client`):

1. Mở `api-tests.http`
2. Click "Send Request" trên từng request
3. Copy token từ response login vào `@ownerToken` / `@tenantToken`

### Luồng demo cơ bản:
```
1. POST /api/auth/login (owner) → copy token
2. POST /api/buildings → tạo khu trọ
3. POST /api/buildings/1/rooms/bulk → tạo 5 phòng
4. POST /api/auth/login (tenant) → copy token
5. POST /api/contracts → tạo hợp đồng
6. GET  /api/bills → xem hóa đơn
7. POST /api/bills/1/pay → thanh toán
```

---

## 🏗️ Kiến trúc

```
src/main/java/com/rentalms/
├── entity/          ← JPA Entities (User, Building, Room, Contract, Bill...)
├── enums/           ← Enum: UserRole, RoomStatus, ContractStatus, BillStatus...
├── dto/             ← Request/Response DTOs
├── repository/      ← Spring Data JPA Repositories
├── service/         ← Business Logic (UserService, BuildingService, BillingService...)
├── controller/      ← REST Controllers (JAX-RS style)
├── security/        ← JWT Auth Filter
├── config/          ← SecurityConfig, DataSeeder
└── exception/       ← Custom Exceptions + GlobalExceptionHandler
```

## 🗄️ Cơ sở dữ liệu

Mặc định dùng **H2 in-memory** (không cần cài đặt).

### Đổi sang MySQL:
1. Uncomment phần MySQL trong `application.properties`
2. Uncomment dependency MySQL trong `pom.xml`
3. Tạo database: `CREATE DATABASE rentalms;`

---

## 📋 Danh sách API

| Method | Endpoint | Role |
|--------|----------|------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET/POST | /api/buildings | Owner |
| POST | /api/buildings/{id}/rooms | Owner |
| POST | /api/buildings/{id}/rooms/bulk | Owner |
| PUT | /api/buildings/{id}/shape | Owner |
| PUT | /api/buildings/{id}/publish | Owner |
| GET/POST | /api/contracts | Owner/Tenant |
| PUT | /api/contracts/{id}/terminate | Owner |
| PUT | /api/contracts/{id}/renew | Owner |
| GET | /api/bills | Tenant |
| POST | /api/bills/{id}/pay | Tenant |
| POST | /api/bills/{id}/items | Owner |
| POST | /api/maintenance | Tenant |
| PUT | /api/maintenance/{id}/status | Manager |
| POST | /api/invites | Owner |
| GET | /api/invites/validate/{token} | Public |
| GET | /api/marketplace | Public |
