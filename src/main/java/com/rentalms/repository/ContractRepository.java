package com.rentalms.repository;

import com.rentalms.entity.Contract;
import com.rentalms.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContractRepository extends JpaRepository<Contract, Long> {
    List<Contract> findByTenantId(Long tenantId);
    List<Contract> findByOwnerId(Long ownerId);
    List<Contract> findByRoomId(Long roomId);

    @Query("SELECT c FROM Contract c WHERE c.room.building.assignedManager.id = :managerId")
    List<Contract> findByAssignedManagerId(Long managerId);
    List<Contract> findByStatus(ContractStatus status);
    Optional<Contract> findByRoomIdAndStatus(Long roomId, ContractStatus status);

    // Kiem tra overlap: phong nay co hop dong active trong khoang thoi gian khong
    @Query("SELECT COUNT(c) > 0 FROM Contract c WHERE c.room.id = :roomId " +
           "AND c.status IN ('PENDING', 'ACTIVE', 'EXTENDED') " +
           "AND NOT (c.endDate < :startDate OR c.startDate > :endDate)")
    boolean existsOverlap(Long roomId, LocalDate startDate, LocalDate endDate);

    // Hop dong sap het han (trong 30 ngay)
    @Query("SELECT c FROM Contract c WHERE c.status = 'ACTIVE' " +
           "AND c.endDate BETWEEN :today AND :in30Days")
    List<Contract> findExpiringContracts(LocalDate today, LocalDate in30Days);

    // Tong doanh thu theo building
    @Query("SELECT SUM(c.monthlyRent) FROM Contract c WHERE c.room.building.id = :buildingId " +
           "AND c.status = 'ACTIVE'")
    java.math.BigDecimal sumActiveRevenue(Long buildingId);

    // Tong doanh thu ky vong toan he thong
    @Query("SELECT COALESCE(SUM(c.monthlyRent),0) FROM Contract c WHERE c.status = 'ACTIVE'")
    java.math.BigDecimal sumAllActiveRevenue();

    // Hop dong moi trong khoang thoi gian
    @Query("SELECT COUNT(c) FROM Contract c WHERE c.startDate BETWEEN :from AND :to")
    long countNewContracts(LocalDate from, LocalDate to);

    // Hop dong cham dut trong khoang thoi gian
    @Query("SELECT COUNT(c) FROM Contract c WHERE c.status = 'TERMINATED' AND c.endDate BETWEEN :from AND :to")
    long countTerminatedContracts(LocalDate from, LocalDate to);

    // Dem hop dong active
    long countByStatus(ContractStatus status);
}
