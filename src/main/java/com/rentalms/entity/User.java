package com.rentalms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.rentalms.enums.UserRole;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Email
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String passwordHash;

    @NotBlank
    private String fullName;

    private String phone;

    @Column(length = 20)
    private String cccdNumber;       // Số CCCD / CMND

    @Column(length = 500)
    private String cccdFrontUrl;     // Ảnh mặt trước CCCD

    @Column(length = 500)
    private String cccdBackUrl;      // Ảnh mặt sau CCCD

    @Column(length = 50)
    private String bankAccount;      // Số tài khoản ngân hàng

    @Column(length = 100)
    private String bankName;         // Tên ngân hàng

    @Column(length = 500)
    private String avatarUrl;        // Ảnh đại diện

    @Column(length = 500)
    private String zaloLink;         // Link Zalo ca nhan (zalo.me/... hoac so DT)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(nullable = false)
    private boolean active = true;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @JsonIgnore
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Building> buildings;

    @JsonIgnore
    @OneToMany(mappedBy = "tenant", fetch = FetchType.LAZY)
    private List<Contract> contracts;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
