# PHÂN TÍCH MÃ NGUỒN - BUILDING SERVICE
## Dự án J2EE Quản Lý Phòng Trọ (RentalMS)

---

## 1. THÔNG TIN TỔNG QUAN

| Thông tin | Chi tiết |
|-----------|----------|
| **File** | `src/main/java/com/rentalms/service/BuildingService.java` |
| **Class** | `BuildingService` |
| **Annotations** | `@Service`, `@RequiredArgsConstructor` |
| **Dependencies** | BuildingRepository, RoomRepository, ContractRepository, UserService, AuditService, BuildingAccessService |
| **Số Methods** | 15 methods chính |

---

## 2. CÁC METHOD VÀ LOGIC CHI TIẾT

### 2.1 Building Management Methods

#### Method: `create()`
```java
@Transactional
public Building create(BuildingDTO.CreateRequest req, Long ownerId)
```

**Logic Flow:**
```
1. Tìm owner: userService.findById(ownerId)
2. Tạo Building với:
   - name, address, description, imageUrl
   - latitude, longitude, shapeGeoJson
   - publishStatus = req.getPublishStatus() ?? "PRIVATE"
   - owner = found owner
3. Save to DB
4. Audit log
5. Return building
```

**Test Cases:**
- ✅ Tạo building thành công
- ✅ Verify owner được set đúng

---

#### Method: `assignManager()`
```java
@Transactional
public Building assignManager(Long buildingId, Long managerId, Long ownerId)
```

**Logic Flow:**
```
1. findAndVerifyOwner(buildingId, ownerId)
2. IF managerId == null:
   - Xóa assignedManager
3. ELSE:
   - Tìm manager: userService.findById(managerId)
   - Kiểm tra role == MANAGER
   - Gán manager vào building
4. Save và audit log
```

**Test Cases:**
- ✅ Gán manager thành công
- ✅ Bỏ gán manager (managerId = null)
- ✅ Exception: User không phải MANAGER role

---

#### Method: `deleteBuilding()`
```java
@Transactional
public void deleteBuilding(Long buildingId, Long ownerId)
```

**Logic Flow:**
```
1. findAndVerifyOwner(buildingId, ownerId)
2. Lấy tất cả rooms của building
3. Với mỗi room:
   - Kiểm tra có contract ACTIVE/PENDING không
   - Nếu có → throw BusinessException
4. Xóa building
5. Audit log
```

**Đặc điểm quan trọng:**
- Chỉ xóa được nếu KHÔNG có phòng nào đang có hợp đồng ACTIVE/PENDING
- Cascade delete các rooms

**Test Cases:**
- ✅ Xóa building thành công (không có phòng)
- ✅ Xóa building thành công (có phòng nhưng không có HĐ)
- ✅ Exception: Có phòng đang có HĐ ACTIVE
- ✅ Exception: Có phòng đang có HĐ PENDING
- ✅ Exception: Không có quyền

---

### 2.2 Room Management Methods

#### Method: `createRoom()`
```java
@Transactional
public Room createRoom(Long buildingId, BuildingDTO.RoomCreateRequest req, Long ownerId)
```

**Logic Flow:**
```
1. findAndVerifyOwner(buildingId, ownerId)
2. Kiểm tra roomNo chưa tồn tại:
   - roomRepo.existsByBuildingIdAndRoomNo(buildingId, roomNo)
   - Nếu tồn tại → throw BusinessException
3. Tạo Room với:
   - building, roomNo, price, area, beds
   - amenities, description, imageUrl, videoUrl
   - status = RoomStatus.AVAILABLE
4. Save và audit log
```

**Test Cases:**
- ✅ Tạo room thành công
- ✅ Exception: roomNo đã tồn tại
- ✅ Exception: Không có quyền

---

#### Method: `bulkCreateRooms()`
```java
@Transactional
public List<Room> bulkCreateRooms(Long buildingId, BuildingDTO.BulkRoomRequest req, Long ownerId)
```

