# PHÂN TÍCH MÃ NGUỒN - BILLING SERVICE
## Dự án J2EE Quản Lý Phòng Trọ (RentalMS)

---

## 1. THÔNG TIN TỔNG QUAN

| Thông tin | Chi tiết |
|-----------|----------|
| **File** | `src/main/java/com/rentalms/service/BillingService.java` |
| **Class** | `BillingService` |
| **Annotations** | `@Service`, `@RequiredArgsConstructor`, `@Slf4j` |
| **Dependencies** | BillRepository, BillItemRepository, PaymentRepository, ContractRepository, AuditService, NotificationService, BuildingAccessService, UserService |
| **Số Methods** | 12 methods chính (bao gồm 3 scheduled jobs) |

---

## 2. CÁC METHOD VÀ LOGIC CHI TIẾT

### 2.1 Scheduled Jobs (Tự động chạy)

#### Method: `autoGenerateMonthlyBills()`
```java
@Scheduled(cron = "0 0 0 1 * *")  // Chạy ngày 1 mỗi tháng lúc 00:00
@Transactional
public void autoGenerateMonthlyBills()
```

**Mục đích:** Tự động tạo hóa đơn cho tất cả hợp đồng ACTIVE vào ngày 1 mỗi tháng

**Logic Flow:**
```
1. Lấy tất cả Contract có status = ACTIVE
2. Với mỗi contract:
   a. Gọi generateBillForContract(contract, period)
   b. Bắt exception nếu có và log lỗi
3. Period format: "yyyy-MM" (ví dụ: "2026-07")
```

**Đặc điểm:**
- Không cần test chi tiết (đã test generateBillForContract)
- Cần test: scheduled annotation hoạt động

---

#### Method: `markOverdueBills()`
```java
@Scheduled(cron = "0 0 8 * * *")  // Chạy hàng ngày lúc 08:00
@Transactional
public void markOverdueBills()
```

**Mục đích:** Đánh dấu hóa đơn quá hạn và gửi thông báo

**Logic Flow:**
```
1. Lấy tất cả bills quá hạn (dueDate < today)
2. Với mỗi bill có status = UNPAID:
   a. Đổi status → OVERDUE
   b. Tính lateFee = (totalAmount - paidAmount) × 5%
   c. Save bill
   d. Gửi thông báo cho tenant
```

**Late Fee Calculation:**
```java
BigDecimal remaining = bill.getTotalAmount().subtract(bill.getPaidAmount());
bill.setLateFee(remaining.multiply(BigDecimal.valueOf(0.05)));
```

**Test Cases:**
- Bill UNPAID → OVERDUE với lateFee đúng
- Bill đã PAID → không xử lý
- Bill đã OVERDUE → không xử lý lại

---

#### Method: `remindDueSoonBills()`
```java
@Scheduled(cron = "0 5 8 * * *")  // Chạy hàng ngày lúc 08:05
@Transactional
public void remindDueSoonBills()
```

**Mục đích:** Gửi nhắc nhở cho các hóa đơn sắp đến hạn (còn 3 ngày)

**Logic Flow:**
```
1. Lấy bills có dueDate trong khoảng [today, today+3days]
2. Với mỗi bill:
   a. Gửi thông báo cho tenant
```

---

### 2.2 Business Methods

#### Method: `generateBillForContract()`
```java
@Transactional
public Bill generateBillForContract(Contract contract, String period)
```

**Mục đích:** Tạo hóa đơn cho một hợp đồng cụ thể

**Logic Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│ Bước 1: Kiểm tra bill đã tồn tại chưa                      │
│ billRepo.findByContractIdAndPeriod(contractId, period)       │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │ Đã tồn tại?           │
                └───────────┬───────────┘
                    No      │     Yes
                    ┌───────┴───────┐
                    ▼               ▼
            Tiếp tục      throw BusinessException
                      "Bill ky {period} da ton tai"
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 2: Tạo Bill mới                                     │
│ - period = tháng-năm                                      │
│ - dueDate = today + 15 days                               │
│ - status = UNPAID                                         │
│ - totalAmount = 0                                         │
│ - paidAmount = 0                                          │
│ - lateFee = 0                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 3: Tạo BillItem RENT                                │
│ - itemType = "RENT"                                       │
│ - description = "Tien thue thang {period}"                 │
│ - amount = contract.getMonthlyRent()                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 4: Cập nhật totalAmount = monthlyRent                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 5: Gửi thông báo cho tenant                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Return Bill   │
                    └───────────────┘
