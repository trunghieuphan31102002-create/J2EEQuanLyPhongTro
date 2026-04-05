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

        boolean isCash = "CASH".equalsIgnoreCase(req.getMethod());

        Payment payment = Payment.builder()
                .bill(bill)
                .amount(req.getAmount())
                .method(req.getMethod())
                .referenceCode(req.getReferenceCode())
                .note(req.getNote())
                .status(isCash ? "PENDING" : "SUCCESS")
                .paidAt(java.time.LocalDateTime.now())
                .build();
        paymentRepo.save(payment);

        if (isCash) {
            // Chua cap nhat paidAmount — cho owner xac nhan
            bill.setStatus(BillStatus.PENDING_CONFIRMATION);
            billRepo.save(bill);

            auditService.log(tenantId, null, "PAYMENT_PENDING", "Bill", billId,
                    "Khai bao thanh toan tien mat " + req.getAmount() + " VND - cho xac nhan");

            // Thong bao cho chu nha de xac nhan
            User owner = bill.getContract().getOwner();
            User tenant = bill.getContract().getTenant();
            notificationService.notify(
                    owner,
                    NotificationType.BILL_PAID,
                    "Tenant khai bao thanh toan tien mat",
                    tenant.getFullName() + " khai bao da thanh toan tien mat "
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

        Payment pending = paymentRepo.findPendingCashPayment(billId)
                .orElseThrow(() -> new NotFoundException("Khong tim thay giao dich tien mat cho hoa don nay"));

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
                    return ir;
                }).collect(Collectors.toList());
        r.setItems(items);
        return r;
    }
}
