package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.dto.RentalRequestDTO;
import com.rentalms.service.RentalRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rental-requests")
@RequiredArgsConstructor
public class RentalRequestController {

    private final RentalRequestService rentalRequestService;
    private final CurrentUser currentUser;

    @PostMapping
    @PreAuthorize("hasRole('TENANT')")
    public ResponseEntity<ApiResponse<RentalRequestDTO.Response>> apply(
            @Valid @RequestBody RentalRequestDTO.CreateRequest req) {
        return ResponseEntity.status(201)
                .body(ApiResponse.ok("Gửi yêu cầu thuê thành công",
                        rentalRequestService.apply(req, currentUser.getId())));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RentalRequestDTO.Response>>> getMyRequests() {
        var user = currentUser.get();
        List<RentalRequestDTO.Response> list = switch (user.getRole()) {
            case OWNER, ADMIN -> rentalRequestService.getByOwner(user.getId());
            default -> rentalRequestService.getByTenant(user.getId());
        };
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<RentalRequestDTO.Response>> approve(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Đã duyệt yêu cầu, hợp đồng đã được tạo",
                rentalRequestService.approve(id, currentUser.getId())));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<RentalRequestDTO.Response>> reject(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Đã từ chối yêu cầu",
                rentalRequestService.reject(id, currentUser.getId())));
    }
}
