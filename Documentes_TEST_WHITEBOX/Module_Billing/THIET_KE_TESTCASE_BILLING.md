# THIẾT KẾ TEST CASE - BILLING SERVICE
## Dự án J2EE Quản Lý Phòng Trọ (RentalMS)

---

## 1. THÔNG TIN TỔNG QUAN

| Thông tin | Chi tiết |
|-----------|----------|
| **Class under test** | `BillingService` |
| **File** | `src/main/java/com/rentalms/service/BillingService.java` |
| **Test Framework** | JUnit 5 + Mockito |
| **Số test cases** | 23 test cases |
| **Coverage target** | Line ≥ 75%, Branch ≥ 70%, Method 100% |

---

## 2. CẤU TRÚC TEST CLASS

### 2.1 Mocks cần thiết

| Mock | Type | Methods chính |
|------|------|----------------|
| `billRepo` | `@Mock BillRepository` | findById, save, findByContractIdAndPeriod, findOverdue, findDueSoon |
| `billItemRepo` | `@Mock BillItemRepository` | findByBillId, save, delete |
| `paymentRepo` | `@Mock PaymentRepository` | save, findPendingPayment |
| `contractRepo` | `@Mock ContractRepository` | findByStatus |
| `auditService` | `@Mock AuditService` | log |
| `notificationService` | `@Mock NotificationService` | notify |
| `buildingAccessService` | `@Mock BuildingAccessService` | assertCanManage |
| `userService` | `@Mock UserService` | findById |

### 2.2 Test data cần chuẩn bị

| Object | Mô tả |
|--------|--------|
| `testOwner` | User có role OWNER |
| `testTenant` | User có role TENANT |
| `testManager` | User có role MANAGER |
| `testBuilding` | Building có đơn giá điện/nước |
| `testContract` | Contract ACTIVE |
| `testBill` | Bill UNPAID, totalAmount=5,000,000 |
| `electricityReq` | BillDTO.SetUtilitiesRequest |
| `payReq` | BillDTO.PayRequest |

---

## 3. TEST CASES CHI TIẾT

### 3.1 Nhóm 1: generateBillForContract() - 3 test cases

#### TC-BILL-001: generateBillForContract_success
| Field | Value |
|-------|-------|
| **Mục đích** | Tạo hóa đơn mới thành công cho hợp đồng ACTIVE |
| **Loại test** | Happy Path |
| **Priority** | Cao |
| **Method** | `generateBillForContract(Contract, String)` |

| Step | Action | Expected |
|------|--------|----------|
| 1 | Mock `billRepo.findByContractIdAndPeriod()` return `Optional.empty()` | Bill chưa tồn tại |
| 2 | Mock `billRepo.save()` return Bill | Save thành công |
| 3 | Gọi `service.generateBillForContract(contract, "2026-07")` | Không throw exception |
| 4 | Verify kết quả | Bill có status=UNPAID, period="2026-07", dueDate=today+15 |
| 5 | Verify `billRepo.save()` được gọi 1 lần | OK |
| 6 | Verify `notificationService.notify()` được gọi | OK với type=BILL_ISSUED |

```java
// Arrange
when(billRepo.findByContractIdAndPeriod(1L, "2026-07"))
    .thenReturn(Optional.empty());
when(billRepo.save(any(Bill.class))).thenReturn(testBill);

// Act
Bill result = service.generateBillForContract(testContract, "2026-07");

// Assert
assertThat(result).isNotNull();
assertThat(result.getStatus()).isEqualTo(BillStatus.UNPAID);
assertThat(result.getPeriod()).isEqualTo("2026-07");
verify(notificationService).notify(any(), eq(NotificationType.BILL_ISSUED), any(), any(), any(), any());
```

---

#### TC-BILL-002: generateBillForContract_createsRentItem
| Field | Value |
|-------|-------|
| **Mục đích** | Verify BillItem RENT được tạo với amount = monthlyRent |
| **Loại test** | Happy Path |
| **Priority** | Cao |

| Step | Action | Expected |
|------|--------|----------|
| 1 | Setup `testContract.getMonthlyRent() = 5,000,000` | OK |
| 2 | Gọi `service.generateBillForContract(contract, "2026-07")` | OK |
| 3 | Verify `billItemRepo.save()` được gọi | Với itemType="RENT" |
| 4 | Verify amount của BillItem | = 5,000,000 |

