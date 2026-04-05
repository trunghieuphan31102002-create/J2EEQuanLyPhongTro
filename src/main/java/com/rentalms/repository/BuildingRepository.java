package com.rentalms.repository;

import com.rentalms.entity.Building;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface BuildingRepository extends JpaRepository<Building, Long> {
    List<Building> findByOwnerId(Long ownerId);
    List<Building> findByAssignedManagerId(Long managerId);
    List<Building> findByPublishStatus(String status);

    @Query("SELECT b FROM Building b WHERE b.publishStatus = 'PUBLIC' AND " +
           "(LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(b.address) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Building> searchPublic(String keyword);
}
