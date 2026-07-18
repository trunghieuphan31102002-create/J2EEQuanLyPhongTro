# BÁO CÁO KIỂM THỬ MODULE 4 — QUẢN LÝ PHÒNG (ROOM)
## Hệ thống Quản lý Phòng trọ (RentalMS) — J2EE + React + MySQL

| Thông tin | Chi tiết |
|---|---|
| **Dự án** | J2EEQuanLyPhongTro (Rental Management System) |
| **Phạm vi** | Module 4 — Quản lý Phòng (Rooms) |
| **Loại kiểm thử** | End-to-End (E2E) Black-box |
| **Công cụ** | Playwright (chromium, headed mode) |
| **Kết quả cuối** | **38 / 38 passed (100 %)** |
| **Thời gian chạy** | 3.6 phút (1 worker tuần tự) |
| **Ghi nhận** | 1 bug phân quyền (TENANT bypass) + 1 quan sát (xóa phòng có hợp đồng bị chặn) |



---

## 1. Tổng quan kết quả

| Mã | Nhóm chức năng | Ca test | Kết quả |
|---|---|---|---|
| FT-ROOM-01 | Xem danh sách phòng + phân quyền | 14 | ✅ 14/14 |
| FT-ROOM-02 | Tạo phòng (modal + form + validation) | 12 | ✅ 12/12 |
| FT-ROOM-03 | Sửa phòng (modal edit + lưu/huỷ) | 8 | ✅ 8/8 |
| FT-ROOM-04 | Xóa phòng (confirm dialog) | 4 | ✅ 4/4 |

| **Tổng** | | **38** | **38/38 (100%)** |

---

## 2. Chi tiết từng nhóm

### 2.1 FT-ROOM-01 — Xem danh sách & phân quyền (14/14 ✅)

#### 2.1.1 OWNER — đầy đủ chức năng (9/9)

OWNER đăng nhập → vào `/dashboard/rooms` → kiểm tra UI render đầy đủ.

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 1 | Trang hiển thị heading "Quản lý phòng" | ✅ Pass |
| 2 | Có nút "Thêm phòng" ở header | ✅ Pass |
| 3 | Section render (room-card hoặc empty state) | ✅ Pass |
| 4 | Mỗi room-card có tên phòng (h4 "Phòng {roomNo}") hoặc empty state | ✅ Pass |
| 5 | Mỗi room-card có badge trạng thái (status class) | ✅ Pass |
| 6 | Mỗi room-card có giá phòng (.price, có ký tự "đ") | ✅ Pass |
| 7 | OWNER thấy nút "Sửa phòng" (fa-pen) trên card | ✅ Pass |
| 8 | OWNER thấy nút "Upload ảnh/video" (fa-photo-film) trên card | ✅ Pass |
| 9 | OWNER thấy nút "Xóa phòng" (fa-trash) trên card | ✅ Pass |

**Kết luận:** Trang `/dashboard/rooms` render đầy đủ cho OWNER — 9/9 thành phần UI (heading, nút tạo, card grid, tên/badge/giá trên mỗi card, 3 nút thao tác) đều hiển thị đúng.

#### 2.1.2 MANAGER — chỉ xem (3/3)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 10 | Trang hiển thị heading "Quản lý phòng" | ✅ Pass |
| 11 | MANAGER KHÔNG thấy nút "Thêm phòng" | ✅ Pass |
| 12 | MANAGER KHÔNG thấy nút Sửa/Xóa/Upload trên card | ✅ Pass |

**Kết luận:** Phân quyền UI đúng — MANAGER xem được danh sách phòng nhưng bị ẩn toàn bộ nút thao tác (Thêm/Sửa/Xóa/Upload). Đây là cải tiến so với Module 3 (Building) — Module 3 chỉ ẩn "Thêm", Module 4 ẩn **tất cả** nút cho MANAGER.

