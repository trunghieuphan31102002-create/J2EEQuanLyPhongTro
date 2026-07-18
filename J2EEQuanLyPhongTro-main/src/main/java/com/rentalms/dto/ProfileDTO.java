package com.rentalms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

public class ProfileDTO {

    @Data
    public static class UpdateRequest {
        @NotBlank
        private String fullName;
        private String phone;
        private String cccdNumber;
        private String cccdFrontUrl;
        private String cccdBackUrl;
        private String bankAccount;
        private String bankName;
        private String avatarUrl;
        private String zaloLink;
    }

    @Data
    @Builder
    public static class Response {
        private Long id;
        private String email;
        private String fullName;
        private String phone;
        private String cccdNumber;
        private String cccdFrontUrl;
        private String cccdBackUrl;
        private String bankAccount;
        private String bankName;
        private String avatarUrl;
        private String zaloLink;
        private String role;
        private boolean active;
        private boolean profileComplete;
        private LocalDateTime createdAt;
    }
}
