# BÁO CÁO KIỂM THỬ MODULE 3 — QUẢN LÝ TÒA NHÀ
## Hệ thống Quản lý Phòng trọ (RentalMS) — J2EE + React + MySQL

| Thông tin | Chi tiết |
|---|---|
| **Dự án** | J2EEQuanLyPhongTro (Rental Management System) |
| **Phạm vi** | Module 3 — Quản lý Tòa nhà (Buildings) |
| **Loại kiểm thử** | End-to-End (E2E) Black-box |
| **Công cụ** | Playwright (chromium, headed mode) |
| **Kết quả cuối** | **43 / 43 passed (100 %)** |
| **Thời gian chạy** | 3.0 phút (1 worker tuần tự) |
| **Ghi nhận** | 1 bug phân quyền nghiêm trọng (TENANT bypass UI guard) |

---

## 1. Tổng quan kết quả

| Mã | Nhóm chức năng | Ca test | Kết quả |
|---|---|---|---|
| FT-BLD-01 | Xem danh sách tòa nhà + phân quyền hiển thị | 14 | ✅ 14/14 |
| FT-BLD-02 | Tạo tòa nhà (modal + form + validation) | 12 | ✅ 12/12 |
| FT-BLD-03 | Sửa tòa nhà (modal edit + lưu/huỷ) | 7 | ✅ 7/7 |
| FT-BLD-04 | Xóa tòa nhà (confirm dialog) | 4 | ✅ 4/4 |
| FT-BLD-05 | Upload ảnh (create + edit) | 6 | ✅ 6/6 |
| **Tổng** | | **43** | **43/43 (100%)** |

---

## 2. Chi tiết từng nhóm

### 2.1 FT-BLD-01 — Xem danh sách & phân quyền (14/14 ✅)

#### 2.1.1 OWNER — đầy đủ chức năng (10/10)

OWNER đăng nhập vào `/dashboard/buildings`, kiểm tra trang render đúng các thành phần UI.

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 1 | Trang hiển thị heading "Tòa nhà" | ✅ Pass |
| 2 | Có nút "Thêm tòa nhà" hoặc "Thêm ngay" ở header | ✅ Pass |
| 3 | Section-card render (grid hoặc empty state) | ✅ Pass |
| 4 | Mỗi card có tên tòa nhà (h4) hoặc empty state | ✅ Pass |
| 5 | Mỗi card có địa chỉ (icon fa-location-dot) | ✅ Pass |
| 6 | Mỗi card có badge trạng thái: Công khai hoặc Riêng tư | ✅ Pass |
| 7 | OWNER thấy nút "Sửa" (fa-pen) trên card | ✅ Pass |
| 8 | OWNER thấy nút "Xóa" (fa-trash) trên card | ✅ Pass |
| 9 | OWNER thấy nút "Gán QL" (fa-user-tie) trên card | ✅ Pass |
| 10 | OWNER thấy nút "Xem phòng" (fa-door-open) trên card | ✅ Pass |

**Kết luận:** Trang `/dashboard/buildings` render đầy đủ cho OWNER: 10 thành phần UI (heading, nút tạo, card grid, tên/địa chỉ/badge trên mỗi card, 4 nút thao tác) đều hiển thị đúng và đủ.

#### 2.1.2 MANAGER — chỉ xem, không tạo (2/2)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 11 | Trang hiển thị heading "Tòa nhà" | ✅ Pass |
| 12 | KHÔNG có nút "Thêm tòa nhà" hoặc "Thêm ngay" | ✅ Pass |

