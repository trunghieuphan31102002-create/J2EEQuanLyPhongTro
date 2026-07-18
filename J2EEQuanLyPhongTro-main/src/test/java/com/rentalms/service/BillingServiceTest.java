package com.rentalms.service;

import com.rentalms.dto.BillDTO;
import com.rentalms.entity.*;
import com.rentalms.enums.BillStatus;
import com.rentalms.enums.ContractStatus;
import com.rentalms.enums.NotificationType;
import com.rentalms.exception.BusinessException;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.BillItemRepository;
import com.rentalms.repository.BillRepository;
import com.rentalms.repository.ContractRepository;
import com.rentalms.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {

    @Mock private BillRepository billRepo;
    @Mock private BillItemRepository billItemRepo;
    @Mock private PaymentRepository paymentRepo;
    @Mock private ContractRepository contractRepo;
    @Mock private AuditService auditService;
    @Mock private NotificationService notificationService;
    @Mock private BuildingAccessService accessService;
    @Mock private UserService userService;

    @InjectMocks
    private BillingService billingService;

    private User tenant;
    private User owner;
    private User actor;
    private Room room;
    private Building building;
    private Contract contract;
    private Bill bill;

    private final Long tenantId = 20L;
    private final Long ownerId = 10L;
    private final Long actorId = 10L;
    private final Long roomId = 100L;
    private final Long contractId = 500L;
    private final Long billId = 1000L;
    private final String period = "2026-07";
    private final BigDecimal monthlyRent = new BigDecimal("5000000");

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(ownerId)
                .email("owner@test.com")
                .fullName("Test Owner")
                .role(com.rentalms.enums.UserRole.OWNER)
                .active(true)
                .build();

        tenant = User.builder()
                .id(tenantId)
                .email("tenant@test.com")
                .fullName("Test Tenant")
                .role(com.rentalms.enums.UserRole.TENANT)
                .active(true)
                .build();

        actor = User.builder()
                .id(actorId)
                .email("actor@test.com")
                .fullName("Test Actor")
                .role(com.rentalms.enums.UserRole.OWNER)
                .active(true)
                .build();

        building = Building.builder()
                .id(1L)
                .name("Test Building")
                .owner(owner)
                .electricityUnitPrice(new BigDecimal("3500"))
                .waterUnitPrice(new BigDecimal("20000"))
                .build();

        room = Room.builder()
                .id(roomId)
                .roomNo("A101")
                .building(building)
                .build();

        contract = Contract.builder()
                .id(contractId)
                .room(room)
                .tenant(tenant)
                .owner(owner)
                .monthlyRent(monthlyRent)
                .status(ContractStatus.ACTIVE)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(12))
                .build();

        bill = Bill.builder()
                .id(billId)
                .contract(contract)
                .period(period)
                .dueDate(LocalDate.now().plusDays(15))
                .status(BillStatus.UNPAID)
                .totalAmount(monthlyRent)
                .paidAmount(BigDecimal.ZERO)
                .lateFee(BigDecimal.ZERO)
                .build();
    }

    // ============================
    // SECTION 1: generateBillForContract()
    // ============================

    @Test
    @DisplayName("BILL-001: Tạo bill mới thành công")
    void generateBillForContract_success() {
        when(billRepo.findByContractIdAndPeriod(contractId, period)).thenReturn(Optional.empty());
        when(billRepo.save(any(Bill.class))).thenAnswer(inv -> {
            Bill b = inv.getArgument(0);
            if (b.getId() == null) b.setId(billId);
            return b;
        });

        Bill result = billingService.generateBillForContract(contract, period);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(BillStatus.UNPAID);
        assertThat(result.getPeriod()).isEqualTo(period);
        assertThat(result.getDueDate()).isEqualTo(LocalDate.now().plusDays(15));
        assertThat(result.getTotalAmount()).isEqualByComparingTo(monthlyRent);
        verify(billRepo, times(2)).save(any(Bill.class));
    }

    @Test
    @DisplayName("BILL-002: Throw exception khi bill period đã tồn tại")
    void generateBillForContract_duplicate() {
        when(billRepo.findByContractIdAndPeriod(contractId, period)).thenReturn(Optional.of(bill));

        assertThatThrownBy(() -> billingService.generateBillForContract(contract, period))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining(period);

        verify(billRepo, never()).save(any(Bill.class));
    }

    @Test
    @DisplayName("BILL-003: BillItem RENT được tạo đúng")
    void generateBillForContract_createsRentItem() {
        when(billRepo.findByContractIdAndPeriod(contractId, period)).thenReturn(Optional.empty());
        when(billRepo.save(any(Bill.class))).thenAnswer(inv -> {
            Bill b = inv.getArgument(0);
            if (b.getId() == null) b.setId(billId);
            return b;
        });

        billingService.generateBillForContract(contract, period);

        ArgumentCaptor<BillItem> captor = ArgumentCaptor.forClass(BillItem.class);
        verify(billItemRepo).save(captor.capture());
        BillItem saved = captor.getValue();
        assertThat(saved.getItemType()).isEqualTo("RENT");
        assertThat(saved.getDescription()).contains(period);
        assertThat(saved.getAmount()).isEqualByComparingTo(monthlyRent);
    }

    @Test
    @DisplayName("BILL-004: Notification BILL_ISSUED được gửi")
    void generateBillForContract_sendsNotification() {
        when(billRepo.findByContractIdAndPeriod(contractId, period)).thenReturn(Optional.empty());
        when(billRepo.save(any(Bill.class))).thenAnswer(inv -> {
            Bill b = inv.getArgument(0);
            if (b.getId() == null) b.setId(billId);
            return b;
        });

        billingService.generateBillForContract(contract, period);

        verify(notificationService).notify(
                eq(tenant),
                eq(NotificationType.BILL_ISSUED),
                anyString(),
                anyString(),
                eq("Bill"),
                eq(billId)
        );
    }

    // ============================
    // SECTION 2: setUtilityReadings()
    // ============================

    @Test
    @DisplayName("BILL-010: Cập nhật cả điện và nước thành công")
    void setUtilityReadings_success() {
        // Bill đã có BillItem RENT sẵn (giả lập DB)
        BillItem rentItem = BillItem.builder()
                .id(99L).bill(bill).itemType("RENT")
                .description("Tien thue").amount(monthlyRent).build();
        BillItem elecItem = BillItem.builder()
                .id(100L).bill(bill).itemType("ELECTRICITY")
                .description("Dien").amount(new BigDecimal("525000")).build();
        BillItem waterItem = BillItem.builder()
                .id(101L).bill(bill).itemType("WATER")
                .description("Nuoc").amount(new BigDecimal("500000")).build();

        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(250.0);
        req.setWaterOld(50.0);
        req.setWaterNew(75.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        // Lần 1: trả về các items hiện tại (chỉ RENT, không có ELEC/WATER)
        // Lần 2: trả về tất cả items (RENT + ELEC + WATER mới save) để tính total
        when(billItemRepo.findByBillId(billId))
                .thenReturn(List.of(rentItem))
                .thenReturn(List.of(rentItem, elecItem, waterItem));
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        Bill result = billingService.setUtilityReadings(billId, req, actorId);

        assertThat(result).isNotNull();
        // 150 kWh * 3500 = 525000
        // 25 m3 * 20000 = 500000
        // total = 5000000 (RENT) + 525000 (ELEC) + 500000 (WATER) = 6025000
        assertThat(result.getTotalAmount()).isEqualByComparingTo(new BigDecimal("6025000"));
        verify(billItemRepo, times(2)).save(any(BillItem.class));
    }

    @Test
    @DisplayName("BILL-011: Cập nhật chỉ điện (nước null)")
    void setUtilityReadings_electricityOnly() {
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(250.0);
        // water null

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        Bill result = billingService.setUtilityReadings(billId, req, actorId);

        assertThat(result).isNotNull();
        verify(billItemRepo, times(1)).save(any(BillItem.class));
    }

    @Test
    @DisplayName("BILL-012: Cập nhật chỉ nước (điện null)")
    void setUtilityReadings_waterOnly() {
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setWaterOld(50.0);
        req.setWaterNew(75.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        Bill result = billingService.setUtilityReadings(billId, req, actorId);

        assertThat(result).isNotNull();
        verify(billItemRepo, times(1)).save(any(BillItem.class));
    }

    @Test
    @DisplayName("BILL-013: electricityNew < electricityOld → bỏ qua")
    void setUtilityReadings_electricityNewLessThanOld() {
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(250.0);
        req.setElectricityNew(100.0);
        req.setWaterOld(50.0);
        req.setWaterNew(75.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        Bill result = billingService.setUtilityReadings(billId, req, actorId);

        assertThat(result).isNotNull();
        // Chỉ tạo WATER, không tạo ELECTRICITY
        verify(billItemRepo, times(1)).save(any(BillItem.class));
    }

    @Test
    @DisplayName("BILL-014: waterNew < waterOld → bỏ qua")
    void setUtilityReadings_waterNewLessThanOld() {
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(250.0);
        req.setWaterOld(75.0);
        req.setWaterNew(50.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        Bill result = billingService.setUtilityReadings(billId, req, actorId);

        assertThat(result).isNotNull();
        // Chỉ tạo ELECTRICITY
        verify(billItemRepo, times(1)).save(any(BillItem.class));
    }

    @Test
    @DisplayName("BILL-015: electricityNew = electricityOld → consumption = 0")
    void setUtilityReadings_zeroConsumption() {
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(100.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        billingService.setUtilityReadings(billId, req, actorId);

        ArgumentCaptor<BillItem> captor = ArgumentCaptor.forClass(BillItem.class);
        verify(billItemRepo).save(captor.capture());
        assertThat(captor.getValue().getAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("BILL-016: Bill PAID → exception")
    void setUtilityReadings_billPaid() {
        bill.setStatus(BillStatus.PAID);
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(200.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());

        assertThatThrownBy(() -> billingService.setUtilityReadings(billId, req, actorId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("thanh toan");
    }

    @Test
    @DisplayName("BILL-017: Bill CANCELLED → exception")
    void setUtilityReadings_billCancelled() {
        bill.setStatus(BillStatus.CANCELLED);
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(200.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());

        assertThatThrownBy(() -> billingService.setUtilityReadings(billId, req, actorId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("BILL-018: Actor không có quyền → exception")
    void setUtilityReadings_noPermission() {
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(200.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doThrow(new BusinessException("Khong co quyen"))
                .when(accessService).assertCanManage(any(), any());

        assertThatThrownBy(() -> billingService.setUtilityReadings(billId, req, actorId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("BILL-019: electricityUnitPrice null → dùng default 3500")
    void setUtilityReadings_electricityDefaultPrice() {
        building.setElectricityUnitPrice(null);
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(150.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        billingService.setUtilityReadings(billId, req, actorId);

        ArgumentCaptor<BillItem> captor = ArgumentCaptor.forClass(BillItem.class);
        verify(billItemRepo).save(captor.capture());
        assertThat(captor.getValue().getUnitPrice()).isEqualByComparingTo(new BigDecimal("3500"));
    }

    @Test
    @DisplayName("BILL-020: waterUnitPrice null → dùng default 20000")
    void setUtilityReadings_waterDefaultPrice() {
        building.setWaterUnitPrice(null);
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setWaterOld(50.0);
        req.setWaterNew(60.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        billingService.setUtilityReadings(billId, req, actorId);

        ArgumentCaptor<BillItem> captor = ArgumentCaptor.forClass(BillItem.class);
        verify(billItemRepo).save(captor.capture());
        assertThat(captor.getValue().getUnitPrice()).isEqualByComparingTo(new BigDecimal("20000"));
    }

    @Test
    @DisplayName("BILL-021: BillItem ELECTRICITY/WATER cũ bị xóa")
    void setUtilityReadings_deletesOldItems() {
        BillItem oldElec = BillItem.builder().id(1L).bill(bill).itemType("ELECTRICITY").amount(new BigDecimal("100000")).build();
        BillItem oldWater = BillItem.builder().id(2L).bill(bill).itemType("WATER").amount(new BigDecimal("50000")).build();

        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(150.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        // Lần đầu gọi findByBillId: trả về items cũ; lần sau: trả về empty
        when(billItemRepo.findByBillId(billId))
                .thenReturn(List.of(oldElec, oldWater))
                .thenReturn(Collections.emptyList());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        billingService.setUtilityReadings(billId, req, actorId);

        verify(billItemRepo).delete(oldElec);
        verify(billItemRepo).delete(oldWater);
    }

    @Test
    @DisplayName("BILL-022: Audit log SET_UTILITIES được ghi")
    void setUtilityReadings_auditLog() {
        BillDTO.SetUtilitiesRequest req = new BillDTO.SetUtilitiesRequest();
        req.setElectricityOld(100.0);
        req.setElectricityNew(150.0);
        req.setWaterOld(50.0);
        req.setWaterNew(60.0);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        billingService.setUtilityReadings(billId, req, actorId);

        verify(auditService).log(eq(actorId), isNull(), eq("SET_UTILITIES"),
                eq("Bill"), eq(billId), anyString());
    }

    // ============================
    // SECTION 3: pay()
    // ============================

    @Test
    @DisplayName("BILL-030: Pay bằng CASH → Payment PENDING, bill PENDING_CONFIRMATION")
    void pay_cash_pending() {
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod("CASH");
        req.setReferenceCode("REF001");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Payment result = billingService.pay(billId, req, tenantId);

        assertThat(result.getStatus()).isEqualTo("PENDING");
        assertThat(bill.getStatus()).isEqualTo(BillStatus.PENDING_CONFIRMATION);
        verify(auditService).log(eq(tenantId), isNull(), eq("PAYMENT_PENDING"),
                eq("Bill"), eq(billId), anyString());
    }

    @Test
    @DisplayName("BILL-031: Pay bằng BANK_TRANSFER → Payment PENDING")
    void pay_bankTransfer_pending() {
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod("BANK_TRANSFER");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Payment result = billingService.pay(billId, req, tenantId);

        assertThat(result.getStatus()).isEqualTo("PENDING");
        assertThat(bill.getStatus()).isEqualTo(BillStatus.PENDING_CONFIRMATION);
    }

    @Test
    @DisplayName("BILL-032: Pay bằng VNPAY → Payment SUCCESS, paidAmount cập nhật")
    void pay_vnpay_autoSuccess() {
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod("VNPAY");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Payment result = billingService.pay(billId, req, tenantId);

        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        assertThat(bill.getPaidAmount()).isEqualByComparingTo(monthlyRent);
        assertThat(bill.getStatus()).isEqualTo(BillStatus.PAID);
    }

    @Test
    @DisplayName("BILL-033: Pay đủ → bill PAID")
    void pay_fullPayment_paid() {
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod("VNPAY");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        billingService.pay(billId, req, tenantId);

        assertThat(bill.getStatus()).isEqualTo(BillStatus.PAID);
    }

    @Test
    @DisplayName("BILL-034: Pay thiếu → bill PARTIAL")
    void pay_partialPayment() {
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(new BigDecimal("2000000"));
        req.setMethod("VNPAY");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        billingService.pay(billId, req, tenantId);

        assertThat(bill.getStatus()).isEqualTo(BillStatus.PARTIAL);
        assertThat(bill.getPaidAmount()).isEqualByComparingTo(new BigDecimal("2000000"));
    }

    @Test
    @DisplayName("BILL-035: Pay vượt → bill PAID")
    void pay_overpay() {
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(new BigDecimal("10000000")); // > 5tr
        req.setMethod("VNPAY");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        billingService.pay(billId, req, tenantId);

        assertThat(bill.getStatus()).isEqualTo(BillStatus.PAID);
    }

    @Test
    @DisplayName("BILL-036: Pay có lateFee → tính đúng remaining")
    void pay_withLateFee() {
        bill.setLateFee(new BigDecimal("100000")); // late fee 100k
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(new BigDecimal("5100000")); // total + lateFee
        req.setMethod("VNPAY");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        billingService.pay(billId, req, tenantId);

        assertThat(bill.getStatus()).isEqualTo(BillStatus.PAID);
    }

    @Test
    @DisplayName("BILL-037: Bill PAID → exception khi pay")
    void pay_billAlreadyPaid() {
        bill.setStatus(BillStatus.PAID);
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod("VNPAY");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));

        assertThatThrownBy(() -> billingService.pay(billId, req, tenantId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("thanh toan");
    }

    @Test
    @DisplayName("BILL-038: Bill CANCELLED → exception khi pay")
    void pay_billCancelled() {
        bill.setStatus(BillStatus.CANCELLED);
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod("VNPAY");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));

        assertThatThrownBy(() -> billingService.pay(billId, req, tenantId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("huy");
    }

    @Test
    @DisplayName("BILL-039: Bill PENDING_CONFIRMATION → exception khi pay")
    void pay_billPendingConfirmation() {
        bill.setStatus(BillStatus.PENDING_CONFIRMATION);
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod("CASH");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));

        assertThatThrownBy(() -> billingService.pay(billId, req, tenantId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("xac nhan");
    }

    @Test
    @DisplayName("BILL-040: Method null → auto-success")
    void pay_methodNull() {
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod(null);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Payment result = billingService.pay(billId, req, tenantId);

        assertThat(result.getStatus()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("BILL-041: CASH → notify owner")
    void pay_cash_notifyOwner() {
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod("CASH");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        billingService.pay(billId, req, tenantId);

        verify(notificationService).notify(eq(owner), eq(NotificationType.BILL_PAID),
                anyString(), anyString(), eq("Bill"), eq(billId));
    }

    @Test
    @DisplayName("BILL-042: VNPAY → notify owner")
    void pay_vnpay_notifyOwner() {
        BillDTO.PayRequest req = new BillDTO.PayRequest();
        req.setAmount(monthlyRent);
        req.setMethod("VNPAY");

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        billingService.pay(billId, req, tenantId);

        verify(notificationService).notify(eq(owner), eq(NotificationType.BILL_PAID),
                anyString(), anyString(), eq("Bill"), eq(billId));
    }

    // ============================
    // SECTION 4: confirmCashPayment()
    // ============================

    @Test
    @DisplayName("BILL-050: Confirm → bill PAID khi đủ tiền")
    void confirmCashPayment_paid() {
        bill.setStatus(BillStatus.PENDING_CONFIRMATION);
        Payment pending = Payment.builder()
                .id(1L)
                .bill(bill)
                .amount(monthlyRent)
                .method("CASH")
                .status("PENDING")
                .build();

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(paymentRepo.findPendingPayment(billId)).thenReturn(Optional.of(pending));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Bill result = billingService.confirmCashPayment(billId, actorId);

        assertThat(result.getStatus()).isEqualTo(BillStatus.PAID);
        assertThat(pending.getStatus()).isEqualTo("SUCCESS");
        assertThat(bill.getPaidAmount()).isEqualByComparingTo(monthlyRent);
    }

    @Test
    @DisplayName("BILL-051: Confirm → bill PARTIAL khi thiếu tiền")
    void confirmCashPayment_partial() {
        bill.setStatus(BillStatus.PENDING_CONFIRMATION);
        Payment pending = Payment.builder()
                .id(1L)
                .bill(bill)
                .amount(new BigDecimal("2000000"))
                .method("CASH")
                .status("PENDING")
                .build();

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(paymentRepo.findPendingPayment(billId)).thenReturn(Optional.of(pending));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        Bill result = billingService.confirmCashPayment(billId, actorId);

        assertThat(result.getStatus()).isEqualTo(BillStatus.PARTIAL);
    }

    @Test
    @DisplayName("BILL-052: Bill không ở PENDING_CONFIRMATION → exception")
    void confirmCashPayment_wrongStatus() {
        bill.setStatus(BillStatus.UNPAID);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());

        assertThatThrownBy(() -> billingService.confirmCashPayment(billId, actorId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("xac nhan");
    }

    @Test
    @DisplayName("BILL-053: Actor không có quyền")
    void confirmCashPayment_noPermission() {
        bill.setStatus(BillStatus.PENDING_CONFIRMATION);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doThrow(new BusinessException("Khong co quyen"))
                .when(accessService).assertCanManage(any(), any());

        assertThatThrownBy(() -> billingService.confirmCashPayment(billId, actorId))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("BILL-054: Không tìm thấy pending payment → NotFoundException")
    void confirmCashPayment_noPendingPayment() {
        bill.setStatus(BillStatus.PENDING_CONFIRMATION);

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(paymentRepo.findPendingPayment(billId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> billingService.confirmCashPayment(billId, actorId))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("BILL-056: Verify notify tenant sau khi confirm")
    void confirmCashPayment_notifyTenant() {
        bill.setStatus(BillStatus.PENDING_CONFIRMATION);
        Payment pending = Payment.builder()
                .id(1L)
                .bill(bill)
                .amount(monthlyRent)
                .method("CASH")
                .status("PENDING")
                .build();

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(paymentRepo.findPendingPayment(billId)).thenReturn(Optional.of(pending));
        when(paymentRepo.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        billingService.confirmCashPayment(billId, actorId);

        verify(notificationService).notify(eq(tenant), eq(NotificationType.BILL_PAID),
                anyString(), anyString(), eq("Bill"), eq(billId));
    }

    // ============================
    // SECTION 5: addItem()
    // ============================

    @Test
    @DisplayName("BILL-060: Add item thành công")
    void addItem_success() {
        BillDTO.AddItemRequest req = new BillDTO.AddItemRequest();
        req.setItemType("SERVICE");
        req.setDescription("Phi dich vu");
        req.setAmount(new BigDecimal("200000"));

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doNothing().when(accessService).assertCanManage(any(), any());
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        Bill result = billingService.addItem(billId, req, actorId);

        assertThat(result).isNotNull();
        verify(billItemRepo).save(any(BillItem.class));
        verify(auditService).log(eq(actorId), isNull(), eq("ADD_ITEM"),
                eq("Bill"), eq(billId), anyString());
    }

    @Test
    @DisplayName("BILL-061: Add item với actor không có quyền")
    void addItem_noPermission() {
        BillDTO.AddItemRequest req = new BillDTO.AddItemRequest();
        req.setItemType("SERVICE");
        req.setAmount(new BigDecimal("200000"));

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(userService.findById(actorId)).thenReturn(actor);
        doThrow(new BusinessException("Khong co quyen"))
                .when(accessService).assertCanManage(any(), any());

        assertThatThrownBy(() -> billingService.addItem(billId, req, actorId))
                .isInstanceOf(BusinessException.class);
    }

    // ============================
    // SECTION 6: resetToUnpaidAndNotify()
    // ============================

    @Test
    @DisplayName("BILL-070: Reset bill thành công")
    void resetToUnpaidAndNotify_success() {
        bill.setStatus(BillStatus.PAID);
        bill.setPaidAmount(monthlyRent);
        bill.setLateFee(new BigDecimal("100000"));

        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        Bill result = billingService.resetToUnpaidAndNotify(billId);

        assertThat(result.getStatus()).isEqualTo(BillStatus.UNPAID);
        assertThat(result.getPaidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.getLateFee()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(notificationService).notify(eq(tenant), eq(NotificationType.BILL_DUE_SOON),
                anyString(), anyString(), eq("Bill"), eq(billId));
    }

    // ============================
    // SECTION 7: Scheduled Jobs
    // ============================

    @Test
    @DisplayName("BILL-080: autoGenerateMonthlyBills với contracts ACTIVE")
    void autoGenerateMonthlyBills_success() {
        when(contractRepo.findByStatus(ContractStatus.ACTIVE)).thenReturn(List.of(contract));
        when(billRepo.findByContractIdAndPeriod(eq(contractId), anyString())).thenReturn(Optional.empty());
        when(billRepo.save(any(Bill.class))).thenAnswer(inv -> {
            Bill b = inv.getArgument(0);
            if (b.getId() == null) b.setId(billId);
            return b;
        });

        billingService.autoGenerateMonthlyBills();

        verify(billRepo, atLeastOnce()).save(any(Bill.class));
        verify(notificationService).notify(eq(tenant), eq(NotificationType.BILL_ISSUED),
                anyString(), anyString(), eq("Bill"), anyLong());
    }

    @Test
    @DisplayName("BILL-081: autoGenerateMonthlyBills - 1 contract lỗi → tiếp tục")
    void autoGenerateMonthlyBills_continueOnError() {
        Contract contract2 = Contract.builder()
                .id(501L)
                .room(room)
                .tenant(tenant)
                .owner(owner)
                .monthlyRent(monthlyRent)
                .status(ContractStatus.ACTIVE)
                .build();

        when(contractRepo.findByStatus(ContractStatus.ACTIVE)).thenReturn(List.of(contract, contract2));
        // Contract 1 đã có bill → exception, contract 2 OK
        when(billRepo.findByContractIdAndPeriod(eq(contractId), anyString()))
                .thenReturn(Optional.of(bill));
        when(billRepo.findByContractIdAndPeriod(eq(501L), anyString()))
                .thenReturn(Optional.empty());
        when(billRepo.save(any(Bill.class))).thenAnswer(inv -> {
            Bill b = inv.getArgument(0);
            if (b.getId() == null) b.setId(billId);
            return b;
        });

        // Không ném exception ra ngoài
        billingService.autoGenerateMonthlyBills();

        verify(notificationService, atLeastOnce()).notify(eq(tenant),
                eq(NotificationType.BILL_ISSUED), anyString(), anyString(), eq("Bill"), anyLong());
    }

    @Test
    @DisplayName("BILL-082: markOverdueBills - Bill UNPAID → OVERDUE + lateFee")
    void markOverdueBills_unpaidToOverdue() {
        when(billRepo.findOverdue(any(LocalDate.class))).thenReturn(List.of(bill));
        when(billRepo.save(any(Bill.class))).thenReturn(bill);

        billingService.markOverdueBills();

        assertThat(bill.getStatus()).isEqualTo(BillStatus.OVERDUE);
        // lateFee = 5000000 * 0.05 = 250000
        assertThat(bill.getLateFee()).isEqualByComparingTo(new BigDecimal("250000"));
        verify(notificationService).notify(eq(tenant), eq(NotificationType.BILL_OVERDUE),
                anyString(), anyString(), eq("Bill"), eq(billId));
    }

    @Test
    @DisplayName("BILL-083: markOverdueBills - Bill PAID → bỏ qua")
    void markOverdueBills_paidSkipped() {
        bill.setStatus(BillStatus.PAID);
        when(billRepo.findOverdue(any(LocalDate.class))).thenReturn(List.of(bill));

        billingService.markOverdueBills();

        verify(billRepo, never()).save(any(Bill.class));
        verify(notificationService, never()).notify(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("BILL-085: remindDueSoonBills - Notify tenant")
    void remindDueSoonBills_notify() {
        when(billRepo.findDueSoon(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(bill));

        billingService.remindDueSoonBills();

        verify(notificationService).notify(eq(tenant), eq(NotificationType.BILL_DUE_SOON),
                anyString(), anyString(), eq("Bill"), eq(billId));
    }

    // ============================
    // SECTION 8: Query methods
    // ============================

    @Test
    @DisplayName("BILL-090: findById tìm thấy")
    void findById_success() {
        when(billRepo.findById(billId)).thenReturn(Optional.of(bill));

        Bill result = billingService.findById(billId);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(billId);
    }

    @Test
    @DisplayName("BILL-091: findById không tìm thấy → NotFoundException")
    void findById_notFound() {
        when(billRepo.findById(billId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> billingService.findById(billId))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("BILL-092: getByTenant trả về list")
    void getByTenant_success() {
        when(billRepo.findByTenantId(tenantId)).thenReturn(List.of(bill));

        List<Bill> result = billingService.getByTenant(tenantId);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("BILL-093: getByContract trả về list")
    void getByContract_success() {
        when(billRepo.findByContractId(contractId)).thenReturn(List.of(bill));

        List<Bill> result = billingService.getByContract(contractId);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("BILL-094: getByOwner chuyển sang Response DTO")
    void getByOwner_success() {
        when(billRepo.findByOwnerId(ownerId)).thenReturn(List.of(bill));
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(paymentRepo.findByBillId(billId)).thenReturn(Collections.emptyList());

        List<BillDTO.Response> result = billingService.getByOwner(ownerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(billId);
        assertThat(result.get(0).getStatus()).isEqualTo("UNPAID");
    }

    @Test
    @DisplayName("BILL-095: getByManager chuyển sang Response DTO")
    void getByManager_success() {
        when(billRepo.findByAssignedManagerId(actorId)).thenReturn(List.of(bill));
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(paymentRepo.findByBillId(billId)).thenReturn(Collections.emptyList());

        List<BillDTO.Response> result = billingService.getByManager(actorId);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("BILL-096: toResponse mapping đầy đủ fields")
    void toResponse_fullMapping() {
        when(billItemRepo.findByBillId(billId)).thenReturn(Collections.emptyList());
        when(paymentRepo.findByBillId(billId)).thenReturn(Collections.emptyList());

        BillDTO.Response result = billingService.toResponse(bill);

        assertThat(result.getId()).isEqualTo(billId);
        assertThat(result.getContractId()).isEqualTo(contractId);
        assertThat(result.getTenantName()).isEqualTo("Test Tenant");
        assertThat(result.getRoomNo()).isEqualTo("A101");
        assertThat(result.getBuildingName()).isEqualTo("Test Building");
        assertThat(result.getPeriod()).isEqualTo(period);
        assertThat(result.getStatus()).isEqualTo("UNPAID");
        assertThat(result.getItems()).isEmpty();
        assertThat(result.getPayments()).isEmpty();
    }
}