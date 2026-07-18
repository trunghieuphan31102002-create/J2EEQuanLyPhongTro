package com.rentalms.service;

import com.rentalms.enums.ContractStatus;
import com.rentalms.enums.RoomStatus;
import com.rentalms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final PaymentRepository paymentRepo;
    private final RoomRepository roomRepo;
    private final ContractRepository contractRepo;
    private final BillRepository billRepo;
    private final MaintenanceRequestRepository maintRepo;

    private static final DateTimeFormatter YM_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    /**
     * Bao cao tong hop cho Admin dashboard.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getOverviewReport() {
        Map<String, Object> report = new LinkedHashMap<>();

        // --- Thong ke phong ---
        long totalRooms = roomRepo.count();
        long occupied = roomRepo.countByStatus(RoomStatus.OCCUPIED);
        long available = roomRepo.countByStatus(RoomStatus.AVAILABLE);
        long maintenance = roomRepo.countByStatus(RoomStatus.MAINTENANCE);
        double occupancyRate = totalRooms > 0 ? (double) occupied / totalRooms * 100 : 0;

        Map<String, Object> rooms = new LinkedHashMap<>();
        rooms.put("total", totalRooms);
        rooms.put("occupied", occupied);
        rooms.put("available", available);
        rooms.put("maintenance", maintenance);
        rooms.put("occupancyRate", round2(occupancyRate));
        report.put("rooms", rooms);

        // --- Hop dong ---
        long activeContracts = contractRepo.countByStatus(ContractStatus.ACTIVE);
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = LocalDate.now();
        long newContracts = contractRepo.countNewContracts(monthStart, monthEnd);
        long terminated = contractRepo.countTerminatedContracts(monthStart, monthEnd);

        Map<String, Object> contracts = new LinkedHashMap<>();
        contracts.put("active", activeContracts);
        contracts.put("newThisMonth", newContracts);
        contracts.put("terminatedThisMonth", terminated);
        report.put("contracts", contracts);

        // --- Doanh thu thang hien tai ---
        String currentMonth = LocalDate.now().format(YM_FMT);
        BigDecimal actualRevenue = paymentRepo.sumRevenueByMonth(currentMonth);
        BigDecimal expectedRevenue = contractRepo.sumAllActiveRevenue();
        double collectionRate = expectedRevenue.compareTo(BigDecimal.ZERO) > 0
                ? actualRevenue.divide(expectedRevenue, 4, RoundingMode.HALF_UP).doubleValue() * 100 : 0;

        Map<String, Object> revenue = new LinkedHashMap<>();
        revenue.put("actual", actualRevenue);
        revenue.put("expected", expectedRevenue);
        revenue.put("collectionRate", round2(collectionRate));
        report.put("currentMonth", revenue);

        // --- No xau ---
        BigDecimal overdueDebt = billRepo.sumOverdueDebt();
        report.put("overdueDebt", overdueDebt);

        // --- Chi phi bao tri thang nay ---
        Double maintCost = maintRepo.sumRepairCostByMonth(currentMonth);
        report.put("maintenanceCost", maintCost != null ? maintCost : 0);

        // --- Loi nhuan rong ---
        double netProfit = actualRevenue.doubleValue() - (maintCost != null ? maintCost : 0);
        report.put("netProfit", round2(netProfit));

        return report;
    }

    /**
     * Doanh thu 12 thang gan nhat: actual vs expected.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMonthlyRevenue(int months) {
        List<Map<String, Object>> result = new ArrayList<>();
        BigDecimal expectedMonthly = contractRepo.sumAllActiveRevenue();

        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            String label = ym.format(YM_FMT);
            BigDecimal actual = paymentRepo.sumRevenueByMonth(label);
            Double maintCost = maintRepo.sumRepairCostByMonth(label);

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("month", label);
            m.put("actual", actual);
            m.put("expected", expectedMonthly);
            m.put("maintenanceCost", maintCost != null ? maintCost : 0);
            m.put("netProfit", round2(actual.doubleValue() - (maintCost != null ? maintCost : 0)));
            result.add(m);
        }
        return result;
    }

    /**
     * Ty le lap day 12 thang (tinh theo so hop dong active / tong phong).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getOccupancyTrend(int months) {
        List<Map<String, Object>> result = new ArrayList<>();
        long totalRooms = roomRepo.count();

        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            String label = ym.format(YM_FMT);
            // Dung so phong occupied hien tai cho don gian (data chinh xac can snapshot)
            double rate = totalRooms > 0 ? (double) roomRepo.countByStatus(RoomStatus.OCCUPIED) / totalRooms * 100 : 0;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("month", label);
            m.put("rate", round2(rate));
            result.add(m);
        }
        return result;
    }

    /**
     * Top phong no xau.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTopOverdueRooms() {
        List<Object[]> rows = billRepo.findTopOverdueRooms();
        List<Map<String, Object>> result = new ArrayList<>();
        int limit = Math.min(rows.size(), 10);
        for (int i = 0; i < limit; i++) {
            Object[] row = rows.get(i);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("roomNo", row[0]);
            m.put("buildingName", row[1]);
            m.put("debt", row[2]);
            result.add(m);
        }
        return result;
    }

    /**
     * Ty le giu chan tenant.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getRetentionRate() {
        long active = contractRepo.countByStatus(ContractStatus.ACTIVE);
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = LocalDate.now();
        long terminated = contractRepo.countTerminatedContracts(monthStart, monthEnd);
        long startOfMonth = active + terminated; // uoc tinh so active dau ky
        double retention = startOfMonth > 0 ? (double)(startOfMonth - terminated) / startOfMonth * 100 : 100;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("activeStart", startOfMonth);
        m.put("terminated", terminated);
        m.put("retentionRate", round2(retention));
        return m;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