```

**Test Cases cần viết:**
- ✅ Tạo bill thành công lần đầu
- ✅ Ném exception khi bill đã tồn tại
- ✅ BillItem RENT được tạo đúng
- ✅ Notification được gửi

---

#### Method: `setUtilityReadings()`
```java
@Transactional
public Bill setUtilityReadings(Long billId, BillDTO.SetUtilitiesRequest req, Long actorId)
```

**Mục đích:** Cập nhật chỉ số công tơ điện/nước cho hóa đơn

**Logic Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│ Bước 1: Tìm bill và actor                                 │
│ bill = findById(billId)                                    │
│ actor = userService.findById(actorId)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 2: Kiểm tra quyền (Actor phải có quyền quản lý)    │
│ accessService.assertCanManage(building, actor)              │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │ Có quyền?             │
                └───────────┬───────────┘
                    Yes     │     No
                    ┌───────┴───────┐
                    ▼               ▼
            Tiếp tục      throw BusinessException
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 3: Kiểm tra bill chưa paid/cancelled                 │
│ if (status == PAID || CANCELLED) → exception               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 4: Lấy đơn giá từ Building                          │
│ electricityPrice = building.getElectricityUnitPrice()       │
│                hoặc default 3500                          │
│ waterPrice = building.getWaterUnitPrice()                  │
│                hoặc default 20000                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 5: Xóa BillItem ELECTRICITY và WATER cũ             │
│ billItemRepo.findByBillId(billId)                         │
│ → delete where itemType = ELECTRICITY or WATER            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 6: Tính và tạo BillItem ELECTRICITY mới             │
│ IF electricityNew >= electricityOld:                       │
│   consumption = electricityNew - electricityOld            │
│   amount = consumption × electricityPrice                  │
│ ELSE: bỏ qua (không tạo item)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 7: Tính và tạo BillItem WATER mới (tương tự)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 8: Tính lại totalAmount = sum(tất cả items)         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Return Bill   │
                    └───────────────┘
```

**Calculation Examples:**
```
Ví dụ 1: Điện
- electricityOld = 100, electricityNew = 250
- consumption = 150 kWh
- electricityPrice = 3500 VND/kWh
- amount = 150 × 3500 = 525,000 VND

Ví dụ 2: Bỏ qua (new < old)
- electricityOld = 100, electricityNew = 80
- Không tạo BillItem, bỏ qua
```

**Test Cases:**
- ✅ Cập nhật cả điện và nước thành công
- ✅ Cập nhật chỉ điện (nước = null)
- ✅ Bỏ qua khi electricityNew < electricityOld
- ✅ Bỏ qua khi waterNew < waterOld
- ✅ Exception: Bill đã PAID
- ✅ Exception: Bill đã CANCELLED
- ✅ Exception: Actor không có quyền
- ✅ Verify: Xóa BillItem cũ
- ✅ Verify: Tính total đúng

---

#### Method: `pay()`
```java
@Transactional
public Payment pay(Long billId, BillDTO.PayRequest req, Long tenantId)
```

**Mục đích:** Xử lý thanh toán hóa đơn

**Logic Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│ Bước 1: Tìm bill                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 2: Kiểm tra trạng thái bill                        │
│ - PAID → exception: "Hoa don nay da duoc thanh toan"      │
│ - CANCELLED → exception: "Hoa don da bi huy"              │
│ - PENDING_CONFIRMATION → exception: "Dang cho xac nhan"   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 3: Xác định có cần xác nhận không                  │
│ needsConfirmation = (CASH || BANK_TRANSFER)                │
│ VNPAY = auto-success                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │ needsConfirmation?     │
                └───────────┬───────────┘
                    Yes     │     No
                    ┌───────┴───────┐
                    ▼               ▼
            PENDING_CONFIRMATION  AUTO_SUCCESS
                    │               │
                    ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│ A. Nếu CASH hoặc BANK_TRANSFER:                          │
│    - Tạo Payment với status = PENDING                     │
│    - Đặt bill status = PENDING_CONFIRMATION               │
│    - Gửi notification cho Owner để xác nhận              │
│                                                          │
│ B. Nếu VNPAY (hoặc method khác):                          │
│    - Tạo Payment với status = SUCCESS                     │
│    - Cập nhật paidAmount                                 │
│    - Nếu paid >= total + lateFee → PAID                   │
│    - Ngược lại → PARTIAL                                 │
│    - Gửi notification cho Owner                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Return Payment│
                    └───────────────┘
```

**Payment Status Flow:**
```
UNPAID → PENDING_CONFIRMATION → PAID
                     ↓
               PARTIAL (nếu trả thiếu)
