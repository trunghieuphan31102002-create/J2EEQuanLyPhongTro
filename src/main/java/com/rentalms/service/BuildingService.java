package com.rentalms.service;

import com.rentalms.dto.BuildingDTO;
import com.rentalms.entity.Building;
import com.rentalms.entity.Room;
import com.rentalms.entity.User;
import com.rentalms.enums.RoomStatus;
import com.rentalms.enums.UserRole;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.BuildingRepository;
import com.rentalms.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BuildingService {

    private final BuildingRepository buildingRepo;
    private final RoomRepository roomRepo;
    private final UserService userService;
    private final AuditService auditService;
    private final BuildingAccessService accessService;

    @Transactional
    public Building create(BuildingDTO.CreateRequest req, Long ownerId) {
        User owner = userService.findById(ownerId);
        Building b = Building.builder()
                .name(req.getName())
                .address(req.getAddress())
                .description(req.getDescription())
                .shapeGeoJson(req.getShapeGeoJson())
                .publishStatus(req.getPublishStatus() != null ? req.getPublishStatus() : "PRIVATE")
                .owner(owner)
                .build();
        b = buildingRepo.save(b);
        auditService.log(ownerId, owner.getEmail(), "CREATE", "Building", b.getId(),
                "Tao khu tro: " + b.getName());
        return b;
    }

    @Transactional
    public Building updateShape(Long buildingId, String geoJson, Long ownerId) {
        Building b = findAndVerifyOwner(buildingId, ownerId);
        b.setShapeGeoJson(geoJson);
        auditService.log(ownerId, null, "UPDATE", "Building", buildingId, "Cap nhat polygon map");
        return buildingRepo.save(b);
    }

    @Transactional
    public Building publish(Long buildingId, String status, Long ownerId) {
        Building b = findAndVerifyOwner(buildingId, ownerId);
        b.setPublishStatus(status);
        auditService.log(ownerId, null, "UPDATE", "Building", buildingId,
                "Chuyen trang thai: " + status);
        return buildingRepo.save(b);
    }

    public List<Building> getByOwner(Long ownerId) {
        return buildingRepo.findByOwnerId(ownerId);
    }

    /**
     * Lay danh sach building ma user hien tai co the quan ly, dua tren role:
     *  - ADMIN: tat ca
     *  - OWNER: cac building do user so huu
     *  - MANAGER: cac building do user duoc assign
     */
    public List<Building> getForActor(User actor) {
        if (actor.getRole() == UserRole.ADMIN) {
            return buildingRepo.findAll();
        }
        if (actor.getRole() == UserRole.MANAGER) {
            return buildingRepo.findByAssignedManagerId(actor.getId());
        }
        return buildingRepo.findByOwnerId(actor.getId());
    }

    /**
     * OWNER/ADMIN gan (hoac bo) manager cho building.
     * managerId = null -> go manager hien tai.
     */
    @Transactional
    public Building assignManager(Long buildingId, Long managerId, Long ownerId) {
        Building b = findAndVerifyOwner(buildingId, ownerId);
        if (managerId == null) {
            b.setAssignedManager(null);
            auditService.log(ownerId, null, "UNASSIGN_MANAGER", "Building", buildingId,
                    "Bo manager khoi khu tro");
        } else {
            User manager = userService.findById(managerId);
            if (manager.getRole() != UserRole.MANAGER) {
                throw new BusinessException("User id " + managerId + " khong phai role MANAGER");
            }
            b.setAssignedManager(manager);
            auditService.log(ownerId, null, "ASSIGN_MANAGER", "Building", buildingId,
                    "Gan manager " + manager.getEmail() + " cho khu tro " + b.getName());
        }
        return buildingRepo.save(b);
    }

    public Building findById(Long id) {
        return buildingRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Khong tim thay building id: " + id));
    }

    // === ROOM trong Building ===

    public List<Room> getRooms(Long buildingId, Long ownerId) {
        findAndVerifyOwner(buildingId, ownerId);
        return roomRepo.findByBuildingId(buildingId);
    }

    /**
     * Lay danh sach phong cho actor (OWNER/MANAGER/ADMIN) - co kiem tra quyen theo role.
     */
    public List<Room> getRoomsForActor(Long buildingId, User actor) {
        Building b = findById(buildingId);
        accessService.assertCanManage(b, actor);
        return roomRepo.findByBuildingId(buildingId);
    }

    @Transactional
    public Room createRoom(Long buildingId, BuildingDTO.RoomCreateRequest req, Long ownerId) {
        Building b = findAndVerifyOwner(buildingId, ownerId);
        if (roomRepo.existsByBuildingIdAndRoomNo(buildingId, req.getRoomNo())) {
            throw new BusinessException("Ma phong da ton tai: " + req.getRoomNo());
        }
        Room room = Room.builder()
                .building(b)
                .roomNo(req.getRoomNo())
                .price(req.getPrice())
                .area(req.getArea())
                .beds(req.getBeds())
                .amenities(req.getAmenities())
                .description(req.getDescription())
                .imageUrl(req.getImageUrl())
                .videoUrl(req.getVideoUrl())
                .status(RoomStatus.AVAILABLE)
                .build();
        room = roomRepo.save(room);
        auditService.log(ownerId, null, "CREATE", "Room", room.getId(),
                "Tao phong: " + room.getRoomNo());
        return room;
    }

    @Transactional
    public List<Room> bulkCreateRooms(Long buildingId, BuildingDTO.BulkRoomRequest req, Long ownerId) {
        Building b = findAndVerifyOwner(buildingId, ownerId);

        // Validate truoc khi tao - dam bao rollback toan bo neu co loi
        List<String> roomNos = new ArrayList<>();
        for (int i = req.getStartIndex(); i < req.getStartIndex() + req.getCount(); i++) {
            String roomNo = req.getPattern().replace("{i}", String.valueOf(i));
            if (roomRepo.existsByBuildingIdAndRoomNo(buildingId, roomNo)) {
                throw new BusinessException("Ma phong da ton tai trong batch: " + roomNo
                        + " - Rollback toan bo!");
            }
            roomNos.add(roomNo);
        }

        List<Room> rooms = new ArrayList<>();
        for (String roomNo : roomNos) {
            Room room = Room.builder()
                    .building(b)
                    .roomNo(roomNo)
                    .price(req.getPrice())
                    .area(req.getArea())
                    .beds(req.getBeds())
                    .amenities(req.getAmenities())
                    .description(req.getDescription())
                    .status(RoomStatus.AVAILABLE)
                    .build();
            rooms.add(roomRepo.save(room));
        }

        auditService.log(ownerId, null, "BULK_CREATE", "Room", buildingId,
                "Bulk create " + rooms.size() + " phong theo pattern: " + req.getPattern());
        return rooms;
    }

    @Transactional
    public Room updateRoomMedia(Long buildingId, Long roomId, String imageUrl, String videoUrl, Long ownerId) {
        findAndVerifyOwner(buildingId, ownerId);
        Room room = roomRepo.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Khong tim thay phong id: " + roomId));
        if (!room.getBuilding().getId().equals(buildingId)) {
            throw new BusinessException("Phong khong thuoc khu tro nay");
        }
        if (imageUrl != null) room.setImageUrl(imageUrl);
        if (videoUrl != null) room.setVideoUrl(videoUrl);
        auditService.log(ownerId, null, "UPDATE_MEDIA", "Room", roomId,
                "Cap nhat anh/video phong " + room.getRoomNo());
        return roomRepo.save(room);
    }

    private Building findAndVerifyOwner(Long buildingId, Long ownerId) {
        Building b = findById(buildingId);
        if (!b.getOwner().getId().equals(ownerId)) {
            throw new BusinessException("Ban khong co quyen quan ly khu tro nay");
        }
        return b;
    }
}
