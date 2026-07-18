package com.rentalms.service;

import com.rentalms.dto.ContractDTO;
import com.rentalms.dto.RentalRequestDTO;
import com.rentalms.entity.RentalRequest;
import com.rentalms.entity.Room;
import com.rentalms.entity.User;
import com.rentalms.enums.NotificationType;
import com.rentalms.enums.RentalRequestStatus;
import com.rentalms.enums.RoomStatus;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.RentalRequestRepository;
import com.rentalms.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RentalRequestService {

    private final RentalRequestRepository rentalRequestRepo;
    private final RoomRepository roomRepo;
    private final UserService userService;
    private final ContractService contractService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional
    public RentalRequestDTO.Response apply(RentalRequestDTO.CreateRequest req, Long tenantId) {
        Room room = roomRepo.findById(req.getRoomId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng"));

        if (room.getStatus() != RoomStatus.AVAILABLE) {
            throw new BusinessException("Phòng hiện không có sẵn để đăng ký thuê");
        }

        if (rentalRequestRepo.existsByRoomIdAndTenantIdAndStatus(
                req.getRoomId(), tenantId, RentalRequestStatus.PENDING)) {
            throw new BusinessException("Bạn đã gửi yêu cầu thuê phòng này rồi, vui lòng chờ chủ nhà duyệt");
        }

        if (req.getStartDate() == null || req.getEndDate() == null
                || !req.getEndDate().isAfter(req.getStartDate())) {
            throw new BusinessException("Ngày bắt đầu và kết thúc không hợp lệ");
        }

        // Phải thuê tối thiểu 1 tháng
        if (req.getEndDate().isBefore(req.getStartDate().plusMonths(1))) {
            throw new BusinessException("Thời gian thuê tối thiểu là 1 tháng");
        }

        User tenant = userService.findById(tenantId);

        // Yêu cầu xác thực CCCD (eKYC) trước khi thuê phòng
        if (tenant.getCccdNumber() == null || tenant.getCccdNumber().isBlank()) {
            throw new BusinessException(
                    "Bạn cần xác thực CCCD trước khi thuê phòng. Vui lòng vào Hồ sơ → Xác thực CCCD tự động (eKYC).");
        }

        RentalRequest request = RentalRequest.builder()
                .room(room)
                .tenant(tenant)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .note(req.getNote())
                .build();

        request = rentalRequestRepo.save(request);
        auditService.log(tenantId, tenant.getEmail(), "CREATE", "RentalRequest", request.getId(),
                "Yêu cầu thuê phòng: " + room.getRoomNo());

        // Thông báo cho chủ nhà
        try {
            notificationService.notify(
                    room.getBuilding().getOwner(),
                    NotificationType.RENTAL_REQUEST_SUBMITTED,
                    "Yêu cầu thuê phòng mới",
                    tenant.getFullName() + " vừa gửi yêu cầu thuê phòng "
                            + room.getRoomNo() + " – " + room.getBuilding().getName(),
                    "RentalRequest", request.getId());
        } catch (Exception e) {
            log.warn("Could not send RENTAL_REQUEST_SUBMITTED notification: {}", e.getMessage());
        }

        return toResponse(request);
    }

    @Transactional
    public RentalRequestDTO.Response approve(Long requestId, Long ownerId) {
        RentalRequest request = findById(requestId);

        if (!request.getRoom().getBuilding().getOwner().getId().equals(ownerId)) {
            throw new BusinessException("Bạn không có quyền duyệt yêu cầu này");
        }

        if (request.getStatus() != RentalRequestStatus.PENDING) {
            throw new BusinessException("Yêu cầu đã được xử lý");
        }

        ContractDTO.CreateRequest contractReq = new ContractDTO.CreateRequest();
        contractReq.setRoomId(request.getRoom().getId());
        contractReq.setTenantId(request.getTenant().getId());
        contractReq.setStartDate(request.getStartDate());
        contractReq.setEndDate(request.getEndDate());
        contractReq.setMonthlyRent(request.getRoom().getPrice());
        contractService.create(contractReq, ownerId);

        // Reject other pending requests for this room
        List<RentalRequest> others = rentalRequestRepo.findByRoomId(request.getRoom().getId());
        for (RentalRequest other : others) {
            if (!other.getId().equals(requestId) && other.getStatus() == RentalRequestStatus.PENDING) {
                other.setStatus(RentalRequestStatus.REJECTED);
                rentalRequestRepo.save(other);
                // Thông báo từ chối cho các tenant khác
                try {
                    notificationService.notify(
                            other.getTenant(),
                            NotificationType.RENTAL_REQUEST_REJECTED,
                            "Yêu cầu thuê phòng không được chấp nhận",
                            "Yêu cầu thuê phòng " + other.getRoom().getRoomNo()
                                    + " – " + other.getRoom().getBuilding().getName()
                                    + " đã bị từ chối vì phòng đã có người thuê.",
                            "RentalRequest", other.getId());
                } catch (Exception e) {
                    log.warn("Could not send rejection notification to tenant {}: {}", other.getTenant().getId(), e.getMessage());
                }
            }
        }

        request.setStatus(RentalRequestStatus.APPROVED);
        request = rentalRequestRepo.save(request);
        auditService.log(ownerId, null, "APPROVE", "RentalRequest", requestId,
                "Duyệt yêu cầu thuê phòng " + request.getRoom().getRoomNo());

        // Thông báo duyệt cho tenant
        try {
            notificationService.notify(
                    request.getTenant(),
                    NotificationType.RENTAL_REQUEST_APPROVED,
                    "Yeu cau thue phong duoc duyet!",
                    "Chuc mung! Yeu cau thue phong " + request.getRoom().getRoomNo()
                            + " - " + request.getRoom().getBuilding().getName()
                            + " da duoc chap thuan. Hop dong da duoc tao.",
                    "RentalRequest", request.getId());
        } catch (Exception e) {
            log.warn("Could not send RENTAL_REQUEST_APPROVED notification: {}", e.getMessage());
        }

        return toResponse(request);
    }

    @Transactional
    public RentalRequestDTO.Response reject(Long requestId, Long ownerId) {
        RentalRequest request = findById(requestId);

        if (!request.getRoom().getBuilding().getOwner().getId().equals(ownerId)) {
            throw new BusinessException("Bạn không có quyền từ chối yêu cầu này");
        }

        if (request.getStatus() != RentalRequestStatus.PENDING) {
            throw new BusinessException("Yêu cầu đã được xử lý");
        }

        request.setStatus(RentalRequestStatus.REJECTED);
        request = rentalRequestRepo.save(request);
        auditService.log(ownerId, null, "REJECT", "RentalRequest", requestId,
                "Từ chối yêu cầu thuê phòng " + request.getRoom().getRoomNo());

        // Thông báo cho tenant
        try {
            notificationService.notify(
                    request.getTenant(),
                    NotificationType.RENTAL_REQUEST_REJECTED,
                    "Yeu cau thue phong bi tu choi",
                    "Yeu cau thue phong " + request.getRoom().getRoomNo()
                            + " - " + request.getRoom().getBuilding().getName()
                            + " da bi tu choi boi chu nha.",
                    "RentalRequest", request.getId());
        } catch (Exception e) {
            log.warn("Could not send RENTAL_REQUEST_REJECTED notification: {}", e.getMessage());
        }

        return toResponse(request);
    }

    @Transactional(readOnly = true)
    public List<RentalRequestDTO.Response> getByTenant(Long tenantId) {
        return rentalRequestRepo.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RentalRequestDTO.Response> getByOwner(Long ownerId) {
        return rentalRequestRepo.findByOwnerId(ownerId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private RentalRequest findById(Long id) {
        return rentalRequestRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu thuê id: " + id));
    }

    private RentalRequestDTO.Response toResponse(RentalRequest r) {
        return RentalRequestDTO.Response.builder()
                .id(r.getId())
                .roomId(r.getRoom().getId())
                .roomNo(r.getRoom().getRoomNo())
                .buildingName(r.getRoom().getBuilding().getName())
                .tenantId(r.getTenant().getId())
                .tenantName(r.getTenant().getFullName())
                .tenantEmail(r.getTenant().getEmail())
                .startDate(r.getStartDate())
                .endDate(r.getEndDate())
                .note(r.getNote())
                .status(r.getStatus().name())
                .monthlyRent(r.getRoom().getPrice())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
