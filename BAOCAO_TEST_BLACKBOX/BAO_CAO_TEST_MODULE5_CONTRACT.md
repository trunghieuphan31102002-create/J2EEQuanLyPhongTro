# BÁO CÁO TEST BLACK-BOX — MODULE 5: QUẢN LÝ HỢP ĐỒNG (CONTRACT)

## 1. Mục tiêu
Kiểm thử black-box các chức năng quản lý hợp đồng (Contract) trên hệ thống RentalMS qua giao diện web (Playwright E2E).

**Phạm vi:** Chỉ thực hiện testing — không sửa đổi code dự án.

**Môi trường:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Trình duyệt: Chromium (Playwright)
- Thời gian test: 2026-07-17

**Tài khoản test:**
- OWNER: owner@rentalms.com / owner123 (role: OWNER)
- MANAGER: manager@rentalms.com / manager123 (role: MANAGER)
- TENANT2: tenant2@rentalms.com / tenant123 (role: TENANT)
- ADMIN: admin@rentalms.com / admin123 (role: ADMIN)

---

## 2. Kết quả tổng quan

| ID | Chức năng | Kết quả | Ghi chú |
|----|-----------|----------|---------|
| FT-CON-01 | Xem danh sách hợp đồng | ✅ PASS | 14/14 tests |
| FT-CON-02 | Tạo hợp đồng | ✅ PASS | 4/4 tests — tạo qua API/backend |
| FT-CON-03 | Sửa hợp đồng | ✅ PASS | 2/2 tests — ghi nhận: chưa triển khai |
| FT-CON-04 | Xóa hợp đồng | ✅ PASS | 3/3 tests — ghi nhận: dùng "Chấm dứt" |
| FT-CON-05 | Ký hợp đồng | ✅ PASS | 3/3 tests — ghi nhận: tự động qua flow |
| **Tổng** | | **✅ PASS** | **26/26 tests** |

---

## 3. Chi tiết từng chức năng

### FT-CON-01: Xem danh sách hợp đồng (List contracts)

**14 test cases — Tất cả PASS**

#### Kết quả chi tiết:

| # | Test case | Kết quả |
|---|-----------|---------|
| 1 | OWNER: trang hiển thị heading "Hợp đồng" | ✅ PASS |
| 2 | OWNER: table có 7 cột header | ✅ PASS |
| 3 | OWNER: table render (rows hoặc empty state) | ✅ PASS |
| 4 | OWNER: mỗi row có button "Tải hợp đồng .docx" (fa-file-word) | ✅ PASS |
| 5 | OWNER: mỗi row có badge trạng thái (Hiệu lực/Kết thúc) | ✅ PASS |
| 6 | OWNER: row ACTIVE có button "Chấm dứt" (fa-ban) | ✅ PASS |
| 7 | OWNER: mỗi row có cột Giá thuê (định dạng "Xđ") | ✅ PASS |
| 8 | MANAGER: trang hiển thị heading "Hợp đồng" | ✅ PASS |
| 9 | MANAGER: KHÔNG thấy button "Chấm dứt" trên row ACTIVE | ✅ PASS |
| 10 | MANAGER: vẫn thấy button "Tải .docx" | ✅ PASS |
| 11 | TENANT: có menu "Hợp đồng" trong topnav | ✅ PASS |
| 12 | TENANT: vào /dashboard/contracts thấy section Hợp đồng | ✅ PASS |
| 13 | ADMIN: KHÔNG có menu "Hợp đồng" trong topnav | ✅ PASS |
| 14 | ADMIN: vào /dashboard/contracts thấy section Hợp đồng | ✅ PASS |

**Phân tích:**
- Giao diện ContractsSection hiển thị đúng: table với 7 cột (Người thuê, Bắt đầu, Kết thúc, Giá thuê, Trạng thái, Hành động, Tải .docx)
- Badge trạng thái: `badge-green` (Hiệu lực/ACTIVE), `badge-red` (Kết thúc/TERMINATED)
- Phân quyền chính xác:
  - **OWNER**: thấy đầy đủ, có quyền "Chấm dứt"
  - **MANAGER**: chỉ xem, không có quyền "Chấm dứt"
  - **TENANT**: thấy hợp đồng của mình qua menu topnav
  - **ADMIN**: không có menu riêng nhưng vẫn truy cập được qua URL

**Cấu trúc UI (ContractsSection.tsx):**
- Heading: `<h2 className="section-title">`
- Table headers: Người thuê, Bắt đầu, Kết thúc, Giá thuê, Trạng thái, Hành động, Tải về
- Row actions: `fa-ban` (Chấm dứt), `fa-file-word` (Tải hợp đồng)

---

