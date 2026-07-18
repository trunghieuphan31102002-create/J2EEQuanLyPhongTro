package com.rentalms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "buildings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Building {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    @NotBlank
    private String address;

    @Column(length = 1000)
    private String description;

    // Anh dai dien toa nha
    private String imageUrl;

    // Vi tri toa nha (lat/lng)
    private Double latitude;
    private Double longitude;

    // GeoJSON polygon cho map
    @Column(columnDefinition = "TEXT")
    private String shapeGeoJson;

    // PUBLIC hoac PRIVATE
    @Column(nullable = false)
    private String publishStatus = "PRIVATE";

    // Don gia dien (VND/kWh) — owner set theo toa nha
    @Builder.Default
    @Column(precision = 12, scale = 2)
    private BigDecimal electricityUnitPrice = new BigDecimal("3500");

    // Don gia nuoc (VND/m3)
    @Builder.Default
    @Column(precision = 12, scale = 2)
    private BigDecimal waterUnitPrice = new BigDecimal("20000");

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "buildings", "contracts"})
    private User owner;

    // Manager duoc OWNER assign de quan ly building nay (nullable)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_manager_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "buildings", "contracts"})
    private User assignedManager;

    @JsonIgnore
    @OneToMany(mappedBy = "building", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Room> rooms;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
