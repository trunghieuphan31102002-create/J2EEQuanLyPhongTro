package com.rentalms.service;

import com.rentalms.dto.ContractDTO;
import com.rentalms.entity.*;
import com.rentalms.enums.ContractStatus;
import com.rentalms.enums.RoomStatus;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.ContractRepository;
import com.rentalms.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContractServiceTest {

    @Mock
    private ContractRepository contractRepo;

    @Mock
    private RoomRepository roomRepo;

    @Mock
    private UserService userService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private ContractService contractService;

    private User tenant;
    private User owner;
    private Room room;
    private Building building;
    private Contract existingContract;

    private final Long ownerId = 10L;
    private final Long tenantId = 20L;
    private final Long roomId = 100L;
    private final Long contractId = 500L;

    /**
     * Helper: tạo CreateRequest bằng setter (vì class dùng @Data, không có @Builder).
     */
    private ContractDTO.CreateRequest buildCreateRequest(Long roomId, Long tenantId,
                                                          BigDecimal monthlyRent) {
        ContractDTO.CreateRequest req = new ContractDTO.CreateRequest();
        req.setRoomId(roomId);
        req.setTenantId(tenantId);
        req.setStartDate(LocalDate.now());
        req.setEndDate(LocalDate.now().plusMonths(12));
        req.setDeposit(BigDecimal.valueOf(5_000_000));
        req.setMonthlyRent(monthlyRent);
        req.setRentCycle("MONTHLY");
        req.setPolicy("No smoking");
        req.setLateFeePercent(0.05);
        return req;
    }

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(ownerId)
                .email("owner@test.com")
                .fullName("Test Owner")
                .role(com.rentalms.enums.UserRole.OWNER)
                .active(true)
                .build();

        tenant = User.builder()
                .id(tenantId)
                .email("tenant@test.com")
                .fullName("Test Tenant")
                .role(com.rentalms.enums.UserRole.TENANT)
                .active(true)
                .build();

        building = Building.builder()
                .id(1L)
                .name("Test Building")
                .owner(owner)
                .build();

        room = Room.builder()
                .id(roomId)
                .roomNo("101")
                .price(BigDecimal.valueOf(5_000_000))
                .status(RoomStatus.AVAILABLE)
                .building(building)
                .build();

        existingContract = Contract.builder()
                .id(contractId)
                .room(room)
                .tenant(tenant)
                .owner(owner)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(12))
                .monthlyRent(BigDecimal.valueOf(5_000_000))
                .deposit(BigDecimal.valueOf(5_000_000))
                .status(ContractStatus.ACTIVE)
                .build();
    }

    // ================================================================
    // NHÓM 1: create() - HAPPY PATH
    // ================================================================

    @Test
    @DisplayName("TC-CT-001: Tạo hợp đồng mới thành công với room AVAILABLE")
    void create_withAvailableRoom_success() {
        ContractDTO.CreateRequest req = buildCreateRequest(roomId, tenantId,
                BigDecimal.valueOf(5_000_000));

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(false);
        when(userService.findById(tenantId)).thenReturn(tenant);
        when(userService.findById(ownerId)).thenReturn(owner);
        when(contractRepo.save(any(Contract.class))).thenAnswer(inv -> {
            Contract c = inv.getArgument(0);
            c.setId(1L);
            return c;
        });

        Contract result = contractService.create(req, ownerId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(ContractStatus.ACTIVE);
        assertThat(result.getRoom()).isEqualTo(room);
        assertThat(result.getTenant()).isEqualTo(tenant);
        assertThat(result.getOwner()).isEqualTo(owner);
        assertThat(result.getMonthlyRent()).isEqualByComparingTo(BigDecimal.valueOf(5_000_000));

        verify(roomRepo).save(room);
        assertThat(room.getStatus()).isEqualTo(RoomStatus.OCCUPIED);
        verify(auditService).log(eq(ownerId), eq(owner.getEmail()), eq("CREATE"),
                eq("Contract"), eq(1L), anyString());
    }

    @Test
    @DisplayName("TC-CT-002: Tạo hợp đồng với room RESERVED vẫn thành công")
    void create_withReservedRoom_success() {
        room.setStatus(RoomStatus.RESERVED);
        ContractDTO.CreateRequest req = buildCreateRequest(roomId, tenantId,
                BigDecimal.valueOf(5_000_000));

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(false);
        when(userService.findById(tenantId)).thenReturn(tenant);
        when(userService.findById(ownerId)).thenReturn(owner);
        when(contractRepo.save(any(Contract.class))).thenAnswer(inv -> {
            Contract c = inv.getArgument(0);
            c.setId(2L);
            return c;
        });

        Contract result = contractService.create(req, ownerId);

        assertThat(result.getStatus()).isEqualTo(ContractStatus.ACTIVE);
    }

    @Test
    @DisplayName("TC-CT-003: monthlyRent=null → lấy price của room làm monthlyRent")
    void create_monthlyRentNull_useRoomPrice() {
        ContractDTO.CreateRequest req = buildCreateRequest(roomId, tenantId, null);

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(anyLong(), any(), any())).thenReturn(false);
        when(userService.findById(tenantId)).thenReturn(tenant);
        when(userService.findById(ownerId)).thenReturn(owner);
        when(contractRepo.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        Contract result = contractService.create(req, ownerId);

        assertThat(result.getMonthlyRent()).isEqualByComparingTo(room.getPrice());
    }

    // ================================================================
    // NHÓM 2: create() - EXCEPTION
    // ================================================================

    @Test
    @DisplayName("TC-CT-101: Room không tồn tại → NotFoundException")
    void create_roomNotFound_throwsNotFound() {
        ContractDTO.CreateRequest req = buildCreateRequest(roomId, tenantId,
                BigDecimal.valueOf(5_000_000));

        when(roomRepo.findById(roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractService.create(req, ownerId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Khong tim thay phong");

        verify(contractRepo, never()).save(any(Contract.class));
        verify(auditService, never()).log(anyLong(), anyString(), anyString(),
                anyString(), anyLong(), anyString());
    }

    @Test
    @DisplayName("TC-CT-102: Room OCCUPIED → BusinessException")
    void create_roomOccupied_throwsBusinessException() {
        room.setStatus(RoomStatus.OCCUPIED);
        ContractDTO.CreateRequest req = buildCreateRequest(roomId, tenantId,
                BigDecimal.valueOf(5_000_000));

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> contractService.create(req, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("khong the tao hop dong");

        verify(contractRepo, never()).save(any(Contract.class));
    }

    @Test
    @DisplayName("TC-CT-103: Room MAINTENANCE → BusinessException")
    void create_roomMaintenance_throwsBusinessException() {
        room.setStatus(RoomStatus.MAINTENANCE);
        ContractDTO.CreateRequest req = buildCreateRequest(roomId, tenantId,
                BigDecimal.valueOf(5_000_000));

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> contractService.create(req, ownerId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("TC-CT-104: Room HANDOVER → BusinessException")
    void create_roomHandover_throwsBusinessException() {
        room.setStatus(RoomStatus.HANDOVER);
        ContractDTO.CreateRequest req = buildCreateRequest(roomId, tenantId,
                BigDecimal.valueOf(5_000_000));

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> contractService.create(req, ownerId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("TC-CT-105: Phòng có hợp đồng overlap → BusinessException")
    void create_overlapExists_throwsBusinessException() {
        ContractDTO.CreateRequest req = buildCreateRequest(roomId, tenantId,
                BigDecimal.valueOf(5_000_000));

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(contractRepo.existsOverlap(roomId, req.getStartDate(), req.getEndDate()))
                .thenReturn(true);

        assertThatThrownBy(() -> contractService.create(req, ownerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("da co hop dong trong khoang thoi gian");

        verify(userService, never()).findById(tenantId);
        verify(contractRepo, never()).save(any(Contract.class));
    }

    // ================================================================
    // NHÓM 3: terminate()
    // ================================================================

    @Test
    @DisplayName("TC-CT-201: Terminate hợp đồng thành công")
    void terminate_withValidOwner_success() {
        when(contractRepo.findById(contractId)).thenReturn(Optional.of(existingContract));
        when(contractRepo.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        Contract result = contractService.terminate(contractId, ownerId);

        assertThat(result.getStatus()).isEqualTo(ContractStatus.TERMINATED);
        assertThat(result.getRoom().getStatus()).isEqualTo(RoomStatus.AVAILABLE);
        verify(roomRepo).save(room);
        verify(auditService).log(eq(ownerId), isNull(), eq("TERMINATE"),
                eq("Contract"), eq(contractId), anyString());
    }

    @Test
    @DisplayName("TC-CT-202: Terminate với owner khác → BusinessException")
    void terminate_wrongOwner_throwsBusinessException() {
        when(contractRepo.findById(contractId)).thenReturn(Optional.of(existingContract));

        Long anotherOwnerId = 99L;
        assertThatThrownBy(() -> contractService.terminate(contractId, anotherOwnerId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Khong co quyen");

        verify(contractRepo, never()).save(any(Contract.class));
        verify(auditService, never()).log(anyLong(), anyString(), anyString(),
                anyString(), anyLong(), anyString());
    }

    @Test
    @DisplayName("TC-CT-203: Terminate hợp đồng không tồn tại → NotFoundException")
    void terminate_contractNotFound_throwsNotFound() {
        when(contractRepo.findById(contractId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractService.terminate(contractId, ownerId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Khong tim thay hop dong");
    }

    // ================================================================
    // NHÓM 4: renew()
    // ================================================================

    @Test
    @DisplayName("TC-CT-301: Renew hợp đồng thành công")
    void renew_withValidOwner_success() {
        LocalDate newEndDate = LocalDate.now().plusMonths(24);
        when(contractRepo.findById(contractId)).thenReturn(Optional.of(existingContract));
        when(contractRepo.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        Contract result = contractService.renew(contractId, newEndDate, ownerId);

        assertThat(result.getEndDate()).isEqualTo(newEndDate);
        assertThat(result.getStatus()).isEqualTo(ContractStatus.EXTENDED);
        verify(auditService).log(eq(ownerId), isNull(), eq("RENEW"),
                eq("Contract"), eq(contractId), anyString());
    }

    @Test
    @DisplayName("TC-CT-302: Renew với owner khác → BusinessException")
    void renew_wrongOwner_throwsBusinessException() {
        LocalDate newEndDate = LocalDate.now().plusMonths(24);
        when(contractRepo.findById(contractId)).thenReturn(Optional.of(existingContract));

        assertThatThrownBy(() -> contractService.renew(contractId, newEndDate, 99L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Khong co quyen gia han");

        verify(contractRepo, never()).save(any(Contract.class));
    }

    @Test
    @DisplayName("TC-CT-303: Renew hợp đồng không tồn tại → NotFoundException")
    void renew_contractNotFound_throwsNotFound() {
        when(contractRepo.findById(contractId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractService.renew(contractId,
                LocalDate.now().plusMonths(24), ownerId))
                .isInstanceOf(NotFoundException.class);
    }

    // ================================================================
    // NHÓM 5: findById() và các getter
    // ================================================================

    @Test
    @DisplayName("TC-CT-401: findById tìm thấy → return contract")
    void findById_exists_returnsContract() {
        when(contractRepo.findById(contractId)).thenReturn(Optional.of(existingContract));

        Contract result = contractService.findById(contractId);

        assertThat(result).isEqualTo(existingContract);
    }

    @Test
    @DisplayName("TC-CT-402: findById không tìm thấy → NotFoundException")
    void findById_notExists_throwsNotFound() {
        when(contractRepo.findById(contractId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractService.findById(contractId))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Khong tim thay hop dong id: " + contractId);
    }

    @Test
    @DisplayName("TC-CT-403: getByOwner trả về danh sách hợp đồng")
    void getByOwner_returnsList() {
        when(contractRepo.findByOwnerId(ownerId)).thenReturn(List.of(existingContract));

        List<Contract> result = contractService.getByOwner(ownerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getOwner()).isEqualTo(owner);
    }

    @Test
    @DisplayName("TC-CT-404: getByTenant trả về danh sách hợp đồng")
    void getByTenant_returnsList() {
        when(contractRepo.findByTenantId(tenantId)).thenReturn(List.of(existingContract));

        List<Contract> result = contractService.getByTenant(tenantId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTenant()).isEqualTo(tenant);
    }

    @Test
    @DisplayName("TC-CT-405: getByManager trả về danh sách hợp đồng")
    void getByManager_returnsList() {
        Long managerId = 30L;
        when(contractRepo.findByAssignedManagerId(managerId)).thenReturn(List.of(existingContract));

        List<Contract> result = contractService.getByManager(managerId);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("TC-CT-406: toResponse chuyển đổi Contract sang DTO đầy đủ")
    void toResponse_convertsCorrectly() {
        ContractDTO.Response response = contractService.toResponse(existingContract);

        assertThat(response.getId()).isEqualTo(contractId);
        assertThat(response.getRoomId()).isEqualTo(roomId);
        assertThat(response.getRoomNo()).isEqualTo("101");
        assertThat(response.getBuildingName()).isEqualTo("Test Building");
        assertThat(response.getTenantId()).isEqualTo(tenantId);
        assertThat(response.getTenantName()).isEqualTo("Test Tenant");
        assertThat(response.getTenantEmail()).isEqualTo("tenant@test.com");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
    }
}