```java
// Arrange
when(testContract.getMonthlyRent()).thenReturn(BigDecimal.valueOf(5_000_000));
when(billRepo.save(any(Bill.class))).thenAnswer(inv -> {
    Bill b = inv.getArgument(0);
    b.setId(1L);
    return b;
});

// Act
Bill result = service.generateBillForContract(testContract, "2026-07");

// Assert
ArgumentCaptor<BillItem> itemCaptor = ArgumentCaptor.forClass(BillItem.class);
verify(billItemRepo).save(itemCaptor.capture());
assertThat(itemCaptor.getValue().getItemType()).isEqualTo("RENT");
assertThat(itemCaptor.getValue().getAmount()).isEqualByComparingTo(BigDecimal.valueOf(5_000_000));
```

---

#### TC-BILL-003: generateBillForContract_duplicate
| Field | Value |
|-------|-------|
| **Mục đích** | Throw exception khi bill đã tồn tại |
| **Loại test** | Exception |
| **Priority** | Cao |

| Step | Action | Expected |
|------|--------|----------|
| 1 | Mock `billRepo.findByContractIdAndPeriod()` return Bill cũ | Bill đã tồn tại |
| 2 | Gọi service | Throw `BusinessException` |
| 3 | Verify message | Chứa "Bill ky 2026-07 da ton tai" |

```java
// Arrange
when(billRepo.findByContractIdAndPeriod(1L, "2026-07"))
    .thenReturn(Optional.of(existingBill));

// Act & Assert
assertThatThrownBy(() -> service.generateBillForContract(testContract, "2026-07"))
    .isInstanceOf(BusinessException.class)
    .hasMessageContaining("da ton tai");

verify(billRepo, never()).save(any(Bill.class));
```

---

### 3.2 Nhóm 2: setUtilityReadings() - 5 test cases

#### TC-BILL-004: setUtilityReadings_success
| Field | Value |
|-------|-------|
| **Mục đích** | Cập nhật điện nước thành công, tính đúng consumption và amount |
| **Loại test** | Happy Path |
| **Priority** | Cao |
| **Input** | electricityOld=100, electricityNew=250, waterOld=50, waterNew=75 |
| **Expected** | ELECTRICITY item = 150 × 3500 = 525,000; WATER item = 25 × 20000 = 500,000 |

| Step | Action | Expected |
|------|--------|----------|
| 1 | Mock `billRepo.findById(1L)` return testBill UNPAID | Bill tồn tại |
| 2 | Mock `userService.findById()` return owner | OK |
| 3 | Mock `buildingAccessService.assertCanManage()` | Có quyền |
| 4 | Mock `billItemRepo.findByBillId()` return empty | Chưa có item cũ |
| 5 | Mock building có electricityUnitPrice=3500, waterUnitPrice=20000 | OK |
| 6 | Gọi service | Trả về bill đã cập nhật |
| 7 | Verify 2 BillItem mới được save | ELECTRICITY và WATER |
| 8 | Verify totalAmount = rent + 525,000 + 500,000 | OK |

```java
// Arrange
BillDTO.SetUtilitiesRequest req = BillDTO.SetUtilitiesRequest.builder()
    .electricityOld(100).electricityNew(250)
    .waterOld(50).waterNew(75)
    .build();
when(billRepo.findById(1L)).thenReturn(Optional.of(testBill));
when(userService.findById(ownerId)).thenReturn(testOwner);
when(testBuilding.getElectricityUnitPrice()).thenReturn(BigDecimal.valueOf(3500));
when(testBuilding.getWaterUnitPrice()).thenReturn(BigDecimal.valueOf(20000));

// Act
Bill result = service.setUtilityReadings(1L, req, ownerId);

// Assert
ArgumentCaptor<List<BillItem>> itemsCaptor = ArgumentCaptor.forClass(List.class);
verify(billItemRepo, atLeast(2)).save(itemsCaptor.capture());
verify(billRepo).save(any(Bill.class));
```

---

#### TC-BILL-005: setUtilityReadings_electricityOnly
| Field | Value |
|-------|-------|
| **Mục đích** | Chỉ cập nhật điện khi water = null |
| **Loại test** | Edge Case |
| **Priority** | Trung bình |
| **Input** | electricityOld=100, electricityNew=200, waterOld=null, waterNew=null |
| **Expected** | Chỉ tạo 1 BillItem ELECTRICITY |

```java
BillDTO.SetUtilitiesRequest req = BillDTO.SetUtilitiesRequest.builder()
    .electricityOld(100).electricityNew(200)
    .waterOld(null).waterNew(null)
    .build();
```

