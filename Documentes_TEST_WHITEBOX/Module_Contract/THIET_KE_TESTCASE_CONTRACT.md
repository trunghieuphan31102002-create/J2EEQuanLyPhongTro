# THIẾT KẾ TEST CASES - CONTRACT SERVICE
## Dự án J2EE Quản Lý Phòng Trọ (RentalMS)

---

## 1. TỔNG HỢP TEST CASES

### 1.1 Danh sách Test Cases hoàn chỉnh

| TC_ID | Priority | Test Type | Test Name | Class |
|-------|----------|-----------|-----------|-------|
| TC-CON-001 | HIGH | Happy Path | create_withValidData_returnsActiveContract | ContractServiceTest |
| TC-CON-002 | HIGH | Happy Path | create_withNullMonthlyRent_usesRoomPrice | ContractServiceTest |
| TC-CON-003 | HIGH | Happy Path | create_withRESERVEDRoom_createsContract | ContractServiceTest |
| TC-CON-004 | HIGH | Happy Path | terminate_withValidOwner_returnsTerminatedContract | ContractServiceTest |
| TC-CON-005 | HIGH | Happy Path | renew_withValidData_returnsExtendedContract | ContractServiceTest |
| TC-CON-006 | HIGH | Exception | create_withNonExistentRoom_throwsNotFoundException | ContractServiceTest |
| TC-CON-007 | HIGH | Exception | create_withOccupiedRoom_throwsBusinessException | ContractServiceTest |
| TC-CON-008 | HIGH | Exception | create_withOverlappingDates_throwsBusinessException | ContractServiceTest |
| TC-CON-009 | HIGH | Exception | create_withNonExistentTenant_throwsNotFoundException | ContractServiceTest |
| TC-CON-010 | HIGH | Exception | terminate_withWrongOwner_throwsBusinessException | ContractServiceTest |
| TC-CON-011 | HIGH | Exception | renew_withWrongOwner_throwsBusinessException | ContractServiceTest |
| TC-CON-012 | MEDIUM | Edge | create_withSameStartAndEndDate_createsContract | ContractServiceTest |
| TC-CON-013 | MEDIUM | Edge | create_withNullDeposit_createsContract | ContractServiceTest |
| TC-CON-014 | HIGH | Verify | create_updatesRoomStatusToOccupied | ContractServiceTest |
| TC-CON-015 | HIGH | Verify | terminate_updatesRoomStatusToAvailable | ContractServiceTest |
| TC-CON-016 | HIGH | Verify | create_logsAuditTrail | ContractServiceTest |
| TC-CON-017 | MEDIUM | Edge | renew_withPastDate_createsContract | ContractServiceTest |

---

## 2. CHI TIẾT TEST CASES

### 2.1 HAPPY PATH TESTS

