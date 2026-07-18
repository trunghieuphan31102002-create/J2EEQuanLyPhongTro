package com.rentalms.service;

import com.rentalms.entity.MaintenanceRequest;
import com.rentalms.entity.Room;
import com.rentalms.entity.User;
import com.rentalms.enums.MaintenanceStatus;
import com.rentalms.enums.NotificationType;
import com.rentalms.enums.RoomStatus;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.ContractRepository;
import com.rentalms.repository.MaintenanceRequestRepository;
import com.rentalms.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MaintenanceService {

    private final MaintenanceRequestRepository mainRepo;
    private final RoomRepository roomRepo;
    private final ContractRepository contractRepo;
    private final UserService userService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final BuildingAccessService accessService;

    @Transactional
    public MaintenanceRequest create(Long roomId, String description,
                                      String priority, String imageUrl, Long tenantId) {
        Room room = roomRepo.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Khong tim thay phong"));
        User tenant = userService.findById(tenantId);

        MaintenanceRequest req = MaintenanceRequest.builder()
                .room(room)
                .tenant(tenant)
                .description(description)
                .priority(priority != null ? priority : "MEDIUM")
                .imageUrl(imageUrl)
                .status(MaintenanceStatus.NEW)
                .build();
        req = mainRepo.save(req);
        final Long reqId = req.getId();

        auditService.log(tenantId, tenant.getEmail(), "CREATE", "Maintenance", reqId,
                "Bao tri phong " + room.getRoomNo() + ": " + description);

        // Thong bao cho chu nha cua phong nay
        contractRepo.findByRoomIdAndStatus(roomId,
                com.rentalms.enums.ContractStatus.ACTIVE).ifPresent(contract -> {
            User owner = contract.getOwner();
            notificationService.notify(
                    owner,
                    NotificationType.MAINTENANCE_SUBMITTED,
                    "Yeu cau bao tri moi",
                    tenant.getFullName() + " gui yeu cau bao tri phong "
                            + room.getRoomNo() + ": " + description
                            + " (Muc uu tien: " + (priority != null ? priority : "MEDIUM") + ").",
                    "Maintenance", reqId
            );
        });

        return req;
    }

    @Transactional
    public MaintenanceRequest updateStatus(Long id, String status,
                                            String note, Double cost, Long actorId) {
        MaintenanceRequest req = mainRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Khong tim thay yeu cau bao tri"));

        // Kiem tra quyen: OWNER cua building hoac MANAGER duoc assign
        User actor = userService.findById(actorId);
        accessService.assertCanManage(req.getRoom().getBuilding(), actor);

        MaintenanceStatus newStatus = MaintenanceStatus.valueOf(status);
        req.setStatus(newStatus);
        req.setResolutionNote(note);
        req.setRepairCost(cost);

        if (status.equals("IN_PROGRESS")) {
            req.getRoom().setStatus(RoomStatus.MAINTENANCE);
            roomRepo.save(req.getRoom());
        } else if (status.equals("DONE")) {
            req.getRoom().setStatus(RoomStatus.OCCUPIED);
            roomRepo.save(req.getRoom());
        }

        auditService.log(actorId, null, "UPDATE", "Maintenance", id,
                "Cap nhat trang thai: " + status);

        MaintenanceRequest saved = mainRepo.save(req);

        // Thong bao cho tenant ve viec cap nhat trang thai
        String statusLabel = switch (newStatus) {
            case IN_PROGRESS -> "Dang xu ly";
            case DONE -> "Da hoan thanh";
            case CANCELLED -> "Da huy";
            default -> status;
        };
        String message = "Yeu cau bao tri phong " + req.getRoom().getRoomNo()
                + " cua ban da duoc cap nhat trang thai: " + statusLabel + ".";
        if (note != null && !note.isBlank()) {
            message += " Ghi chu: " + note;
        }
        if (cost != null && cost > 0) {
            message += " Chi phi sua chua: " + cost + " VND.";
        }

        notificationService.notify(
                req.getTenant(),
                NotificationType.MAINTENANCE_STATUS_UPDATED,
                "Cap nhat yeu cau bao tri",
                message,
                "Maintenance", id
        );

        return saved;
    }

    public List<MaintenanceRequest> getByBuilding(Long buildingId, Long actorId) {
        User actor = userService.findById(actorId);
        Room room = roomRepo.findByBuildingId(buildingId).stream().findFirst().orElse(null);
        // Neu building co phong, kiem tra quyen qua building cua phong. Neu building khong co phong,
        // chung ta van can check — lay building qua query room hoac bypass: dung building lookup truc tiep.
        // Don gian nhat: chap nhan rang neu khong co room thi tra ve list rong.
        if (room != null) {
            accessService.assertCanManage(room.getBuilding(), actor);
        }
        return mainRepo.findByRoomBuildingId(buildingId);
    }

    public List<MaintenanceRequest> getByManager(Long managerId) {
        return mainRepo.findByRoomBuildingAssignedManagerId(managerId);
    }

    public List<MaintenanceRequest> getByTenant(Long tenantId) {
        return mainRepo.findByTenantId(tenantId);
    }
}