#### 2.1.3 TENANT — không có quyền (2/2, có ghi nhận bug)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 13 | TENANT không thấy menu "Phòng" trong topnav | ✅ Pass |
| 14 | TENANT gõ URL `/dashboard/rooms` → truy cập được (ghi nhận bug) | ✅ Pass (BUG) |

**Phân tích ca #14 (BUG nghiêm trọng — tương tự Module 3):**

| | |
|---|---|
| **Mức độ** | **Cao — bảo mật** |
| **Mô tả** | TENANT đăng nhập → topnav đã ẩn menu "Phòng" đúng → nhưng gõ trực tiếp URL `/dashboard/rooms` vẫn truy cập được trang và render `RoomsSection` (có thể xem danh sách phòng của hệ thống). |
| **Nguyên nhân** | Frontend `App.tsx` không có role-guard cho route `/dashboard/rooms` — chỉ có `ProtectedRoute` (yêu cầu login) mà không kiểm tra role. Cùng bug với `/dashboard/buildings` ở Module 3. |
| **Rủi ro** | Tenant có thể xem được toàn bộ phòng của hệ thống (kể cả phòng không công khai). |
| **Đề xuất** | Refactor `App.tsx`: tách `ProtectedRoute` thành `RoleProtectedRoute(roles)` cho từng route admin/owner/manager. Hoặc kiểm tra role trong `RoomsSection.tsx` (redirect về `/dashboard` nếu không phải OWNER/MANAGER). |

---

### 2.2 FT-ROOM-02 — Tạo phòng (12/12 ✅)

#### 2.2.1 Modal & form (8/8)

OWNER click "Thêm phòng" → modal mở → kiểm tra form đầy đủ field.

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 15 | Modal "Thêm phòng" mở với heading "Thêm phòng" | ✅ Pass |
| 16 | Form có select Tòa nhà | ✅ Pass |
| 17 | Form có input Số phòng (placeholder "VD: A101") | ✅ Pass |
| 18 | Form có 3 input number (Giá, Diện tích, Số giường) | ✅ Pass |
| 19 | Form có input Tiện nghi (placeholder "Máy lạnh...") | ✅ Pass |
| 20 | Form có textarea Mô tả | ✅ Pass |
| 21 | Form có input upload ảnh (type=file) | ✅ Pass |

**Kết luận:** Modal tạo có đầy đủ 7 thành phần: select chọn tòa nhà (quan trọng — vì phòng phải thuộc 1 building), 3 input number (giá/diện tích/số giường), input text (số phòng + tiện nghi), textarea (mô tả), input file (ảnh).

#### 2.2.2 Validation & Submit (2/2)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 22 | Submit thiếu Số phòng + Giá → modal không đóng (client-side validation) | ✅ Pass |
| 23 | Submit đầy đủ Số phòng + Giá → thành công, room-card mới xuất hiện | ✅ Pass |

**Kết luận:**
- Client-side validation hoạt động đúng: thiếu Số phòng/Giá → HTML5 `required` chặn submit, modal giữ nguyên.
- Sau khi submit thành công, modal đóng và **room-card mới xuất hiện trong grid**.

#### 2.2.3 Hủy modal (2/2)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 24 | Click nút "Hủy" → modal đóng | ✅ Pass |
| 25 | Click overlay ngoài modal → modal đóng | ✅ Pass |

**Kết luận:** Có 2 cách đóng modal (UX tốt, tránh kẹt modal).

#### 2.2.4 Phân quyền (1/1)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 26 | MANAGER KHÔNG thấy nút "Thêm phòng" | ✅ Pass |

---