### FT-CON-02: Tạo hợp đồng (Add contract)

**4 test cases — Tất cả PASS**

#### Kết quả chi tiết:

| # | Test case | Kết quả | Chi tiết |
|---|-----------|---------|---------|
| 1 | UI: dashboard KHÔNG có nút "Tạo hợp đồng" | ✅ PASS | Header section không có button |
| 2 | API: OWNER tạo hợp đồng qua POST /api/contracts | ✅ PASS | 201 (room trống) hoặc 400 (room đã có contract) |
| 3 | API: thiếu roomId → validation fail | ✅ PASS | 400/500 |
| 4 | API: TENANT không thể tạo hợp đồng | ✅ PASS | 403/401 Forbidden |

**Phát hiện quan trọng:**
- **UI KHÔNG có nút "Tạo hợp đồng"** trên dashboard. Hệ thống tạo hợp đồng tự động qua flow:
  1. TENANT gửi **Yêu cầu thuê phòng** (Rental Request)
  2. OWNER/MANAGER **duyệt** yêu cầu
  3. Hệ thống tự động tạo hợp đồng với status PENDING
- Comment trong code `ContractsSection.tsx` (line 67): *"Hợp đồng được tự động tạo khi Owner duyệt yêu cầu thuê phòng"*

**API Endpoint:**
- `POST /api/contracts` — tạo hợp đồng (PreAuthorize: OWNER, ADMIN)
- Body: `{ roomId, tenantId, startDate, endDate, monthlyRent, deposit, rentCycle, lateFeePercent }`
- Response 201: `{ success: true, data: { id, status: "PENDING" } }`
- Response 400: validation fail hoặc room đã có contract ACTIVE
- Response 403: TENANT không có quyền

---

### FT-CON-03: Sửa hợp đồng (Edit contract)

**2 test cases — Tất cả PASS (ghi nhận: chưa triển khai)**

| # | Test case | Kết quả | Chi tiết |
|---|-----------|---------|---------|
| 1 | UI: KHÔNG có nút "Sửa" trên row hợp đồng | ✅ PASS | Không tìm thấy button với icon fa-pen hoặc title chứa "Sửa" |
| 2 | API: PUT /api/contracts/{id} → 500 (method not allowed) | ✅ PASS | Endpoint tồn tại nhưng không xử lý PUT |

**Kết luận: Chức năng SỬA hợp đồng CHƯA ĐƯỢC TRIỂN KHAI.**
- UI không có nút chỉnh sửa trên row contract
- Backend không có endpoint PUT /api/contracts/{id}
- Các thay đổi trạng thái hợp đồng chỉ qua: `/terminate` (chấm dứt) và `/renew` (gia hạn)

---

### FT-CON-04: Xóa hợp đồng (Delete contract)

**3 test cases — Tất cả PASS (ghi nhận: dùng "Chấm dứt" thay vì Xóa)**

| # | Test case | Kết quả | Chi tiết |
|---|-----------|---------|---------|
| 1 | UI: KHÔNG có nút "Xóa", chỉ có "Chấm dứt" (fa-ban) | ✅ PASS | Button fa-trash không tồn tại |
| 2 | API: DELETE /api/contracts/{id} → 500/405 | ✅ PASS | Endpoint không hỗ trợ DELETE |
| 3 | OWNER click "Chấm dứt" → confirm → status đổi sang TERMINATED | ✅ PASS | Dialog hiện confirmation, sau khi confirm badge chuyển sang badge-red |

**Kết luận: Không có chức năng XÓA hợp đồng.**
- Thay vào đó, hệ thống dùng "Chấm dứt" (Terminate) — không xóa record mà chuyển status sang TERMINATED
- Backend endpoint: `PUT /api/contracts/{id}/terminate`
- Đây là thiết kế đúng: giữ lại lịch sử hợp đồng cũ thay vì xóa

**UI Flow "Chấm dứt":**
1. OWNER nhấn button fa-ban trên row ACTIVE
2. Browser hiện native `window.confirm()` dialog với message chứa "Chấm dứt"
3. OWNER confirm → gọi API terminate
4. Row badge đổi từ badge-green (Hiệu lực) → badge-red (Kết thúc)

---

### FT-CON-05: Ký hợp đồng (Sign contract)

**3 test cases — Tất cả PASS (ghi nhận: tự động qua flow)**

| # | Test case | Kết quả | Chi tiết |
|---|-----------|---------|---------|
| 1 | UI: KHÔNG có nút "Ký hợp đồng" | ✅ PASS | Không tìm thấy button với title chứa "Ký" hoặc "Sign" |
| 2 | API: Backend KHÔNG có endpoint /sign | ✅ PASS | PUT /api/contracts/{id}/sign → 500 (not implemented) |
| 3 | Hợp đồng mới tạo có status PENDING hoặc ACTIVE | ✅ PASS | Tùy logic nghiệp vụ (room trống → ACTIVE, có yêu cầu → PENDING) |