---

#### TC-BILL-006: setUtilityReadings_skipWhenNewLessThanOld
| Field | Value |
|-------|-------|
| **Mục đích** | Bỏ qua khi new < old |
| **Loại test** | Edge Case |
| **Priority** | Trung bình |
| **Input** | electricityOld=100, electricityNew=80, waterOld=50, waterNew=40 |
| **Expected** | Không tạo BillItem nào (consumption âm) |

```java
// Verify billItemRepo.save() không được gọi với ELECTRICITY/WATER
verify(billItemRepo, never()).save(argThat(item -> 
    item.getItemType().equals("ELECTRICITY") || item.getItemType().equals("WATER")
));
```

---

#### TC-BILL-007: setUtilityReadings_billPaid
| Field | Value |
|-------|-------|
| **Mục đích** | Throw exception khi bill đã PAID |
| **Loại test** | Exception |
| **Priority** | Cao |

| Step | Action | Expected |
|------|--------|----------|
| 1 | Bill có status=PAID | - |
| 2 | Gọi service | Throw `BusinessException` |

```java
when(testBill.getStatus()).thenReturn(BillStatus.PAID);
assertThatThrownBy(() -> service.setUtilityReadings(1L, req, ownerId))
    .isInstanceOf(BusinessException.class);
verify(billItemRepo, never()).save(any(BillItem.class));
```

---

#### TC-BILL-008: setUtilityReadings_noPermission
| Field | Value |
|-------|-------|
| **Mục đích** | Throw exception khi actor không có quyền |
| **Loại test** | Exception |
| **Priority** | Cao |

| Step | Action | Expected |
|------|--------|----------|
| 1 | Mock `assertCanManage()` throw BusinessException | Không có quyền |
| 2 | Gọi service | Throw exception |

```java
doThrow(new BusinessException("Khong co quyen"))
    .when(buildingAccessService).assertCanManage(any(), any());

assertThatThrownBy(() -> service.setUtilityReadings(1L, req, ownerId))
    .isInstanceOf(BusinessException.class)
    .hasMessageContaining("quyen");
```

---

### 3.3 Nhóm 3: pay() - 6 test cases

#### TC-BILL-009: pay_cash_pendingConfirmation
| Field | Value |
|-------|-------|
| **Mục đích** | Pay CASH → status = PENDING_CONFIRMATION |
| **Loại test** | Happy Path |
| **Priority** | Cao |
| **Input** | method="CASH", amount=5,000,000 |

| Step | Action | Expected |
|------|--------|----------|
| 1 | Bill UNPAID | - |
| 2 | PayRequest: method=CASH, amount=5,000,000 | OK |
| 3 | Gọi `service.pay(1L, payReq, tenantId)` | Return Payment |
| 4 | Verify bill status | = PENDING_CONFIRMATION |
| 5 | Verify payment status | = PENDING |
| 6 | Verify notification gửi cho Owner | OK |

```java
BillDTO.PayRequest req = BillDTO.PayRequest.builder()
    .amount(BigDecimal.valueOf(5_000_000))
    .method("CASH")
    .referenceCode("REF001")
    .build();

Payment result = service.pay(1L, req, tenantId);

verify(billRepo).save(any(Bill.class));
verify(paymentRepo).save(any(Payment.class));
verify(notificationService).notify(any(), eq(NotificationType.PAYMENT_PENDING), any(), any(), any(), any());
```

---

#### TC-BILL-010: pay_vnpay_autoSuccess
| Field | Value |
|-------|-------|
| **Mục đích** | Pay VNPAY → auto success (status = SUCCESS) |
| **Loại test** | Happy Path |
| **Priority** | Cao |
| **Input** | method="VNPAY", amount=5,000,000 |

| Step | Action | Expected |
|------|--------|----------|
| 1 | Bill UNPAID | - |
| 2 | PayRequest: method=VNPAY, amount=5,000,000 | OK |
| 3 | Gọi service | Return Payment SUCCESS |
| 4 | Verify bill status | = PAID (vì paid đủ) |
| 5 | Verify payment status | = SUCCESS |

---

#### TC-BILL-011: pay_fullPayment_paid
| Field | Value |
|-------|-------|
| **Mục đích** | Pay đủ → bill status = PAID |
| **Loại test** | Happy Path |
| **Priority** | Cao |
| **Input** | method="VNPAY", amount=totalAmount=5,000,000 |

