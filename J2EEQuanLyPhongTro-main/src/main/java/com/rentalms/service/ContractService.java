package com.rentalms.service;

import com.rentalms.dto.ContractDTO;
import com.rentalms.entity.*;
import com.rentalms.enums.ContractStatus;
import com.rentalms.enums.RoomStatus;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContractService {

    private final ContractRepository contractRepo;
    private final RoomRepository roomRepo;
    private final UserService userService;
    private final AuditService auditService;

    @Transactional
    public Contract create(ContractDTO.CreateRequest req, Long ownerId) {
        Room room = roomRepo.findById(req.getRoomId())
                .orElseThrow(() -> new NotFoundException("Khong tim thay phong"));

        if (room.getStatus() != RoomStatus.AVAILABLE && room.getStatus() != RoomStatus.RESERVED) {
            throw new BusinessException("Phong hien khong the tao hop dong (trang thai: "
                    + room.getStatus() + ")");
        }

        // Kiem tra overlap
        if (contractRepo.existsOverlap(req.getRoomId(), req.getStartDate(), req.getEndDate())) {
            throw new BusinessException("Phong da co hop dong trong khoang thoi gian nay!");
        }

        User tenant = userService.findById(req.getTenantId());
        User owner = userService.findById(ownerId);

        Contract contract = Contract.builder()
                .room(room)
                .tenant(tenant)
                .owner(owner)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .deposit(req.getDeposit())
                .monthlyRent(req.getMonthlyRent() != null ? req.getMonthlyRent() : room.getPrice())
                .rentCycle(req.getRentCycle())
                .policy(req.getPolicy())
                .lateFeePercent(req.getLateFeePercent())
                .status(ContractStatus.ACTIVE)
                .build();

        contract = contractRepo.save(contract);

        // Cap nhat trang thai phong
        room.setStatus(RoomStatus.OCCUPIED);
        roomRepo.save(room);

        auditService.log(ownerId, owner.getEmail(), "CREATE", "Contract", contract.getId(),
                "Tao hop dong phong " + room.getRoomNo() + " cho tenant " + tenant.getEmail());
        return contract;
    }

    @Transactional
    public Contract terminate(Long contractId, Long ownerId) {
        Contract c = findById(contractId);
        if (!c.getOwner().getId().equals(ownerId)) {
            throw new BusinessException("Khong co quyen ket thuc hop dong nay");
        }
        c.setStatus(ContractStatus.TERMINATED);
        c.getRoom().setStatus(RoomStatus.AVAILABLE);
        roomRepo.save(c.getRoom());

        auditService.log(ownerId, null, "TERMINATE", "Contract", contractId,
                "Ket thuc hop dong phong " + c.getRoom().getRoomNo());
        return contractRepo.save(c);
    }

    @Transactional
    public Contract renew(Long contractId, LocalDate newEndDate, Long ownerId) {
        Contract c = findById(contractId);
        if (!c.getOwner().getId().equals(ownerId)) {
            throw new BusinessException("Khong co quyen gia han hop dong nay");
        }
        c.setEndDate(newEndDate);
        c.setStatus(ContractStatus.EXTENDED);
        auditService.log(ownerId, null, "RENEW", "Contract", contractId,
                "Gia han den: " + newEndDate);
        return contractRepo.save(c);
    }

    public Contract findById(Long id) {
        return contractRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Khong tim thay hop dong id: " + id));
    }

    public List<Contract> getByOwner(Long ownerId) {
        return contractRepo.findByOwnerId(ownerId);
    }

    public List<Contract> getByTenant(Long tenantId) {
        return contractRepo.findByTenantId(tenantId);
    }

    public List<Contract> getByManager(Long managerId) {
        return contractRepo.findByAssignedManagerId(managerId);
    }

    public ContractDTO.Response toResponse(Contract c) {
        ContractDTO.Response r = new ContractDTO.Response();
        r.setId(c.getId());
        r.setRoomId(c.getRoom().getId());
        r.setRoomNo(c.getRoom().getRoomNo());
        r.setBuildingName(c.getRoom().getBuilding().getName());
        r.setTenantId(c.getTenant().getId());
        r.setTenantName(c.getTenant().getFullName());
        r.setTenantEmail(c.getTenant().getEmail());
        r.setStartDate(c.getStartDate());
        r.setEndDate(c.getEndDate());
        r.setDeposit(c.getDeposit());
        r.setMonthlyRent(c.getMonthlyRent());
        r.setStatus(c.getStatus().name());
        r.setCreatedAt(c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        return r;
    }
}
