package com.rentalms.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;

public class BillDTO {

    @Data
    public static class Response {
        private Long id;
        private Long contractId;
        private String tenantName;
        private String roomNo;
        private String buildingName;
        private String period;
        private BigDecimal totalAmount;
        private BigDecimal paidAmount;
        private BigDecimal lateFee;
        private String dueDate;
        private String status;
        private List<ItemResponse> items;
    }

    @Data
    public static class ItemResponse {
        private Long id;
        private String itemType;
        private String description;
        private BigDecimal amount;
    }

    @Data
    public static class PayRequest {
        @NotNull @Positive
        private BigDecimal amount;
        private String method = "BANK_TRANSFER";
        private String referenceCode;
        private String note;
    }

    @Data
    public static class AddItemRequest {
        private String itemType;
        private String description;
        @NotNull @Positive
        private BigDecimal amount;
    }
}