```java
// Assert bill status sau khi pay
ArgumentCaptor<Bill> billCaptor = ArgumentCaptor.forClass(Bill.class);
verify(billRepo).save(billCaptor.capture());
assertThat(billCaptor.getValue().getStatus()).isEqualTo(BillStatus.PAID);
```

---

#### TC-BILL-012: pay_partialPayment
| Field | Value |
|-------|-------|
| **Mục đích** | Pay thiếu → bill status = PARTIAL |
| **Loại test** | Edge Case |
| **Priority** | Trung bình |
| **Input** | method="VNPAY", amount=2,000,000 (total=5,000,000) |

```java
BillDTO.PayRequest req = BillDTO.PayRequest.builder()
    .amount(BigDecimal.valueOf(2_000_000))
    .method("VNPAY")
    .build();
// Assert: bill.status = PARTIAL, paidAmount = 2,000,000
```

---

#### TC-BILL-013: pay_billAlreadyPaid
| Field | Value |
|-------|-------|
| **Mục đích** | Throw exception khi pay bill đã PAID |
| **Loại test** | Exception |
| **Priority** | Cao |

```java
when(testBill.getStatus()).thenReturn(BillStatus.PAID);
assertThatThrownBy(() -> service.pay(1L, req, tenantId))
    .isInstanceOf(BusinessException.class)
    .hasMessageContaining("da duoc thanh toan");
verify(paymentRepo, never()).save(any(Payment.class));
```

---

#### TC-BILL-014: pay_billCancelled
| Field | Value |
|-------|-------|
| **Mục đích** | Throw exception khi pay bill đã CANCELLED |
| **Loại test** | Exception |
| **Priority** | Cao |

```java
when(testBill.getStatus()).thenReturn(BillStatus.CANCELLED);
assertThatThrownBy(() -> service.pay(1L, req, tenantId))
    .isInstanceOf(BusinessException.class)
    .hasMessageContaining("bi huy");
```

---

### 3.4 Nhóm 4: confirmCashPayment() - 3 test cases

#### TC-BILL-015: confirmCashPayment_fullPayment_paid
| Field | Value |
|-------|-------|
| **Mục đích** | Confirm thành công → bill PAID |
| **Loại test** | Happy Path |
| **Priority** | Cao |

| Step | Action | Expected |
|------|--------|----------|
| 1 | Bill PENDING_CONFIRMATION, pending payment PENDING | - |
| 2 | Gọi `confirmCashPayment(1L, ownerId)` | OK |
| 3 | Verify bill status | = PAID |
| 4 | Verify payment status | = SUCCESS |
| 5 | Verify notification gửi cho Tenant | OK |

```java
when(testBill.getStatus()).thenReturn(BillStatus.PENDING_CONFIRMATION);
Payment pendingPayment = Payment.builder()
    .id(1L).amount(BigDecimal.valueOf(5_000_000))
    .status(PaymentStatus.PENDING).bill(testBill).build();
when(paymentRepo.findPendingPayment(1L)).thenReturn(Optional.of(pendingPayment));

Bill result = service.confirmCashPayment(1L, ownerId);

// Assert bill status = PAID
ArgumentCaptor<Bill> billCaptor = ArgumentCaptor.forClass(Bill.class);
verify(billRepo, atLeast(2)).save(billCaptor.capture());
Bill savedBill = billCaptor.getValue();
assertThat(savedBill.getStatus()).isEqualTo(BillStatus.PAID);
```

---

#### TC-BILL-016: confirmCashPayment_partial
| Field | Value |
|-------|-------|
| **Mục đích** | Confirm khi trả thiếu → bill PARTIAL |
| **Loại test** | Edge Case |
| **Priority** | Trung bình |
| **Input** | pendingAmount=2,000,000 (total=5,000,000) |

---

#### TC-BILL-017: confirmCashPayment_wrongStatus
| Field | Value |
|-------|-------|
| **Mục đích** | Throw exception khi bill không ở PENDING_CONFIRMATION |
| **Loại test** | Exception |
| **Priority** | Cao |

```java
when(testBill.getStatus()).thenReturn(BillStatus.UNPAID);
assertThatThrownBy(() -> service.confirmCashPayment(1L, ownerId))
    .isInstanceOf(BusinessException.class);
verify(paymentRepo, never()).save(any(Payment.class));
```

---

### 3.5 Nhóm 5: markOverdueBills() - 3 test cases

