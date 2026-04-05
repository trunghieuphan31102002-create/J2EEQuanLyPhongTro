package com.rentalms.repository;

import com.rentalms.entity.MaintenanceRequest;
import com.rentalms.enums.MaintenanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaintenanceRequestRepository extends JpaRepository<MaintenanceRequest, Long> {
    List<MaintenanceRequest> findByRoomId(Long roomId);
    List<MaintenanceRequest> findByTenantId(Long tenantId);
    List<MaintenanceRequest> findByStatus(MaintenanceStatus status);
    List<MaintenanceRequest> findByRoomBuildingId(Long buildingId);
    List<MaintenanceRequest> findByRoomBuildingAssignedManagerId(Long managerId);

    // Tong chi phi bao tri theo thang
    @org.springframework.data.jpa.repository.Query(
        "SELECT COALESCE(SUM(m.repairCost),0) FROM MaintenanceRequest m " +
        "WHERE m.status = com.rentalms.enums.MaintenanceStatus.DONE " +
        "AND FUNCTION('DATE_FORMAT', m.createdAt, '%Y-%m') = :yearMonth")
    Double sumRepairCostByMonth(String yearMonth);
}
