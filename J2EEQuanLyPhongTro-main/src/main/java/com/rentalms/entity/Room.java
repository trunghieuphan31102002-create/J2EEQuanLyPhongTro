package com.rentalms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.rentalms.enums.RoomStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "rooms", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"building_id", "room_no"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "room_no", nullable = false)
    private String roomNo;

    @Positive
    private Double area; // m2

    @Positive
    @Column(nullable = false)
    private BigDecimal price; // VND/thang

    private Integer beds;

    @Column(length = 500)
    private String amenities; // wifi, dieu hoa, tu lanh...

    @Column(length = 1000)
    private String description;

    @Column(length = 2000)
    private String imageUrl; // comma-separated URLs, first = thumbnail

    @Column(length = 500)
    private String videoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomStatus status = RoomStatus.AVAILABLE;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

    @JsonIgnore
    @OneToMany(mappedBy = "room", fetch = FetchType.LAZY)
    private List<Contract> contracts;

    @JsonIgnore
    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<MaintenanceRequest> maintenanceRequests;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
