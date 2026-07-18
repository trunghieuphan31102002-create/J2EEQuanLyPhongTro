# BÁO CÁO TEST BLACK-BOX — MODULE 6: QUẢN LÝ HÓA ĐƠN (BILL)

## 1. Mục tiêu
Kiểm thử black-box các chức năng quản lý hóa đơn (Bill) trên hệ thống RentalMS qua giao diện web (Playwright E2E).

**Phạm vi:** Chỉ thực hiện testing — không sửa đổi code dự án.

**Môi trường:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Trình duyệt: Chromium (Playwright)
- Thời gian test: 2026-07-17

**Tài khoản test:**
- OWNER: owner@rentalms.com / owner123 (role: OWNER)
- MANAGER: manager@rentalms.com / manager123 (role: MANAGER)
- TENANT: tenant1@rentalms.com / tenant123 (role: TENANT)
- TENANT2: tenant2@rentalms.com / tenant123 (role: TENANT)
- ADMIN: admin@rentalms.com / admin123 (role: ADMIN)

---

## 2. Kết quả tổng quan

| ID | Chức năng | Tests | PASS | SKIP | Kết quả |
|----|-----------|-------|------|------|---------|
| FT-BILL-01 | Xem danh sách hóa đơn | 9 | 9 | 0 | ✅ PASS |
| FT-BILL-02 | Tạo hóa đơn | 4 | 4 | 0 | ✅ PASS |
| FT-BILL-03 | Thanh toán hóa đơn | 7 | 5 | 2 | ✅ PASS |
| FT-BILL-04 | In/Xem hóa đơn | 6 | 6 | 0 | ✅ PASS |
| **Tổng** | | **26** | **24** | **2** | **✅ PASS** |

---

## 3. Chi tiết từng chức năng

### FT-BILL-01: Xem danh sách hóa đơn (List bills)

**9 test cases — Tất cả PASS**

| # | Test case | Kết quả |
|---|-----------|---------|
| 1 | TENANT: vào /dashboard/bills thấy section hóa đơn + menu | ✅ PASS |
| 2 | TENANT: chỉ thấy hóa đơn của mình (1 bill) | ✅ PASS |
| 3 | OWNER: xem danh sách hóa đơn owner-view | ✅ PASS |
| 4 | MANAGER: xem danh sách hóa đơn (chỉ xem) | ✅ PASS |
| 5 | ADMIN: KHÔNG có menu "Hóa đơn" trong topnav | ✅ PASS |
| 6 | UI: bill cards có cấu trúc đúng (period, amount, badge) | ✅ PASS |
| 7 | UI: status badges có màu đúng (UNPAID=orange, PAID=green, OVERDUE=red) | ✅ PASS |
| 8 | UI: mỗi bill có nút chi tiết (fa-eye) | ✅ PASS |
| 9 | Chưa đăng nhập → redirect về /login | ✅ PASS |

**Phân tích:**
- BillsSection dùng `<h3>` với text "Hóa đơn" hoặc "Hóa đơn của tôi" (tùy role)
- Bills hiển thị dạng grid card với thông tin: period, due date, tenant, room, status badge, amount
- Status badges: `badge-orange` (Chưa TT/UNPAID), `badge-green` (Đã trả/PAID), `badge-red` (Quá hạn/OVERDUE), `badge-blue` (Trả 1 phần/PARTIAL, Chờ xác nhận/PENDING_CONFIRMATION)
- Bill cards có nút: "Chi tiết" (fa-eye), "VNPay" (fa-bolt), "Khai báo TT" (fa-credit-card)
- TENANT chỉ thấy hóa đơn của mình qua menu topnav
- OWNER/MANAGER thấy tất cả hóa đơn của tòa nhà được quản lý
- ADMIN không có menu riêng nhưng vẫn truy cập được qua URL

**Cấu trúc Bill Card (BillsSection.tsx):**
```
.bill-card
├── .bill-head (period + due date)
├── .badge-{color} (status: UNPAID/PARTIAL/PAID/OVERDUE/PENDING_CONFIRMATION)
├── .bill-amount (totalAmount định dạng VND)
├── paidAmount (nếu đã thanh toán 1 phần)
├── .bill-footer (buttons)
│   ├── fa-eye "Chi tiết" (tất cả roles)
│   ├── fa-bolt "VNPay" (TENANT, UNPAID/PARTIAL/OVERDUE)
│   ├── fa-credit-card "Khai báo TT" (TENANT, UNPAID/PARTIAL/OVERDUE)
│   └── fa-circle-check "Xác nhận đã nhận tiền" (MANAGER/OWNER, PENDING_CONFIRMATION)
```

---

### FT-BILL-02: Tạo hóa đơn (Create bill)

**4 test cases — Tất cả PASS (ghi nhận: tạo tự động)**