```

**Test Cases:**
- ✅ Pay bằng CASH thành công → PENDING
- ✅ Pay bằng BANK_TRANSFER thành công → PENDING
- ✅ Pay bằng VNPAY thành công → SUCCESS (auto)
- ✅ Pay khi bill đã PAID → exception
- ✅ Pay khi bill đã CANCELLED → exception
- ✅ Pay khi bill đang PENDING → exception
- ✅ Partial payment → bill status = PARTIAL
- ✅ Full payment → bill status = PAID

---

#### Method: `confirmCashPayment()`
```java
@Transactional
public Bill confirmCashPayment(Long billId, Long actorId)
```

**Mục đích:** Owner/Manager xác nhận đã nhận tiền mặt

**Logic Flow:**
```
1. Tìm bill (NotFoundException)
2. Kiểm tra quyền (assertCanManage)
3. Kiểm tra bill status == PENDING_CONFIRMATION
4. Tìm pending payment
5. Cập nhật payment status = SUCCESS
6. Cập nhật bill paidAmount += pending amount
7. Tính remaining = total + lateFee - paidAmount
8. Nếu remaining <= 0 → PAID, ngược lại → PARTIAL
9. Gửi notification cho tenant
10. Return bill
```

**Test Cases:**
- ✅ Confirm thành công → bill PAID
- ✅ Confirm thành công → bill PARTIAL (nếu trả thiếu)
- ✅ Exception: bill không ở PENDING_CONFIRMATION
- ✅ Exception: actor không có quyền
- ✅ Exception: không tìm thấy pending payment

---

## 3. DEPENDENCY ANALYSIS

### 3.1 Dependencies cần Mock

| Dependency | Methods được gọi | Mục đích test |
|------------|-------------------|---------------|
| BillRepository | findById(), save(), findByContractIdAndPeriod(), findOverdue(), findDueSoon() | Mock tất cả DB calls |
| BillItemRepository | findByBillId(), save(), delete() | Mock item operations |
| PaymentRepository | save(), findPendingPayment() | Mock payment operations |
| ContractRepository | findByStatus() | Mock contract queries |
| AuditService | log() | Verify audit logging |
| NotificationService | notify() | Verify notifications |
| BuildingAccessService | assertCanManage() | Mock access control |
| UserService | findById() | Mock user lookups |

### 3.2 Data Flow

```
Bill
 ├── Contract (1)
 │    ├── Room (N)
 │    │    └── Building (N) → electricityUnitPrice, waterUnitPrice
 │    ├── Tenant (N) → notifications
 │    └── Owner (N) → notifications
 │
 └── List<BillItem> (N)
      ├── RENT
      ├── ELECTRICITY
      └── WATER

Payment (N) → Bill (1)
```

---

## 4. EDGE CASES VÀ BOUNDARY ANALYSIS

### 4.1 Edge Cases cho `setUtilityReadings()`

| # | Edge Case | Input | Expected |
|---|-----------|-------|----------|
| 1 | electricityNew = electricityOld | 100 = 100 | consumption = 0, amount = 0 |
| 2 | electricityNew < electricityOld | 80 < 100 | Bỏ qua, không tạo item |
| 3 | Tất cả null | null | Tạo bill với chỉ RENT |
| 4 | electricity null, water có | null, 150 | Chỉ cập nhật water |
| 5 | totalAmount tính đúng | Items mới | Sum tất cả items |

### 4.2 Edge Cases cho `pay()`

| # | Edge Case | Input | Expected |
|---|-----------|-------|----------|
| 1 | paidAmount = totalAmount | exact | PAID |
| 2 | paidAmount > totalAmount | overpay | PAID |
| 3 | paidAmount < totalAmount | underpay | PARTIAL |
| 4 | paidAmount = totalAmount + lateFee | with fee | PAID |
| 5 | Method = null | null | treated as auto-success? |

### 4.3 Potential Bugs phát hiện qua phân tích

```
⚠️ BUG 1: pay() không kiểm tra tenantId hợp lệ
   - Bất kỳ ai cũng có thể trả hóa đơn của người khác
   - Nên kiểm tra bill.getContract().getTenant().getId() == tenantId

⚠️ BUG 2: confirmCashPayment() không kiểm tra payment status
   - Có thể confirm payment đã ở status khác

⚠️ BUG 3: Late fee không có giới hạn tối đa
   - 5% mỗi ngày → có thể vượt quá bill gốc
