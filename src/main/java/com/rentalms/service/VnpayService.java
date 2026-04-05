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
 * Code viet theo dung mau chinh thuc cua VNPay:
 * https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */
@Slf4j
@Service
public class VnpayService {

    @Value("${vnpay.tmn-code:}")
    private String tmnCodeRaw;

    @Value("${vnpay.hash-secret:}")
    private String hashSecretRaw;

    @Value("${vnpay.pay-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String payUrl;

    @Value("${vnpay.return-url:}")
    private String returnUrlRaw;

    @Value("${vnpay.version:2.1.0}")
    private String version;

    private String tmnCode() { return tmnCodeRaw == null ? "" : tmnCodeRaw.trim(); }
    private String hashSecret() { return hashSecretRaw == null ? "" : hashSecretRaw.trim(); }
    private String returnUrl() { return returnUrlRaw == null ? "" : returnUrlRaw.trim(); }

    /**
     * Tao URL thanh toan VNPay — viet theo dung pattern cua sample VNPay chinh thuc.
     */
    public String createPaymentUrl(Long billId, long amountVnd, String orderInfo, String ipAddress) {
        String tmn = tmnCode();
        String secret = hashSecret();
        String retUrl = returnUrl();

        if (tmn.isEmpty() || secret.isEmpty()) {
            throw new BusinessException("Chua cau hinh VNPay (VNPAY_TMN_CODE, VNPAY_HASH_SECRET)");
        }
        if (retUrl.isEmpty()) {
            throw new BusinessException("Chua cau hinh VNPAY_RETURN_URL");
        }

        log.info("VNPay config check: tmnCode.len={}, hashSecret.len={}, returnUrl={}",
                tmn.length(), secret.length(), retUrl);

        // vnp_TxnRef phai duy nhat
        String txnRef = billId + "-" + System.currentTimeMillis();

        // Format thoi gian theo mau VNPay (GMT+7)
        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        formatter.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        String vnp_CreateDate = formatter.format(cld.getTime());
        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", version);
        vnp_Params.put("vnp_Command", "pay");
        vnp_Params.put("vnp_TmnCode", tmn);
        vnp_Params.put("vnp_Amount", String.valueOf(amountVnd * 100));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", txnRef);
        vnp_Params.put("vnp_OrderInfo", orderInfo);
        vnp_Params.put("vnp_OrderType", "other");
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", retUrl);
        vnp_Params.put("vnp_IpAddr", ipAddress == null || ipAddress.isEmpty() ? "127.0.0.1" : ipAddress);
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        // === Build hash data + query theo dung pattern VNPay sample ===
        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                // Build hash data
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                // Build query
                query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII));
                query.append('=');
                query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }

        String queryUrl = query.toString();
        String vnp_SecureHash = hmacSHA512(secret, hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        String paymentUrl = payUrl + "?" + queryUrl;

        log.info("VNPay hashData: {}", hashData);
        log.info("VNPay secureHash: {}", vnp_SecureHash);
        log.info("VNPay payment URL created for bill {}: txnRef={}", billId, txnRef);
        return paymentUrl;
    }

    /**
     * Xac thuc signature tu callback (Return URL hoac IPN).
     */
    public boolean verifyCallback(Map<String, String> params) {
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null) return false;

        Map<String, String> filtered = new HashMap<>(params);
        filtered.remove("vnp_SecureHash");
        filtered.remove("vnp_SecureHashType");

        List<String> fieldNames = new ArrayList<>(filtered.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = filtered.get(fieldName);
            if (fieldValue != null && !fieldValue.isEmpty()) {
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                if (itr.hasNext()) {
                    hashData.append('&');
                }
            }
        }

        String computed = hmacSHA512(hashSecret(), hashData.toString());
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
            if (key == null || data == null) {
                throw new NullPointerException();
            }
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            byte[] hmacKeyBytes = key.getBytes(StandardCharsets.UTF_8);
            SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, "HmacSHA512");
            hmac512.init(secretKey);
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] result = hmac512.doFinal(dataBytes);
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new BusinessException("Loi ky HMAC-SHA512: " + ex.getMessage());
        }
    }
}
