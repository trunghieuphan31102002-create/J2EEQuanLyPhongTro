package com.rentalms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.rentalms.enums.RentalRequestStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rental_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RentalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    private LocalDate startDate;
    private LocalDate endDate;

    @Column(length = 500)
    private String note;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RentalRequestStatus status = RentalRequestStatus.PENDING;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
