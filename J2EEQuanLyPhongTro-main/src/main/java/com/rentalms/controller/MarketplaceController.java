package com.rentalms.controller;

import com.rentalms.dto.ApiResponse;
import com.rentalms.entity.Building;
import com.rentalms.entity.Room;
import com.rentalms.enums.RoomStatus;
import com.rentalms.repository.BuildingRepository;
import com.rentalms.repository.RoomRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

    private final BuildingRepository buildingRepo;
    private final RoomRepository roomRepo;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Building>>> search(
            @RequestParam(defaultValue = "") String keyword) {
        List<Building> results = buildingRepo.searchPublic(keyword);
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<RoomListing>>> searchRooms(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Double minArea,
            @RequestParam(required = false) Double maxArea) {

        List<Building> buildings = buildingRepo.searchPublic(keyword);
        List<RoomListing> result = new ArrayList<>();

        for (Building b : buildings) {
            List<Room> rooms = roomRepo.findByBuildingIdAndStatus(b.getId(), RoomStatus.AVAILABLE);
            for (Room r : rooms) {
                if (minPrice != null && r.getPrice().compareTo(minPrice) < 0) continue;
                if (maxPrice != null && r.getPrice().compareTo(maxPrice) > 0) continue;
                if (minArea != null && (r.getArea() == null || r.getArea() < minArea)) continue;
                if (maxArea != null && r.getArea() != null && r.getArea() > maxArea) continue;
                result.add(new RoomListing(
                        r.getId(), r.getRoomNo(), r.getPrice(), r.getArea(),
                        r.getBeds(), r.getAmenities(), r.getDescription(),
                        r.getImageUrl(), r.getVideoUrl(),
                        r.getStatus().name(), b.getId(), b.getName(),
                        b.getAddress(), b.getDescription(), b.getShapeGeoJson(),
                        r.getCreatedAt()
                ));
            }
        }

        result.sort((a, b2) -> {
            if (a.getCreatedAt() == null) return 1;
            if (b2.getCreatedAt() == null) return -1;
            return b2.getCreatedAt().compareTo(a.getCreatedAt());
        });

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/buildings/{buildingId}/rooms")
    public ResponseEntity<ApiResponse<List<Room>>> getRoomsPublic(
            @PathVariable Long buildingId) {
        Building b = buildingRepo.findById(buildingId).orElseThrow();
        if (!"PUBLIC".equals(b.getPublishStatus())) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Khu tro nay la private"));
        }
        List<Room> rooms = roomRepo.findByBuildingId(buildingId);
        return ResponseEntity.ok(ApiResponse.ok(rooms));
    }

    // Thong tin lien he chu nha (public)
    @GetMapping("/buildings/{buildingId}/owner")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getOwnerInfo(
            @PathVariable Long buildingId) {
        Building b = buildingRepo.findById(buildingId).orElseThrow();
        if (!"PUBLIC".equals(b.getPublishStatus())) {
            return ResponseEntity.status(403).body(ApiResponse.error("Khu tro nay la private"));
        }
        com.rentalms.entity.User owner = b.getOwner();
        java.util.Map<String, Object> info = new java.util.LinkedHashMap<>();
        info.put("fullName", owner.getFullName());
        info.put("phone", owner.getPhone());
        info.put("email", owner.getEmail());
        info.put("avatarUrl", owner.getAvatarUrl());
        info.put("zaloLink", owner.getZaloLink());
        info.put("buildingName", b.getName());
        info.put("buildingAddress", b.getAddress());
        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    @Data
    @AllArgsConstructor
    public static class RoomListing {
        private Long id;
        private String roomNo;
        private BigDecimal price;
        private Double area;
        private Integer beds;
        private String amenities;
        private String description;
        private String imageUrl;
        private String videoUrl;
        private String status;
        private Long buildingId;
        private String buildingName;
        private String buildingAddress;
        private String buildingDescription;
        private String buildingShapeGeoJson;
        private LocalDateTime createdAt;
    }
}
