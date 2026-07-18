package com.rentalms.service;

import com.rentalms.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Goi API FPT.AI de nhan dien thong tin tren CCCD/CMND Viet Nam.
 * Tai lieu: https://docs.fpt.ai/vi/v1.0/docs/identity-card-vietnam
 * Endpoint: POST https://api.fpt.ai/vision/idr/vnm
 * Header:   api-key: <YOUR_API_KEY>
 * Body:     multipart/form-data, field "image" = file anh
 */
@Slf4j
@Service
public class FptEkycService {

    @Value("${fpt.ekyc.api-key:}")
    private String apiKey;

    @Value("${fpt.ekyc.url:https://api.fpt.ai/vision/idr/vnm}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Nhan dien mot mat cua CCCD (front hoac back).
     * @param image file anh do user upload
     * @return Map chua cac truong tra ve tu FPT.AI (id, name, dob, address, ...)
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> recognize(MultipartFile image) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException("Chua cau hinh FPT eKYC API key (fpt.ekyc.api-key)");
        }
        if (image == null || image.isEmpty()) {
            throw new BusinessException("File anh khong duoc de trong");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("api-key", apiKey);

            ByteArrayResource fileResource = new ByteArrayResource(image.getBytes()) {
                @Override
                public String getFilename() {
                    return image.getOriginalFilename() != null ? image.getOriginalFilename() : "cccd.jpg";
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", fileResource);

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

            Map<String, Object> json = response.getBody();
            if (json == null) {
                throw new BusinessException("FPT.AI khong tra ve du lieu");
            }

            // FPT tra ve: { errorCode: 0, errorMessage: "", data: [ { ... } ] }
            Object errorCode = json.get("errorCode");
            if (errorCode != null && !"0".equals(String.valueOf(errorCode))) {
                String msg = String.valueOf(json.getOrDefault("errorMessage", "Loi khong xac dinh"));
                log.warn("FPT eKYC loi: code={}, msg={}", errorCode, msg);
                throw new BusinessException("Khong nhan dien duoc CCCD: " + msg);
            }

            Object data = json.get("data");
            if (!(data instanceof List<?> list) || list.isEmpty()) {
                throw new BusinessException("Anh khong hop le hoac khong phai CCCD/CMND");
            }
            return (Map<String, Object>) list.get(0);

        } catch (IOException e) {
            log.error("Loi doc file anh", e);
            throw new BusinessException("Khong doc duoc file anh: " + e.getMessage());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Loi goi FPT eKYC", e);
            throw new BusinessException("Loi goi dich vu eKYC: " + e.getMessage());
        }
    }
}
