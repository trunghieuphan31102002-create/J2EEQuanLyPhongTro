package com.rentalms.service;

import com.rentalms.entity.Building;
import com.rentalms.entity.User;
import com.rentalms.enums.UserRole;
import com.rentalms.exception.BusinessException;
import org.springframework.stereotype.Service;

/**
 * Kiem tra quyen truy cap cua user hien tai doi voi mot building.
 * Quy tac:
 *  - ADMIN: luon co quyen
 *  - OWNER: phai la chu cua building
 *  - MANAGER: phai la manager duoc assign cho building
 *  - TENANT / cac role khac: khong co quyen quan ly
 */
@Service
public class BuildingAccessService {

    public boolean canManage(Building building, User user) {
        if (building == null || user == null) return false;
        UserRole role = user.getRole();
        if (role == UserRole.ADMIN) return true;
        if (role == UserRole.OWNER) {
            return building.getOwner() != null
                    && building.getOwner().getId().equals(user.getId());
        }
        if (role == UserRole.MANAGER) {
            return building.getAssignedManager() != null
                    && building.getAssignedManager().getId().equals(user.getId());
        }
        return false;
    }

    public void assertCanManage(Building building, User user) {
        if (!canManage(building, user)) {
            throw new BusinessException("Ban khong co quyen thao tac tren khu tro nay");
        }
    }
}