#### TC-BILL-018: markOverdueBills_unpaidToOverdue
| Field | Value |
|-------|-------|
| **Mục đích** | Bill UNPAID quá hạn → OVERDUE + lateFee |
| **Loại test** | Happy Path |
| **Priority** | Trung bình |
| **Expected lateFee** | (5,000,000 - 0) × 5% = 250,000 |

```java
Bill overdueBill = Bill.builder()
    .id(1L).status(BillStatus.UNPAID)
    .totalAmount(BigDecimal.valueOf(5_000_000))
    .paidAmount(BigDecimal.ZERO)
    .lateFee(BigDecimal.ZERO)
    .build();
when(billRepo.findOverdue(any())).thenReturn(List.of(overdueBill));

service.markOverdueBills();

ArgumentCaptor<Bill> captor = ArgumentCaptor.forClass(Bill.class);
verify(billRepo).save(captor.capture());
Bill saved = captor.getValue();
assertThat(saved.getStatus()).isEqualTo(BillStatus.OVERDUE);
assertThat(saved.getLateFee()).isEqualByComparingTo(BigDecimal.valueOf(250_000));
```

---

#### TC-BILL-019: markOverdueBills_skipPaid
| Field | Value |
|-------|-------|
| **Mục đích** | Bill PAID → không thay đổi |
| **Loại test** | Edge Case |

```java
Bill paidBill = Bill.builder().id(2L).status(BillStatus.PAID).build();
when(billRepo.findOverdue(any())).thenReturn(List.of(paidBill));

service.markOverdueBills();

verify(billRepo, never()).save(any(Bill.class));
```

---

#### TC-BILL-020: markOverdueBills_alreadyOverdue
| Field | Value |
|-------|-------|
| **Mục đích** | Bill đã OVERDUE → không xử lý lại |
| **Loại test** | Edge Case |

```java
Bill overdueBill = Bill.builder().id(3L).status(BillStatus.OVERDUE).build();
when(billRepo.findOverdue(any())).thenReturn(List.of(overdueBill));

service.markOverdueBills();

verify(billRepo, never()).save(any(Bill.class));
```

---

### 3.6 Nhóm 6: autoGenerateMonthlyBills() & remindDueSoonBills() - 2 test cases

#### TC-BILL-021: autoGenerateMonthlyBills_withActiveContracts
| Field | Value |
|-------|-------|
| **Mục đích** | Wrapper gọi generateBillForContract cho mỗi contract ACTIVE |
| **Loại test** | Happy Path |

```java
Contract contract1 = mock(Contract.class); when(contract1.getId()).thenReturn(1L);
Contract contract2 = mock(Contract.class); when(contract2.getId()).thenReturn(2L);
when(contractRepo.findByStatus(ContractStatus.ACTIVE))
    .thenReturn(List.of(contract1, contract2));

service.autoGenerateMonthlyBills();

verify(contractRepo).findByStatus(ContractStatus.ACTIVE);
// Mỗi contract → gọi findByContractIdAndPeriod → bill mới → save
```

---

#### TC-BILL-022: remindDueSoonBills_sendsNotification
| Field | Value |
|-------|-------|
| **Mục đích** | Gửi nhắc nhở cho bills sắp đến hạn |
| **Loại test** | Happy Path |

```java
Bill dueSoonBill = mock(Bill.class);
when(dueSoonBill.getId()).thenReturn(1L);
when(billRepo.findDueSoon(any())).thenReturn(List.of(dueSoonBill));

service.remindDueSoonBills();

verify(notificationService, atLeastOnce()).notify(
    any(), eq(NotificationType.BILL_REMINDER), any(), any(), any(), any()
);
```

---

#### TC-BILL-023: autoGenerateMonthlyBills_handlesException
| Field | Value |
|-------|-------|
| **Mục đích** | Một contract lỗi không ảnh hưởng các contract khác |
| **Loại test** | Exception |

```java
Contract good = mock(Contract.class); when(good.getId()).thenReturn(1L);
Contract bad = mock(Contract.class); when(bad.getId()).thenReturn(2L);
when(contractRepo.findByStatus(ContractStatus.ACTIVE)).thenReturn(List.of(good, bad));

when(billRepo.findByContractIdAndPeriod(1L, any())).thenReturn(Optional.empty());
when(billRepo.findByContractIdAndPeriod(2L, any()))
    .thenThrow(new RuntimeException("DB error"));

// Act - không throw exception ra ngoài
assertThatCode(() -> service.autoGenerateMonthlyBills()).doesNotThrowAnyException();
```

---

## 4. SETUP & TEARDOWN

