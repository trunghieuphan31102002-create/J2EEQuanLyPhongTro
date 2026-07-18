package com.rentalms.service;

import com.rentalms.entity.Notification;
import com.rentalms.entity.User;
import com.rentalms.enums.NotificationType;
import com.rentalms.enums.UserRole;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.NotificationRepository;
import com.rentalms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;

    /**
     * Tạo thông báo cho một người dùng cụ thể.
     * REQUIRES_NEW: chạy trong transaction riêng, lỗi thông báo không ảnh hưởng transaction gốc.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification notify(User recipient, NotificationType type,
                               String title, String message,
                               String relatedEntityType, Long relatedEntityId) {
        Notification n = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .message(message)
                .relatedEntityType(relatedEntityType)
                .relatedEntityId(relatedEntityId)
                .build();
        Notification saved = notificationRepo.save(n);
        log.info("Notification [{}] -> userId={}: {}", type, recipient.getId(), title);
        return saved;
    }

    /**
     * Gửi thông báo hệ thống đến toàn bộ OWNER và TENANT.
     * Chỉ ADMIN hoặc MANAGER mới được gọi.
     */
    @Transactional
    public void broadcastSystemAnnouncement(String title, String message, User actor) {
        if (actor.getRole() != UserRole.ADMIN && actor.getRole() != UserRole.MANAGER) {
            throw new BusinessException("Chi ADMIN hoac MANAGER moi co the gui thong bao he thong");
        }

        List<User> owners = userRepo.findByRole(UserRole.OWNER);
        List<User> tenants = userRepo.findByRole(UserRole.TENANT);

        for (User u : owners) {
            notify(u, NotificationType.SYSTEM_ANNOUNCEMENT, title, message, "System", null);
        }
        for (User u : tenants) {
            notify(u, NotificationType.SYSTEM_ANNOUNCEMENT, title, message, "System", null);
        }

        log.info("System announcement broadcast by {} [{}]: {}", actor.getEmail(), actor.getRole(), title);
    }

    /**
     * Lấy danh sách thông báo của một người dùng (mới nhất lên trước).
     */
    public List<Notification> getMyNotifications(Long userId) {
        return notificationRepo.findByRecipientIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Đếm số thông báo chưa đọc.
     */
    public long countUnread(Long userId) {
        return notificationRepo.countUnread(userId);
    }

    /**
     * Đánh dấu một thông báo là đã đọc.
     */
    @Transactional
    public void markAsRead(Long notifId, Long userId) {
        Notification n = notificationRepo.findById(notifId)
                .orElseThrow(() -> new NotFoundException("Khong tim thay thong bao id: " + notifId));
        if (!n.getRecipient().getId().equals(userId)) {
            throw new BusinessException("Khong co quyen doc thong bao nay");
        }
        n.setRead(true);
        notificationRepo.save(n);
    }

    /**
     * Đánh dấu tất cả thông báo của người dùng là đã đọc.
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepo.markAllReadByRecipient(userId);
    }

    /**
     * Gui bao loi chuc nang tu nguoi dung den tat ca ADMIN.
     */
    @Transactional
    public void submitBugReport(String title, String message, User reporter) {
        List<User> admins = userRepo.findByRole(UserRole.ADMIN);
        String fullMessage = "[Bao loi tu " + reporter.getFullName() + " - " + reporter.getEmail()
                + " (" + reporter.getRole() + ")]\n" + message;
        for (User admin : admins) {
            notify(admin, NotificationType.BUG_REPORT, title, fullMessage, "BugReport", null);
        }
        log.info("Bug report submitted by {}: {}", reporter.getEmail(), title);
    }

    /**
     * Lay danh sach bao loi (chi ADMIN xem).
     */
    @Transactional(readOnly = true)
    public List<Notification> getBugReports() {
        List<Notification> list = notificationRepo.findByTypeOrderByCreatedAtDesc(NotificationType.BUG_REPORT);
        list.forEach(n -> { if (n.getRecipient() != null) n.getRecipient().getFullName(); });
        return list;
    }

    /**
     * Lay lich su thong bao he thong da gui.
     */
    @Transactional(readOnly = true)
    public List<Notification> getSystemAnnouncements() {
        List<Notification> list = notificationRepo.findByTypeOrderByCreatedAtDesc(NotificationType.SYSTEM_ANNOUNCEMENT);
        list.forEach(n -> { if (n.getRecipient() != null) n.getRecipient().getFullName(); });
        return list;
    }
}
