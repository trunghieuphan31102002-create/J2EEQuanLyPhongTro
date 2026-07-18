package com.rentalms.controller;

import com.rentalms.dto.ApiResponse;
import com.rentalms.dto.AuthDTO;
import com.rentalms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthDTO.AuthResponse>> register(
            @Valid @RequestBody AuthDTO.RegisterRequest req) {
        return ResponseEntity.status(201)
                .body(ApiResponse.ok("Dang ky thanh cong", userService.register(req)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthDTO.AuthResponse>> login(
            @Valid @RequestBody AuthDTO.LoginRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Dang nhap thanh cong", userService.login(req)));
    }
}
