package com.rentalms.service;

import com.rentalms.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Dich vu tich hop VNPay Sandbox.
 * Tai lieu: https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/
 *
 * Quy trinh:
 *  1. Tao URL thanh toan voi HMAC-SHA512 signature
 *  2. Client redirect sang URL do
 *  3. Sau khi user thanh toan, VNPay:
 *     - Redirect ve `vnp_ReturnUrl` (kem query params ket qua)
 *     - Goi server-to-server ve `vnp_IpnUrl` (xac nhan thanh toan)
 *  4. Backend verify signature cua callback de dam bao tinh xac thuc
 */
@Slf4j
@Service
public class VnpayService {

    @Value("${vnpay.tmn-code:}")
    private String tmnCode;

    @Value("${vnpay.hash-secret:}")
    private String hashSecret;

    @Value("${vnpay.pay-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String payUrl;

    @Value("${vnpay.return-url:}")
    private String returnUrl;

    @Value("${vnpay.version:2.1.0}")
    private String version;

    /**
     * Tao URL thanh toan VNPay.
     *
     * @param billId      ID hoa don trong DB (dung lam vnp_TxnRef)
     * @param amountVnd   So tien (VND, dang BigDecimal.longValue())
     * @param orderInfo   Mo ta don hang (hien tren trang VNPay)
     * @param ipAddress   IP cua client (bat buoc)
     * @return URL day du de redirect sang VNPay
     */
    public String createPaymentUrl(Long billId, long amountVnd, String orderInfo, String ipAddress) {
        if (tmnCode == null || tmnCode.isBlank() || hashSecret == null || hashSecret.isBlank()) {
            throw new BusinessException("Chua cau hinh VNPay (VNPAY_TMN_CODE, VNPAY_HASH_SECRET)");
        }
        if (returnUrl == null || returnUrl.isBlank()) {
            throw new BusinessException("Chua cau hinh VNPAY_RETURN_URL");
        }

        // vnp_TxnRef phai duy nhat — dung billId + timestamp de tranh trung khi user thanh toan lai
        String txnRef = billId + "-" + System.currentTimeMillis();

        // Format thoi gian theo GMT+7
        SimpleDateFormat fmt = new SimpleDateFormat("yyyyMMddHHmmss");
        fmt.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        String createDate = fmt.format(cal.getTime());
        cal.add(Calendar.MINUTE, 15); // het han sau 15 phut
        String expireDate = fmt.format(cal.getTime());

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", version);
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", tmnCode);
        params.put("vnp_Amount", String.valueOf(amountVnd * 100)); // VNPay yeu cau x100
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", ipAddress == null ? "127.0.0.1" : ipAddress);
        params.put("vnp_CreateDate", createDate);
        params.put("vnp_ExpireDate", expireDate);

        // Build query string + hash data
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (e.getValue() == null || e.getValue().isEmpty()) continue;
            if (hashData.length() > 0) {
                hashData.append('&');
                query.append('&');
            }
            hashData.append(e.getKey()).append('=')
                    .append(URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII));
            query.append(URLEncoder.encode(e.getKey(), StandardCharsets.US_ASCII)).append('=')
                    .append(URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII));
        }

        String secureHash = hmacSHA512(hashSecret, hashData.toString());
        query.append("&vnp_SecureHash=").append(secureHash);

        String fullUrl = payUrl + "?" + query;
        log.info("VNPay payment URL created for bill {}: txnRef={}", billId, txnRef);
        return fullUrl;
    }

    /**
     * Xac thuc signature tu callback (Return URL hoac IPN).
     * Dam bao du lieu thuc su den tu VNPay, khong bi gia mao.
     */
    public boolean verifyCallback(Map<String, String> params) {
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null) return false;

        Map<String, String> sorted = new TreeMap<>(params);
        sorted.remove("vnp_SecureHash");
        sorted.remove("vnp_SecureHashType");

        StringBuilder hashData = new StringBuilder();
        for (Map.Entry<String, String> e : sorted.entrySet()) {
            if (e.getValue() == null || e.getValue().isEmpty()) continue;
            if (hashData.length() > 0) hashData.append('&');
            hashData.append(e.getKey()).append('=')
                    .append(URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII));
        }

        String computed = hmacSHA512(hashSecret, hashData.toString());
        return computed.equalsIgnoreCase(receivedHash);
    }

    /**
     * Parse billId tu vnp_TxnRef (dinh dang "{billId}-{timestamp}").
     */
    public Long extractBillId(String txnRef) {
        if (txnRef == null || !txnRef.contains("-")) return null;
        try {
            return Long.parseLong(txnRef.substring(0, txnRef.indexOf('-')));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new BusinessException("Loi ky HMAC-SHA512: " + e.getMessage());
        }
    }
}
