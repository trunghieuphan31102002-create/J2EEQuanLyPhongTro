package com.rentalms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

public class BuildingDTO {

    @Data
    public static class CreateRequest {
        @NotBlank
        private String name;
        @NotBlank
        private String address;
        private String description;
        private String shapeGeoJson;
        private String publishStatus = "PRIVATE";
    }

    @Data
    public static class Response {
        private Long id;
        private String name;
        private String address;
        private String description;
        private String shapeGeoJson;
        private String publishStatus;
        private Long ownerId;
        private String ownerName;
        private int totalRooms;
        private int availableRooms;
        private String createdAt;
    }

    @Data
    public static class BulkRoomRequest {
        @NotBlank
        private String pattern; // VD: "A-{i}" tao A-1, A-2...
        @NotNull @Positive
        private Integer count;
        private int startIndex = 1;
        @NotNull @Positive
        private BigDecimal price;
        private Double area;
        private Integer beds;
        private String amenities;
        private String description;
    }

    @Data
    public static class RoomCreateRequest {
        @NotBlank
        private String roomNo;
        @NotNull @Positive
        private BigDecimal price;
        private Double area;
        private Integer beds;
        private String amenities;
        private String description;
        private String imageUrl;
        private String videoUrl;
    }
}
