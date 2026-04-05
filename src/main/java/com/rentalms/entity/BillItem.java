package com.rentalms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "bill_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BillItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    private Bill bill;

    // RENT, ELECTRICITY, WATER, INTERNET, SERVICE, PENALTY, MAINTENANCE
    private String itemType;

    private String description;

    @Column(nullable = false)
    private BigDecimal amount;

    // So dien/nuoc cu
    private Double previousReading;

    // So dien/nuoc moi
    private Double currentReading;

    // Don gia (VND/kwh hoac VND/m3)
    private BigDecimal unitPrice;
}
