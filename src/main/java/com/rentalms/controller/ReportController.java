package com.rentalms.controller;

import com.rentalms.dto.ApiResponse;
import com.rentalms.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /** Bao cao tong hop */
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> overview() {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getOverviewReport()));
    }

    /** Doanh thu 12 thang */
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> revenue(
            @RequestParam(defaultValue = "12") int months) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getMonthlyRevenue(months)));
    }

    /** Ty le lap day theo thang */
    @GetMapping("/occupancy")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> occupancy(
            @RequestParam(defaultValue = "12") int months) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getOccupancyTrend(months)));
    }

    /** Top phong no xau */
    @GetMapping("/overdue-rooms")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> overdueRooms() {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getTopOverdueRooms()));
    }

    /** Ty le giu chan */
    @GetMapping("/retention")
    public ResponseEntity<ApiResponse<Map<String, Object>>> retention() {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getRetentionRate()));
    }

    /** Tat ca bao cao trong 1 call */
    @GetMapping("/full")
    public ResponseEntity<ApiResponse<Map<String, Object>>> fullReport() {
        Map<String, Object> full = new LinkedHashMap<>();
        full.put("overview", reportService.getOverviewReport());
        full.put("monthlyRevenue", reportService.getMonthlyRevenue(12));
        full.put("occupancyTrend", reportService.getOccupancyTrend(12));
        full.put("topOverdueRooms", reportService.getTopOverdueRooms());
        full.put("retention", reportService.getRetentionRate());
        return ResponseEntity.ok(ApiResponse.ok(full));
    }
}