#### TC-CON-001: create_withValidData_returnsActiveContract

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-001                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh tạo hợp đồng thành công với dữ liệu hợp lệ│
├─────────────────────────────────────────────────────────────────┤
│ PRE-CONDITIONS:                                                  │
│ 1. Owner và Tenant tồn tại                                       │
│ 2. Room tồn tại với status = AVAILABLE                           │
│ 3. Không có hợp đồng overlap                                    │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - roomId: 1L                                                    │
│ - tenantId: 2L                                                  │
│ - startDate: 2026-07-17                                         │
│ - endDate: 2026-12-31                                           │
│ - deposit: 10,000,000 VND                                        │
│ - monthlyRent: 5,000,000 VND                                     │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                      │
│ 1. Setup mocks: roomRepo.findById → room AVAILABLE               │
│ 2. Setup mocks: contractRepo.existsOverlap → false               │
│ 3. Setup mocks: userService.findById → owner, tenant            │
│ 4. Setup mocks: contractRepo.save → contract                    │
│ 5. Call: contractService.create(request, ownerId)                │
│ 6. Assert: contract != null                                     │
│ 7. Assert: contract.status == ACTIVE                            │
│ 8. Assert: contract.tenant == testTenant                        │
│ 9. Assert: contract.owner == testOwner                          │
├─────────────────────────────────────────────────────────────────┤
│ ASSERTIONS:                                                      │
│ 1. contract.getStatus() == ContractStatus.ACTIVE                 │
│ 2. contract.getStartDate() == request.startDate                 │
│ 3. contract.getEndDate() == request.endDate                     │
│ 4. contract.getDeposit() == request.deposit                      │
│ 5. contract.getMonthlyRent() == request.monthlyRent              │
│ 6. verify(roomRepo).save(any(Room.class))                       │
│ 7. verify(auditService).log(...) called                         │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### TC-CON-002: create_withNullMonthlyRent_usesRoomPrice

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-002                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh monthlyRent null sẽ sử dụng giá từ Room    │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - room.price: 5,000,000 VND                                    │
│ - request.monthlyRent: null                                     │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks (room.status = AVAILABLE)                        │
│ 2. Call: contractService.create(request, ownerId)               │
│ 3. Assert: contract.monthlyRent == room.price                   │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### TC-CON-003: create_withRESERVEDRoom_createsContract

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-003                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh có thể tạo HĐ với Room ở status RESERVED  │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - room.status: RESERVED (không phải AVAILABLE)                 │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks: room.status = RESERVED                          │
│ 2. Setup mocks: overlap = false                                 │
│ 3. Call: contractService.create(request, ownerId)                │
│ 4. Assert: contract.status == ACTIVE                             │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### TC-CON-004: terminate_withValidOwner_returnsTerminatedContract

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-004                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh terminate thành công khi Owner đúng        │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - contract.owner.id: 1L (same as ownerId)                      │
│ - contract.status: ACTIVE                                       │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks: contractRepo.findById → contract                │
│ 2. Setup mocks: contractRepo.save → contract                    │
│ 3. Call: contractService.terminate(contractId, ownerId)         │
│ 4. Assert: contract.status == TERMINATED                        │
│ 5. Assert: room.status == AVAILABLE                             │
├─────────────────────────────────────────────────────────────────┤
│ ASSERTIONS:                                                     │
│ 1. contract.getStatus() == ContractStatus.TERMINATED            │
│ 2. room.getStatus() == RoomStatus.AVAILABLE                     │
│ 3. verify(roomRepo).save(room)                                  │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### TC-CON-005: renew_withValidData_returnsExtendedContract

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-005                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh renew thành công với ngày mới             │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - contract.owner.id: 1L                                        │
│ - newEndDate: 2027-12-31                                      │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks: contractRepo.findById → contract               │
│ 2. Call: contractService.renew(contractId, newEndDate, ownerId)│
│ 3. Assert: contract.endDate == newEndDate                       │
│ 4. Assert: contract.status == EXTENDED                          │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.2 EXCEPTION TESTS

#### TC-CON-006: create_withNonExistentRoom_throwsNotFoundException

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-006                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh ném NotFoundException khi Room không tồn tại│
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - roomId: 999L (không tồn tại)                                 │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks: roomRepo.findById → Optional.empty()           │
│ 2. Call: contractService.create(request, ownerId)               │
│ 3. Assert: throws NotFoundException                             │
│ 4. Assert: message contains "Khong tim thay phong"             │
│ 5. Verify: contractRepo.save() never called                     │
├─────────────────────────────────────────────────────────────────┤
│ TEST CODE:                                                      │
│ ```java                                                        │
│ @Test                                                          │
│ @DisplayName("Should throw NotFoundException when room not found")│
│ void create_withNonExistentRoom_throwsNotFoundException() {     │
│     when(roomRepo.findById(999L)).thenReturn(Optional.empty());  │
│     ContractDTO.CreateRequest req = ContractDTO.CreateRequest    │
│         .builder().roomId(999L)...build();                      │
│                                                               │
│     assertThatThrownBy(() ->                                    │
│         contractService.create(req, ownerId))                   │
│         .isInstanceOf(NotFoundException.class)                  │
│         .hasMessageContaining("Khong tim thay phong");          │
│                                                               │
│     verify(contractRepo, never()).save(any());                  │
│ }                                                              │
│ ```                                                             │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### TC-CON-007: create_withOccupiedRoom_throwsBusinessException

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-007                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh ném BusinessException khi Room không AVAILABLE│
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - room.status: OCCUPIED                                        │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks: room.status = OCCUPIED                         │
│ 2. Call: contractService.create(request, ownerId)               │
│ 3. Assert: throws BusinessException                             │
│ 4. Assert: message contains "hien khong the tao hop dong"      │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### TC-CON-008: create_withOverlappingDates_throwsBusinessException

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-008                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh ném BusinessException khi có overlap dates  │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - request.startDate: 2026-08-01                                │
│ - request.endDate: 2026-12-31                                  │
│ - existing overlap: true                                       │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks: room.status = AVAILABLE                         │
│ 2. Setup mocks: contractRepo.existsOverlap → true              │
│ 3. Call: contractService.create(request, ownerId)               │
│ 4. Assert: throws BusinessException                             │
│ 5. Assert: message contains "da co hop dong trong khoang"      │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### TC-CON-009: create_withNonExistentTenant_throwsNotFoundException

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-009                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh ném NotFoundException khi Tenant không tồn │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - tenantId: 999L (không tồn tại)                               │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks: room.status = AVAILABLE                         │
│ 2. Setup mocks: overlap = false                                │
│ 3. Setup mocks: userService.findById(tenantId) → throw       │
│ 4. Call: contractService.create(request, ownerId)               │
│ 5. Assert: throws NotFoundException                             │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### TC-CON-010: terminate_withWrongOwner_throwsBusinessException

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-010                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh ném BusinessException khi Owner không đúng │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - contract.owner.id: 1L                                        │
│ - ownerId gọi: 999L (khác)                                    │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks: contract.owner.id = 1L                         │
│ 2. Call: contractService.terminate(contractId, 999L)            │
│ 3. Assert: throws BusinessException                             │
│ 4. Assert: message contains "Khong co quyen"                    │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.3 EDGE CASE TESTS

