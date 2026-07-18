package com.rentalms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;

/**
 * Tự động sửa CHECK constraint cũ trên cột 'type' của bảng notifications.
 *
 * Hibernate 6 tạo CHECK constraint liệt kê tất cả giá trị enum khi ddl-auto tạo bảng.
 * Khi thêm enum mới, ddl-auto=update không cập nhật constraint đó → insert thất bại.
 * Component này chạy một lần sau khi app khởi động: tìm và xóa constraint, sau đó
 * entity đã dùng columnDefinition="varchar(60)" nên sẽ không tạo lại CHECK constraint mới.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SchemaFixConfig {

    private final DataSource dataSource;

    @EventListener(ApplicationReadyEvent.class)
    public void dropNotificationTypeCheckConstraint() {
        try (Connection conn = dataSource.getConnection()) {
            // Tìm tất cả CHECK constraint trên bảng notifications liên quan đến cột type
            String query =
                "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS " +
                "WHERE TABLE_SCHEMA = DATABASE() " +
                "  AND TABLE_NAME = 'notifications' " +
                "  AND CONSTRAINT_TYPE = 'CHECK'";

            try (ResultSet rs = conn.createStatement().executeQuery(query)) {
                while (rs.next()) {
                    String constraintName = rs.getString("CONSTRAINT_NAME");
                    // Chỉ xóa constraint liên quan đến cột type (chứa enum values)
                    if (constraintName != null && constraintName.toLowerCase().contains("type")) {
                        String drop = "ALTER TABLE notifications DROP CHECK `" + constraintName + "`";
                        conn.createStatement().execute(drop);
                        log.info("SchemaFix: Dropped CHECK constraint '{}' on notifications.type", constraintName);
                    }
                }
            }
        } catch (Exception e) {
            // Không phải lỗi nghiêm trọng – constraint có thể đã bị xóa hoặc không tồn tại
            log.debug("SchemaFix: Could not drop notifications type check constraint: {}", e.getMessage());
        }
    }
}
