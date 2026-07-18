package com.rentalms.repository;

import com.rentalms.entity.Room;
import com.rentalms.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByBuildingId(Long buildingId);
    List<Room> findByBuildingIdAndStatus(Long buildingId, RoomStatus status);
    boolean existsByBuildingIdAndRoomNo(Long buildingId, String roomNo);
    Optional<Room> findByBuildingIdAndRoomNo(Long buildingId, String roomNo);

    @Query("SELECT r FROM Room r WHERE r.building.id = :buildingId AND " +
           "r.status = 'AVAILABLE' AND " +
           "(:minPrice IS NULL OR r.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR r.price <= :maxPrice) AND " +
           "(:minArea IS NULL OR r.area >= :minArea)")
    List<Room> searchAvailable(Long buildingId, java.math.BigDecimal minPrice,
                                java.math.BigDecimal maxPrice, Double minArea);

    @Query("SELECT COUNT(r) FROM Room r WHERE r.building.id = :buildingId AND r.status = 'OCCUPIED'")
    long countOccupied(Long buildingId);

    @Query("SELECT COUNT(r) FROM Room r WHERE r.building.id = :buildingId")
    long countTotal(Long buildingId);

    // Dem phong theo trang thai (toan he thong)
    long countByStatus(RoomStatus status);
}
