package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.entity.MaintenanceRequest;
import com.rentalms.enums.ContractStatus;
import com.rentalms.exception.BusinessException;
import com.rentalms.repository.ContractRepository;
import com.rentalms.service.MaintenanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceService maintenanceService;
    private final ContractRepository contractRepository;
    private final CurrentUser currentUser;

    @PostMapping
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<MaintenanceRequest>> create(
            @RequestBody Map<String, Object> body) {
        Long tenantId = currentUser.getId();
        Long roomId;
        if (body.containsKey("roomId") && body.get("roomId") != null) {
            roomId = Long.valueOf(body.get("roomId").toString());
        } else {
            roomId = contractRepository.findByTenantId(tenantId).stream()
                .filter(c -> c.getStatus() == ContractStatus.ACTIVE)
                .findFirst()
                .map(c -> c.getRoom().getId())
                .orElseThrow(() -> new BusinessException("Ban chua co hop dong hoat dong de gui yeu cau bao tri"));
        }
        String desc = body.get("description").toString();
        String priority = body.getOrDefault("priority", "MEDIUM").toString();
        String imageUrl = body.containsKey("imageUrl") ? body.get("imageUrl").toString() : null;

        MaintenanceRequest req = maintenanceService.create(
                roomId, desc, priority, imageUrl, currentUser.getId());
        return ResponseEntity.status(201).body(ApiResponse.ok("Gui yeu cau bao tri thanh cong", req));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<List<MaintenanceRequest>>> getMyRequests() {
        return ResponseEntity.ok(ApiResponse.ok(
                maintenanceService.getByTenant(currentUser.getId())));
    }

    @GetMapping("/building/{buildingId}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<List<MaintenanceRequest>>> getByBuilding(
            @PathVariable Long buildingId) {
        return ResponseEntity.ok(ApiResponse.ok(
                maintenanceService.getByBuilding(buildingId, currentUser.getId())));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<MaintenanceRequest>> updateStatus(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        String status = body.get("status").toString();
        String note = body.containsKey("note") ? body.get("note").toString() : null;
        Double cost = body.containsKey("cost") ?
                Double.valueOf(body.get("cost").toString()) : null;

        MaintenanceRequest updated = maintenanceService.updateStatus(
                id, status, note, cost, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Cap nhat trang thai thanh cong", updated));
    }
}
