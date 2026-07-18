package com.rentalms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

public class ContractDTO {

    @Data
    public static class CreateRequest {
        @NotNull
        private Long roomId;
        @NotNull
        private Long tenantId;
        @NotNull
        private LocalDate startDate;
        @NotNull
        private LocalDate endDate;
        private BigDecimal deposit;
        private BigDecimal monthlyRent;
        private String rentCycle = "MONTHLY";
        private String policy;
        private Double lateFeePercent = 0.05;
    }

    @Data
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
        private BigDecimal deposit;
        private BigDecimal monthlyRent;
        private String status;
        private String createdAt;
    }
}
