# HƯỚNG DẪN WHITE-BOX TESTING
## Dự án J2EE Quản Lý Phòng Trọ (RentalMS)

---

## MỤC LỤC
1. [White-box Testing là gì?](#1-white-box-testing-là-gì)
2. [Công cụ sử dụng](#2-công-cụ-sử-dụng)
3. [Quy trình 1: Phân tích và hiểu mã nguồn](#3-quy-trình-1-phân-tích-và-hiểu-mã-nguồn)
4. [Quy trình 2: Thiết kế Test Case](#4-quy-trình-2-thiết-kế-test-case)
5. [Cấu trúc mã nguồn cần test](#5-cấu-trúc-mã-nguồn-cần-test)
6. [Template báo cáo](#6-template-báo-cáo)

---

## 1. WHITE-BOX TESTING LÀ GÌ?

### Định nghĩa
White-box Testing (Kiểm thử hộp trắng) là phương pháp kiểm thử phần mềm trong đó người kiểm thử:
- **Biết được cấu trúc bên trong** của mã nguồn
- **Hiểu logic nghiệp vụ** được implement
- **Truy cập được source code** để viết test cases

### So sánh Black-box vs White-box

| Khía cạnh | Black-box | White-box |
|-----------|-----------|-----------|
| Kiến thức cần | Hiểu yêu cầu, UI | Hiểu code, logic |
| Truy cập code | ❌ Không | ✅ Có |
| Mục tiêu | Kiểm tra chức năng từ bên ngoài | Kiểm tra logic bên trong |
| Test case dựa vào | Use cases, requirements | Code flow, branch coverage |

### Mục tiêu White-box Testing cho dự án này
1. **Unit Testing**: Kiểm tra từng method/service riêng lẻ
2. **Path Testing**: Đảm bảo tất cả các đường đi trong code được test
3. **Branch Testing**: Kiểm tra các điều kiện if/else
4. **Error Handling**: Kiểm tra xử lý exception
5. **Data Flow**: Kiểm tra dữ liệu được xử lý đúng

---

## 2. CÔNG CỤ SỬ DỤNG

### 2.1 JUnit 5 - Framework Testing chính

**Cài đặt:** (đã có trong `pom.xml`)
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

**Các annotation quan trọng:**

| Annotation | Mục đích |
|------------|----------|
| `@Test` | Đánh dấu method là test case |
| `@BeforeEach` | Chạy trước mỗi test |
| `@AfterEach` | Chạy sau mỗi test |
| `@BeforeAll` | Chạy 1 lần trước tất cả tests |
| `@AfterAll` | Chạy 1 lần sau tất cả tests |
| `@DisplayName` | Tên hiển thị của test |
| `@Disabled` | Bỏ qua test này |
| `@Nested` | Nhóm các tests liên quan |

### 2.2 Mockito - Mocking dependencies

**Mục đích:** Tách riêng unit cần test khỏi các dependency (database, service khác)

```java
import org.mockito.Mockito;

// Tạo mock object
UserService userServiceMock = Mockito.mock(UserService.class);

// Định nghĩa behavior khi method được gọi
Mockito.when(userServiceMock.findById(1L)).thenReturn(testUser);

// Verify method đã được gọi
Mockito.verify(userServiceMock).findById(1L);
```

### 2.3 AssertJ - Assertion library

**Ưu điểm:** Code tự nhiên, dễ đọc, error message chi tiết

```java
import static org.assertj.core.api.Assertions.*;

// So sánh giá trị
assertThat(result).isEqualTo(expected);

// Kiểm tra exception
assertThatThrownBy(() -> service.method())
    .isInstanceOf(BusinessException.class)
    .hasMessageContaining("expected message");

// Kiểm tra collection
assertThat(list).hasSize(3)
    .contains(element1, element2);
```

### 2.4 Spring Boot Test - Integration Testing

```java
@SpringBootTest          // Load full application context
@AutoConfigureMockMvc    // Mock MVC cho controller test
@DataJpaTest            // Chỉ load JPA, dùng in-memory DB
@TestConfiguration       // Cấu hình test riêng
```

---

## 3. QUY TRÌNH 1: PHÂN TÍCH VÀ HIỂU MÃ NGUỒN

### Bước 1.1: Xác định các Module cần test

Dựa trên cấu trúc dự án, chúng ta có các module chính:

```
src/main/java/com/rentalms/
├── service/           ← CORE BUSINESS LOGIC (TEST TRỌNG ĐIỂM)
│   ├── ContractService.java
│   ├── BillingService.java
│   ├── BuildingService.java
│   ├── UserService.java
│   └── ...
├── security/          ← SECURITY LOGIC
│   ├── JwtUtil.java
│   └── JwtFilter.java
├── controller/        ← API ENDPOINTS
├── repository/        ← DATA ACCESS
├── entity/            ← DATABASE ENTITIES
├── dto/               ← DATA TRANSFER OBJECTS
└── exception/         ← ERROR HANDLING
```

### Bước 1.2: Phân tích từng Service

#### Ví dụ 1: ContractService

**File:** `src/main/java/com/rentalms/service/ContractService.java`

**Các method cần test:**

| Method | Mô tả | Input | Output | Exception có thể |
|--------|--------|-------|--------|------------------|
| `create()` | Tạo hợp đồng mới | ContractDTO, ownerId | Contract | NotFoundException, BusinessException |
| `terminate()` | Kết thúc hợp đồng | contractId, ownerId | Contract | BusinessException |
| `renew()` | Gia hạn hợp đồng | contractId, newEndDate, ownerId | Contract | BusinessException |
| `findById()` | Tìm hợp đồng | id | Contract | NotFoundException |
| `getByOwner()` | Lấy HĐ theo chủ nhà | ownerId | List<Contract> | - |
| `getByTenant()` | Lấy HĐ theo tenant | tenantId | List<Contract> | - |

**Phân tích logic `create()` method:**

```
1. Tìm phòng theo roomId
   ↓ Nếu không tìm thấy → throw NotFoundException("Khong tim thay phong")
   
2. Kiểm tra trạng thái phòng
   ↓ Nếu status != AVAILABLE && != RESERVED → throw BusinessException("Phong hien khong the tao hop dong")
   
3. Kiểm tra overlap (hợp đồng trùng thời gian)
   ↓ Nếu có overlap → throw BusinessException("Phong da co hop dong trong khoang thoi gian nay!")
   
4. Tìm tenant và owner
   ↓ Nếu không tìm thấy → throw NotFoundException
   
5. Tạo hợp đồng với status = ACTIVE
   ↓ Save vào database
   
6. Cập nhật trạng thái phòng → OCCUPIED
   
7. Log audit trail
   
8. Return contract
```

**Các test paths cần cover:**
- ✅ Happy path: Tạo thành công
- ✅ Exception: Phòng không tồn tại
- ✅ Exception: Phòng đang thuê (không AVAILABLE/RESERVED)
- ✅ Exception: Overlap dates
- ✅ Exception: Tenant không tồn tại
- ✅ Verify: Phòng được cập nhật sang OCCUPIED

#### Ví dụ 2: BillingService

**File:** `src/main/java/com/rentalms/service/BillingService.java`

**Các method cần test:**

| Method | Mô tả | Input | Output | Exception |
|--------|--------|-------|--------|-----------|
| `generateBillForContract()` | Tạo hóa đơn cho hợp đồng | Contract, period | Bill | BusinessException (đã tồn tại) |
| `setUtilityReadings()` | Cập nhật công tơ điện/nước | billId, SetUtilitiesRequest | Bill | BusinessException |
| `pay()` | Thanh toán hóa đơn | billId, PayRequest | Payment | BusinessException |
| `confirmCashPayment()` | Xác nhận tiền mặt | billId, actorId | Bill | BusinessException |
| `markOverdueBills()` | Đánh dấu quá hạn (scheduled) | - | void | - |

**Phân tích logic `setUtilityReadings()`:**

```
1. Tìm bill theo id
   ↓ Không tìm thấy → throw NotFoundException
   
2. Kiểm tra actor có quyền quản lý building không
   ↓ Không có quyền → throw BusinessException
   
3. Kiểm tra bill chưa paid/cancelled
   ↓ Đã paid/cancelled → throw BusinessException
   
4. Lấy đơn giá điện/nước từ building
   
5. Xóa BillItem ELECTRICITY và WATER cũ
   
6. Tính tiền điện mới:
   - Nếu electricityNew >= electricityOld:
     consumption = electricityNew - electricityOld
     amount = consumption × electricityPrice
   - Ngược lại: bỏ qua
   
7. Tính tiền nước mới (tương tự)
   
8. Tính lại total từ tất cả items
   
9. Log audit trail
   
10. Return bill
```

**Test cases cần viết:**
- ✅ Happy path: Cập nhật điện/nước thành công
- ✅ Happy path: Chỉ cập nhật điện (nước = null)
- ✅ Exception: Bill đã thanh toán
- ✅ Exception: Bill đã hủy
- ✅ Exception: Không có quyền
- ✅ Verify: Xóa BillItem cũ
- ✅ Verify: Tính đúng consumption
- ✅ Edge: electricityNew < electricityOld (bỏ qua)

### Bước 1.3: Xác định Test Data cần Mock

| Service | Dependencies cần Mock |
|---------|----------------------|
| ContractService | ContractRepository, RoomRepository, UserService, AuditService |
| BillingService | BillRepository, BillItemRepository, PaymentRepository, ContractRepository, AuditService, NotificationService, BuildingAccessService, UserService |
| BuildingService | BuildingRepository, RoomRepository, ContractRepository, UserService, AuditService, BuildingAccessService |
| JwtUtil | Không cần mock (uses @Value) |

### Bước 1.4: Xác định Edge Cases

| Module | Edge Cases cần test |
|--------|---------------------|
| Contract | - Ngày bắt đầu = ngày kết thúc<br>- Ngày kết thúc trước ngày bắt đầu<br>- Deposit = null, = 0, = giá trị lớn<br>- monthlyRent = null (dùng room.getPrice()) |
| Billing | - electricityNew = electricityOld (0 consumption)<br>- Tất cả utility = null<br>- Bill đã paid 1 phần (PARTIAL)<br>- Paid amount > total amount |
| Building | - Room đã tồn tại<br>- Bulk create 100 phòng<br>- Delete building có phòng trống<br>- Delete building có phòng đang thuê |

---

## 4. QUY TRÌNH 2: THIẾT KẾ TEST CASE

### 4.1 Cấu trúc Test Class

```java
package com.rentalms.service;

import com.rentalms.entity.*;
import com.rentalms.enums.*;
import com.rentalms.exception.*;
import com.rentalms.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ContractService Tests")
class ContractServiceTest {

    @Mock private ContractRepository contractRepo;
    @Mock private RoomRepository roomRepo;
    @Mock private UserService userService;
    @Mock private AuditService auditService;

    @InjectMocks private ContractService contractService;

    // Test data helpers
    private User testOwner;
    private User testTenant;
    private Room testRoom;
    private Building testBuilding;
    private Contract testContract;

    @BeforeEach
    void setUp() {
        // Setup test data
        testOwner = User.builder()
            .id(1L)
            .email("owner@test.com")
            .role(UserRole.OWNER)
            .build();

        testTenant = User.builder()
            .id(2L)
            .email("tenant@test.com")
            .role(UserRole.TENANT)
            .build();

        testBuilding = Building.builder()
            .id(1L)
            .name("Test Building")
            .owner(testOwner)
            .build();

        testRoom = Room.builder()
            .id(1L)
            .roomNo("101")
            .building(testBuilding)
            .status(RoomStatus.AVAILABLE)
            .price(BigDecimal.valueOf(5000000))
            .build();

        testContract = Contract.builder()
            .id(1L)
            .room(testRoom)
            .tenant(testTenant)
            .owner(testOwner)
            .startDate(LocalDate.now())
            .endDate(LocalDate.now().plusMonths(6))
            .deposit(BigDecimal.valueOf(10000000))
            .monthlyRent(BigDecimal.valueOf(5000000))
            .status(ContractStatus.ACTIVE)
            .build();
    }

    // === TEST CASES ===
}
```

### 4.2 Template Test Case

```
┌─────────────────────────────────────────────────────────────┐
│ TEST CASE TEMPLATE                                          │
├─────────────────────────────────────────────────────────────┤
│ TC_ID:        [Module]-[Number]                              │
│ Module:       [Tên module: Contract, Billing, Building...]   │
│ Method:       [Tên method đang test]                        │
│ Test Type:    [Happy Path / Exception / Edge Case]          │
├─────────────────────────────────────────────────────────────┤
│ OBJECTIVE:    [Mục tiêu của test case này]                 │
├─────────────────────────────────────────────────────────────┤
│ PRE-CONDITIONS:                                             │
│ 1. [Điều kiện trước 1]                                     │
│ 2. [Điều kiện trước 2]                                     │
├─────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                  │
│ - Input:     [Dữ liệu đầu vào]                             │
│ - Expected:  [Kết quả mong đợi]                            │
├─────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                 │
│ 1. [Bước 1]                                                │
│ 2. [Bước 2]                                                │
│ 3. [Bước 3]                                                │
├─────────────────────────────────────────────────────────────┤
│ ASSERTIONS:                                                 │
│ 1. [Assertion 1]                                           │
│ 2. [Assertion 2]                                           │
│ 3. [Verification calls]                                    │
├─────────────────────────────────────────────────────────────┤
│ TEST CODE:                                                  │
│ ```java                                                     │
│ @Test                                                       │
│ @DisplayName("[Tên test hiển thị]")                         │
│ void should_[action]_when_[condition]() {                   │
│     // Setup                                                 │
│     when(mock.method(args)).thenReturn(value);               │
│                                                               │
│     // Execute                                               │
│     Result result = service.method(input);                   │
│                                                               │
│     // Assert                                               │
│     assertThat(result).isEqualTo(expected);                 │
│ }                                                            │
│ ```                                                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Ví dụ: ContractService - create()

```
┌─────────────────────────────────────────────────────────────┐
│ TC_ID:        CONTRACT-001                                   │
│ Module:       ContractService                                │
│ Method:       create(ContractDTO.CreateRequest, ownerId)    │
│ Test Type:    Happy Path                                     │
├─────────────────────────────────────────────────────────────┤
│ OBJECTIVE:    Verify tạo hợp đồng thành công               │
├─────────────────────────────────────────────────────────────┤
│ PRE-CONDITIONS:                                             │
│ 1. Owner và Tenant đã tồn tại trong hệ thống                │
│ 2. Room tồn tại và có status = AVAILABLE                    │
│ 3. Không có hợp đồng overlap trong khoảng thời gian này    │
├─────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                  │
│ - Input:     ContractDTO với roomId=1, tenantId=2,          │
│              startDate=hôm nay, endDate=+6 tháng,           │
│              deposit=10tr, monthlyRent=5tr                   │
│ - Expected:  Contract được tạo với status=ACTIVE           │
│              Room status được cập nhật sang OCCUPIED        │
├─────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                 │
│ 1. Mock roomRepo.findById() → trả testRoom (AVAILABLE)      │
│ 2. Mock contractRepo.existsOverlap() → false               │
│ 3. Mock userService.findById() → owner, tenant             │
│ 4. Mock contractRepo.save() → trả testContract             │
│ 5. Gọi contractService.create(req, ownerId)                │
│ 6. Assert contract được tạo đúng                           │
│ 7. Assert room status = OCCUPIED                           │
│ 8. Verify auditService.log() được gọi                      │
├─────────────────────────────────────────────────────────────┤
│ ASSERTIONS:                                                 │
│ 1. contract.getStatus() == ContractStatus.ACTIVE             │
│ 2. contract.getRoom().getStatus() == RoomStatus.OCCUPIED    │
│ 3. contract.getTenant() == testTenant                      │
│ 4. contract.getOwner() == testOwner                        │
│ 5. verify(auditService).log() called once                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Ví dụ: ContractService - create() với Exception

```
┌─────────────────────────────────────────────────────────────┐
│ TC_ID:        CONTRACT-002                                   │
│ Module:       ContractService                                │
│ Method:       create()                                       │
│ Test Type:    Exception - Room không tìm thấy                │
├─────────────────────────────────────────────────────────────┤
│ OBJECTIVE:    Verify ném NotFoundException khi room không    │
│               tồn tại                                        │
├─────────────────────────────────────────────────────────────┤
│ PRE-CONDITIONS:                                             │
│ 1. Room với id=999 không tồn tại trong database              │
├─────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                  │
│ - Input:     ContractDTO với roomId=999                     │
│ - Expected:  throw NotFoundException("Khong tim thay phong")│
├─────────────────────────────────────────────────────────────┤
│ TEST CODE:                                                  │
│ ```java                                                     │
│ @Test                                                       │
│ @DisplayName("Should throw NotFoundException when room      │
│               not found")                                  │
│ void shouldThrowNotFoundException_whenRoomNotFound() {      │
│     // Arrange                                             │
│     when(roomRepo.findById(999L))                           │
│         .thenReturn(Optional.empty());                      │
│                                                               │
│     ContractDTO.CreateRequest req = ContractDTO.CreateRequest │
│         .builder().roomId(999L)...build();                  │
│                                                               │
│     // Act & Assert                                         │
│     assertThatThrownBy(() ->                               │
│         contractService.create(req, ownerId))               │
│         .isInstanceOf(NotFoundException.class)              │
│         .hasMessageContaining("Khong tim thay phong");      │
│                                                               │
│     // Verify không gọi save                               │
│     verify(contractRepo, never()).save(any());              │
│ }                                                            │
│ ```                                                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Bảng tổng hợp Test Cases cho ContractService

| TC_ID | Test Type | Mô tả | Input | Expected |
|-------|-----------|--------|-------|----------|
| CONTRACT-001 | Happy | Tạo HĐ thành công | Room AVAILABLE | Contract ACTIVE, Room OCCUPIED |
| CONTRACT-002 | Exception | Room không tồn tại | roomId=999 | NotFoundException |
| CONTRACT-003 | Exception | Room đang thuê | Room OCCUPIED | BusinessException |
| CONTRACT-004 | Exception | Overlap dates | HĐ trùng thời gian | BusinessException |
| CONTRACT-005 | Exception | Tenant không tồn tại | tenantId=999 | NotFoundException |
| CONTRACT-006 | Edge | monthlyRent = null | null | Dùng room.getPrice() |
| CONTRACT-007 | Happy | Terminate thành công | Owner đúng | Contract TERMINATED, Room AVAILABLE |
| CONTRACT-008 | Exception | Terminate - không có quyền | Owner khác | BusinessException |
| CONTRACT-009 | Happy | Renew thành công | Owner đúng | Contract EXTENDED, endDate mới |
| CONTRACT-010 | Exception | Renew - không có quyền | Owner khác | BusinessException |

---

## 5. CẤU TRÚC MÃ NGUỒN CẦN TEST

### 5.1 Danh sách Services cần test

| # | Service | Số Method | Priority | Độ phức tạp |
|---|---------|-----------|----------|-------------|
| 1 | ContractService | 7 | Cao | Trung bình |
| 2 | BillingService | 10 | Cao | Cao |
| 3 | BuildingService | 12 | Cao | Trung bình |
| 4 | JwtUtil | 5 | Cao | Thấp |
| 5 | UserService | 5 | Trung bình | Thấp |
| 6 | RentalRequestService | 4 | Trung bình | Trung bình |
| 7 | VnpayService | 3 | Thấp | Cao |

### 5.2 Thứ tự ưu tiên test

```
Priority 1 (Test trước):
├── JwtUtil           → Cốt lõi bảo mật, dễ test
├── ContractService    → Nghiệp vụ chính
└── BillingService     → Nghiệp vụ tài chính

Priority 2 (Test tiếp):
├── BuildingService    → Quản lý tài sản
├── UserService        → Quản lý người dùng
└── RentalRequestService

Priority 3 (Test sau):
├── VnpayService       → Tích hợp bên ngoài
└── NotificationService
```

---

## 6. TEMPLATE BÁO CÁO WHITE-BOX TESTING

### 6.1 Cấu trúc thư mục báo cáo

```
BAOCAO_TEST_WHITEBOX/
├── BAO_CAO_WHITEBOX_TONGHOP.md
├── Module_Contract/
│   ├── PHAN_TICH_CODE_CONTRACT.md
│   ├── THIET_KE_TESTCASE_CONTRACT.md
│   └── KET_QUA_TEST_CONTRACT.md
├── Module_Billing/
│   ├── PHAN_TICH_CODE_BILLING.md
│   ├── THIET_KE_TESTCASE_BILLING.md
│   └── KET_QUA_TEST_BILLING.md
└── Module_Building/
    ├── PHAN_TICH_CODE_BUILDING.md
    ├── THIET_KE_TESTCASE_BUILDING.md
    └── KET_QUA_TEST_BUILDING.md
```

### 6.2 Template Báo cáo Tổng hợp

```markdown
# BÁO CÁO WHITE-BOX TESTING - TỔNG HỢP

## 1. Thông tin dự án
- **Dự án:** J2EE Quản Lý Phòng Trọ (RentalMS)
- **Ngày test:** [Ngày]
- **Người thực hiện:** [Họ tên]
- **Môi trường:** Java 17, Spring Boot 3.x, JUnit 5, Mockito

## 2. Phạm vi Testing
- **Module đã test:**
  - [ ] ContractService
  - [ ] BillingService
  - [ ] BuildingService
  - [ ] JwtUtil
  - [ ] UserService
- **Tổng số test cases:** [Số]

## 3. Kết quả tổng quan
| Module | Test Cases | PASS | FAIL | Coverage |
|--------|------------|------|------|----------|
| ContractService | 10 | 10 | 0 | 85% |
| BillingService | 15 | 14 | 1 | 78% |
| ... | | | | |

## 4. Công cụ sử dụng
- **JUnit 5:** Framework testing chính
- **Mockito:** Mocking dependencies
- **AssertJ:** Fluent assertions
- **JaCoCo:** Code coverage measurement

## 5. Kết luận và Đề xuất
[Viết kết luận...]
```

---

## 7. HƯỚNG DẪN CHẠY TEST

### 7.1 Chạy tất cả tests

```bash
# Trong thư mục dự án J2EEQuanLyPhongTro-main
cd J2EEQuanLyPhongTro-main

# Chạy tất cả tests
mvn test

# Chạy với coverage report
mvn test jacoco:report
```

### 7.2 Chạy tests của một module cụ thể

```bash
# Chỉ test ContractService
mvn test -Dtest=ContractServiceTest

# Chỉ test BillingService
mvn test -Dtest=BillingServiceTest

# Chạy test có chứa "create" trong tên
mvn test -Dtest=*Test#should*create*
```

### 7.3 Xem Coverage Report

```bash
# Sau khi chạy mvn test jacoco:report
# Mở file HTML report
# Windows:
start target/site/jacoco/index.html
# Linux/Mac:
open target/site/jacoco/index.html
```

### 7.4 Cấu hình JaCoCo trong pom.xml

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.11</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

---

## 8. CHECKLIST TRƯỚC KHI BẮT ĐẦU TEST

### 8.1 Checklist cho từng Service

```
□ Đã đọc và hiểu toàn bộ source code của Service
□ Đã xác định tất cả public methods cần test
□ Đã liệt kê các exceptions có thể xảy ra
□ Đã xác định dependencies cần mock
□ Đã chuẩn bị test data (entities, DTOs)
□ Đã viết test cases cho Happy Path
□ Đã viết test cases cho Exception cases
□ Đã viết test cases cho Edge Cases
□ Đã chạy tests và kiểm tra 100% PASS
□ Đã đo coverage ≥ 70%
□ Đã cập nhật báo cáo
```

### 8.2 Tiêu chí đánh giá coverage

| Coverage | Đánh giá |
|----------|----------|
| < 50% | Cần cải thiện |
| 50-70% | Chấp nhận được |
| 70-85% | Tốt |
| 85-100% | Xuất sắc |

---

## 9. CÁC LỖI THƯỜNG GẶP VÀ CÁCH KHẮC PHỤC

| Lỗi | Nguyên nhân | Cách khắc phục |
|------|-------------|----------------|
| `NullPointerException` | Mock chưa setup đúng | Setup tất cả mock trước khi gọi method |
| `UnnecessaryStubbing` | Mock không sử dụng | Sử dụng `@MockitoSettings(strictness = Strictness.LENIENT)` hoặc xóa stub không dùng |
| `WrongAssertion` | Expected value sai | Kiểm tra lại logic nghiệp vụ |
| `MissingMock` | Quên mock dependency | Thêm `when(...).thenReturn(...)` |
| Test chạy chậm | Database calls thật | Đảm bảo dùng `@DataJpaTest` hoặc mock tất cả repos |

---

**Tài liệu này là hướng dẫn cho Quy trình 1 và Quy trình 2**
**Sau khi bạn duyệt, chúng ta sẽ tiến hành Quy trình 3: Viết code test thực tế**
