# PHÂN TÍCH MÃ NGUỒN - CONTRACT SERVICE
## Dự án J2EE Quản Lý Phòng Trọ (RentalMS)

---

## 1. THÔNG TIN TỔNG QUAN

| Thông tin | Chi tiết |
|-----------|----------|
| **File** | `src/main/java/com/rentalms/service/ContractService.java` |
| **Class** | `ContractService` |
| **Annotations** | `@Service`, `@RequiredArgsConstructor` |
| **Dependencies** | ContractRepository, RoomRepository, UserService, AuditService |
| **Số Methods** | 8 methods chính |

---

## 2. CÁC METHOD VÀ LOGIC CHI TIẾT

### 2.1 Method: `create()`

```java
@Transactional
public Contract create(ContractDTO.CreateRequest req, Long ownerId)
```

**Mục đích:** Tạo mới một hợp đồng thuê phòng

**Input:**
- `req: ContractDTO.CreateRequest` - Chứa roomId, tenantId, startDate, endDate, deposit, monthlyRent, rentCycle, policy, lateFeePercent
- `ownerId: Long` - ID của chủ nhà

**Logic Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ BẮT ĐẦU create()                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 1: Tìm phòng theo roomId                              │
│ roomRepo.findById(req.getRoomId())                         │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │ Tìm thấy?             │
                └───────────┬───────────┘
                    Yes     │     No
                    ┌───────┴───────┐
                    ▼               ▼
            Tiếp tục      throw NotFoundException
                                    │
                            "Khong tim thay phong"
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 2: Kiểm tra trạng thái phòng                         │
│ status == AVAILABLE || status == RESERVED                   │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │ Hợp lệ?               │
                └───────────┬───────────┘
                    Yes     │     No
                    ┌───────┴───────┐
                    ▼               ▼
            Tiếp tục      throw BusinessException
                      "Phong hien khong the tao hop dong"
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 3: Kiểm tra overlap (trùng thời gian)               │
│ contractRepo.existsOverlap(roomId, startDate, endDate)     │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │ Có overlap?           │
                └───────────┬───────────┘
                    No      │     Yes
                    ┌───────┴───────┐
                    ▼               ▼
            Tiếp tục      throw BusinessException
                      "Phong da co hop dong trong khoang thoi gian nay!"
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 4: Tìm Tenant và Owner                               │
│ userService.findById(req.getTenantId())                     │
│ userService.findById(ownerId)                              │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │ Tìm thấy?             │
                └───────────┬───────────┘
                    Yes     │     No
                    ┌───────┴───────┐
                    ▼               ▼
            Tiếp tục      throw NotFoundException
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 5: Tạo Contract object                               │
│ - room = found room                                       │
│ - tenant = found tenant                                   │
│ - owner = found owner                                     │
│ - startDate, endDate từ request                          │
│ - deposit từ request                                      │
│ - monthlyRent = req.getMonthlyRent() ?? room.getPrice()   │
│ - status = ContractStatus.ACTIVE                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 6: Save Contract                                     │
│ contractRepo.save(contract)                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 7: Cập nhật trạng thái phòng                        │
│ room.setStatus(RoomStatus.OCCUPIED)                        │
│ roomRepo.save(room)                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 8: Ghi Audit Log                                      │
│ auditService.log(ownerId, ownerEmail, "CREATE", ...)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Return Contract│
                    └───────────────┘
```

**Output:** `Contract` - Hợp đồng đã được tạo

**Exceptions có thể:**
| Exception | Điều kiện |
|-----------|-----------|
| NotFoundException | Room không tồn tại |
| NotFoundException | Tenant không tồn tại |
| BusinessException | Phòng không ở trạng thái AVAILABLE hoặc RESERVED |
| BusinessException | Có hợp đồng overlap trong khoảng thời gian này |

**Đặc điểm quan trọng:**
- Sử dụng `@Transactional` - rollback nếu có exception
- Tự động cập nhật room status sang OCCUPIED khi tạo hợp đồng
- `monthlyRent` có thể null → sẽ dùng giá từ `room.getPrice()`

---

### 2.2 Method: `terminate()`

```java
@Transactional
public Contract terminate(Long contractId, Long ownerId)
```

**Mục đích:** Kết thúc một hợp đồng thuê

**Logic Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ Bước 1: Tìm Contract                                      │
│ findById(contractId)                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │ Tìm thấy?             │
                └───────────┬───────────┘
                    Yes     │     No
                    ┌───────┴───────┐
                    ▼               ▼
            Tiếp tục      throw NotFoundException
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 2: Kiểm tra quyền sở hữu                             │
│ contract.getOwner().getId().equals(ownerId)                │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │ Có quyền?             │
                └───────────┬───────────┘
                    Yes     │     No
                    ┌───────┴───────┐
                    ▼               ▼
            Tiếp tục      throw BusinessException
                      "Khong co quyen ket thuc hop dong nay"
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 3: Cập nhật trạng thái                               │
│ contract.setStatus(ContractStatus.TERMINATED)               │
│ contract.getRoom().setStatus(RoomStatus.AVAILABLE)         │
│ roomRepo.save(room)                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 4: Save Contract                                      │
│ contractRepo.save(contract)                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Return Contract│
                    └───────────────┘
```

