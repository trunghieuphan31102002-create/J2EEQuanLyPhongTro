package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.dto.BillDTO;
import com.rentalms.entity.Bill;
import com.rentalms.enums.BillStatus;
import com.rentalms.exception.BusinessException;
import com.rentalms.service.BillingService;
import com.rentalms.service.VnpayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * Endpoint tich hop VNPay.
 *
 * Flow:
 *  1. POST /api/vnpay/create-payment/{billId}  → tra ve URL thanh toan (can JWT)
 *  2. User redirect sang URL → thanh toan trong trang VNPay
 *  3. VNPay goi IPN (server-to-server): GET /api/vnpay/ipn → backend cap nhat bill
 *  4. VNPay redirect user ve return URL (cua frontend) → frontend hien ket qua
 */
@Slf4j
@RestController
@RequestMapping("/api/vnpay")
@RequiredArgsConstructor
public class VnpayController {

    private final VnpayService vnpayService;
    private final BillingService billingService;
    private final CurrentUser currentUser;

    @Value("${vnpay.frontend-result-url:}")
    private String frontendResultUrl;

    /**
     * Tao URL thanh toan cho 1 hoa don cu the.
     * Chi tenant cua hoa don moi duoc phep.
     */
    @PostMapping("/create-payment/{billId}")
    public ResponseEntity<ApiResponse<Map<String, String>>> createPayment(
            @PathVariable Long billId,
            HttpServletRequest request) {

        Bill bill = billingService.findById(billId);

        // Chi tenant cua hoa don moi duoc thanh toan
        Long uid = currentUser.getId();
        if (!bill.getContract().getTenant().getId().equals(uid)) {
            throw new BusinessException("Ban khong co quyen thanh toan hoa don nay");
        }

        if (bill.getStatus() == BillStatus.PAID) {
            throw new BusinessException("Hoa don nay da duoc thanh toan");
        }
        if (bill.getStatus() == BillStatus.CANCELLED) {
            throw new BusinessException("Hoa don da bi huy");
        }

        // Tinh so tien con phai tra
        BigDecimal remaining = bill.getTotalAmount()
                .add(bill.getLateFee() == null ? BigDecimal.ZERO : bill.getLateFee())
                .subtract(bill.getPaidAmount() == null ? BigDecimal.ZERO : bill.getPaidAmount());
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Hoa don khong con so tien nao de thanh toan");
        }

        String orderInfo = "Thanh toan hoa don #" + billId + " ky " + bill.getPeriod();
        String ipAddr = extractClientIp(request);

        String payUrl = vnpayService.createPaymentUrl(billId, remaining.longValue(), orderInfo, ipAddr);

        Map<String, String> data = new HashMap<>();
        data.put("paymentUrl", payUrl);
        return ResponseEntity.ok(ApiResponse.ok("Tao URL thanh toan thanh cong", data));
    }

    /**
     * Return URL: VNPay redirect user ve day sau khi thanh toan xong.
     * Chuyen huong tiep ve frontend de hien ket qua cho user.
     */
    @GetMapping("/return")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> params) {
        boolean valid = vnpayService.verifyCallback(params);
        String responseCode = params.getOrDefault("vnp_ResponseCode", "99");
        String txnRef = params.getOrDefault("vnp_TxnRef", "");
        Long billId = vnpayService.extractBillId(txnRef);

        // Build URL ve frontend kem query params
        StringBuilder url = new StringBuilder(frontendResultUrl == null ? "/" : frontendResultUrl);
        url.append("?valid=").append(valid)
                .append("&code=").append(responseCode)
                .append("&billId=").append(billId == null ? "" : billId)
                .append("&amount=").append(params.getOrDefault("vnp_Amount", ""));

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(url.toString()));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    /**
     * IPN: VNPay goi server-to-server de xac nhan ket qua thanh toan.
     * Day la nguon tin cay nhat — cap nhat DB o day.
     */
    @GetMapping("/ipn")
    public ResponseEntity<Map<String, String>> vnpayIpn(@RequestParam Map<String, String> params) {
        Map<String, String> response = new HashMap<>();

        if (!vnpayService.verifyCallback(params)) {
            log.warn("VNPay IPN: invalid signature");
            response.put("RspCode", "97");
            response.put("Message", "Invalid Checksum");
            return ResponseEntity.ok(response);
        }

        String txnRef = params.get("vnp_TxnRef");
        Long billId = vnpayService.extractBillId(txnRef);
        if (billId == null) {
            response.put("RspCode", "01");
            response.put("Message", "Order not found");
            return ResponseEntity.ok(response);
        }

        Bill bill;
        try {
            bill = billingService.findById(billId);
        } catch (Exception e) {
            response.put("RspCode", "01");
            response.put("Message", "Order not found");
            return ResponseEntity.ok(response);
        }

        // So tien VNPay gui ve (x100, VND)
        long vnpAmount = Long.parseLong(params.getOrDefault("vnp_Amount", "0")) / 100;
        String responseCode = params.get("vnp_ResponseCode");
        String transactionStatus = params.get("vnp_TransactionStatus");

        // Idempotent: neu bill da PAID roi thi khong xu ly lai
        if (bill.getStatus() == BillStatus.PAID) {
            response.put("RspCode", "02");
            response.put("Message", "Order already confirmed");
            return ResponseEntity.ok(response);
        }

        if ("00".equals(responseCode) && "00".equals(transactionStatus)) {
            // Thanh toan thanh cong → tao Payment voi method VNPAY, bill se tu chuyen PAID
            BillDTO.PayRequest payReq = new BillDTO.PayRequest();
            payReq.setAmount(BigDecimal.valueOf(vnpAmount));
            payReq.setMethod("VNPAY");
            payReq.setReferenceCode(params.get("vnp_TransactionNo"));
            payReq.setNote("Thanh toan qua VNPay, ma GD: " + params.get("vnp_TransactionNo"));

            try {
                billingService.pay(billId, payReq, bill.getContract().getTenant().getId());
                log.info("VNPay IPN: bill {} paid successfully, amount={}", billId, vnpAmount);
                response.put("RspCode", "00");
                response.put("Message", "Confirm Success");
            } catch (Exception e) {
                log.error("VNPay IPN: error updating bill {}", billId, e);
                response.put("RspCode", "99");
                response.put("Message", "Unknown error");
            }
        } else {
            log.info("VNPay IPN: payment failed for bill {}, code={}", billId, responseCode);
            response.put("RspCode", "00");
            response.put("Message", "Confirm Success");
        }

        return ResponseEntity.ok(response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        } else {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
