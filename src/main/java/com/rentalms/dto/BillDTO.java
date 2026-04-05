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
        private List<PaymentResponse> payments;
    }

    @Data
    public static class ItemResponse {
        private Long id;
        private String itemType;
        private String description;
        private BigDecimal amount;
        private Double previousReading;
        private Double currentReading;
        private BigDecimal unitPrice;
    }

    @Data
    public static class PaymentResponse {
        private Long id;
        private BigDecimal amount;
        private String method;
        private String status;
        private String referenceCode;
        private String note;
        private String proofImageUrl;
        private String paidAt;
    }

    @Data
    public static class PayRequest {
        @NotNull @Positive
        private BigDecimal amount;
        private String method = "BANK_TRANSFER";
        private String referenceCode;
        private String note;
        private String proofImageUrl;
    }

    @Data
    public static class AddItemRequest {
        private String itemType;
        private String description;
        @NotNull @Positive
        private BigDecimal amount;
    }

    @Data
    public static class SetUtilitiesRequest {
        // So dien cu (kWh)
        private Double electricityOld;
        // So dien moi (kWh)
        private Double electricityNew;
        // So nuoc cu (m3)
        private Double waterOld;
        // So nuoc moi (m3)
        private Double waterNew;
    }
}
