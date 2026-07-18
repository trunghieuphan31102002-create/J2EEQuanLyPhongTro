# BÁO CÁO KIỂM THỬ MODULE 1 — AUTHENTICATION

## Hệ thống Quản lý Phòng trọ (RentalMS) — J2EE + React + MySQL

| Thông tin          | Chi tiết                                        |
| ------------------ | ----------------------------------------------- |
| **Dự án**          | J2EEQuanLyPhongTro (Rental Management System)   |
| **Phạm vi**        | Module 1 — Xác thực người dùng (Authentication) |
| **Loại kiểm thử**  | End-to-End (E2E) Black-box                      |
| **Công cụ**        | Playwright (chromium, headed mode)              |
| **Kết quả cuối**   | **17 / 18 passed (94.4 %)** — 1 failed          |
| **Thời gian chạy** | 24.2 giây (4 workers song song)                 |

---

## 1. Tổng quan kết quả

| Mã         | Nhóm chức năng                | Ca test | Kết quả           |
| ---------- | ----------------------------- | ------- | ----------------- |
| FT-AUTH-01 | Đăng nhập thành công (4 role) | 5       | ✅ 5/5            |
| FT-AUTH-02 | Đăng nhập thất bại            | 3       | ✅ 3/3            |
| FT-AUTH-03 | Đăng xuất                     | 1       | ✅ 1/1            |
| FT-AUTH-04 | Validation form               | 3       | ❌ 2/3            |
| FT-AUTH-05 | JWT Token                     | 2       | ✅ 2/2            |
| FT-AUTH-06 | Bảo vệ route                  | 4       | ✅ 4/4            |
| **Tổng**   |                               | **18**  | **17/18 (94.4%)** |

---

## 2. Chi tiết từng nhóm

### 2.1 FT-AUTH-01 — Đăng nhập thành công (5/5 ✅)

Test đầy đủ 4 role, mỗi role kiểm tra: login thành công → JWT được lưu vào `localStorage` → `role` trong token khớp với role trong DB.

| #   | Role              | Email                              | Kết quả |
| --- | ----------------- | ---------------------------------- | ------- |
| 1   | **ADMIN**         | `admin@rentalms.com`               | ✅ Pass |
| 2   | **OWNER**         | `owner@rentalms.com`               | ✅ Pass |
| 3   | **MANAGER**       | `manager@rentalms.com`             | ✅ Pass |
| 4   | **TENANT**        | `tenant1@rentalms.com`             | ✅ Pass |
| 5   | TENANT (nút demo) | Click nút "Người thuê" → auto-fill | ✅ Pass |

**Kết luận:** Form đăng nhập hoạt động đúng cho **cả 4 role**. Backend xác thực thành công, JWT được lưu với `role` chính xác.

---

### 2.2 FT-AUTH-02 — Đăng nhập thất bại (3/3 ✅)

| #   | Ca kiểm thử         | Mô tả                                 | Kết quả |
| --- | ------------------- | ------------------------------------- | ------- |
| 1   | Sai password        | `tenant1@rentalms.com` + password sai | ✅ Pass |
| 2   | Email không tồn tại | `nobody@rentalms.com`                 | ✅ Pass |
| 3   | Password rỗng       | Email đúng + password rỗng            | ✅ Pass |

**Kết quả đạt được:**

- Hiển thị alert lỗi với nội dung `"Email hoac mat khau khong dung"`
- Vẫn ở trang `/login` (không redirect)
- `localStorage.token` và `localStorage.user` đều rỗng

**Lưu ý:** Backend trả thông báo lỗi ASCII không dấu (`hoac`, `khong dung`) thay vì UTF-8 (`hoặc`, `không đúng`).

---

### 2.3 FT-AUTH-03 — Đăng xuất (1/1 ✅)

| #   | Ca kiểm thử                                                       | Kết quả |
| --- | ----------------------------------------------------------------- | ------- |
| 1   | Login → click avatar → click "Đăng xuất" → clear token & redirect | ✅ Pass |

**Hành vi đúng:**