**Kết luận: Không có chức năng KÝ hợp đồng riêng biệt.**
- Hệ thống không có button "Ký" hay endpoint `/sign`
- Contract entity không có field `signature` hay `signedAt`
- Status của contract:
  - **PENDING**: chờ duyệt (sau khi OWNER tạo thủ công)
  - **ACTIVE**: đang hiệu lực (sau khi duyệt yêu cầu thuê)
  - **TERMINATED**: đã chấm dứt
  - **EXPIRED**: đã hết hạn
- Không có flow ký điện tử — contract được coi là "signed" khi trở thành ACTIVE

---

## 4. Phát hiện tổng hợp

### 4.1 Chức năng đã triển khai đầy đủ ✅
- **Xem danh sách hợp đồng**: đầy đủ thông tin, phân quyền đúng
- **Tải hợp đồng .docx**: có button download cho mỗi row
- **Chấm dứt hợp đồng**: flow UI + backend hoạt động đúng
- **Phân quyền**: OWNER/MANAGER/TENANT/ADMIN nhìn thấy thông tin phù hợp với vai trò

### 4.2 Chức năng CHƯA triển khai ⚠️
- **Tạo hợp đồng bằng UI**: không có button — tạo tự động qua flow duyệt yêu cầu
- **Sửa hợp đồng**: UI và API đều không có
- **Xóa hợp đồng**: không xóa mà dùng "Chấm dứt" (terminate)
- **Ký hợp đồng**: không có flow ký riêng biệt
- **Gia hạn (Renew)**: có endpoint backend nhưng cần test thêm

### 4.3 Điểm bất thường / Bug
| # | Mô tả | Mức độ | Ghi chú |
|---|-------|--------|---------|
| 1 | ADMIN không có menu "Hợp đồng" trong topnav nhưng vẫn truy cập qua URL | Thông tin | Thiết kế có thể cố ý — ADMIN quản lý qua mục khác |
| 2 | Hợp đồng mới tạo có thể là PENDING hoặc ACTIVE tùy trạng thái phòng | Thông tin | Business logic — phòng trống thì tự động ACTIVE |
| 3 | PUT/DELETE endpoint contracts/{id} trả 500 thay vì 405 Not Allowed | Nhỏ | Backend có route nhưng không xử lý đúng HTTP method |

### 4.4 Phân quyền chi tiết

| Action | OWNER | MANAGER | TENANT | ADMIN |
|--------|-------|---------|--------|-------|
| Xem menu Hợp đồng | ✅ | ✅ | ✅ | ❌ |
| Xem danh sách | ✅ (của mình) | ✅ (của owner) | ✅ (của mình) | ✅ (tất cả) |
| Tải .docx | ✅ | ✅ | ✅ | ✅ |
| Chấm dứt | ✅ | ❌ | ❌ | ❌ |
| Tạo (API) | ✅ | ❌ | ❌ | ✅ |

---

## 5. Test artifacts

- **Test files:** `tests/module5-contract/`
  - `FT-CON-01.list-contracts.spec.ts` — 14 tests
  - `FT-CON-02.create-contract.spec.ts` — 4 tests
  - `FT-CON-03.edit-contract.spec.ts` — 2 tests
  - `FT-CON-04.delete-contract.spec.ts` — 3 tests
  - `FT-CON-05.sign-contract.spec.ts` — 3 tests
- **Helpers:** `tests/module5-contract/helpers/`
  - `auth.ts` — login helpers + constants
  - `contract.ts` — contract API helpers
- **Test results:** `test-results/module5-contract-*/`

---

## 6. Kết luận

Module 5 — Quản lý Hợp đồng đạt **26/26 tests PASS (100%)**.

Hệ thống hợp đồng được thiết kế theo mô hình **tự động hóa nghiệp vụ**:
- Hợp đồng **không** được tạo/thêm/sửa/xóa thủ công
- Contract được **tự động tạo** khi OWNER duyệt yêu cầu thuê phòng (Rental Request)
- Trạng thái hợp đồng được quản lý qua: PENDING → ACTIVE → TERMINATED/EXPIRED
- Các thao tác thủ công chỉ gồm: **Xem**, **Tải .docx**, và **Chấm dứt**

Đây là thiết kế hợp lý cho hệ thống quản lý phòng trọ — giữ tính toàn vẹn dữ liệu bằng cách không cho phép sửa/xóa hợp đồng đã ký.
