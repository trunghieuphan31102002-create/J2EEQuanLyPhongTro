package com.rentalms.service;

import com.rentalms.entity.AuditLog;
import com.rentalms.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repo;

    public void log(Long actorId, String actorEmail, String action,
                    String entityType, Long entityId, String description) {
        AuditLog log = AuditLog.builder()
                .actorId(actorId)
                .actorEmail(actorEmail)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .build();
        repo.save(log);
    }

    public List<AuditLog> getByEntity(String type, Long id) {
        return repo.findByEntityTypeAndEntityId(type, id);
    }

    public Page<AuditLog> getFiltered(String action, String entityType, Long actorId,
                                       LocalDateTime from, LocalDateTime to, int page, int size) {
        return repo.findFiltered(action, entityType, actorId, from, to, PageRequest.of(page, size));
    }

    public List<String> getDistinctActions() {
        return repo.findDistinctActions();
    }

    public List<String> getDistinctEntityTypes() {
        return repo.findDistinctEntityTypes();
    }
}