**Logic Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│ Bước 1: VALIDATE TẤT CẢ TRƯỚC KHI TẠO (Pre-validation) │
│ Với mỗi i từ startIndex đến startIndex + count - 1:      │
│   - Tạo roomNo = pattern.replace("{i}", i)               │
│   - Kiểm tra roomNo đã tồn tại chưa                      │
│   - Nếu tồn tại → throw BusinessException (và ROLLBACK)  │
│   - Nếu không → thêm vào danh sách                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 2: TẠO TẤT CẢ CÁC PHÒNG                           │
│ Với mỗi roomNo trong danh sách:                          │
│   - Tạo Room object                                      │
│   - Save vào DB                                          │
│   - Thêm vào danh sách kết quả                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Return List<Room>│
                    └───────────────┘
```

**Đặc điểm quan trọng:**
- **Pre-validation:** Kiểm tra TẤT CẢ roomNos trước khi tạo
- **Rollback all:** Nếu bất kỳ roomNo nào trùng → throw exception và KHÔNG tạo gì cả
- Ví dụ pattern: `"Phòng {i}"` → "Phòng 101", "Phòng 102", ...

**Test Cases:**
- ✅ Bulk create 10 phòng thành công
- ✅ Bulk create với pattern hợp lệ
- ✅ Exception: roomNo trùng ngay lần đầu → rollback all
- ✅ Exception: roomNo trùng ở giữa → rollback all
- ✅ Verify: Tất cả rooms đều AVAILABLE

---

#### Method: `deleteRoom()`
```java
@Transactional
public void deleteRoom(Long buildingId, Long roomId, Long ownerId)
```

**Logic Flow:**
```
1. findAndVerifyOwner(buildingId, ownerId)
2. Tìm room theo roomId
3. Kiểm tra room thuộc building này
4. Kiểm tra contract ACTIVE hoặc PENDING:
   - Nếu có → throw BusinessException
5. Xóa room
6. Audit log
```

**Test Cases:**
- ✅ Xóa room thành công (không có HĐ)
- ✅ Exception: Room không tồn tại
- ✅ Exception: Room không thuộc building này
- ✅ Exception: Room có HĐ ACTIVE
- ✅ Exception: Room có HĐ PENDING

---

#### Method: `updateRoom()`
```java
@Transactional
public Room updateRoom(Long buildingId, Long roomId, BuildingDTO.RoomCreateRequest req, Long ownerId)
```

**Logic Flow:**
```
1. findAndVerifyOwner(buildingId, ownerId)
2. Tìm room và kiểm tra thuộc building
3. Nếu đổi roomNo:
   - Kiểm tra roomNo mới chưa tồn tại
   - Nếu tồn tại → exception
   - Nếu không → cập nhật roomNo
4. Cập nhật các fields nếu có giá trị:
   - price, area, beds, amenities, description
   - imageUrl, videoUrl
5. Save và audit log
```

**Đặc điểm:**
- Partial update: Chỉ cập nhật fields có giá trị (not null)
- Không cho phép trùng roomNo trong cùng building

**Test Cases:**
- ✅ Update tất cả fields thành công
- ✅ Update chỉ một số fields
- ✅ Update roomNo thành công
- ✅ Exception: roomNo mới đã tồn tại
- ✅ Exception: Không có quyền

---

## 3. EDGE CASES VÀ BOUNDARY ANALYSIS

### 3.1 Edge Cases cho `bulkCreateRooms()`

| # | Edge Case | Input | Expected |
|---|-----------|-------|----------|
| 1 | Bulk create 100 phòng | count=100 | Tất cả tạo thành công |
| 2 | Pattern với số 0 | "P{i}" → P0, P1 | Hoạt động đúng |
| 3 | Pattern không có {i} | "Floor1" | Tất cả cùng tên → exception ở lần 2 |
| 4 | startIndex lớn | startIndex=1000, count=5 | Tạo P1000, P1001... |
| 5 | count = 1 | 1 phòng | Tạo thành công |

### 3.2 Edge Cases cho `updateRoom()`

| # | Edge Case | Input | Expected |
|---|-----------|-------|----------|
| 1 | Đổi roomNo trùng | RoomNo mới = RoomNo của phòng khác | Exception |
| 2 | Giữ nguyên roomNo | RoomNo mới = roomNo cũ | Không kiểm tra trùng |
| 3 | Update tất cả null | Tất cả fields null | Không thay đổi gì |
| 4 | roomNo null | roomNo = null | Giữ nguyên |

### 3.3 Potential Bugs

```
⚠️ BUG 1: bulkCreateRooms() - Pre-validation không có transaction
   - Nếu pre-validation pass nhưng save fail → dữ liệu không nhất quán
   - NÊN: Thêm @Transactional cho method