```

---

## 5. TEST CASES ĐỀ XUẤT

### 5.1 Happy Path Tests

| TC_ID | Test Name | Mô tả |
|-------|-----------|--------|
| BILL-001 | generateBillForContract_success | Tạo bill mới thành công |
| BILL-002 | generateBillForContract_createsRentItem | BillItem RENT được tạo đúng |
| BILL-003 | setUtilityReadings_success | Cập nhật điện nước thành công |
| BILL-004 | setUtilityReadings_calculatesCorrectly | Tính đúng consumption và amount |
| BILL-005 | pay_cash_pending | Pay CASH → PENDING_CONFIRMATION |
| BILL-006 | pay_vnpay_autoSuccess | Pay VNPAY → SUCCESS |
| BILL-007 | pay_fullPayment_paid | Trả đủ → PAID |
| BILL-008 | pay_partialPayment | Trả thiếu → PARTIAL |
| BILL-009 | confirmCashPayment_paid | Confirm → bill PAID |
| BILL-010 | confirmCashPayment_partial | Confirm → bill PARTIAL |

### 5.2 Exception Tests

| TC_ID | Test Name | Expected Exception |
|-------|-----------|-------------------|
| BILL-101 | generateBillForContract_duplicate | BusinessException |
| BILL-102 | setUtilityReadings_billPaid | BusinessException |
| BILL-103 | setUtilityReadings_billCancelled | BusinessException |
| BILL-104 | setUtilityReadings_noPermission | BusinessException |
| BILL-105 | pay_billAlreadyPaid | BusinessException |
| BILL-106 | pay_billCancelled | BusinessException |
| BILL-107 | pay_billPending | BusinessException |
| BILL-108 | confirmCashPayment_wrongStatus | BusinessException |
| BILL-109 | confirmCashPayment_noPermission | BusinessException |

### 5.3 Edge Case Tests

| TC_ID | Test Name | Input | Expected |
|-------|-----------|-------|----------|
| BILL-201 | setUtilityReadings_zeroConsumption | new=old=100 | item amount = 0 |
| BILL-202 | setUtilityReadings_electricityOnly | water=null | Chỉ tạo ELECTRICITY item |
| BILL-203 | pay_overpay | paid > total | PAID |
| BILL-204 | markOverdue_noChangeForPaid | bill PAID | No action |

---

## 6. TEST DATA TEMPLATE

```java
// Bill test data
Bill testBill = Bill.builder()
    .id(1L)
    .contract(testContract)
    .period("2026-07")
    .dueDate(LocalDate.now().plusDays(15))
    .status(BillStatus.UNPAID)
    .totalAmount(BigDecimal.valueOf(5000000))
    .paidAmount(BigDecimal.ZERO)
    .lateFee(BigDecimal.ZERO)
    .build();

// SetUtilitiesRequest test data
BillDTO.SetUtilitiesRequest utilityReq = BillDTO.SetUtilitiesRequest.builder()
    .electricityOld(100)
    .electricityNew(250)
    .waterOld(50)
    .waterNew(75)
    .build();

// PayRequest test data
BillDTO.PayRequest payReq = BillDTO.PayRequest.builder()
    .amount(BigDecimal.valueOf(5000000))
    .method("CASH")  // hoặc "VNPAY", "BANK_TRANSFER"
    .referenceCode("REF123")
    .note("Thanh toán tiền thuê tháng 7")
    .build();
```

---

## 7. ASSERTION PATTERNS ĐẶC BIỆT

```java
// 1. Assert Bill status
assertThat(bill.getStatus()).isEqualTo(BillStatus.PAID);

// 2. Assert Late Fee calculation
BigDecimal expectedLateFee = remaining.multiply(BigDecimal.valueOf(0.05));
assertThat(bill.getLateFee()).isEqualByComparingTo(expectedLateFee);

// 3. Assert BillItem created
assertThat(billItem.getItemType()).isEqualTo("ELECTRICITY");
assertThat(billItem.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(525000));

// 4. Assert Notification sent (mock verify)
verify(notificationService).notify(
    eq(tenant),
    eq(NotificationType.BILL_ISSUED),
    anyString(),
    anyString(),
    eq("Bill"),
    eq(billId)
);

// 5. Assert BillItem deleted (mock verify)
verify(billItemRepo, times(2)).delete(any(BillItem.class));
```

---

## 8. SUMMARY

### 8.1 Số lượng Test Cases

| Category | Số lượng |
|----------|----------|
| Happy Path | 10 |
| Exception | 9 |
| Edge Case | 4 |
| **Tổng** | **23** |

### 8.2 Coverage Target

| Metric | Target |
|--------|--------|
| Line Coverage | ≥ 75% |
| Branch Coverage | ≥ 70% |
| Method Coverage | 100% |

### 8.3 Priority Testing Order

```
1. setUtilityReadings() - Phức tạp nhất, nhiều logic
2. pay() - Nhiều branches và status flows
3. generateBillForContract() - Core business logic
4. confirmCashPayment() - Quyền và status checks
5. markOverdueBills() - Scheduled job
6. remindDueSoonBills() - Notification only
7. autoGenerateMonthlyBills() - Wrapper method
```