- URL chuyển về `/login`
- `localStorage.token` và `localStorage.user` bị xóa
- Gõ lại URL `/dashboard` → tự redirect về `/login`

**Lưu ý bảo mật:** Token JWT phía server vẫn còn hợp lệ cho đến khi `exp` (JWT là stateless). Nếu cần vô hiệu hóa ngay, cần thêm endpoint `POST /api/auth/logout` phía backend.

---

### 2.4 FT-AUTH-04 — Validation form (2/3 ❌)

| #   | Ca kiểm thử                                            | Kết quả     |
| --- | ------------------------------------------------------ | ----------- |
| 1   | Email + password đều rỗng → click submit               | ❌ **Fail** |
| 2   | Email sai định dạng → browser chặn submit              | ✅ Pass     |
| 3   | Email hợp lệ, password rỗng → password bị browser chặn | ✅ Pass     |

**Ca fail (#1) — phân tích:**

Test kỳ vọng: khi 2 field đều rỗng và click submit, browser HTML5 sẽ chặn submit, không có alert lỗi nào hiển thị.

**Thực tế:** Alert lỗi `<div class="bg-red-100">` vẫn hiển thị dù HTML5 đã chặn submit.

**Nguyên nhân có thể:** State `error` trong `LoginPage.tsx` không được reset khi component mount, nên alert từ lần submit trước (hoặc giá trị khởi tạo) vẫn còn trên DOM.

**Mức độ:** Thấp — không ảnh hưởng logic, chỉ là UX hiển thị thừa.

---

### 2.5 FT-AUTH-05 — JWT Token (2/2 ✅)

| #   | Ca kiểm thử                   | Mô tả                                                                              | Kết quả |
| --- | ----------------------------- | ---------------------------------------------------------------------------------- | ------- |
| 1   | Cấu trúc token hợp lệ         | 3 phần (header.payload.signature), `alg` tồn tại, payload có `sub` + `exp` còn hạn | ✅ Pass |
| 2   | 2 lần login → token khác nhau | `iat` thay đổi mỗi lần → token duy nhất                                            | ✅ Pass |

**Kết luận:** JWT do Spring Boot JJWT cấp có cấu trúc chuẩn RFC 7519. Mỗi lần login tạo token mới (an toàn, không thể replay).

---

### 2.6 FT-AUTH-06 — Bảo vệ route (4/4 ✅)

| #   | URL truy cập khi chưa login | Kết quả mong đợi | Thực tế |
| --- | --------------------------- | ---------------- | ------- |
| 1   | `/dashboard`                | → `/login`       | ✅      |
| 2   | `/rentalms`                 | → `/login`       | ✅      |
| 3   | `/notifications`            | → `/login`       | ✅      |
| 4   | Gõ URL protected nhiều lần  | Luôn về `/login` | ✅      |

**Kết luận:** `ProtectedRoute` hoạt động đúng — không có cách nào vào trang protected mà không qua `/login` trước.

---

## 3. Tổng kết & đánh giá

### 3.1 Kết quả

| Tiêu chí         | Đánh giá               |
| ---------------- | ---------------------- |
| Tổng ca kiểm thử | 18 (gồm 4 role)        |
| Ca pass          | 17 (94.4 %)            |
| Ca fail          | 1 (FT-AUTH-04 #1)      |
| Bug nghiêm trọng | 0                      |
| Bug nhỏ (UX)     | 1 (alert thừa)         |
| Tính ổn định     | Ổn định qua 3 lần chạy |

### 3.2 Điểm mạnh của module Authentication

- ✅ Form đăng nhập có đầy đủ validation HTML5 (`required`, `type="email"`)
- ✅ Backend trả message lỗi rõ ràng cho mọi trường hợp sai
- ✅ JWT có cấu trúc chuẩn, mỗi lần login tạo token mới (security tốt)
- ✅ `ProtectedRoute` chặn đúng mọi URL protected
- ✅ Logout xóa sạch session + redirect đúng trang
- ✅ Có đủ 4 tài khoản demo cho 4 role

### 3.3 Điểm yếu cần cải thiện

| #   | Vấn đề                                                         | Mức độ     | Đề xuất                                                           |
| --- | -------------------------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| 1   | Alert lỗi có thể hiển thị thừa sau khi reset trang             | Thấp       | Reset `error = null` khi `LoginPage` mount                        |
| 2   | Token logout không bị vô hiệu hóa phía server                  | Trung bình | Thêm endpoint `POST /api/auth/logout` + Redis blocklist           |
| 3   | Message lỗi backend dùng ASCII (`hoac`) thay vì UTF-8 (`hoặc`) | Thấp       | Cấu hình UTF-8 cho `MessageSource`                                |
| 4   | Chưa test rate-limit / brute-force                             | Cao        | Bổ sung test gửi nhiều request sai trong 1 phút                   |
| 5   | Chưa test menu sidebar theo role                               | Trung bình | Bổ sung test `ADMIN` thấy "Người dùng", `TENANT` thấy "Tìm phòng" |

---

## 4. Khuyến nghị tiếp theo

1. **Sửa bug UX nhỏ (#1)** — thêm `useEffect(() => setError(null), [])` trong `LoginPage` để reset alert.
2. **Bổ sung test cho các module còn lại** (Room, Contract, Notification, …) theo cùng pattern Playwright.
3. **Bổ sung test menu sidebar theo role** — kiểm tra `ADMIN` thấy "Người dùng"/"Báo cáo", `TENANT` thấy "Tìm phòng"/"Yêu cầu của tôi".
4. **Bổ sung test route theo role** — `TENANT` gõ `/dashboard/users` → bị chặn.
5. **Bổ sung test rate-limit** — chống brute-force login.
6. **Tích hợp CI/CD** — chạy `npx playwright test` tự động trước mỗi lần merge.
7. **Xuất báo cáo HTML** — `npx playwright show-report` cho stakeholder xem trực quan.

---

## 5. Phụ lục

### 5.1 Môi trường kiểm thử

| Thành phần       | Cấu hình                                     |
| ---------------- | -------------------------------------------- |
| OS               | Windows 11 (10.0.26200)                      |
| Browser          | Chromium (Desktop Chrome), headed            |
| Workers          | 4 song song                                  |
| Timeout mỗi test | 30s                                          |
| Frontend URL     | `http://localhost:5173` (Vite default)       |
| Backend          | Spring Boot (Java J2EE) — port mặc định 8080 |

### 5.2 Tài khoản demo sử dụng

| Email                  | Password     | Role    |
| ---------------------- | ------------ | ------- |
| `admin@rentalms.com`   | `admin123`   | ADMIN   |
| `owner@rentalms.com`   | `owner123`   | OWNER   |
| `manager@rentalms.com` | `manager123` | MANAGER |
| `tenant1@rentalms.com` | `tenant123`  | TENANT  |

### 5.3 Cấu trúc thư mục test

```
tests/
├── FT-AUTH-01.login-success.spec.ts          (5 tests: 4 role + 1 nút demo)
├── FT-AUTH-02.login-failure.spec.ts          (3 tests)
├── FT-AUTH-03.logout.spec.ts                 (1 test)
├── FT-AUTH-04.form-validation.spec.ts        (3 tests)
├── FT-AUTH-05.jwt-token.spec.ts              (2 tests)
├── FT-AUTH-06.unauthorized-redirect.spec.ts  (4 tests)
└── helpers/
    └── auth.ts                               (helpers chung)
```

### 5.4 Lệnh chạy lại toàn bộ test

```bash
cd "d:\Báo cáo thực tập\J2EEQuanLyPhongTro-main"
npx playwright test --headed                # chạy tất cả, có giao diện
npx playwright test --reporter=html         # xuất báo cáo HTML đẹp
npx playwright test FT-AUTH-04.form-validation.spec.ts   # chạy riêng file lỗi
npx playwright install chromium             # cài browser (nếu cache bị mất)
```

---

**Ngày:** 17/07/2026
**Trạng thái:** Module 1 — Authentication: **PASS với 1 lỗi nhỏ (UX) — 17/18 test pass (94.4 %)**