⚠️ BUG 2: deleteRoom() - Không kiểm tra HĐ đã TERMINATED
   - Chỉ kiểm tra ACTIVE và PENDING
   - HĐ đã kết thúc thì không vấn đề gì (OK)
```

---

## 4. TEST CASES ĐỀ XUẤT

### 4.1 Building Tests

| TC_ID | Test Name | Mô tả |
|-------|-----------|--------|
| BLD-001 | create_building_success | Tạo building thành công |
| BLD-002 | assignManager_success | Gán manager thành công |
| BLD-003 | assignManager_unassign | Bỏ gán manager |
| BLD-004 | assignManager_wrongRole | Exception: user không phải MANAGER |
| BLD-005 | deleteBuilding_noContracts | Xóa thành công |
| BLD-006 | deleteBuilding_hasActiveContract | Exception: có HĐ ACTIVE |
| BLD-007 | deleteBuilding_hasPendingContract | Exception: có HĐ PENDING |

### 4.2 Room Tests

| TC_ID | Test Name | Mô tả |
|-------|-----------|--------|
| ROOM-001 | createRoom_success | Tạo room thành công |
| ROOM-002 | createRoom_duplicateRoomNo | Exception: roomNo trùng |
| ROOM-003 | bulkCreate_success | Bulk create 10 phòng |
| ROOM-004 | bulkCreate_duplicateInBatch | Exception: trùng trong batch → rollback all |
| ROOM-005 | bulkCreate_duplicateExisting | Exception: trùng room hiện có → rollback all |
| ROOM-006 | updateRoom_success | Update thành công |
| ROOM-007 | updateRoom_changeRoomNo | Đổi roomNo thành công |
| ROOM-008 | updateRoom_duplicateRoomNo | Exception: roomNo mới trùng |
| ROOM-009 | deleteRoom_noContract | Xóa thành công |
| ROOM-010 | deleteRoom_hasActiveContract | Exception: có HĐ ACTIVE |
| ROOM-011 | deleteRoom_hasPendingContract | Exception: có HĐ PENDING |

---

## 5. ASSERTION PATTERNS

```java
// Assert Building created
assertThat(result).isNotNull();
assertThat(result.getOwner()).isEqualTo(owner);
assertThat(result.getPublishStatus()).isEqualTo("PRIVATE");

// Assert Room created with correct status
assertThat(room.getStatus()).isEqualTo(RoomStatus.AVAILABLE);
assertThat(room.getBuilding()).isEqualTo(building);

// Assert Bulk create count
assertThat(result).hasSize(10);

// Assert Exception thrown
assertThatThrownBy(() -> service.deleteBuilding(id, ownerId))
    .isInstanceOf(BusinessException.class)
    .hasMessageContaining("hop dong ACTIVE");

// Assert Audit log called
verify(auditService).log(eq(ownerId), any(), eq("CREATE"), eq("Building"), any(), any());
```

---

## 6. SUMMARY

### 6.1 Số lượng Test Cases

| Module | Happy | Exception | Edge | Tổng |
|--------|-------|-----------|------|-------|
| Building | 2 | 3 | 0 | 5 |
| Room | 4 | 5 | 2 | 11 |
| **Tổng** | **6** | **8** | **2** | **16** |

### 6.2 Coverage Target

| Metric | Target |
|--------|--------|
| Line Coverage | ≥ 75% |
| Method Coverage | 100% |