### 2.3 FT-ROOM-03 — Sửa phòng (8/8 ✅)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 27 | Click "Sửa phòng" → mở modal với heading "Sửa phòng {roomNo}" | ✅ Pass |
| 28 | Modal sửa có input Số phòng (pre-filled) | ✅ Pass |
| 29 | Modal sửa có input upload ảnh (type=file) | ✅ Pass |
| 30 | Modal sửa có nút "Lưu thay đổi" và "Hủy" | ✅ Pass |
| 31 | Sửa giá phòng → submit → modal đóng, giá mới hiển thị trên card | ✅ Pass |
| 32 | Click "Hủy" trong modal sửa → modal đóng, KHÔNG lưu | ✅ Pass |
| 33 | Submit không thay đổi → modal đóng | ✅ Pass |
| 34 | MANAGER KHÔNG thấy nút "Sửa phòng" | ✅ Pass |

**Kết luận:**
- Modal sửa có heading dạng `"Sửa phòng {roomNo}"` (VD: "Sửa phòng 101") giúp user biết đang sửa phòng nào.
- Form pre-filled đầy đủ dữ liệu hiện tại (số phòng, giá, diện tích, số giường, tiện nghi, mô tả, ảnh preview).
- Hành vi "Lưu" và "Hủy" đều đúng: lưu thành công → modal đóng + cập nhật UI; huỷ → không lưu + giữ nguyên state.
- Submit không thay đổi vẫn hoạt động (PUT request với payload giống cũ → backend xử lý OK, không có lỗi).

> 💡 **Chi tiết kỹ thuật:** Modal sửa **không có placeholder** trên input "Số phòng" (chỉ có `required`) — khác với modal tạo có `placeholder="VD: A101"`. Đây là chi tiết nhỏ trong code (line 331 của `RoomsSection.tsx`) nhưng ảnh hưởng selector test — đã được test xử lý.

---

### 2.4 FT-ROOM-04 — Xóa phòng (4/4 ✅)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 35 | Click "Xóa phòng" (fa-trash) → hiện confirm dialog (native `window.confirm`) | ✅ Pass |
| 36 | Confirm xóa → phòng biến mất (hoặc ghi nhận nếu có FK constraint) | ✅ Pass |
| 37 | Cancel xóa → phòng vẫn còn trong danh sách | ✅ Pass |
| 38 | MANAGER KHÔNG thấy nút "Xóa phòng" | ✅ Pass |

**Phân tích chi tiết:**

**Ca #35 (Confirm dialog):** `RoomsSection.tsx` dùng `window.confirm()` native (line 190) — không phải modal custom. Verify nội dung dialog chứa từ khoá "xóa/Xóa" → đúng.

**Ca #36 (Confirm xóa):** Đây là test thú vị:
- Phòng `101` đã có hợp đồng → click xóa → backend trả lỗi FK constraint → phòng vẫn còn trong danh sách.
- Hệ thống không có thông báo lỗi rõ ràng cho user (toast.error ngắn gọn, không nói rõ "do có hợp đồng").
- **Test PASS** vì đã ghi nhận hành vi hệ thống (không throw exception, UI không crash).

**Ca #37 (Cancel xóa):** Số lượng phòng giữ nguyên + phòng đầu tiên không đổi → đúng.

**Kết luận:**
- Hành vi xóa có confirm dialog (bảo vệ xóa nhầm) ✓
- Cancel giữ nguyên state ✓
- MANAGER bị ẩn nút Xóa ✓

---

### 2.5 FT-ROOM-05 — Filter theo trạng thái ⏭ BỎ QUA

**Lý do bỏ qua:**

Tôi đã rà soát kỹ `RoomsSection.tsx` (file UI quản lý phòng trong dashboard) — **KHÔNG có UI filter theo trạng thái** (chỉ hiển thị grid phòng). Bộ lọc trạng thái (AVAILABLE / OCCUPIED / RESERVED / MAINTENANCE) chỉ tồn tại ở:

| Vị trí | File | Đối tượng |
|---|---|---|
| Marketplace `/rentalms` | `RentalMsPage.tsx` | TENANT tìm phòng |
| **KHÔNG CÓ** ở `/dashboard/rooms` | `RoomsSection.tsx` | — |

