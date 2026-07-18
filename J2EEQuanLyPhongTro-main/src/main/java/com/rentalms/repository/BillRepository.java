package com.rentalms.repository;

import com.rentalms.entity.Bill;
import com.rentalms.enums.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByContractId(Long contractId);
    List<Bill> findByStatus(BillStatus status);
    Optional<Bill> findByContractIdAndPeriod(Long contractId, String period);

    @Query("SELECT b FROM Bill b WHERE b.contract.tenant.id = :tenantId")
    List<Bill> findByTenantId(Long tenantId);

    @Query("SELECT b FROM Bill b WHERE b.status = 'UNPAID' AND b.dueDate < :today")
    List<Bill> findOverdue(LocalDate today);

    @Query("SELECT b FROM Bill b WHERE b.status = 'UNPAID' AND b.dueDate BETWEEN :today AND :dueBefore")
    List<Bill> findDueSoon(LocalDate today, LocalDate dueBefore);

    @Query("SELECT b FROM Bill b WHERE b.contract.room.building.id = :buildingId")
    List<Bill> findByBuildingId(Long buildingId);

    @Query("SELECT b FROM Bill b WHERE b.contract.owner.id = :ownerId ORDER BY b.issuedAt DESC")
    List<Bill> findByOwnerId(Long ownerId);

    @Query("SELECT b FROM Bill b WHERE b.contract.room.building.assignedManager.id = :managerId ORDER BY b.issuedAt DESC")
    List<Bill> findByAssignedManagerId(Long managerId);

    // Tong no xau (OVERDUE)
    @Query("SELECT COALESCE(SUM(b.totalAmount + b.lateFee - b.paidAmount),0) FROM Bill b WHERE b.status = 'OVERDUE'")
    java.math.BigDecimal sumOverdueDebt();

    // Top phong no xau
    @Query("SELECT b.contract.room.roomNo, b.contract.room.building.name, " +
           "SUM(b.totalAmount + b.lateFee - b.paidAmount) as debt " +
           "FROM Bill b WHERE b.status = 'OVERDUE' " +
           "GROUP BY b.contract.room.id, b.contract.room.roomNo, b.contract.room.building.name " +
           "ORDER BY debt DESC")
    List<Object[]> findTopOverdueRooms();
}
