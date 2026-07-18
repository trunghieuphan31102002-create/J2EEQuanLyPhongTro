package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.entity.Notification;
import com.rentalms.entity.User;
import com.rentalms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUser currentUser;

    private Map<String, Object> toNotifMap(Notification n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.getId());
        m.put("type", n.getType());
        m.put("title", n.getTitle());
        m.put("message", n.getMessage());
        m.put("read", n.isRead());
        m.put("relatedEntityType", n.getRelatedEntityType());
        m.put("relatedEntityId", n.getRelatedEntityId());
        m.put("createdAt", n.getCreatedAt());
        if (n.getRecipient() != null) {
            m.put("recipientName", n.getRecipient().getFullName());
            m.put("recipientEmail", n.getRecipient().getEmail());
        }
        return m;
    }

    /** Lấy danh sách thông báo của tôi */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getMyNotifications() {
        List<Notification> list = notificationService.getMyNotifications(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /** Đếm số thông báo chưa đọc */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> countUnread() {
        long count = notificationService.countUnread(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok(count));
    }

    /** Đánh dấu một thông báo đã đọc */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Da danh dau da doc", null));
    }

    /** Đánh dấu tất cả thông báo đã đọc */
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        notificationService.markAllAsRead(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Da danh dau tat ca da doc", null));
    }

    /**
     * Gửi thông báo hệ thống (chỉ ADMIN / MANAGER).
     * Body: { "title": "...", "message": "..." }
     */
    @PostMapping("/system-announcement")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> sendSystemAnnouncement(
            @RequestBody Map<String, String> body) {
        String title = body.get("title");
        String message = body.get("message");
        User actor = currentUser.get();
        notificationService.broadcastSystemAnnouncement(title, message, actor);
        return ResponseEntity.ok(ApiResponse.ok("Da gui thong bao he thong den tat ca OWNER va TENANT", null));
    }

    /**
     * Nguoi dung bao loi chuc nang den Admin.
     * Body: { "title": "...", "message": "..." }
     */
    @PostMapping("/bug-report")
    public ResponseEntity<ApiResponse<Void>> submitBugReport(
            @RequestBody Map<String, String> body) {
        String title = body.get("title");
        String message = body.get("message");
        User reporter = currentUser.get();
        notificationService.submitBugReport(title, message, reporter);
        return ResponseEntity.ok(ApiResponse.ok("Da gui bao loi den Admin. Cam on ban!", null));
    }

    /**
     * Admin xem danh sach bao loi tu nguoi dung.
     */
    @GetMapping("/bug-reports")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBugReports() {
        List<Map<String, Object>> list = notificationService.getBugReports()
                .stream().map(this::toNotifMap).toList();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /**
     * Admin xem lich su thong bao he thong da gui.
     */
    @GetMapping("/system-announcements")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSystemAnnouncements() {
        List<Map<String, Object>> list = notificationService.getSystemAnnouncements()
                .stream().map(this::toNotifMap).toList();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }
}