#### TC-CON-012: create_withSameStartAndEndDate_createsContract

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-012                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh có thể tạo HĐ với startDate = endDate     │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - startDate: 2026-07-17                                       │
│ - endDate: 2026-07-17 (cùng ngày)                            │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks (no overlap check)                              │
│ 2. Call: contractService.create(request, ownerId)               │
│ 3. Assert: contract.status == ACTIVE                            │
│ 4. Assert: duration = 0 days                                   │
├─────────────────────────────────────────────────────────────────┤
│ NOTE: Đây là edge case - có thể là bug nếu không cho phép     │
│ EXPECTED RESULT: ⚠️ CÓ THỂ FAIL nếu có validation            │
└─────────────────────────────────────────────────────────────────┘
```

#### TC-CON-013: create_withNullDeposit_createsContract

```
┌─────────────────────────────────────────────────────────────────┐
│ TC-ID: TC-CON-013                                               │
├─────────────────────────────────────────────────────────────────┤
│ OBJECTIVE: Xác minh tạo HĐ với deposit = null                │
├─────────────────────────────────────────────────────────────────┤
│ TEST DATA:                                                      │
│ - deposit: null                                                │
├─────────────────────────────────────────────────────────────────┤
│ TEST STEPS:                                                     │
│ 1. Setup mocks                                                  │
│ 2. Call: contractService.create(request, ownerId)               │
│ 3. Assert: contract.deposit == null                             │
├─────────────────────────────────────────────────────────────────┤
│ EXPECTED RESULT: ✅ PASS (hoặc field nullable)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. MOCK SETUP TỔNG HỢP

