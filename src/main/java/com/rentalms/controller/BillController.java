package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.dto.BillDTO;
import com.rentalms.entity.Bill;
import com.rentalms.entity.Payment;
import com.rentalms.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillingService billingService;
    private final CurrentUser currentUser;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Bill>>> getMyBills() {
        var user = currentUser.get();
        List<Bill> bills = billingService.getByTenant(user.getId());
        return ResponseEntity.ok(ApiResponse.ok(bills));
    }

    @GetMapping("/owner-view")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<List<BillDTO.Response>>> getOwnerBills() {
        var user = currentUser.get();
        List<BillDTO.Response> bills = switch (user.getRole()) {
            case MANAGER -> billingService.getByManager(user.getId());
            default      -> billingService.getByOwner(user.getId());
        };
        return ResponseEntity.ok(ApiResponse.ok(bills));
    }

    @GetMapping("/contract/{contractId}")
    public ResponseEntity<ApiResponse<List<Bill>>> getByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(ApiResponse.ok(billingService.getByContract(contractId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BillDTO.Response>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(billingService.toResponse(billingService.findById(id))));
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('TENANT','OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Payment>> pay(
            @PathVariable Long id,
            @Valid @RequestBody BillDTO.PayRequest req) {
        Payment payment = billingService.pay(id, req, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Thanh toan thanh cong", payment));
    }

    @PostMapping("/{id}/items")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Bill>> addItem(
            @PathVariable Long id,
            @Valid @RequestBody BillDTO.AddItemRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Them khoan phi thanh cong",
                billingService.addItem(id, req, currentUser.getId())));
    }

    @PostMapping("/{id}/utilities")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<BillDTO.Response>> setUtilities(
            @PathVariable Long id,
            @RequestBody BillDTO.SetUtilitiesRequest req) {
        Bill bill = billingService.setUtilityReadings(id, req, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Cap nhat tien dien/nuoc thanh cong",
                billingService.toResponse(bill)));
    }

    @PostMapping("/{id}/confirm-cash")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Bill>> confirmCash(@PathVariable Long id) {
        Bill bill = billingService.confirmCashPayment(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Da xac nhan thanh toan tien mat", bill));
    }

    // Reset hoa don ve UNPAID va gui thong bao nhac nho cho tenant (Admin/Owner)
    @PostMapping("/{id}/reset-unpaid")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Bill>> resetUnpaid(@PathVariable Long id) {
        Bill bill = billingService.resetToUnpaidAndNotify(id);
        return ResponseEntity.ok(ApiResponse.ok("Da reset hoa don ve UNPAID va gui thong bao cho tenant", bill));
    }

    // Trigger thu cong (demo/test)
    @PostMapping("/generate/{contractId}")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Bill>> generateManual(
            @PathVariable Long contractId,
            @RequestBody Map<String, String> body) {
        var contract = new com.rentalms.entity.Contract();
        contract.setId(contractId);
        // Lay tu service
        var billingServiceFull = billingService;
        String period = body.getOrDefault("period",
                java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM")));
        // Can inject ContractService - dung endpoint khac
        return ResponseEntity.ok(ApiResponse.<Bill>ok("Xem endpoint POST /api/bills/contract/{id}/generate", null));
    }
}