### 4.1 Setup chung cho tất cả tests

```java
@ExtendWith(MockitoExtension.class)
class BillingServiceTest {

    @Mock BillRepository billRepo;
    @Mock BillItemRepository billItemRepo;
    @Mock PaymentRepository paymentRepo;
    @Mock ContractRepository contractRepo;
    @Mock AuditService auditService;
    @Mock NotificationService notificationService;
    @Mock BuildingAccessService buildingAccessService;
    @Mock UserService userService;

    @InjectMocks BillingService service;

    User owner, tenant, manager;
    Building building;
    Room room;
    Contract contract;
    Bill bill;

    Long ownerId = 10L;
    Long tenantId = 20L;
    Long managerId = 30L;
    Long contractId = 100L;
    Long billId = 200L;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(ownerId).role(UserRole.OWNER).build();
        tenant = User.builder().id(tenantId).role(UserRole.TENANT).build();
        manager = User.builder().id(managerId).role(UserRole.MANAGER).build();

        building = Building.builder()
            .id(1L)
            .name("Test Building")
            .electricityUnitPrice(BigDecimal.valueOf(3500))
            .waterUnitPrice(BigDecimal.valueOf(20000))
            .owner(owner)
            .build();

        room = Room.builder().id(1L).roomNo("101").building(building).build();

        contract = Contract.builder()
            .id(contractId)
            .status(ContractStatus.ACTIVE)
            .room(room)
            .tenant(tenant)
            .owner(owner)
            .monthlyRent(BigDecimal.valueOf(5_000_000))
            .startDate(LocalDate.now().minusMonths(1))
            .endDate(LocalDate.now().plusMonths(11))
            .build();

        bill = Bill.builder()
            .id(billId)
            .contract(contract)
            .period("2026-07")
            .dueDate(LocalDate.now().plusDays(15))
            .status(BillStatus.UNPAID)
            .totalAmount(BigDecimal.valueOf(5_000_000))
            .paidAmount(BigDecimal.ZERO)
            .lateFee(BigDecimal.ZERO)
            .build();
    }
}
```

---

## 5. MAPPING TEST CASE ↔ METHOD

| Method | Test Cases | Số lượng |
|--------|------------|----------|
| `generateBillForContract` | TC-BILL-001, 002, 003 | 3 |
| `setUtilityReadings` | TC-BILL-004, 005, 006, 007, 008 | 5 |
| `pay` | TC-BILL-009, 010, 011, 012, 013, 014 | 6 |
| `confirmCashPayment` | TC-BILL-015, 016, 017 | 3 |
| `markOverdueBills` | TC-BILL-018, 019, 020 | 3 |
| `autoGenerateMonthlyBills` | TC-BILL-021, 023 | 2 |
| `remindDueSoonBills` | TC-BILL-022 | 1 |
| **Tổng** | | **23** |

---

## 6. COVERAGE ESTIMATION

| Method | Dòng code ước tính | Test cases | Coverage |
|--------|-------------------|------------|----------|
| `generateBillForContract` | ~20 | 3 | 90% |
| `setUtilityReadings` | ~50 | 5 | 85% |
| `pay` | ~40 | 6 | 85% |
| `confirmCashPayment` | ~25 | 3 | 80% |
| `markOverdueBills` | ~15 | 3 | 90% |
| `remindDueSoonBills` | ~10 | 1 | 70% |
| `autoGenerateMonthlyBills` | ~10 | 2 | 80% |
| **Trung bình** | | | **~83%** |

---

## 7. THỨ TỰ TRIỂN KHAI

```
1. TC-BILL-001 → 002 → 003        (generateBillForContract)
2. TC-BILL-009 → 013 → 014        (pay - exceptions trước)
3. TC-BILL-010 → 011 → 012        (pay - happy paths)
4. TC-BILL-004 → 005 → 006        (setUtilityReadings - happy)
5. TC-BILL-007 → 008              (setUtilityReadings - exceptions)
6. TC-BILL-015 → 016 → 017        (confirmCashPayment)
7. TC-BILL-018 → 019 → 020        (markOverdueBills)
8. TC-BILL-021 → 023 → 022        (scheduled jobs)
```

---

## 8. KẾT QUẢ MONG ĐỢI

| Metric | Target |
|--------|--------|
| **Số test cases** | 23 |
| **Line coverage** | ≥ 75% |
| **Branch coverage** | ≥ 70% |
| **Method coverage** | 100% (8/8 methods) |
| **Thời gian chạy** | < 5 giây |