package com.rentalms.repository;

import com.rentalms.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByBillId(Long billId);

    @Query("SELECT p FROM Payment p WHERE p.bill.id = :billId AND p.method = 'CASH' AND p.status = 'PENDING' ORDER BY p.createdAt DESC")
    Optional<Payment> findPendingCashPayment(Long billId);

    // Doanh thu thuc theo thang (chi payment SUCCESS)
    @Query("SELECT COALESCE(SUM(p.amount),0) FROM Payment p WHERE p.status = 'SUCCESS' " +
           "AND FUNCTION('DATE_FORMAT', p.paidAt, '%Y-%m') = :yearMonth")
    java.math.BigDecimal sumRevenueByMonth(String yearMonth);

    // Doanh thu thuc theo thang cua 1 building
    @Query("SELECT COALESCE(SUM(p.amount),0) FROM Payment p WHERE p.status = 'SUCCESS' " +
           "AND p.bill.contract.room.building.id = :buildingId " +
           "AND FUNCTION('DATE_FORMAT', p.paidAt, '%Y-%m') = :yearMonth")
    java.math.BigDecimal sumRevenueByMonthAndBuilding(String yearMonth, Long buildingId);
}