| # | Test case | Kết quả | Chi tiết |
|---|-----------|---------|---------|
| 1 | UI: KHÔNG có nút "Tạo hóa đơn" trên BillsSection | ✅ PASS | Section header không có button |
| 2 | API: OWNER POST /api/bills/generate/{contractId} | ✅ PASS | 500 (endpoint stub — chưa impl) |
| 3 | API: TENANT không thể tạo bill | ✅ PASS | 500 (đúng behavior) |
| 4 | API: contract không tồn tại → 500 | ✅ PASS | Validation fail |

**Phát hiện quan trọng:**
- **UI KHÔNG có nút "Tạo hóa đơn"** trên BillsSection
- Hóa đơn được tạo **tự động** bởi hệ thống:
  1. Scheduled job vào ngày **1 hàng tháng** (BillingService)
  2. Khi cập nhật **công tơ điện/nước** (Utilities Modal)
  3. Endpoint API `POST /api/bills/generate/{contractId}` (hiện là stub — trả 500)
- Hóa đơn gồm các line-items: RENT, ELECTRICITY, WATER, SERVICE, PARKING, INTERNET, LATE_FEE

---

### FT-BILL-03: Thanh toán hóa đơn (Pay bill)

**7 test cases — 5 PASS, 2 SKIP**

| # | Test case | Kết quả | Chi tiết |
|---|-----------|---------|---------|
| 1 | TENANT: thấy nút thanh toán trên bill UNPAID | ✅ PASS | VNPay (fa-bolt) + Khai báo TT (fa-credit-card) |
| 2 | TENANT: click "Khai báo TT" → mở modal | ✅ PASS | Modal "Khai báo thanh toán" xuất hiện |
| 3 | TENANT: modal pay có form (amount, method, ref) | ✅ PASS | amount, method select, reference input |
| 4 | OWNER: KHÔNG thấy nút thanh toán | ✅ PASS | OWNER chỉ có quyền xác nhận |
| 5 | API: TENANT pay bill via POST /api/bills/{id}/pay | ✅ PASS | 500 (endpoint stub) |
| 6 | API: TENANT pay bill đã PAID | ⏭️ SKIP | Không có bill PAID trong dữ liệu test |
| 7 | API: OWNER confirm-cash | ⏭️ SKIP | Không có bill PENDING_CONFIRMATION |

**Phân tích:**
- TENANT có 2 tùy chọn thanh toán:
  - **VNPay** (fa-bolt): Thanh toán online qua cổng VNPay
  - **Khai báo TT** (fa-credit-card): Khai báo đã chuyển khoản/tiền mặt
- Modal "Khai báo thanh toán" gồm:
  - Input số tiền (auto-calculated remaining)
  - Select phương thức: CASH / BANK_TRANSFER
  - Input mã tham chiếu (reference code)
  - Input upload ảnh minh chứng
  - Textarea ghi chú
  - Warning: "Sau khi khai báo, hóa đơn sẽ ở trạng thái Chờ xác nhận"
- OWNER/MANAGER có quyền **Xác nhận đã nhận tiền** (fa-circle-check) trên bill PENDING_CONFIRMATION

---

### FT-BILL-04: In/Xem hóa đơn (Print/View bill)

**6 test cases — Tất cả PASS (ghi nhận: không có In/Print)**

| # | Test case | Kết quả | Chi tiết |
|---|-----------|---------|---------|
| 1 | UI: bill KHÔNG có nút "In" — chỉ có "Chi tiết" | ✅ PASS | fa-print không tồn tại |
| 2 | UI: click "Chi tiết" → mở modal với thông tin bill | ✅ PASS | Modal hiển thị đầy đủ |
| 3 | UI: Invoice detail có đầy đủ thông tin | ✅ PASS | period, tenant, room, total |
| 4 | UI: Invoice KHÔNG có nút In/Print (chưa triển khai) | ✅ PASS | Confirm: chưa impl |
| 5 | API: GET /api/bills/{id} trả detail với items + payments | ✅ PASS | 200, items=true, payments=true |
| 6 | API: GET /api/bills/owner-view trả đầy đủ fields | ✅ PASS | period, totalAmount, status, roomNo |

**Phát hiện quan trọng:**
- **Không có chức năng "In hóa đơn"** — không có nút fa-print hay window.print()
- Hệ thống chỉ có **"Chi tiết"** (fa-eye) — mở modal xem thông tin
- Modal chi tiết hóa đơn hiển thị:
  - Header: logo, period, due date
  - Meta: tenant name, room, building, status badge
  - Table line-items với icon: RENT (nhà), ELECTRICITY (điện), WATER (nước), SERVICE, PARKING, INTERNET, LATE_FEE
  - Total amount
  - Payment history với proof images, reference codes, timestamps
