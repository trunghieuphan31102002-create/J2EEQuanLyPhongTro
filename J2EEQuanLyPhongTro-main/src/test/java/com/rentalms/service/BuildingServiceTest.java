package com.rentalms.service;

import com.rentalms.dto.BuildingDTO;
import com.rentalms.entity.Building;
import com.rentalms.entity.Contract;
import com.rentalms.entity.Room;
import com.rentalms.entity.User;
import com.rentalms.enums.ContractStatus;
import com.rentalms.enums.RoomStatus;
import com.rentalms.enums.UserRole;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.BuildingRepository;
import com.rentalms.repository.ContractRepository;
import com.rentalms.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BuildingServiceTest {

    @Mock private BuildingRepository buildingRepo;
    @Mock private RoomRepository roomRepo;
    @Mock private ContractRepository contractRepo;
    @Mock private UserService userService;
    @Mock private AuditService auditService;
    @Mock private BuildingAccessService accessService;

    @InjectMocks
    private BuildingService buildingService;

    private User owner;
    private User manager;
    private User anotherOwner;
    private Building building;
    private Room room;

    private final Long ownerId = 10L;
    private final Long managerId = 11L;
    private final Long anotherOwnerId = 99L;
    private final Long buildingId = 1L;
    private final Long roomId = 100L;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(ownerId)
                .email("owner@test.com")
                .fullName("Test Owner")
                .role(UserRole.OWNER)
                .active(true)
                .build();

        anotherOwner = User.builder()
                .id(anotherOwnerId)
                .email("another@test.com")
                .fullName("Another Owner")
                .role(UserRole.OWNER)
                .active(true)
                .build();

        manager = User.builder()
                .id(managerId)
                .email("manager@test.com")
                .fullName("Test Manager")
                .role(UserRole.MANAGER)
                .active(true)
                .build();

        building = Building.builder()
                .id(buildingId)
                .name("Test Building")
                .address("123 Test Street")
                .description("Test description")
                .owner(owner)
                .publishStatus("PRIVATE")
                .electricityUnitPrice(new BigDecimal("3500"))
                .waterUnitPrice(new BigDecimal("20000"))
                .build();

        room = Room.builder()
                .id(roomId)
                .roomNo("A101")
                .building(building)
                .price(new BigDecimal("3000000"))
                .area(25.0)
                .beds(1)
                .status(RoomStatus.AVAILABLE)
                .build();
    }

    // ============================
    // SECTION 1: create()
    // ============================

    @Test
    @DisplayName("BLD-001: Tạo building thành công với publishStatus mặc định")
    void create_success_defaultStatus() {
        BuildingDTO.CreateRequest req = new BuildingDTO.CreateRequest();
        req.setName("New Building");
        req.setAddress("456 New Street");
        req.setDescription("Desc");
        req.setImageUrl("img.png");
        req.setLatitude(10.762622);
        req.setLongitude(106.660172);
        req.setShapeGeoJson("{}");
        // publishStatus = null -> mac dinh PRIVATE

        when(userService.findById(ownerId)).thenReturn(owner);
        when(buildingRepo.save(any(Building.class))).thenAnswer(inv -> {
            Building b = inv.getArgument(0);
            b.setId(buildingId);
            return b;
        });

        Building result = buildingService.create(req, ownerId);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("New Building");
        assertThat(result.getAddress()).isEqualTo("456 New Street");
        assertThat(result.getPublishStatus()).isEqualTo("PRIVATE");
        assertThat(result.getOwner()).isEqualTo(owner);
        verify(auditService).log(eq(ownerId), eq(owner.getEmail()), eq("CREATE"),
                eq("Building"), eq(buildingId), anyString());
    }

    @Test
    @DisplayName("BLD-002: Tạo building với publishStatus=PUBLIC")
    void create_success_publicStatus() {
        BuildingDTO.CreateRequest req = new BuildingDTO.CreateRequest();
        req.setName("Public Building");
        req.setAddress("789 Public Street");
        req.setPublishStatus("PUBLIC");

        when(userService.findById(ownerId)).thenReturn(owner);
        when(buildingRepo.save(any(Building.class))).thenAnswer(inv -> {
            Building b = inv.getArgument(0);
            b.setId(buildingId);
            return b;
        });

        Building result = buildingService.create(req, ownerId);

        assertThat(result.getPublishStatus()).isEqualTo("PUBLIC");
    }

    // ============================
    // SECTION 2: updateShape() / publish() / updateDetails()
    // ============================

    @Test
    @DisplayName("BLD-003: updateShape thành công")
    void updateShape_success() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(buildingRepo.save(any(Building.class))).thenReturn(building);

        Building result = buildingService.updateShape(buildingId, "{\"polygon\":[...]}", ownerId);

        assertThat(result.getShapeGeoJson()).contains("polygon");
        verify(auditService).log(eq(ownerId), isNull(), eq("UPDATE"),
                eq("Building"), eq(buildingId), anyString());
    }

    @Test
    @DisplayName("BLD-004: updateShape - không phải owner → exception")
    void updateShape_notOwner() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));

        assertThatThrownBy(() -> buildingService.updateShape(buildingId, "{}", anotherOwnerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("quyen");
    }

    @Test
    @DisplayName("BLD-005: publish thành công")
    void publish_success() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(buildingRepo.save(any(Building.class))).thenReturn(building);

        Building result = buildingService.publish(buildingId, "PUBLIC", ownerId);

        assertThat(result.getPublishStatus()).isEqualTo("PUBLIC");
    }

    @Test
    @DisplayName("BLD-006: updateDetails cập nhật 1 số fields")
    void updateDetails_partial() {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "Updated Name");
        body.put("latitude", 11.0);
        body.put("longitude", 22.0);
        // description absent -> giu nguyen

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(buildingRepo.save(any(Building.class))).thenReturn(building);

        Building result = buildingService.updateDetails(buildingId, body, ownerId);

        assertThat(result.getName()).isEqualTo("Updated Name");
        assertThat(result.getLatitude()).isEqualTo(11.0);
        assertThat(result.getLongitude()).isEqualTo(22.0);
    }

    @Test
    @DisplayName("BLD-007: updateDetails latitude null → bỏ qua")
    void updateDetails_nullLatitude() {
        Map<String, Object> body = new HashMap<>();
        body.put("latitude", null);
        body.put("name", "Only Name");

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(buildingRepo.save(any(Building.class))).thenReturn(building);

        Building result = buildingService.updateDetails(buildingId, body, ownerId);

        assertThat(result.getName()).isEqualTo("Only Name");
    }

    // ============================
    // SECTION 3: getByOwner() / getForActor()
    // ============================

    @Test
    @DisplayName("BLD-010: getByOwner trả về list buildings")
    void getByOwner_success() {
        when(buildingRepo.findByOwnerId(ownerId)).thenReturn(List.of(building));

        List<Building> result = buildingService.getByOwner(ownerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Test Building");
    }

    @Test
    @DisplayName("BLD-011: getForActor với role ADMIN → findAll")
    void getForActor_admin() {
        User admin = User.builder().id(1L).role(UserRole.ADMIN).build();
        when(buildingRepo.findAll()).thenReturn(List.of(building));

        List<Building> result = buildingService.getForActor(admin);

        assertThat(result).hasSize(1);
        verify(buildingRepo).findAll();
        verify(buildingRepo, never()).findByOwnerId(anyLong());
    }

    @Test
    @DisplayName("BLD-012: getForActor với role MANAGER → findByAssignedManagerId")
    void getForActor_manager() {
        User mgr = User.builder().id(managerId).role(UserRole.MANAGER).build();
        when(buildingRepo.findByAssignedManagerId(managerId)).thenReturn(List.of(building));

        List<Building> result = buildingService.getForActor(mgr);

        assertThat(result).hasSize(1);
        verify(buildingRepo).findByAssignedManagerId(managerId);
    }

    @Test
    @DisplayName("BLD-013: getForActor với role OWNER → findByOwnerId")
    void getForActor_owner() {
        when(buildingRepo.findByOwnerId(ownerId)).thenReturn(List.of(building));

        List<Building> result = buildingService.getForActor(owner);

        assertThat(result).hasSize(1);
        verify(buildingRepo).findByOwnerId(ownerId);
    }

    // ============================
    // SECTION 4: assignManager()
    // ============================

    @Test
    @DisplayName("BLD-020: assignManager thành công")
    void assignManager_success() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(userService.findById(managerId)).thenReturn(manager);
        when(buildingRepo.save(any(Building.class))).thenReturn(building);

        Building result = buildingService.assignManager(buildingId, managerId, ownerId);

        assertThat(result.getAssignedManager()).isEqualTo(manager);
        verify(auditService).log(eq(ownerId), isNull(), eq("ASSIGN_MANAGER"),
                eq("Building"), eq(buildingId), anyString());
    }

    @Test
    @DisplayName("BLD-021: assignManager(managerId=null) → bỏ manager")
    void assignManager_unassign() {
        building.setAssignedManager(manager);
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(buildingRepo.save(any(Building.class))).thenReturn(building);

        Building result = buildingService.assignManager(buildingId, null, ownerId);

        assertThat(result.getAssignedManager()).isNull();
        verify(auditService).log(eq(ownerId), isNull(), eq("UNASSIGN_MANAGER"),
                eq("Building"), eq(buildingId), anyString());
    }

    @Test
    @DisplayName("BLD-022: assignManager - user không phải MANAGER → exception")
    void assignManager_wrongRole() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(userService.findById(managerId)).thenReturn(owner); // role OWNER

        assertThatThrownBy(() -> buildingService.assignManager(buildingId, managerId, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("MANAGER");
    }

    // ============================
    // SECTION 5: findById() / getRooms() / getRoomsForActor()
    // ============================

    @Test
    @DisplayName("BLD-030: findById tìm thấy")
    void findById_success() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));

        Building result = buildingService.findById(buildingId);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(buildingId);
    }

    @Test
    @DisplayName("BLD-031: findById không tìm thấy → NotFoundException")
    void findById_notFound() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> buildingService.findById(buildingId))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("BLD-032: getRooms - owner hợp lệ")
    void getRooms_ownerValid() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findByBuildingId(buildingId)).thenReturn(List.of(room));

        List<Room> result = buildingService.getRooms(buildingId, ownerId);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("BLD-033: getRooms - không phải owner → exception")
    void getRooms_notOwner() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));

        assertThatThrownBy(() -> buildingService.getRooms(buildingId, anotherOwnerId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("BLD-034: getRoomsForActor - actor có quyền")
    void getRoomsForActor_allowed() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        doNothing().when(accessService).assertCanManage(any(), any());
        when(roomRepo.findByBuildingId(buildingId)).thenReturn(List.of(room));

        List<Room> result = buildingService.getRoomsForActor(buildingId, owner);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("BLD-035: getRoomsForActor - actor không có quyền")
    void getRoomsForActor_denied() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        doThrow(new BusinessException("Khong co quyen"))
                .when(accessService).assertCanManage(any(), any());

        assertThatThrownBy(() -> buildingService.getRoomsForActor(buildingId, anotherOwner))
                .isInstanceOf(BusinessException.class);
    }

    // ============================
    // SECTION 6: createRoom()
    // ============================

    @Test
    @DisplayName("BLD-040: createRoom thành công")
    void createRoom_success() {
        BuildingDTO.RoomCreateRequest req = new BuildingDTO.RoomCreateRequest();
        req.setRoomNo("A102");
        req.setPrice(new BigDecimal("3500000"));
        req.setArea(30.0);
        req.setBeds(2);
        req.setAmenities("Wifi, AC");
        req.setDescription("Nice room");

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.existsByBuildingIdAndRoomNo(buildingId, "A102")).thenReturn(false);
        when(roomRepo.save(any(Room.class))).thenAnswer(inv -> {
            Room r = inv.getArgument(0);
            r.setId(101L);
            return r;
        });

        Room result = buildingService.createRoom(buildingId, req, ownerId);

        assertThat(result.getRoomNo()).isEqualTo("A102");
        assertThat(result.getStatus()).isEqualTo(RoomStatus.AVAILABLE);
        assertThat(result.getBuilding()).isEqualTo(building);
    }

    @Test
    @DisplayName("BLD-041: createRoom - roomNo đã tồn tại → exception")
    void createRoom_duplicateRoomNo() {
        BuildingDTO.RoomCreateRequest req = new BuildingDTO.RoomCreateRequest();
        req.setRoomNo("A101");
        req.setPrice(new BigDecimal("3000000"));

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.existsByBuildingIdAndRoomNo(buildingId, "A101")).thenReturn(true);

        assertThatThrownBy(() -> buildingService.createRoom(buildingId, req, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("A101");
    }

    @Test
    @DisplayName("BLD-042: createRoom - không phải owner → exception")
    void createRoom_notOwner() {
        BuildingDTO.RoomCreateRequest req = new BuildingDTO.RoomCreateRequest();
        req.setRoomNo("A102");
        req.setPrice(new BigDecimal("3000000"));

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));

        assertThatThrownBy(() -> buildingService.createRoom(buildingId, req, anotherOwnerId))
                .isInstanceOf(BusinessException.class);
    }

    // ============================
    // SECTION 7: bulkCreateRooms()
    // ============================

    @Test
    @DisplayName("BLD-050: bulkCreateRooms thành công với pattern hợp lệ")
    void bulkCreateRooms_success() {
        BuildingDTO.BulkRoomRequest req = new BuildingDTO.BulkRoomRequest();
        req.setPattern("A-{i}");
        req.setCount(3);
        req.setStartIndex(1);
        req.setPrice(new BigDecimal("3000000"));
        req.setArea(25.0);
        req.setBeds(1);

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.existsByBuildingIdAndRoomNo(eq(buildingId), anyString())).thenReturn(false);
        when(roomRepo.save(any(Room.class))).thenAnswer(inv -> {
            Room r = inv.getArgument(0);
            r.setId((long) (Math.random() * 1000));
            return r;
        });

        List<Room> result = buildingService.bulkCreateRooms(buildingId, req, ownerId);

        assertThat(result).hasSize(3);
        ArgumentCaptor<String> roomNoCaptor = ArgumentCaptor.forClass(String.class);
        verify(roomRepo, times(3)).existsByBuildingIdAndRoomNo(eq(buildingId), roomNoCaptor.capture());
        assertThat(roomNoCaptor.getAllValues()).containsExactly("A-1", "A-2", "A-3");
    }

    @Test
    @DisplayName("BLD-051: bulkCreateRooms - trùng roomNo giữa batch → rollback all")
    void bulkCreateRooms_duplicateInBatch() {
        BuildingDTO.BulkRoomRequest req = new BuildingDTO.BulkRoomRequest();
        req.setPattern("Floor1"); // khong co {i} -> tat ca cung ten
        req.setCount(3);
        req.setPrice(new BigDecimal("3000000"));

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        lenient().when(roomRepo.existsByBuildingIdAndRoomNo(eq(buildingId), eq("Floor1")))
                .thenReturn(false)   // lan 1: ok
                .thenReturn(true);    // lan 2: trung

        assertThatThrownBy(() -> buildingService.bulkCreateRooms(buildingId, req, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Rollback");

        verify(roomRepo, never()).save(any(Room.class));
    }

    @Test
    @DisplayName("BLD-052: bulkCreateRooms - roomNo trùng với room đã tồn tại → rollback all")
    void bulkCreateRooms_duplicateExisting() {
        BuildingDTO.BulkRoomRequest req = new BuildingDTO.BulkRoomRequest();
        req.setPattern("A-{i}");
        req.setCount(3);
        req.setStartIndex(1);
        req.setPrice(new BigDecimal("3000000"));

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        // A-1 OK, A-2 trùng → rollback
        lenient().when(roomRepo.existsByBuildingIdAndRoomNo(eq(buildingId), eq("A-1"))).thenReturn(false);
        lenient().when(roomRepo.existsByBuildingIdAndRoomNo(eq(buildingId), eq("A-2"))).thenReturn(true);

        assertThatThrownBy(() -> buildingService.bulkCreateRooms(buildingId, req, ownerId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("BLD-053: bulkCreateRooms count=1 → tạo 1 phòng")
    void bulkCreateRooms_singleRoom() {
        BuildingDTO.BulkRoomRequest req = new BuildingDTO.BulkRoomRequest();
        req.setPattern("P-{i}");
        req.setCount(1);
        req.setStartIndex(100);
        req.setPrice(new BigDecimal("3000000"));

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.existsByBuildingIdAndRoomNo(eq(buildingId), eq("P-100"))).thenReturn(false);
        when(roomRepo.save(any(Room.class))).thenAnswer(inv -> inv.getArgument(0));

        List<Room> result = buildingService.bulkCreateRooms(buildingId, req, ownerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRoomNo()).isEqualTo("P-100");
    }

    // ============================
    // SECTION 8: updateRoom() / updateRoomMedia()
    // ============================

    @Test
    @DisplayName("BLD-060: updateRoom cập nhật tất cả fields")
    void updateRoom_success() {
        BuildingDTO.RoomCreateRequest req = new BuildingDTO.RoomCreateRequest();
        req.setRoomNo("A201");
        req.setPrice(new BigDecimal("4000000"));
        req.setArea(35.0);
        req.setBeds(2);
        req.setDescription("Updated");

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(roomRepo.existsByBuildingIdAndRoomNo(buildingId, "A201")).thenReturn(false);
        when(roomRepo.save(any(Room.class))).thenReturn(room);

        Room result = buildingService.updateRoom(buildingId, roomId, req, ownerId);

        assertThat(result.getRoomNo()).isEqualTo("A201");
        assertThat(result.getPrice()).isEqualByComparingTo(new BigDecimal("4000000"));
    }

    @Test
    @DisplayName("BLD-061: updateRoom - đổi roomNo trùng → exception")
    void updateRoom_duplicateRoomNo() {
        BuildingDTO.RoomCreateRequest req = new BuildingDTO.RoomCreateRequest();
        req.setRoomNo("A999");

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(roomRepo.existsByBuildingIdAndRoomNo(buildingId, "A999")).thenReturn(true);

        assertThatThrownBy(() -> buildingService.updateRoom(buildingId, roomId, req, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("A999");
    }

    @Test
    @DisplayName("BLD-062: updateRoom - roomNo không đổi → bỏ qua check trùng")
    void updateRoom_sameRoomNo() {
        BuildingDTO.RoomCreateRequest req = new BuildingDTO.RoomCreateRequest();
        req.setRoomNo("A101"); // giu nguyen
        req.setPrice(new BigDecimal("3500000"));

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(roomRepo.save(any(Room.class))).thenReturn(room);

        Room result = buildingService.updateRoom(buildingId, roomId, req, ownerId);

        assertThat(result.getPrice()).isEqualByComparingTo(new BigDecimal("3500000"));
        verify(roomRepo, never()).existsByBuildingIdAndRoomNo(anyLong(), anyString());
    }

    @Test
    @DisplayName("BLD-063: updateRoom - room không thuộc building → exception")
    void updateRoom_wrongBuilding() {
        Building anotherBuilding = Building.builder().id(999L).owner(owner).build();
        Room anotherRoom = Room.builder().id(500L).building(anotherBuilding).roomNo("B101").build();
        BuildingDTO.RoomCreateRequest req = new BuildingDTO.RoomCreateRequest();
        req.setRoomNo("B201");

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(500L)).thenReturn(Optional.of(anotherRoom));

        assertThatThrownBy(() -> buildingService.updateRoom(buildingId, 500L, req, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("khong thuoc");
    }

    @Test
    @DisplayName("BLD-064: updateRoom - roomId không tồn tại → NotFoundException")
    void updateRoom_roomNotFound() {
        BuildingDTO.RoomCreateRequest req = new BuildingDTO.RoomCreateRequest();
        req.setRoomNo("A301");

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> buildingService.updateRoom(buildingId, 999L, req, ownerId))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("BLD-065: updateRoomMedia - cập nhật cả imageUrl và videoUrl")
    void updateRoomMedia_success() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(roomRepo.save(any(Room.class))).thenReturn(room);

        Room result = buildingService.updateRoomMedia(buildingId, roomId, "img.jpg", "video.mp4", ownerId);

        assertThat(result.getImageUrl()).isEqualTo("img.jpg");
        assertThat(result.getVideoUrl()).isEqualTo("video.mp4");
        verify(auditService).log(eq(ownerId), isNull(), eq("UPDATE_MEDIA"),
                eq("Room"), eq(roomId), anyString());
    }

    @Test
    @DisplayName("BLD-066: updateRoomMedia - chỉ imageUrl (videoUrl null)")
    void updateRoomMedia_onlyImage() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(roomRepo.save(any(Room.class))).thenReturn(room);

        Room result = buildingService.updateRoomMedia(buildingId, roomId, "img.jpg", null, ownerId);

        assertThat(result.getImageUrl()).isEqualTo("img.jpg");
    }

    // ============================
    // SECTION 9: deleteRoom()
    // ============================

    @Test
    @DisplayName("BLD-070: deleteRoom thành công - không có HĐ")
    void deleteRoom_noContract() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.ACTIVE)).thenReturn(Optional.empty());
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.PENDING)).thenReturn(Optional.empty());

        buildingService.deleteRoom(buildingId, roomId, ownerId);

        verify(roomRepo).delete(room);
        verify(auditService).log(eq(ownerId), isNull(), eq("DELETE"),
                eq("Room"), eq(roomId), anyString());
    }

    @Test
    @DisplayName("BLD-071: deleteRoom - room có HĐ ACTIVE → exception")
    void deleteRoom_activeContract() {
        Contract contract = Contract.builder().id(1L).status(ContractStatus.ACTIVE).build();
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.ACTIVE))
                .thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> buildingService.deleteRoom(buildingId, roomId, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ACTIVE");

        verify(roomRepo, never()).delete(any(Room.class));
    }

    @Test
    @DisplayName("BLD-072: deleteRoom - room có HĐ PENDING → exception")
    void deleteRoom_pendingContract() {
        Contract contract = Contract.builder().id(1L).status(ContractStatus.PENDING).build();
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.ACTIVE)).thenReturn(Optional.empty());
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.PENDING))
                .thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> buildingService.deleteRoom(buildingId, roomId, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("PENDING");
    }

    @Test
    @DisplayName("BLD-073: deleteRoom - room không thuộc building → exception")
    void deleteRoom_wrongBuilding() {
        Building anotherBuilding = Building.builder().id(999L).owner(owner).build();
        Room anotherRoom = Room.builder().id(500L).building(anotherBuilding).build();

        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(500L)).thenReturn(Optional.of(anotherRoom));

        assertThatThrownBy(() -> buildingService.deleteRoom(buildingId, 500L, ownerId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("BLD-074: deleteRoom - roomId không tồn tại → NotFoundException")
    void deleteRoom_roomNotFound() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> buildingService.deleteRoom(buildingId, 999L, ownerId))
                .isInstanceOf(NotFoundException.class);
    }

    // ============================
    // SECTION 10: deleteBuilding()
    // ============================

    @Test
    @DisplayName("BLD-080: deleteBuilding thành công - không có phòng")
    void deleteBuilding_noRooms() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findByBuildingId(buildingId)).thenReturn(List.of());

        buildingService.deleteBuilding(buildingId, ownerId);

        verify(buildingRepo).delete(building);
        verify(auditService).log(eq(ownerId), isNull(), eq("DELETE"),
                eq("Building"), eq(buildingId), anyString());
    }

    @Test
    @DisplayName("BLD-081: deleteBuilding - có phòng nhưng không có HĐ → xóa được")
    void deleteBuilding_roomsWithoutContracts() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findByBuildingId(buildingId)).thenReturn(List.of(room));
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.ACTIVE)).thenReturn(Optional.empty());
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.PENDING)).thenReturn(Optional.empty());

        buildingService.deleteBuilding(buildingId, ownerId);

        verify(buildingRepo).delete(building);
    }

    @Test
    @DisplayName("BLD-082: deleteBuilding - có phòng với HĐ ACTIVE → exception")
    void deleteBuilding_roomHasActiveContract() {
        Contract contract = Contract.builder().id(1L).status(ContractStatus.ACTIVE).build();
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findByBuildingId(buildingId)).thenReturn(List.of(room));
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.ACTIVE))
                .thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> buildingService.deleteBuilding(buildingId, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining(room.getRoomNo());

        verify(buildingRepo, never()).delete(any(Building.class));
    }

    @Test
    @DisplayName("BLD-083: deleteBuilding - có phòng với HĐ PENDING → exception")
    void deleteBuilding_roomHasPendingContract() {
        Contract contract = Contract.builder().id(1L).status(ContractStatus.PENDING).build();
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));
        when(roomRepo.findByBuildingId(buildingId)).thenReturn(List.of(room));
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.ACTIVE)).thenReturn(Optional.empty());
        when(contractRepo.findByRoomIdAndStatus(roomId, ContractStatus.PENDING))
                .thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> buildingService.deleteBuilding(buildingId, ownerId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("BLD-084: deleteBuilding - không phải owner → exception")
    void deleteBuilding_notOwner() {
        when(buildingRepo.findById(buildingId)).thenReturn(Optional.of(building));

        assertThatThrownBy(() -> buildingService.deleteBuilding(buildingId, anotherOwnerId))
                .isInstanceOf(BusinessException.class);
    }
}
