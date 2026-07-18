package com.rentalms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.rentalms.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "buildings", "contracts"})
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(60)")
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Builder.Default
    @Column(nullable = false)
    private boolean isRead = false;

    // Loại entity liên quan: "Bill", "Maintenance", "System"
    private String relatedEntityType;

    private Long relatedEntityId;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