```java
@ExtendWith(MockitoExtension.class)
@DisplayName("ContractService Tests")
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
    private ContractDTO.CreateRequest createRequest;

    @BeforeEach
    void setUp() {
        // Build test data
        owner = User.builder()
            .id(1L)
            .email("owner@test.com")
            .role(UserRole.OWNER)
            .build();

        tenant = User.builder()
            .id(2L)
            .email("tenant@test.com")
            .role(UserRole.TENANT)
            .build();

        building = Building.builder()
            .id(1L)
            .name("Test Building")
            .owner(owner)
            .build();

        room = Room.builder()
            .id(1L)
            .roomNo("101")
            .building(building)
            .status(RoomStatus.AVAILABLE)
            .price(BigDecimal.valueOf(5000000))
            .build();

        contract = Contract.builder()
            .id(1L)
            .room(room)
            .tenant(tenant)
            .owner(owner)
            .startDate(LocalDate.now())
            .endDate(LocalDate.now().plusMonths(6))
            .deposit(BigDecimal.valueOf(10000000))
            .monthlyRent(BigDecimal.valueOf(5000000))
            .status(ContractStatus.ACTIVE)
            .build();

        createRequest = ContractDTO.CreateRequest.builder()
            .roomId(1L)
            .tenantId(2L)
            .startDate(LocalDate.now())
            .endDate(LocalDate.now().plusMonths(6))
            .deposit(BigDecimal.valueOf(10000000))
            .monthlyRent(BigDecimal.valueOf(5000000))
            .build();
    }

    // ========================================
    // HAPPY PATH TESTS
    // ========================================

    @Test
    @DisplayName("Should create contract successfully with valid data")
    void create_withValidData_returnsActiveContract() {
        // Arrange
        when(roomRepo.findById(1L)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(false);
        when(userService.findById(2L)).thenReturn(tenant);
        when(userService.findById(1L)).thenReturn(owner);
        when(contractRepo.save(any(Contract.class))).thenReturn(contract);

        // Act
        Contract result = contractService.create(createRequest, 1L);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(ContractStatus.ACTIVE);
        assertThat(result.getTenant()).isEqualTo(tenant);
        assertThat(result.getOwner()).isEqualTo(owner);

        // Verify
        verify(roomRepo).save(any(Room.class)); // Room status updated
        verify(auditService).log(anyLong(), any(), eq("CREATE"), eq("Contract"), any(), any());
    }

    @Test
    @DisplayName("Should use room price when monthlyRent is null")
    void create_withNullMonthlyRent_usesRoomPrice() {
        // Arrange
        createRequest.setMonthlyRent(null);
        when(roomRepo.findById(1L)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(false);
        when(userService.findById(2L)).thenReturn(tenant);
        when(userService.findById(1L)).thenReturn(owner);
        when(contractRepo.save(any(Contract.class))).thenAnswer(inv -> {
            Contract c = inv.getArgument(0);
            assertThat(c.getMonthlyRent()).isEqualByComparingTo(BigDecimal.valueOf(5000000));
            return c;
        });

        // Act
        contractService.create(createRequest, 1L);

        // Assert - verified in save() answer
    }

    @Test
    @DisplayName("Should create contract with RESERVED room status")
    void create_withRESERVEDRoom_createsContract() {
        // Arrange
        room.setStatus(RoomStatus.RESERVED);
        when(roomRepo.findById(1L)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(false);
        when(userService.findById(2L)).thenReturn(tenant);
        when(userService.findById(1L)).thenReturn(owner);
        when(contractRepo.save(any(Contract.class))).thenReturn(contract);

        // Act
        Contract result = contractService.create(createRequest, 1L);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(ContractStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should terminate contract and update room status to AVAILABLE")
    void terminate_withValidOwner_returnsTerminatedContract() {
        // Arrange
        when(contractRepo.findById(1L)).thenReturn(Optional.of(contract));
        when(contractRepo.save(any(Contract.class))).thenReturn(contract);
        when(roomRepo.save(any(Room.class))).thenReturn(room);

        // Act
        Contract result = contractService.terminate(1L, 1L);

        // Assert
        assertThat(result.getStatus()).isEqualTo(ContractStatus.TERMINATED);
        assertThat(result.getRoom().getStatus()).isEqualTo(RoomStatus.AVAILABLE);

        // Verify
        verify(roomRepo).save(any(Room.class));
    }

    @Test
    @DisplayName("Should renew contract with new end date")
    void renew_withValidData_returnsExtendedContract() {
        // Arrange
        LocalDate newEndDate = LocalDate.now().plusYears(1);
        when(contractRepo.findById(1L)).thenReturn(Optional.of(contract));
        when(contractRepo.save(any(Contract.class))).thenReturn(contract);

        // Act
        Contract result = contractService.renew(1L, newEndDate, 1L);

        // Assert
        assertThat(result.getEndDate()).isEqualTo(newEndDate);
        assertThat(result.getStatus()).isEqualTo(ContractStatus.EXTENDED);
    }

    // ========================================
    // EXCEPTION TESTS
    // ========================================

    @Test
    @DisplayName("Should throw NotFoundException when room not found")
    void create_withNonExistentRoom_throwsNotFoundException() {
        // Arrange
        when(roomRepo.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> contractService.create(
            ContractDTO.CreateRequest.builder().roomId(999L).build(), 1L))
            .isInstanceOf(NotFoundException.class)
            .hasMessageContaining("Khong tim thay phong");

        // Verify
        verify(contractRepo, never()).save(any());
    }

    @Test
    @DisplayName("Should throw BusinessException when room is OCCUPIED")
    void create_withOccupiedRoom_throwsBusinessException() {
        // Arrange
        room.setStatus(RoomStatus.OCCUPIED);
        when(roomRepo.findById(1L)).thenReturn(Optional.of(room));

        // Act & Assert
        assertThatThrownBy(() -> contractService.create(createRequest, 1L))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("hien khong the tao hop dong");

        verify(contractRepo, never()).save(any());
    }

    @Test
    @DisplayName("Should throw BusinessException when overlap dates exist")
    void create_withOverlappingDates_throwsBusinessException() {
        // Arrange
        when(roomRepo.findById(1L)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> contractService.create(createRequest, 1L))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("da co hop dong trong khoang");

        verify(contractRepo, never()).save(any());
    }

    @Test
    @DisplayName("Should throw NotFoundException when tenant not found")
    void create_withNonExistentTenant_throwsNotFoundException() {
        // Arrange
        when(roomRepo.findById(1L)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(false);
        when(userService.findById(999L)).thenThrow(new NotFoundException("Khong tim thay tenant"));

        createRequest.setTenantId(999L);

        // Act & Assert
        assertThatThrownBy(() -> contractService.create(createRequest, 1L))
            .isInstanceOf(NotFoundException.class)
            .hasMessageContaining("Khong tim thay tenant");
    }

    @Test
    @DisplayName("Should throw BusinessException when wrong owner terminates")
    void terminate_withWrongOwner_throwsBusinessException() {
        // Arrange
        when(contractRepo.findById(1L)).thenReturn(Optional.of(contract));

        // Act & Assert
        assertThatThrownBy(() -> contractService.terminate(1L, 999L))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Khong co quyen");
    }

    @Test
    @DisplayName("Should throw BusinessException when wrong owner renews")
    void renew_withWrongOwner_throwsBusinessException() {
        // Arrange
        when(contractRepo.findById(1L)).thenReturn(Optional.of(contract));

        // Act & Assert
        assertThatThrownBy(() -> contractService.renew(1L, LocalDate.now().plusYears(1), 999L))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Khong co quyen");
    }

    // ========================================
    // EDGE CASE TESTS
    // ========================================

    @Test
    @DisplayName("Should create contract when startDate equals endDate")
    void create_withSameStartAndEndDate_createsContract() {
        // Arrange
        createRequest.setStartDate(LocalDate.now());
        createRequest.setEndDate(LocalDate.now());
        when(roomRepo.findById(1L)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(false);
        when(userService.findById(2L)).thenReturn(tenant);
        when(userService.findById(1L)).thenReturn(owner);
        when(contractRepo.save(any(Contract.class))).thenReturn(contract);

        // Act
        Contract result = contractService.create(createRequest, 1L);

        // Assert
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("Should create contract with null deposit")
    void create_withNullDeposit_createsContract() {
        // Arrange
        createRequest.setDeposit(null);
        when(roomRepo.findById(1L)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(false);
        when(userService.findById(2L)).thenReturn(tenant);
        when(userService.findById(1L)).thenReturn(owner);
        when(contractRepo.save(any(Contract.class))).thenAnswer(inv -> {
            Contract c = inv.getArgument(0);
            assertThat(c.getDeposit()).isNull();
            return c;
        });

        // Act
        contractService.create(createRequest, 1L);

        // Assert - verified in save() answer
    }
}
```

---

## 4. COVERAGE TARGET

| Metric | Current | Target |
|--------|---------|--------|
| Line Coverage | - | ≥ 80% |
| Branch Coverage | - | ≥ 70% |
| Method Coverage | - | 100% |

---

## 5. EXECUTION SUMMARY

| Category | Count | Priority |
|----------|-------|----------|
| Happy Path | 5 | HIGH |
| Exception | 6 | HIGH |
| Edge Case | 3 | MEDIUM |
| Verification | 3 | HIGH |
| **Total** | **17** | |

**Next Steps:**
1. Tạo file test `src/test/java/com/rentalms/service/ContractServiceTest.java`
2. Copy code template vào file
3. Chạy `mvn test -Dtest=ContractServiceTest`
4. Đo coverage với JaCoCo
5. Fix any failures