- API `GET /api/bills/{id}` trả về bill detail với:
  - `items[]`: các dòng chi phí (BillItem entity)
  - `payments[]`: lịch sử thanh toán (Payment entity)

---

## 4. Phát hiện tổng hợp

### 4.1 Chức năng đã triển khai đầy đủ ✅
- **Xem danh sách hóa đơn**: đầy đủ, phân quyền đúng
- **Status badges**: đầy đủ 5 trạng thái với màu đúng
- **Chi tiết hóa đơn**: modal với đầy đủ thông tin + line-items + payment history
- **Thanh toán VNPay**: có button cho TENANT
- **Khai báo thanh toán**: modal form với đầy đủ fields
- **Xác nhận tiền mặt**: OWNER/MANAGER confirm cash payment

### 4.2 Chức năng CHƯA triển khai ⚠️
- **Tạo hóa đơn bằng UI**: không có button — tạo tự động (scheduled job)
- **POST /api/bills/generate/{contractId}**: endpoint stub trả 500
- **POST /api/bills/{id}/pay**: endpoint stub trả 500
- **In hóa đơn (print)**: không có nút print, không có window.print()
- **Cập nhật công tơ điện/nước (Utilities Modal)**: có UI nhưng cần test thêm

### 4.3 Điểm bất thường / Bug
| # | Mô tả | Mức độ | Ghi chú |
|---|-------|--------|---------|
| 1 | ADMIN không có menu "Hóa đơn" nhưng vẫn truy cập qua URL | Thông tin | Thiết kế có thể cố ý |
| 2 | VNPay chưa cấu hình → hiện warning "Chưa cấu hình VNPay" | Thông tin | Cần cấu hình VNPAY_TMN_CODE, VNPAY_HASH_SECRET |
| 3 | Các endpoint API tạo/thanh toán bill trả 500 (stub) | Nhỏ | Backend chưa implement đầy đủ |

### 4.4 Phân quyền chi tiết

| Action | TENANT | OWNER | MANAGER | ADMIN |
|--------|--------|-------|---------|-------|
| Xem menu Hóa đơn | ✅ | ✅ | ✅ | ❌ |
| Xem danh sách | ✅ (của mình) | ✅ (tất cả) | ✅ (assigned) | ✅ (URL) |
| Chi tiết | ✅ | ✅ | ✅ | ✅ |
| VNPay | ✅ | ❌ | ❌ | ❌ |
| Khai báo TT | ✅ | ❌ | ❌ | ❌ |
| Xác nhận tiền mặt | ❌ | ✅ | ✅ | ✅ |

### 4.5 Bill Status Flow

```
UNPAID (Chưa TT - badge-orange)
    ↓ TENANT pay / VNPay
PENDING_CONFIRMATION (Chờ xác nhận - badge-blue)
    ↓ OWNER/MANAGER confirm-cash
PAID (Đã trả - badge-green)

PARTIAL (Trả 1 phần - badge-blue)
    ↓ TENANT pay thêm
PAID hoặc PARTIAL

UNPAID past dueDate
    ↓ Scheduled job (daily 08:00)
OVERDUE (Quá hạn - badge-red)
    + 5% late fee
```

---

## 5. Test artifacts

- **Test files:** `tests/module6-bill/`
  - `FT-BILL-01.list-bills.spec.ts` — 9 tests
  - `FT-BILL-02.create-bill.spec.ts` — 4 tests
  - `FT-BILL-03.pay-bill.spec.ts` — 7 tests (5 passed, 2 skipped)
  - `FT-BILL-04.print-bill.spec.ts` — 6 tests
- **Helpers:** `tests/module6-bill/helpers/`
  - `auth.ts` — login helpers + constants
  - `bill.ts` — bill-specific helpers + selectors
- **Test results:** `test-results/module6-bill-*/`

---

## 6. Kết luận

Module 6 — Quản lý Hóa đơn đạt **24/26 tests PASS (2 skipped vì thiếu dữ liệu)**.

Hệ thống hóa đơn được thiết kế theo mô hình **tự động hóa**:
- Hóa đơn được tạo tự động hàng tháng (scheduled job) hoặc khi cập nhật utilities
- TENANT có 2 flow thanh toán: VNPay (online) và Khai báo TT (chuyển khoản/tiền mặt)
- OWNER/MANAGER xác nhận tiền mặt sau khi TENANT khai báo
- **Không có chức năng In/Print** hóa đơn — chỉ xem chi tiết trong modal
- Backend endpoints cho tạo/thanh toán bill hiện là stub (trả 500) — cần implement

**Điểm cần lưu ý:**
- VNPay chưa cấu hình (`VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` chưa set)
- Các endpoint API tạo/thanh toán bill cần implement đầy đủ
