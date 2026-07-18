package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.dto.ProfileDTO;
import com.rentalms.entity.User;
import com.rentalms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserService userService;
    private final CurrentUser currentUser;

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileDTO.Response>> getProfile() {
        User user = userService.findById(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(userService.toProfileResponse(user)));
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<ProfileDTO.Response>> getTenantProfile(@PathVariable Long userId) {
        User user = userService.findById(userId);
        return ResponseEntity.ok(ApiResponse.ok(userService.toProfileResponse(user)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ProfileDTO.Response>> updateProfile(
            @Valid @RequestBody ProfileDTO.UpdateRequest req) {
        User user = userService.updateProfile(currentUser.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok(
                "Cap nhat thong tin thanh cong", userService.toProfileResponse(user)));
    }
}