**Output:** `Contract` - Hợp đồng đã được kết thúc

**Exceptions:**
| Exception | Điều kiện |
|-----------|-----------|
| NotFoundException | Contract không tồn tại |
| BusinessException | Owner của contract không phải là ownerId truyền vào |

**Đặc điểm quan trọng:**
- Khi terminate, phòng tự động được set về AVAILABLE
- Chỉ owner mới có quyền terminate contract của mình

---

### 2.3 Method: `renew()`

```java
@Transactional
public Contract renew(Long contractId, LocalDate newEndDate, Long ownerId)
```

**Mục đích:** Gia hạn hợp đồng thuê

**Logic Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ Bước 1: Tìm Contract (giống terminate)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 2: Kiểm tra quyền sở hữu                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 3: Cập nhật                                          │
│ contract.setEndDate(newEndDate)                            │
│ contract.setStatus(ContractStatus.EXTENDED)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Return Contract│
                    └───────────────┘
```

**Output:** `Contract` - Hợp đồng đã được gia hạn

**Đặc điểm quan trọng:**
- Không tự động cập nhật room status (vẫn là OCCUPIED)
- Status contract được đổi sang EXTENDED
- **Không kiểm tra newEndDate > current endDate** (CÓ THỂ là bug)

---

### 2.4 Method: `findById()`

```java
public Contract findById(Long id)
```

**Mục đích:** Tìm hợp đồng theo ID

**Logic:**
```
findById → Repository.findById → Optional<Contract>
         → if empty → throw NotFoundException
         → if found → return Contract
```

**Output:** `Contract`

**Exception:** NotFoundException nếu không tìm thấy

---

### 2.5 Method: `getByOwner()`, `getByTenant()`, `getByManager()`

```java
public List<Contract> getByOwner(Long ownerId)
public List<Contract> getByTenant(Long tenantId)
public List<Contract> getByManager(Long managerId)
```

**Mục đích:** Lấy danh sách hợp đồng theo role

**Logic:**
```
getByOwner → contractRepo.findByOwnerId(ownerId)
getByTenant → contractRepo.findByTenantId(tenantId)
getByManager → contractRepo.findByAssignedManagerId(managerId)
```

**Output:** `List<Contract>` - Danh sách hợp đồng (có thể empty)

---

### 2.6 Method: `toResponse()`

```java
public ContractDTO.Response toResponse(Contract c)
```

**Mục đích:** Chuyển đổi Contract entity sang DTO Response

**Fields được map:**

| Contract field | Response field |
|----------------|----------------|
| c.getId() | r.setId() |
| c.getRoom().getId() | r.setRoomId() |
| c.getRoom().getRoomNo() | r.setRoomNo() |
| c.getRoom().getBuilding().getName() | r.setBuildingName() |
| c.getTenant().getId() | r.setTenantId() |
| c.getTenant().getFullName() | r.setTenantName() |
| c.getTenant().getEmail() | r.setTenantEmail() |
| c.getStartDate() | r.setStartDate() |
| c.getEndDate() | r.setEndDate() |
| c.getDeposit() | r.setDeposit() |
| c.getMonthlyRent() | r.setMonthlyRent() |
| c.getStatus().name() | r.setStatus() |
| c.getCreatedAt() | r.setCreatedAt() |

**Output:** `ContractDTO.Response`

---

## 3. DEPENDENCY ANALYSIS

### 3.1 Dependencies cần Mock trong Test

| Dependency | Methods được gọi | Cần mock? |
|------------|-------------------|-----------|
| ContractRepository | findById(), save(), existsOverlap() | ✅ Cần |
| RoomRepository | findById(), save() | ✅ Cần |
| UserService | findById() | ✅ Cần |
| AuditService | log() | ✅ Cần |

### 3.2 Entity Relationships

```
Contract (1) ←→ (1) Room
     │
     ├── (N) ←→ (1) User (tenant)
     │
     └── (N) ←→ (1) User (owner)

Room (N) ←→ (1) Building
```

---

## 4. EDGE CASES VÀ BOUNDARY ANALYSIS

### 4.1 Edge Cases cần test

| # | Edge Case | Input | Expected Behavior |
|---|-----------|-------|-------------------|
| 1 | startDate = endDate | cùng ngày | Tạo được (không kiểm tra) |
| 2 | endDate < startDate | sai thứ tự | Tạo được? (không kiểm tra) - **CÓ THỂ LÀ BUG** |
| 3 | deposit = null | null | Tạo được? Có field nullable không? |
| 4 | deposit = 0 | 0 | Tạo được? |
| 5 | deposit = số âm | -1000 | Tạo được? (không kiểm tra) |
| 6 | monthlyRent = null | null | Dùng room.getPrice() |
| 7 | monthlyRent = 0 | 0 | Tạo được? |
| 8 | Ngày trong quá khứ | startDate = -1 year | Tạo được? (không kiểm tra) |
| 9 | Ngày quá xa tương lai | endDate = +50 years | Tạo được? (không kiểm tra) |
| 10 | Room RESERVED status | RESERVED | Tạo được (logic cho phép) |

### 4.2 Potential Bugs phát hiện qua phân tích

```
⚠️ BUG 1: renew() không kiểm tra newEndDate
   - Có thể renew với ngày trong quá khứ
   - Có thể renew với ngày trước endDate hiện tại

