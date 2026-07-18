package com.rentalms.controller;

import com.rentalms.dto.ApiResponse;
import com.rentalms.entity.AuditLog;
import com.rentalms.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<AuditLog> result = auditService.getFiltered(action, entityType, actorId, from, to, page, size);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", result.getContent());
        response.put("totalElements", result.getTotalElements());
        response.put("totalPages", result.getTotalPages());
        response.put("currentPage", result.getNumber());
        response.put("size", result.getSize());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/filters")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFilters() {
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("actions", auditService.getDistinctActions());
        filters.put("entityTypes", auditService.getDistinctEntityTypes());
        return ResponseEntity.ok(ApiResponse.ok(filters));
    }
}
