package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.dto.BuildingDTO;
import com.rentalms.entity.Building;
import com.rentalms.entity.Room;
import com.rentalms.entity.User;
import com.rentalms.enums.UserRole;
import com.rentalms.repository.UserRepository;
import com.rentalms.service.BuildingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/buildings")
@RequiredArgsConstructor
public class BuildingController {

    private final BuildingService buildingService;
    private final CurrentUser currentUser;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Building>> create(
            @Valid @RequestBody BuildingDTO.CreateRequest req) {
        return ResponseEntity.status(201)
                .body(ApiResponse.ok("Tao khu tro thanh cong",
                        buildingService.create(req, currentUser.getId())));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<List<Building>>> getMyBuildings() {
        return ResponseEntity.ok(ApiResponse.ok(
                buildingService.getForActor(currentUser.get())));
    }

    /**
     * Danh sach cac MANAGER co the assign (cho OWNER/ADMIN chon).
     * Tra ve minimal profile: id, fullName, email, phone.
     */
    @GetMapping("/available-managers")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listAvailableManagers() {
        List<Map<String, Object>> managers = userRepository.findByRole(UserRole.MANAGER).stream()
                .filter(User::isActive)
                .map(u -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("fullName", u.getFullName());
                    m.put("email", u.getEmail());
                    m.put("phone", u.getPhone());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(managers));
    }

    /**
     * OWNER/ADMIN gan manager cho building.
     * Body: { "managerId": 123 }  hoac  { "managerId": null } de go.
     */
    @PutMapping("/{id}/assign-manager")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Building>> assignManager(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Object raw = body.get("managerId");
        Long managerId = (raw == null) ? null : Long.valueOf(raw.toString());
        Building updated = buildingService.assignManager(id, managerId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                managerId == null ? "Da bo manager" : "Da gan manager", updated));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Building>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(buildingService.findById(id)));
    }

    @PutMapping("/{id}/shape")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Building>> updateShape(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Building updated = buildingService.updateShape(id, body.get("geoJson"), currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Cap nhat map thanh cong", updated));
    }

    @PutMapping("/{id}/details")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Building>> updateDetails(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Building updated = buildingService.updateDetails(id, body, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Cap nhat thong tin thanh cong", updated));
    }

    @PutMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Building>> publish(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Building updated = buildingService.publish(id, body.get("status"), currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Cap nhat trang thai thanh cong", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteBuilding(@PathVariable Long id) {
        buildingService.deleteBuilding(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Xoa toa nha thanh cong", null));
    }

    // === ROOM endpoints ===

    @GetMapping("/{buildingId}/rooms")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<List<Room>>> getRooms(@PathVariable Long buildingId) {
        List<Room> rooms = buildingService.getRoomsForActor(buildingId, currentUser.get());
        return ResponseEntity.ok(ApiResponse.ok(rooms));
    }

    @PostMapping("/{buildingId}/rooms")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Room>> createRoom(
            @PathVariable Long buildingId,
            @Valid @RequestBody BuildingDTO.RoomCreateRequest req) {
        Room room = buildingService.createRoom(buildingId, req, currentUser.getId());
        return ResponseEntity.status(201).body(ApiResponse.ok("Tao phong thanh cong", room));
    }

    @PutMapping("/{buildingId}/rooms/{roomId}/media")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Room>> updateRoomMedia(
            @PathVariable Long buildingId,
            @PathVariable Long roomId,
            @RequestBody Map<String, String> body) {
        Room room = buildingService.updateRoomMedia(
                buildingId, roomId,
                body.get("imageUrl"), body.get("videoUrl"),
                currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Cap nhat anh/video thanh cong", room));
    }

    @PutMapping("/{buildingId}/rooms/{roomId}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Room>> updateRoom(
            @PathVariable Long buildingId,
            @PathVariable Long roomId,
            @RequestBody BuildingDTO.RoomCreateRequest req) {
        Room room = buildingService.updateRoom(buildingId, roomId, req, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Cap nhat phong thanh cong", room));
    }

    @DeleteMapping("/{buildingId}/rooms/{roomId}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable Long buildingId,
            @PathVariable Long roomId) {
        buildingService.deleteRoom(buildingId, roomId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Xoa phong thanh cong", null));
    }

    @PostMapping("/{buildingId}/rooms/bulk")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Room>>> bulkCreateRooms(
            @PathVariable Long buildingId,
            @Valid @RequestBody BuildingDTO.BulkRoomRequest req) {
        List<Room> rooms = buildingService.bulkCreateRooms(buildingId, req, currentUser.getId());
        return ResponseEntity.status(201)
                .body(ApiResponse.ok("Tao " + rooms.size() + " phong thanh cong", rooms));
    }
}