⚠️ BUG 2: create() không kiểm tra startDate
   - Có thể tạo hợp đồng bắt đầu trong quá khứ

⚠️ BUG 3: create() không kiểm tra endDate
   - Có thể tạo hợp đồng kết thúc trước startDate

⚠️ BUG 4: create() không kiểm tra deposit âm
   - Có thể tạo với deposit = -1000
```

---

## 5. TEST CASES ĐỀ XUẤT

### 5.1 Happy Path Tests

| TC_ID | Test Name | Input | Expected |
|-------|-----------|-------|----------|
| TC-001 | create_success_with_full_data | đầy đủ data | Contract ACTIVE |
| TC-002 | create_success_with_null_monthlyRent | monthlyRent=null | Dùng room.price |
| TC-003 | create_with_RESERVED_room | Room RESERVED | Contract ACTIVE |
| TC-004 | terminate_success | Owner đúng | Contract TERMINATED, Room AVAILABLE |
| TC-005 | renew_success | newEndDate > current | Contract EXTENDED |

### 5.2 Exception Tests

| TC_ID | Test Name | Input | Expected Exception |
|-------|-----------|-------|-------------------|
| TC-101 | create_roomNotFound | roomId=999 | NotFoundException |
| TC-102 | create_roomNotAvailable | Room OCCUPIED | BusinessException |
| TC-103 | create_overlapExists | Overlap dates | BusinessException |
| TC-104 | create_tenantNotFound | tenantId=999 | NotFoundException |
| TC-105 | terminate_notOwner | Owner khác | BusinessException |
| TC-106 | renew_notOwner | Owner khác | BusinessException |

### 5.3 Edge Case Tests

| TC_ID | Test Name | Input | Expected |
|-------|-----------|-------|----------|
| TC-201 | create_sameDate | startDate=endDate | Contract ACTIVE (nếu cho phép) |
| TC-202 | create_invalidDates | endDate < startDate | Exception? (chưa có check) |
| TC-203 | create_negativeDeposit | deposit=-1000 | ??? (chưa có check) |
| TC-204 | renew_sameDate | newEndDate = current | Contract EXTENDED |

---

## 6. MOCK SETUP TEMPLATE

```java
@ExtendWith(MockitoExtension.class)
class ContractServiceTest {

    @Mock private ContractRepository contractRepo;
    @Mock private RoomRepository roomRepo;
    @Mock private UserService userService;
    @Mock private AuditService auditService;

    @InjectMocks private ContractService contractService;

    // Test data
    private User owner, tenant;
    private Room room;
    private Building building;
    private Contract contract;

    @BeforeEach
    void setUp() {
        owner = User.builder()
            .id(1L).email("owner@test.com")
            .role(UserRole.OWNER).build();

        tenant = User.builder()
            .id(2L).email("tenant@test.com")
            .role(UserRole.TENANT).build();

        building = Building.builder()
            .id(1L).name("Test Building").owner(owner).build();

        room = Room.builder()
            .id(1L).roomNo("101").building(building)
            .status(RoomStatus.AVAILABLE)
            .price(BigDecimal.valueOf(5000000)).build();

        contract = Contract.builder()
            .id(1L).room(room).tenant(tenant).owner(owner)
            .startDate(LocalDate.now())
            .endDate(LocalDate.now().plusMonths(6))
            .deposit(BigDecimal.valueOf(10000000))
            .monthlyRent(BigDecimal.valueOf(5000000))
            .status(ContractStatus.ACTIVE).build();
    }
}
```

---

## 7. ASSERTION PATTERNS

```java
// 1. Assert returned object
assertThat(result).isNotNull();
assertThat(result.getStatus()).isEqualTo(ContractStatus.ACTIVE);

// 2. Assert exception thrown
assertThatThrownBy(() -> service.create(req, ownerId))
    .isInstanceOf(BusinessException.class)
    .hasMessageContaining("expected message");

// 3. Assert mock interactions
verify(contractRepo).save(any(Contract.class));
verify(roomRepo).save(any(Room.class));
verify(auditService).log(eq(ownerId), any(), eq("CREATE"), eq("Contract"), any(), any());

// 4. Assert no interaction (for negative cases)
verify(contractRepo, never()).save(any());
```

---

## 8. SUMMARY

### 8.1 Số lượng Test Cases cần viết

| Category | Số lượng |
|----------|----------|
| Happy Path | 5 |
| Exception | 6 |
| Edge Case | 4 |
| **Tổng** | **15** |

### 8.2 Code Coverage Target

| Metric | Target |
|--------|--------|
| Line Coverage | ≥ 80% |
| Branch Coverage | ≥ 70% |
| Method Coverage | 100% |

### 8.3 Files cần tạo

```
src/test/java/com/rentalms/service/
└── ContractServiceTest.java    ← Tất cả test cases
```
