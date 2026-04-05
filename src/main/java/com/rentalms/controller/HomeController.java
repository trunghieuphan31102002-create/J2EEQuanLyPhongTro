package com.rentalms.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, Object> home() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("app", "RentalMS - He thong Quan ly Phong Tro");
        info.put("version", "1.0.0");
        info.put("h2Console", "http://localhost:8080/h2-console (JDBC: jdbc:h2:mem:rentalms, user: sa)");

        Map<String, String> accounts = new LinkedHashMap<>();
        accounts.put("admin", "admin@rentalms.com / admin123");
        accounts.put("owner", "owner@rentalms.com / owner123");
        accounts.put("manager", "manager@rentalms.com / manager123");
        accounts.put("tenant1", "tenant1@rentalms.com / tenant123");
        accounts.put("tenant2", "tenant2@rentalms.com / tenant123");
        info.put("demoAccounts", accounts);

        Map<String, String> apis = new LinkedHashMap<>();
        apis.put("POST /api/auth/register", "Dang ky tai khoan moi");
        apis.put("POST /api/auth/login", "Dang nhap - nhan JWT token");
        apis.put("GET  /api/buildings", "Danh sach khu tro (Owner)");
        apis.put("POST /api/buildings", "Tao khu tro moi (Owner)");
        apis.put("POST /api/buildings/{id}/rooms", "Tao phong (Owner)");
        apis.put("POST /api/buildings/{id}/rooms/bulk", "Tao nhieu phong (Owner)");
        apis.put("PUT  /api/buildings/{id}/shape", "Cap nhat GeoJSON polygon (Owner)");
        apis.put("PUT  /api/buildings/{id}/publish", "Public/Private khu tro (Owner)");
        apis.put("POST /api/contracts", "Tao hop dong (Owner)");
        apis.put("GET  /api/contracts", "Danh sach hop dong");
        apis.put("PUT  /api/contracts/{id}/terminate", "Ket thuc hop dong (Owner)");
        apis.put("PUT  /api/contracts/{id}/renew", "Gia han hop dong (Owner)");
        apis.put("GET  /api/bills", "Xem hoa don cua toi (Tenant)");
        apis.put("POST /api/bills/{id}/pay", "Thanh toan hoa don (Tenant)");
        apis.put("POST /api/bills/{id}/items", "Them khoan phi (Owner/Manager)");
        apis.put("POST /api/maintenance", "Gui yeu cau bao tri (Tenant)");
        apis.put("GET  /api/maintenance/building/{id}", "Xem bao tri cua building (Owner)");
        apis.put("PUT  /api/maintenance/{id}/status", "Cap nhat bao tri (Manager)");
        apis.put("GET  /api/marketplace", "Tim kiem phong public (Public)");
        info.put("endpoints", apis);

        info.put("note", "Dung Authorization: Bearer {token} trong header cho cac API can xac thuc");
        return info;
    }
}