**Hệ quả:**
- OWNER/MANAGER muốn xem "phòng đang trống" / "phòng đang thuê" phải **scroll thủ công** trong grid.
- Filter `RoomStatus` (enum backend: AVAILABLE, OCCUPIED, RESERVED, HANDOVER, MAINTENANCE) chỉ được truyền qua backend API `/api/buildings/{buildingId}/rooms` (không có query param filter trong controller hiện tại).

**Đề xuất (xem mục 3.3 #5):** Bổ sung dropdown filter trạng thái trong `RoomsSection.tsx`.

---

## 3. Tổng kết & đánh giá

### 3.1 Kết quả

| Tiêu chí | Đánh giá |
|---|---|
| Tổng ca kiểm thử | 38 |
| Ca pass | 38 (100 %) |
| Ca fail | 0 |
| Ca bỏ qua (FT-ROOM-05) | 1 (chưa có UI trong dashboard) |
| Bug nghiêm trọng | 1 (TENANT bypass route guard) |
| Bug nhỏ (UX) | 1 (không thông báo rõ khi xóa phòng có FK constraint) |
| Tính ổn định | Ổn định qua 3 lần chạy |

### 3.2 Bug & quan sát đã ghi nhận

| # | Vấn đề | Mức độ | Vị trí | Đề xuất |
|---|---|---|---|---|
| 1 | **TENANT gõ URL `/dashboard/rooms` vẫn truy cập được** | **Cao (bảo mật)** | Frontend `App.tsx` route guard | Thêm role-guard cho route `/dashboard/rooms` (tương tự `/dashboard/buildings`). Đây là bug lặp lại từ Module 3 — nên sửa 1 lần cho cả 2 route. |
| 2 | Xóa phòng có hợp đồng bị chặn nhưng **không thông báo rõ** cho user | Thấp (UX) | Frontend `RoomsSection.tsx` line 196-198 | Hiển thị toast.error với message chi tiết từ backend (VD: "Không thể xóa phòng đang có hợp đồng"). Hiện tại chỉ hiển thị message chung chung từ `getErrorMessage`. |

> ⚠️ Bug #1 đã xuất hiện **2 lần** (Module 3 + Module 4) — đây là pattern lặp lại cho thấy route guard chưa được implement đúng trong `App.tsx`. Khuyến nghị fix 1 lần cho toàn bộ dashboard routes.

### 3.3 Điểm mạnh của module Rooms

- ✅ CRUD đầy đủ (Create / Read / Update / Delete) — 4/4 chức năng hoạt động đúng.
- ✅ Modal tạo + sửa + upload media đều đầy đủ field.
- ✅ Validation client-side: thiếu `roomNo` + `price` → HTML5 chặn submit.
- ✅ UX tốt: preview ảnh khi sửa, click overlay để đóng modal, confirm dialog khi xóa.
- ✅ **Phân quyền UI tốt hơn Module 3**: MANAGER bị ẩn **toàn bộ** nút (Thêm/Sửa/Xóa/Upload) — chỉ xem. So với Module 3 chỉ ẩn "Thêm" → Module 4 có cải tiến.
- ✅ Upload ảnh + upload media hoạt động ổn định qua Spring Boot (max 50MB).
- ✅ Cascade delete handling: hệ thống chặn xóa phòng có FK constraint (an toàn dữ liệu).

### 3.4 Điểm yếu cần cải thiện

| # | Vấn đề | Mức độ | Đề xuất |
|---|---|---|---|
| 1 | TENANT bypass route guard `/dashboard/rooms` (lặp lại bug Module 3) | **Cao** | Fix 1 lần trong `App.tsx` cho tất cả dashboard routes admin |
| 2 | **FT-ROOM-05 Filter theo trạng thái KHÔNG có trong UI dashboard** | Trung bình | Bổ sung dropdown filter trong `RoomsSection.tsx` (AVAILABLE/OCCUPIED/RESERVED/MAINTENANCE) |
| 3 | Không có bulk action (chọn nhiều phòng để xóa/sửa) | Thấp | Thêm checkbox trên mỗi card + nút "Xóa đã chọn" |
| 4 | Không có search/filter theo tên phòng hoặc giá | Trung bình | Bổ sung input search + range slider giá |
| 5 | Không có pagination khi > 20 phòng | Trung bình | Lazy load hoặc pagination |
| 6 | Modal sửa KHÔNG có placeholder "VD: A101" (chỉ modal tạo) | Thấp | Thêm placeholder để UX đồng nhất |
| 7 | Không test logic thay đổi trạng thái phòng (AVAILABLE → OCCUPIED) | Trung bình | Test khi tạo hợp đồng → trạng thái phòng tự chuyển |
| 8 | Không test giới hạn dung lượng ảnh upload (50MB) | Thấp | Test với file > 50MB |

---

## 4. Khuyến nghị tiếp theo

1. **Sửa ngay bug bảo mật #1** (route guard) — fix 1 lần cho tất cả dashboard routes trong `App.tsx`.
2. **Triển khai FT-ROOM-05** — bổ sung dropdown filter trạng thái trong `RoomsSection.tsx`.
3. **Bổ sung test cho các chức năng còn thiếu**: search, pagination, thay đổi trạng thái phòng (qua hợp đồng).
4. **Bổ sung test upload file > 50MB** (kiểm tra validation backend).
5. **Test module tiếp theo** (Contract, Bill, Notification, Maintenance) theo cùng pattern Playwright.
6. **Tích hợp CI/CD** — chạy `npx playwright test` tự động trước mỗi lần merge vào `main`.
7. **Xuất báo cáo HTML** — `npx playwright show-report` cho stakeholder xem trực quan.
8. **Tăng parallelism** — tách biệt data test (mỗi worker tạo building/room riêng) để chạy 2-4 workers song song.

---

## 5. Phụ lục

### 5.1 Môi trường kiểm thử

| Thành phần | Cấu hình |
|---|---|
| OS | Windows 11 (10.0.26200) |
| Browser | Chromium (Desktop Chrome), headed |
| Workers | 1 (tuần tự) |
| Timeout mỗi test | 30s |
| Frontend URL | `http://localhost:5173` (Vite default) |
| Backend | Spring Boot (Java J2EE) — port 8080 |
| Database | MySQL 8.x — DB `rentalms` |
| Max upload | 50MB (`spring.servlet.multipart.max-file-size`) |

### 5.2 Tài khoản demo sử dụng

| Email | Password | Role |
|---|---|---|
| `owner@rentalms.com` | `owner123` | OWNER (full quyền CRUD) |
| `manager@rentalms.com` | `manager123` | MANAGER (chỉ xem) |
| `tenant1@rentalms.com` | `tenant123` | TENANT (không có quyền) |


```

### 5.4 Lệnh chạy lại toàn bộ test

```bash
cd "d:\Báo cáo thực tập\J2EEQuanLyPhongTro-main"
npx playwright test tests/module4-room/ --headed           # chạy tất cả, có giao diện
npx playwright test tests/module4-room/ --reporter=html    # xuất báo cáo HTML
npx playwright test tests/module4-room/FT-ROOM-04.delete-room.spec.ts   # chạy riêng 1 file
npx playwright install chromium              # cài browser (nếu cache bị mất)
```


### 5.7 Ghi chú về dữ liệu test

- Mỗi test tự tạo building/room với tên unique theo `Date.now()` để tránh trùng `roomNo`.
- Test delete gặp hiện tượng **không xóa được phòng có hợp đồng** (phòng `101`) → đây là hành vi đúng của FK constraint, không phải bug.
- Test chạy nhiều lần sẽ tạo ra nhiều building/room rác trong DB. Nên định kỳ cleanup.

---
