package com.rentalms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class RentalRequestDTO {

    @Data
    public static class CreateRequest {
        @NotNull
        private Long roomId;
        @NotNull
        private LocalDate startDate;
        @NotNull
        private LocalDate endDate;
        private String note;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long roomId;
        private String roomNo;
        private String buildingName;
        private Long tenantId;
        private String tenantName;
        private String tenantEmail;
        private LocalDate startDate;
        private LocalDate endDate;
        private String note;
        private String status;
        private BigDecimal monthlyRent;
        private LocalDateTime createdAt;
    }
}
