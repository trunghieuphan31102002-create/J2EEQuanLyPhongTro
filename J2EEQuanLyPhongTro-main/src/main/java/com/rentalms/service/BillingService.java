package com.rentalms.service;

import com.rentalms.dto.BillDTO;
import com.rentalms.entity.*;
import com.rentalms.enums.BillStatus;
import com.rentalms.enums.ContractStatus;
import com.rentalms.enums.NotificationType;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

    private final BillRepository billRepo;
    private final BillItemRepository billItemRepo;
    private final PaymentRepository paymentRepo;
    private final ContractRepository contractRepo;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final BuildingAccessService accessService;
    private final UserService userService;

    // Chay ngay 1 moi thang luc 00:00
    @Scheduled(cron = "0 0 0 1 * *")
    @Transactional
    public void autoGenerateMonthlyBills() {
        log.info("=== Auto generate monthly bills ===");
        List<Contract> activeContracts = contractRepo.findByStatus(ContractStatus.ACTIVE);
        String period = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        for (Contract contract : activeContracts) {
            try {
                generateBillForContract(contract, period);
            } catch (Exception e) {
                log.error("Loi generate bill cho contract {}: {}", contract.getId(), e.getMessage());
            }
        }
    }

    // Chay hang ngay luc 08:00 - danh dau overdue va gui thong bao
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void markOverdueBills() {
        List<Bill> overdue = billRepo.findOverdue(LocalDate.now());
        for (Bill bill : overdue) {
            if (bill.getStatus() == BillStatus.UNPAID) {
                bill.setStatus(BillStatus.OVERDUE);
                // Tinh late fee 5% tren so tien con lai
                BigDecimal remaining = bill.getTotalAmount().subtract(bill.getPaidAmount());
                bill.setLateFee(remaining.multiply(BigDecimal.valueOf(0.05)));
                billRepo.save(bill);
                log.info("Bill {} marked OVERDUE", bill.getId());

                // Thong bao cho tenant
                User tenant = bill.getContract().getTenant();
                notificationService.notify(
                        tenant,
                        NotificationType.BILL_OVERDUE,
                        "Hoa don qua han",
                        "Hoa don thang " + bill.getPeriod() + " so tien "
                                + bill.getTotalAmount() + " VND da qua han. Phi phat sinh them "
                                + bill.getLateFee() + " VND.",
                        "Bill", bill.getId()
                );
            }
        }
    }

    // Chay hang ngay luc 08:00 - nhac nho hoa don sap den han (con 3 ngay)
    @Scheduled(cron = "0 5 8 * * *")
    @Transactional
    public void remindDueSoonBills() {
        LocalDate threeDaysLater = LocalDate.now().plusDays(3);
        List<Bill> dueSoon = billRepo.findDueSoon(LocalDate.now(), threeDaysLater);
        for (Bill bill : dueSoon) {
            User tenant = bill.getContract().getTenant();
            notificationService.notify(
                    tenant,
                    NotificationType.BILL_DUE_SOON,
                    "Hoa don sap den han",
                    "Hoa don thang " + bill.getPeriod() + " so tien "
                            + bill.getTotalAmount() + " VND se den han vao ngay "
                            + bill.getDueDate() + ". Vui long thanh toan dung han.",
                    "Bill", bill.getId()
            );
        }
    }

    @Transactional
    public Bill generateBillForContract(Contract contract, String period) {
        // Kiem tra da co bill chua
        if (billRepo.findByContractIdAndPeriod(contract.getId(), period).isPresent()) {
            throw new BusinessException("Bill ky " + period + " da ton tai");
        }

        Bill bill = Bill.builder()
                .contract(contract)
                .period(period)
                .dueDate(LocalDate.now().plusDays(15))
                .status(BillStatus.UNPAID)
                .totalAmount(BigDecimal.ZERO)
                .paidAmount(BigDecimal.ZERO)
                .lateFee(BigDecimal.ZERO)
                .build();
        bill = billRepo.save(bill);

        // Tao line item tien thue
        BillItem rentItem = BillItem.builder()
                .bill(bill)
                .itemType("RENT")
                .description("Tien thue thang " + period)
                .amount(contract.getMonthlyRent())
                .build();
        billItemRepo.save(rentItem);

        bill.setTotalAmount(contract.getMonthlyRent());
        bill = billRepo.save(bill);

        // Thong bao cho tenant: hoa don moi duoc tao
        notificationService.notify(
                contract.getTenant(),
                NotificationType.BILL_ISSUED,
                "Hoa don thang " + period,
                "Hoa don tien thue thang " + period + " so tien "
                        + contract.getMonthlyRent() + " VND da duoc tao. Han thanh toan: "
                        + bill.getDueDate() + ".",
                "Bill", bill.getId()
        );

        log.info("Generated bill {} for contract {} period {}", bill.getId(), contract.getId(), period);
        return bill;
    }

    /**
     * Cap nhat chi so dien/nuoc cho hoa don. Owner/Manager input so cu/moi,
     * he thong tu tinh tien dua tren don gia cua Building, thay the cac BillItem
     * ELECTRICITY va WATER cu, va cap nhat lai totalAmount cua bill.
     */
    @Transactional
    public Bill setUtilityReadings(Long billId, BillDTO.SetUtilitiesRequest req, Long actorId) {
        Bill bill = findById(billId);
        User actor = userService.findById(actorId);
        accessService.assertCanManage(bill.getContract().getRoom().getBuilding(), actor);

        if (bill.getStatus() == BillStatus.PAID || bill.getStatus() == BillStatus.CANCELLED) {
            throw new BusinessException("Khong the cap nhat hoa don da thanh toan hoac da huy");
        }

        var building = bill.getContract().getRoom().getBuilding();
        BigDecimal elecPrice = building.getElectricityUnitPrice() != null
                ? building.getElectricityUnitPrice() : new BigDecimal("3500");
        BigDecimal waterPrice = building.getWaterUnitPrice() != null
                ? building.getWaterUnitPrice() : new BigDecimal("20000");

        // Xoa cac BillItem ELECTRICITY va WATER cu (neu co)
        List<BillItem> existing = billItemRepo.findByBillId(billId);
        for (BillItem item : existing) {
            if ("ELECTRICITY".equals(item.getItemType()) || "WATER".equals(item.getItemType())) {
                billItemRepo.delete(item);
            }
        }

        // Tinh va tao BillItem moi cho dien
        BigDecimal elecAmount = BigDecimal.ZERO;
        if (req.getElectricityOld() != null && req.getElectricityNew() != null
                && req.getElectricityNew() >= req.getElectricityOld()) {
            double consumption = req.getElectricityNew() - req.getElectricityOld();
            elecAmount = elecPrice.multiply(BigDecimal.valueOf(consumption))
                    .setScale(0, java.math.RoundingMode.HALF_UP);
            BillItem elec = BillItem.builder()
                    .bill(bill)
                    .itemType("ELECTRICITY")
                    .description(String.format("Tieu thu %.0f kWh (%.0f -> %.0f) x %sd/kWh",
                            consumption, req.getElectricityOld(), req.getElectricityNew(), elecPrice.toPlainString()))
                    .amount(elecAmount)
                    .previousReading(req.getElectricityOld())
                    .currentReading(req.getElectricityNew())
                    .unitPrice(elecPrice)
                    .build();
            billItemRepo.save(elec);
        }

        // Tinh va tao BillItem moi cho nuoc
        BigDecimal waterAmount = BigDecimal.ZERO;
        if (req.getWaterOld() != null && req.getWaterNew() != null
                && req.getWaterNew() >= req.getWaterOld()) {
            double consumption = req.getWaterNew() - req.getWaterOld();
            waterAmount = waterPrice.multiply(BigDecimal.valueOf(consumption))
                    .setScale(0, java.math.RoundingMode.HALF_UP);
            BillItem water = BillItem.builder()
                    .bill(bill)
                    .itemType("WATER")
                    .description(String.format("Tieu thu %.0f m3 (%.0f -> %.0f) x %sd/m3",
                            consumption, req.getWaterOld(), req.getWaterNew(), waterPrice.toPlainString()))
                    .amount(waterAmount)
                    .previousReading(req.getWaterOld())
                    .currentReading(req.getWaterNew())
                    .unitPrice(waterPrice)
                    .build();
            billItemRepo.save(water);
        }

        // Tinh lai total tu tat ca items con lai (RENT + cac khoan khac) + dien + nuoc
        BigDecimal newTotal = BigDecimal.ZERO;
        List<BillItem> remaining = billItemRepo.findByBillId(billId);
        for (BillItem item : remaining) {
            newTotal = newTotal.add(item.getAmount());
        }
        bill.setTotalAmount(newTotal);
        billRepo.save(bill);

        auditService.log(actorId, null, "SET_UTILITIES", "Bill", billId,
                "Cap nhat tien dien " + elecAmount + "d, tien nuoc " + waterAmount + "d");

        return bill;
    }

    @Transactional
    public Bill addItem(Long billId, BillDTO.AddItemRequest req, Long actorId) {
        Bill bill = findById(billId);
        // Kiem tra quyen: actor phai la OWNER cua building hoac MANAGER duoc assign
        User actor = userService.findById(actorId);
        accessService.assertCanManage(bill.getContract().getRoom().getBuilding(), actor);

        BillItem item = BillItem.builder()
                .bill(bill)
                .itemType(req.getItemType())
                .description(req.getDescription())
                .amount(req.getAmount())
                .build();
        billItemRepo.save(item);

        bill.setTotalAmount(bill.getTotalAmount().add(req.getAmount()));
        auditService.log(actorId, null, "ADD_ITEM", "Bill", billId,
                "Them " + req.getItemType() + ": " + req.getAmount());
        return billRepo.save(bill);
    }

    @Transactional
    public Payment pay(Long billId, BillDTO.PayRequest req, Long tenantId) {
        Bill bill = findById(billId);

        if (bill.getStatus() == BillStatus.PAID) {
            throw new BusinessException("Hoa don nay da duoc thanh toan");
        }
        if (bill.getStatus() == BillStatus.CANCELLED) {
            throw new BusinessException("Hoa don da bi huy");
        }
        if (bill.getStatus() == BillStatus.PENDING_CONFIRMATION) {
            throw new BusinessException("Hoa don dang cho chu nha xac nhan thanh toan tien mat");
        }

        // CASH va BANK_TRANSFER deu can owner xac nhan
        // VNPAY auto-confirm (da co callback tu VNPay)
        String method = req.getMethod() == null ? "" : req.getMethod().toUpperCase();
        boolean needsConfirmation = "CASH".equals(method) || "BANK_TRANSFER".equals(method);

        Payment payment = Payment.builder()
                .bill(bill)
                .amount(req.getAmount())
                .method(req.getMethod())
                .referenceCode(req.getReferenceCode())
                .note(req.getNote())
                .proofImageUrl(req.getProofImageUrl())
                .status(needsConfirmation ? "PENDING" : "SUCCESS")
                .paidAt(java.time.LocalDateTime.now())
                .build();
        paymentRepo.save(payment);

        if (needsConfirmation) {
            // Chua cap nhat paidAmount — cho owner xac nhan
            bill.setStatus(BillStatus.PENDING_CONFIRMATION);
            billRepo.save(bill);

            String methodLabel = "CASH".equals(method) ? "tien mat" : "chuyen khoan";
            auditService.log(tenantId, null, "PAYMENT_PENDING", "Bill", billId,
                    "Khai bao thanh toan " + methodLabel + " " + req.getAmount() + " VND - cho xac nhan");

            // Thong bao cho chu nha de xac nhan
            User owner = bill.getContract().getOwner();
            User tenant = bill.getContract().getTenant();
            notificationService.notify(
                    owner,
                    NotificationType.BILL_PAID,
                    "Tenant khai bao thanh toan " + methodLabel,
                    tenant.getFullName() + " khai bao da thanh toan " + methodLabel + " "
                            + req.getAmount() + " VND cho hoa don thang " + bill.getPeriod()
                            + " (phong " + bill.getContract().getRoom().getRoomNo()
                            + "). Vui long xac nhan da nhan tien.",
                    "Bill", billId
            );
        } else {
            // Non-cash: cap nhat ngay
            BigDecimal newPaid = bill.getPaidAmount().add(req.getAmount());
            bill.setPaidAmount(newPaid);
            BigDecimal remaining = bill.getTotalAmount().add(bill.getLateFee()).subtract(newPaid);
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                bill.setStatus(BillStatus.PAID);
            } else if (newPaid.compareTo(BigDecimal.ZERO) > 0) {
                bill.setStatus(BillStatus.PARTIAL);
            }
            billRepo.save(bill);

            auditService.log(tenantId, null, "PAYMENT", "Bill", billId,
                    "Thanh toan " + req.getAmount() + " VND, phuong thuc: " + req.getMethod());

            User owner = bill.getContract().getOwner();
            User tenant = bill.getContract().getTenant();
            notificationService.notify(
                    owner,
                    NotificationType.BILL_PAID,
                    "Tenant da thanh toan hoa don",
                    tenant.getFullName() + " da thanh toan " + req.getAmount()
                            + " VND cho hoa don thang " + bill.getPeriod()
                            + " (phong " + bill.getContract().getRoom().getRoomNo() + ").",
                    "Bill", billId
            );
        }

        return payment;
    }

    @Transactional
    public Bill confirmCashPayment(Long billId, Long actorId) {
        Bill bill = findById(billId);
        // Kiem tra quyen: OWNER hoac MANAGER cua building
        User actor = userService.findById(actorId);
        accessService.assertCanManage(bill.getContract().getRoom().getBuilding(), actor);

        if (bill.getStatus() != BillStatus.PENDING_CONFIRMATION) {
            throw new BusinessException("Hoa don nay khong o trang thai cho xac nhan");
        }

        Payment pending = paymentRepo.findPendingPayment(billId)
                .orElseThrow(() -> new NotFoundException("Khong tim thay giao dich dang cho xac nhan cho hoa don nay"));

        // Xac nhan payment
        pending.setStatus("SUCCESS");
        paymentRepo.save(pending);

        // Cap nhat bill
        BigDecimal newPaid = bill.getPaidAmount().add(pending.getAmount());
        bill.setPaidAmount(newPaid);
        BigDecimal remaining = bill.getTotalAmount().add(bill.getLateFee()).subtract(newPaid);
        bill.setStatus(remaining.compareTo(BigDecimal.ZERO) <= 0 ? BillStatus.PAID : BillStatus.PARTIAL);
        billRepo.save(bill);

        auditService.log(actorId, null, "CONFIRM_CASH", "Bill", billId,
                "Xac nhan nhan tien mat " + pending.getAmount() + " VND");

        // Thong bao cho tenant
        User tenant = bill.getContract().getTenant();
        notificationService.notify(
                tenant,
                NotificationType.BILL_PAID,
                "Thanh toan tien mat da duoc xac nhan",
                "Chu nha da xac nhan nhan duoc " + pending.getAmount()
                        + " VND tien mat cho hoa don thang " + bill.getPeriod() + ".",
                "Bill", billId
        );

        return bill;
    }

    /**
     * Reset hoa don ve UNPAID va gui thong bao nhac nho cho tenant.
     * Chi ADMIN / OWNER duoc phep goi.
     */
    @Transactional
    public Bill resetToUnpaidAndNotify(Long billId) {
        Bill bill = findById(billId);
        bill.setStatus(BillStatus.UNPAID);
        bill.setPaidAmount(java.math.BigDecimal.ZERO);
        bill.setLateFee(java.math.BigDecimal.ZERO);
        billRepo.save(bill);

        User tenant = bill.getContract().getTenant();
        notificationService.notify(
                tenant,
                NotificationType.BILL_DUE_SOON,
                "Nhac nho thanh toan hoa don",
                "Hoa don thang " + bill.getPeriod() + " so tien "
                        + bill.getTotalAmount() + " VND can duoc thanh toan truoc ngay "
                        + bill.getDueDate() + ". Vui long vao muc Hoa don de thanh toan.",
                "Bill", billId
        );
        return bill;
    }

    public Bill findById(Long id) {
        return billRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Khong tim thay hoa don id: " + id));
    }

    public List<Bill> getByTenant(Long tenantId) {
        return billRepo.findByTenantId(tenantId);
    }

    public List<Bill> getByContract(Long contractId) {
        return billRepo.findByContractId(contractId);
    }

    public List<BillDTO.Response> getByOwner(Long ownerId) {
        return billRepo.findByOwnerId(ownerId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<BillDTO.Response> getByManager(Long managerId) {
        return billRepo.findByAssignedManagerId(managerId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public BillDTO.Response toResponse(Bill b) {
        BillDTO.Response r = new BillDTO.Response();
        r.setId(b.getId());
        r.setContractId(b.getContract().getId());
        r.setTenantName(b.getContract().getTenant().getFullName());
        r.setRoomNo(b.getContract().getRoom().getRoomNo());
        r.setBuildingName(b.getContract().getRoom().getBuilding().getName());
        r.setPeriod(b.getPeriod());
        r.setTotalAmount(b.getTotalAmount());
        r.setPaidAmount(b.getPaidAmount());
        r.setLateFee(b.getLateFee());
        r.setDueDate(b.getDueDate() != null ? b.getDueDate().toString() : null);
        r.setStatus(b.getStatus().name());
        List<BillDTO.ItemResponse> items = billItemRepo.findByBillId(b.getId()).stream()
                .map(i -> {
                    BillDTO.ItemResponse ir = new BillDTO.ItemResponse();
                    ir.setId(i.getId());
                    ir.setItemType(i.getItemType());
                    ir.setDescription(i.getDescription());
                    ir.setAmount(i.getAmount());
                    ir.setPreviousReading(i.getPreviousReading());
                    ir.setCurrentReading(i.getCurrentReading());
                    ir.setUnitPrice(i.getUnitPrice());
                    return ir;
                }).collect(Collectors.toList());
        r.setItems(items);

        // Bao gom cac giao dich thanh toan (de owner xem proof image, tenant xem lich su)
        List<BillDTO.PaymentResponse> payments = paymentRepo.findByBillId(b.getId()).stream()
                .map(p -> {
                    BillDTO.PaymentResponse pr = new BillDTO.PaymentResponse();
                    pr.setId(p.getId());
                    pr.setAmount(p.getAmount());
                    pr.setMethod(p.getMethod());
                    pr.setStatus(p.getStatus());
                    pr.setReferenceCode(p.getReferenceCode());
                    pr.setNote(p.getNote());
                    pr.setProofImageUrl(p.getProofImageUrl());
                    pr.setPaidAt(p.getPaidAt() != null ? p.getPaidAt().toString() : null);
                    return pr;
                }).collect(Collectors.toList());
        r.setPayments(payments);

        return r;
    }
}
