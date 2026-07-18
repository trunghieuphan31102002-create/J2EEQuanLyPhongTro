package com.rentalms.enums;

public enum NotificationType {

    // Người thuê nhà nhận
    BILL_ISSUED,             // Hóa đơn mới được tạo
    BILL_DUE_SOON,           // Hóa đơn sắp đến hạn (3 ngày nữa)
    BILL_OVERDUE,            // Hóa đơn quá hạn

    // Chủ nhà / quản lý nhận
    BILL_PAID,               // Tenant vừa thanh toán hóa đơn
    MAINTENANCE_SUBMITTED,   // Tenant gửi yêu cầu bảo trì
    RENTAL_REQUEST_SUBMITTED, // Tenant gửi yêu cầu thuê phòng mới

    // Người thuê nhà nhận
    MAINTENANCE_STATUS_UPDATED, // Chủ nhà cập nhật trạng thái yêu cầu bảo trì
    RENTAL_REQUEST_APPROVED,  // Chủ nhà duyệt yêu cầu thuê
    RENTAL_REQUEST_REJECTED,  // Chủ nhà từ chối yêu cầu thuê

    // Tất cả nhận
    SYSTEM_ANNOUNCEMENT,     // Thông báo bảo trì hệ thống từ Admin / Manager

    // User gui den Admin
    BUG_REPORT               // Bao loi chuc nang tu nguoi dung
}