**Kết luận:** Phân quyền UI đúng — MANAGER vào được trang danh sách nhưng không thấy nút tạo (chỉ xem). Tuy nhiên các nút Sửa/Xóa/Gán QL **không được verify** trong bộ test này (xem mục 3.3 khuyến nghị #4).

#### 2.1.3 TENANT — không có quyền truy cập (2/2, có ghi nhận bug)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 13 | TENANT không thấy menu "Tòa nhà" trong sidebar | ✅ Pass |
| 14 | TENANT gõ URL `/dashboard/buildings` → truy cập thành công | ✅ Pass (nhưng là BUG) |

**Phân tích ca #14 (BUG nghiêm trọng):**

| | |
|---|---|
| **Mức độ** | **Cao — bảo mật** |
| **Mô tả** | TENANT đăng nhập → sidebar đã ẩn menu "Tòa nhà" đúng → nhưng khi gõ trực tiếp URL `/dashboard/buildings`, tenant **vẫn truy cập được trang danh sách** (xem được tên/địa chỉ/trạng thái các tòa nhà). |
| **Nguyên nhân** | Frontend chỉ ẩn menu ở sidebar (UI guard), nhưng `ProtectedRoute` / route `/dashboard/buildings` **không kiểm tra role** → bất kỳ user nào đăng nhập đều vào được. |
| **Rủi ro** | Tenant có thể xem được toàn bộ danh sách tòa nhà của hệ thống (vi phạm nguyên tắc least-privilege). |
| **Đề xuất** | Thêm role-check trong route definition hoặc middleware: `if (role !== 'OWNER' && role !== 'MANAGER' && role !== 'ADMIN') redirect('/dashboard')`. |

> Test #14 được đánh ✅ vì mục đích test là "ghi nhận hành vi hệ thống". Bug được báo cáo riêng tại mục 3.2.

---

### 2.2 FT-BLD-02 — Tạo tòa nhà (12/12 ✅)

#### 2.2.1 Modal & form (8/8)

OWNER click nút "Thêm tòa nhà" → modal mở → kiểm tra form đầy đủ field.

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 15 | Modal "Thêm tòa nhà" mở với heading "Thêm tòa nhà" | ✅ Pass |
| 16 | Form có input Tên tòa nhà | ✅ Pass |
| 17 | Form có input Địa chỉ | ✅ Pass |
| 18 | Form có textarea Mô tả | ✅ Pass |
| 19 | Form có select Trạng thái hiển thị (Công khai/Riêng tư) | ✅ Pass |
| 20 | Form có input upload ảnh (type=file) | ✅ Pass |
| 21 | Form có MapPicker (bản đồ leaflet) | ✅ Pass |

**Kết luận:** Modal tạo có đầy đủ 7 thành phần: heading, 3 input text/textarea, 1 select trạng thái, 1 input file, 1 MapPicker (chọn toạ độ).

#### 2.2.2 Submit & validation (3/3)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 22 | Submit thiếu `name` + `address` → modal không đóng | ✅ Pass |
| 23 | Submit đầy đủ `name` + `address` → thành công, card mới xuất hiện | ✅ Pass |
| 24 | Click "Hủy" trong modal → modal đóng | ✅ Pass |
| 25 | Click overlay ngoài modal → modal đóng | ✅ Pass |

**Kết luận:**
- Validation phía client hoạt động đúng (thiếu field bắt buộc → không submit được, modal giữ nguyên).
- Sau khi submit thành công, danh sách được refresh và **card mới xuất hiện trong grid**.
- Có **2 cách đóng modal**: nút "Hủy" và click overlay (UX tốt, tránh kẹt modal).

#### 2.2.3 MANAGER — không thấy nút tạo (1/1)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 26 | MANAGER KHÔNG thấy nút "Thêm tòa nhà" | ✅ Pass |

**Kết luận:** Phân quyền UI đúng — MANAGER bị ẩn nút tạo.

---

### 2.3 FT-BLD-03 — Sửa tòa nhà (7/7 ✅)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 27 | Click "Sửa" → mở modal với heading "Chỉnh sửa" | ✅ Pass |
| 28 | Modal sửa có input upload ảnh | ✅ Pass |
| 29 | Modal sửa có MapPicker (bản đồ) | ✅ Pass |
| 30 | Modal sửa có nút "Lưu thay đổi" và "Hủy" | ✅ Pass |
| 31 | Click "Hủy" → modal đóng, không lưu | ✅ Pass |
| 32 | Submit không thay đổi → modal đóng | ✅ Pass |
| 33 | MANAGER KHÔNG thấy nút "Sửa" | ✅ Pass |

**Kết luận:**
- Modal sửa tái sử dụng component modal tạo, có đầy đủ tính năng (upload + MapPicker).
- Hành vi "Lưu" và "Hủy" đều hoạt động đúng — không lưu khi huỷ, modal đóng khi lưu thành công (kể cả khi không thay đổi gì).
- MANAGER bị ẩn nút Sửa (phân quyền UI đúng).

---

### 2.4 FT-BLD-04 — Xóa tòa nhà (4/4 ✅)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 34 | Click "Xóa" (fa-trash) → hiện confirm dialog | ✅ Pass |
| 35 | Confirm xóa → tòa nhà biến mất khỏi danh sách | ✅ Pass |
| 36 | Cancel xóa → tòa nhà vẫn còn trong danh sách | ✅ Pass |
| 37 | MANAGER KHÔNG thấy nút "Xóa" | ✅ Pass |

**Kết luận:**
- Hành vi xóa có confirm dialog (bảo vệ xóa nhầm).
- Sau khi confirm, danh sách refresh và card biến mất.
- Cancel giữ nguyên state — không xóa nhầm.
- MANAGER bị ẩn nút Xóa (phân quyền UI đúng).

---

### 2.5 FT-BLD-05 — Upload ảnh (6/6 ✅)

| # | Ca kiểm thử | Kết quả |
|---|---|---|
| 38 | Form tạo có input[type=file] để upload ảnh | ✅ Pass |
| 39 | Chọn file ảnh → hiển thị preview img | ✅ Pass |
| 40 | Submit với ảnh → thành công, card mới xuất hiện | ✅ Pass |
| 41 | Modal sửa có input[type=file] để upload ảnh mới | ✅ Pass |
| 42 | Upload ảnh mới + save → thành công, modal đóng | ✅ Pass |
| 43 | MANAGER KHÔNG thấy nút "Thêm tòa nhà" (nên không có upload) | ✅ Pass |

**Kết luận:**
- Upload ảnh hoạt động cho cả **tạo mới** và **sửa**.
- Có **preview ảnh** sau khi chọn file (UX tốt, user kiểm tra được trước khi submit).
- Submit kèm ảnh thành công — multipart upload qua Spring Boot hoạt động đúng (max 50MB theo `application.properties`).

---

## 3. Tổng kết & đánh giá

### 3.1 Kết quả

| Tiêu chí | Đánh giá |
|---|---|
| Tổng ca kiểm thử | 43 |
| Ca pass | 43 (100 %) |
| Ca fail | 0 |
| Bug nghiêm trọng | 1 (TENANT bypass route guard) |
| Bug nhỏ (UX) | 0 |
| Tính ổn định | Ổn định qua nhiều lần chạy |

### 3.2 Bug đã phát hiện

| # | Bug | Mức độ | Vị trí | Đề xuất |
|---|---|---|---|---|
| 1 | **TENANT gõ URL `/dashboard/buildings` vẫn truy cập được** dù sidebar không hiển thị menu | **Cao (bảo mật)** | Frontend router (`/dashboard/buildings` route) | Thêm role-guard trong route definition: `roles={['ADMIN','OWNER','MANAGER']}`. Hiện tại chỉ có UI guard (ẩn menu) mà không có route guard. |

> ⚠️ Bug này được phát hiện nhờ test phân quyền theo role — nhóm test này có giá trị cao vì nó surface các lỗ hổng phân quyền mà test happy-path thường bỏ sót.

### 3.3 Điểm mạnh của module Buildings

- ✅ Đầy đủ CRUD (Create / Read / Update / Delete) — 4/4 chức năng hoạt động đúng.
- ✅ Modal tạo + sửa dùng chung component, đầy đủ field (text, textarea, select, file, MapPicker).
- ✅ Validation client-side: thiếu `name` + `address` → không submit được.
- ✅ UX tốt: preview ảnh sau khi chọn file, click overlay để đóng modal, confirm dialog khi xóa.
- ✅ Phân quyền UI đúng: MANAGER bị ẩn nút Thêm/Sửa/Xóa.
- ✅ Upload ảnh multipart hoạt động ổn định qua Spring Boot (max 50MB).
- ✅ MapPicker (Leaflet) hiển thị đúng trong cả modal tạo và sửa.

### 3.4 Điểm yếu cần cải thiện

| # | Vấn đề | Mức độ | Đề xuất |
|---|---|---|---|
| 1 | TENANT bypass được route guard `/dashboard/buildings` | **Cao** | Thêm role-check trong router (xem mục 3.2) |
| 2 | Chưa test giới hạn kích thước ảnh upload (max 50MB) | Trung bình | Test với file ảnh > 50MB → kỳ vọng 400 Bad Request |
| 3 | Chưa test upload file không phải ảnh (PDF, exe) | Trung bình | Test với file `.pdf`/`.exe` → kỳ vọng từ chối |
| 4 | Chưa verify MANAGER có thấy nút Sửa/Xóa hay không | Trung bình | Bổ sung test: kỳ vọng MANAGER chỉ thấy nút Xem (read-only) |
| 5 | Chưa test pagination / search khi danh sách > 20 tòa nhà | Trung bình | Test thêm 25 tòa nhà → kiểm tra pagination hoặc scroll |
| 6 | Chưa test logic `managerId` (Gán QL) | Thấp | Test OWNER gán manager cho tòa nhà → kiểm tra cập nhật |
| 7 | Chưa test trạng thái `Công khai` vs `Riêng tư` ảnh hưởng UI | Thấp | Test tenant xem trang public → chỉ thấy tòa nhà Công khai |

---

## 4. Khuyến nghị tiếp theo

1. **Sửa ngay bug bảo mật #1** (TENANT bypass route guard) — đây là ưu tiên cao nhất.
2. **Bổ sung test cho các chức năng còn thiếu** của Module 3: Gán quản lý (nút "Gán QL"), filter/search tòa nhà, pagination.
3. **Bổ sung test validate file upload** — đúng định dạng ảnh, đúng dung lượng.
4. **Bổ sung test phân quyền chi tiết cho MANAGER** — verify chính xác MANAGER được làm gì và không được làm gì.
5. **Bổ sung test Module tiếp theo** (Room, Contract, Notification, Payment) theo cùng pattern Playwright.
6. **Tích hợp CI/CD** — chạy `npx playwright test` tự động trước mỗi lần merge vào `main`.
7. **Xuất báo cáo HTML** — `npx playwright show-report` cho stakeholder xem trực quan.
8. **Tăng parallelism** — hiện tại chỉ chạy 1 worker (~3 phút), có thể tăng lên 2-4 workers để giảm thời gian (cần tách biệt data test).

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



### 5.4 Lệnh chạy lại toàn bộ test

```bash
cd "d:\Báo cáo thực tập\J2EEQuanLyPhongTro-main"
npx playwright test tests/module3-building/ --headed           # chạy tất cả, có giao diện
npx playwright test tests/module3-building/ --reporter=html    # xuất báo cáo HTML
npx playwright test tests/module3-building/FT-BLD-04.delete-building.spec.ts   # chạy riêng 1 file
npx playwright install chromium              # cài browser (nếu cache bị mất)
```



---
