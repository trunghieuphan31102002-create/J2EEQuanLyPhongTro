package com.rentalms.config;

import com.rentalms.entity.*;
import com.rentalms.enums.*;
import com.rentalms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepo;
    private final BuildingRepository buildingRepo;
    private final RoomRepository roomRepo;
    private final ContractRepository contractRepo;
    private final BillRepository billRepo;
    private final BillItemRepository billItemRepo;
    private final PasswordEncoder encoder;

    @Override
    public void run(String... args) {
        if (userRepo.count() > 0) return; // chi seed lan dau

        log.info("=== Seeding demo data ===");

        // 1. Tao users
        User admin = userRepo.save(User.builder()
                .email("admin@rentalms.com").passwordHash(encoder.encode("admin123"))
                .fullName("Admin He Thong").role(UserRole.ADMIN).active(true).build());

        User owner = userRepo.save(User.builder()
                .email("owner@rentalms.com").passwordHash(encoder.encode("owner123"))
                .fullName("Nguyen Van A (Chu tro)").phone("0901234567")
                .role(UserRole.OWNER).active(true).build());

        User manager = userRepo.save(User.builder()
                .email("manager@rentalms.com").passwordHash(encoder.encode("manager123"))
                .fullName("Tran Thi B (Quan ly)").phone("0902345678")
                .role(UserRole.MANAGER).active(true).build());

        User tenant1 = userRepo.save(User.builder()
                .email("tenant1@rentalms.com").passwordHash(encoder.encode("tenant123"))
                .fullName("Le Van C (Nguoi thue 1)").phone("0903456789")
                .role(UserRole.TENANT).active(true).build());

        User tenant2 = userRepo.save(User.builder()
                .email("tenant2@rentalms.com").passwordHash(encoder.encode("tenant123"))
                .fullName("Pham Thi D (Nguoi thue 2)").phone("0904567890")
                .role(UserRole.TENANT).active(true).build());

        // 2. Tao buildings
        Building b1 = buildingRepo.save(Building.builder()
                .name("Khu Tro Binh Thanh A").address("123 Duong Binh Loi, Binh Thanh, TP.HCM")
                .description("Khu tro 3 tang, gan truong dai hoc, day du tien nghi")
                .publishStatus("PUBLIC")
                .shapeGeoJson("{\"type\":\"Polygon\",\"coordinates\":[[[106.7,10.8],[106.71,10.8],[106.71,10.81],[106.7,10.81],[106.7,10.8]]]}")
                .owner(owner).build());

        Building b2 = buildingRepo.save(Building.builder()
                .name("Khu Tro Thu Duc B").address("456 Duong Linh Trung, Thu Duc, TP.HCM")
                .description("Khu tro moi xay, gan cac khu cong nghiep")
                .publishStatus("PRIVATE")
                .owner(owner).build());

        // 3. Tao rooms
        String[] types = {"A", "B", "C"};
        RoomStatus[] statuses = {RoomStatus.AVAILABLE, RoomStatus.OCCUPIED, RoomStatus.AVAILABLE};
        BigDecimal[] prices = {
            new BigDecimal("2500000"), new BigDecimal("3000000"), new BigDecimal("3500000")
        };
        Double[] areas = {20.0, 25.0, 30.0};

        Room occupiedRoom = null;
        for (int floor = 1; floor <= 3; floor++) {
            for (int num = 1; num <= 4; num++) {
                int idx = (floor - 1) % 3;
                String roomNo = floor + "0" + num;
                RoomStatus status = (floor == 1 && num == 1) ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE;
                Room room = roomRepo.save(Room.builder()
                        .building(b1)
                        .roomNo(roomNo)
                        .price(prices[idx])
                        .area(areas[idx])
                        .beds(1)
                        .amenities("Wifi, Dieu hoa, Nha ve sinh rieng, Ban cong")
                        .description("Phong loai " + types[idx] + " - Tang " + floor)
                        .status(status)
                        .build());
                if (floor == 1 && num == 1) occupiedRoom = room;
            }
        }

        for (int num = 1; num <= 4; num++) {
            roomRepo.save(Room.builder()
                    .building(b2).roomNo("P10" + num)
                    .price(new BigDecimal("2800000")).area(22.0).beds(1)
                    .amenities("Wifi, May nuoc nong").status(RoomStatus.AVAILABLE)
                    .build());
        }

        // 4. Tao contract
        if (occupiedRoom != null) {
            Contract contract = contractRepo.save(Contract.builder()
                    .room(occupiedRoom).tenant(tenant1).owner(owner)
                    .startDate(LocalDate.now().minusMonths(2))
                    .endDate(LocalDate.now().plusMonths(10))
                    .deposit(new BigDecimal("5000000"))
                    .monthlyRent(new BigDecimal("2500000"))
                    .rentCycle("MONTHLY")
                    .policy("Tra tien truoc ngay 5 moi thang. Phat 5% neu tre han.")
                    .lateFeePercent(0.05)
                    .status(ContractStatus.ACTIVE)
                    .build());

            // 5. Tao bill
            Bill bill = billRepo.save(Bill.builder()
                    .contract(contract)
                    .period(LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM")))
                    .dueDate(LocalDate.now().plusDays(10))
                    .status(com.rentalms.enums.BillStatus.UNPAID)
                    .totalAmount(new BigDecimal("3150000"))
                    .paidAmount(BigDecimal.ZERO)
                    .lateFee(BigDecimal.ZERO)
                    .build());

            billItemRepo.save(BillItem.builder()
                    .bill(bill).itemType("RENT")
                    .description("Tien thue thang " + bill.getPeriod())
                    .amount(new BigDecimal("2500000")).build());

            billItemRepo.save(BillItem.builder()
                    .bill(bill).itemType("ELECTRICITY")
                    .description("Tien dien (150 so x 3.500d)")
                    .amount(new BigDecimal("525000"))
                    .previousReading(100.0).currentReading(250.0)
                    .unitPrice(new BigDecimal("3500")).build());

            billItemRepo.save(BillItem.builder()
                    .bill(bill).itemType("WATER")
                    .description("Tien nuoc")
                    .amount(new BigDecimal("125000")).build());
        }

        log.info("=== Seed hoan tat! ===");
        log.info("Tai khoan demo:");
        log.info("  Admin   : admin@rentalms.com / admin123");
        log.info("  Owner   : owner@rentalms.com / owner123");
        log.info("  Manager : manager@rentalms.com / manager123");
        log.info("  Tenant1 : tenant1@rentalms.com / tenant123");
        log.info("  Tenant2 : tenant2@rentalms.com / tenant123");
    }
}
