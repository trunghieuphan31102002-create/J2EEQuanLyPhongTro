package com.rentalms.service;

import com.rentalms.dto.AuthDTO;
import com.rentalms.dto.ProfileDTO;
import com.rentalms.entity.User;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.UserRepository;
import com.rentalms.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;

    @Transactional
    public AuthDTO.AuthResponse register(AuthDTO.RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new BusinessException("Email da duoc su dung: " + req.getEmail());
        }

        User user = User.builder()
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .phone(req.getPhone())
                .role(req.getRole())
                .active(true)
                .build();

        user = userRepo.save(user);
        auditService.log(user.getId(), user.getEmail(), "REGISTER", "User", user.getId(),
                "User dang ky thanh cong: " + user.getEmail());

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId());
        return new AuthDTO.AuthResponse(token, user.getId(), user.getEmail(),
                user.getFullName(), user.getRole());
    }

    public AuthDTO.AuthResponse login(AuthDTO.LoginRequest req) {
        User user = userRepo.findByEmail(req.getEmail())
                .orElseThrow(() -> new BusinessException("Email hoac mat khau khong dung"));

        if (!user.isActive()) {
            throw new BusinessException("Tai khoan da bi khoa");
        }

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new BusinessException("Email hoac mat khau khong dung");
        }

        auditService.log(user.getId(), user.getEmail(), "LOGIN", "User", user.getId(), "Dang nhap");

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name(), user.getId());
        return new AuthDTO.AuthResponse(token, user.getId(), user.getEmail(),
                user.getFullName(), user.getRole());
    }

    public User findById(Long id) {
        return userRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Khong tim thay user id: " + id));
    }

    public User findByEmail(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Khong tim thay user: " + email));
    }

    @Transactional
    public User updateProfile(Long userId, ProfileDTO.UpdateRequest req) {
        User user = findById(userId);
        user.setFullName(req.getFullName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getCccdNumber() != null) user.setCccdNumber(req.getCccdNumber());
        if (req.getCccdFrontUrl() != null) user.setCccdFrontUrl(req.getCccdFrontUrl());
        if (req.getCccdBackUrl() != null) user.setCccdBackUrl(req.getCccdBackUrl());
        if (req.getBankAccount() != null) user.setBankAccount(req.getBankAccount());
        if (req.getBankName() != null) user.setBankName(req.getBankName());
        if (req.getAvatarUrl() != null) user.setAvatarUrl(req.getAvatarUrl());
        if (req.getZaloLink() != null) user.setZaloLink(req.getZaloLink());
        auditService.log(userId, user.getEmail(), "UPDATE_PROFILE", "User", userId, "Cap nhat thong tin ca nhan");
        return userRepo.save(user);
    }

    public ProfileDTO.Response toProfileResponse(User u) {
        boolean complete = notBlank(u.getPhone()) && notBlank(u.getCccdNumber())
                && notBlank(u.getCccdFrontUrl()) && notBlank(u.getCccdBackUrl())
                && notBlank(u.getBankAccount()) && notBlank(u.getBankName());
        return ProfileDTO.Response.builder()
                .id(u.getId())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .phone(u.getPhone())
                .cccdNumber(u.getCccdNumber())
                .cccdFrontUrl(u.getCccdFrontUrl())
                .cccdBackUrl(u.getCccdBackUrl())
                .bankAccount(u.getBankAccount())
                .bankName(u.getBankName())
                .avatarUrl(u.getAvatarUrl())
                .zaloLink(u.getZaloLink())
                .role(u.getRole().name())
                .active(u.isActive())
                .profileComplete(complete)
                .createdAt(u.getCreatedAt())
                .build();
    }

    // ── Admin: danh sach tat ca user ──
    public java.util.List<ProfileDTO.Response> getAllUsers() {
        return userRepo.findAll().stream()
                .map(this::toProfileResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    // ── Admin: danh sach user theo role ──
    public java.util.List<ProfileDTO.Response> getUsersByRole(com.rentalms.enums.UserRole role) {
        return userRepo.findByRole(role).stream()
                .map(this::toProfileResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    // ── Admin: khoa / mo tai khoan ──
    @Transactional
    public User toggleActive(Long userId, Long adminId) {
        User user = findById(userId);
        user.setActive(!user.isActive());
        String action = user.isActive() ? "UNLOCK_USER" : "LOCK_USER";
        auditService.log(adminId, null, action, "User", userId,
                (user.isActive() ? "Mo khoa" : "Khoa") + " tai khoan: " + user.getEmail());
        return userRepo.save(user);
    }

    // Cac role chi cho phep 1 tai khoan duy nhat
    private static final java.util.Set<com.rentalms.enums.UserRole> UNIQUE_ROLES = java.util.Set.of(
            com.rentalms.enums.UserRole.ADMIN,
            com.rentalms.enums.UserRole.OWNER,
            com.rentalms.enums.UserRole.MANAGER
    );

    // ── Admin: doi role ──
    @Transactional
    public User changeRole(Long userId, com.rentalms.enums.UserRole newRole, Long adminId) {
        // Khong cho doi role cua ADMIN va OWNER
        User user = findById(userId);
        if (user.getRole() == com.rentalms.enums.UserRole.ADMIN
                || user.getRole() == com.rentalms.enums.UserRole.OWNER) {
            throw new BusinessException("Khong the thay doi vai tro cua tai khoan Admin va Chu nha");
        }

        // Kiem tra role unique
        if (UNIQUE_ROLES.contains(newRole)) {
            java.util.List<User> existing = userRepo.findByRole(newRole);
            boolean occupied = existing.stream().anyMatch(u -> !u.getId().equals(userId));
            if (occupied) {
                String ownerName = existing.stream()
                        .filter(u -> !u.getId().equals(userId))
                        .findFirst().map(User::getFullName).orElse("???");
                String roleName = newRole == com.rentalms.enums.UserRole.ADMIN ? "Admin"
                        : newRole == com.rentalms.enums.UserRole.OWNER ? "Chu nha"
                        : "Quan ly";
                throw new BusinessException(
                        "Vai tro " + roleName + " da duoc gan cho \"" + ownerName
                                + "\". Moi vai tro chi cho phep 1 tai khoan duy nhat.");
            }
        }

        com.rentalms.enums.UserRole oldRole = user.getRole();
        user.setRole(newRole);
        auditService.log(adminId, null, "CHANGE_ROLE", "User", userId,
                "Doi role " + oldRole + " -> " + newRole + " cho " + user.getEmail());
        return userRepo.save(user);
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
