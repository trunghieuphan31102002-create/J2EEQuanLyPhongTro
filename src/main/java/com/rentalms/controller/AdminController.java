package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.dto.ProfileDTO;
import com.rentalms.entity.User;
import com.rentalms.enums.UserRole;
import com.rentalms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;
    private final CurrentUser currentUser;

    // Lay danh sach tat ca user
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<ProfileDTO.Response>>> getAllUsers(
            @RequestParam(required = false) String role) {
        List<ProfileDTO.Response> users;
        if (role != null && !role.isBlank()) {
            users = userService.getUsersByRole(UserRole.valueOf(role.toUpperCase()));
        } else {
            users = userService.getAllUsers();
        }
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    // Xem chi tiet 1 user
    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<ProfileDTO.Response>> getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(userService.toProfileResponse(user)));
    }

    // Khoa / mo tai khoan
    @PutMapping("/users/{id}/toggle-active")
    public ResponseEntity<ApiResponse<ProfileDTO.Response>> toggleActive(@PathVariable Long id) {
        User user = userService.toggleActive(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                user.isActive() ? "Da mo khoa tai khoan" : "Da khoa tai khoan",
                userService.toProfileResponse(user)));
    }

    // Doi role
    @PutMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<ProfileDTO.Response>> changeRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        UserRole newRole = UserRole.valueOf(body.get("role").toUpperCase());
        User user = userService.changeRole(id, newRole, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Da doi role thanh " + newRole,
                userService.toProfileResponse(user)));
    }
}
