package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.entity.User;
import com.rentalms.exception.BusinessException;
import com.rentalms.repository.UserRepository;
import com.rentalms.service.AuditService;
import com.rentalms.service.FptEkycService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * eKYC — Xac thuc danh tinh nguoi thue qua anh CCCD.
 *
 * Flow:
 *  1. Client upload 2 anh (mat truoc + mat sau CCCD)
 *  2. Server goi FPT.AI de OCR -> lay ra so CCCD, ho ten, ngay sinh, dia chi, ...
 *  3. Luu truc tiep vao profile user hien tai
 *  4. Tra ve JSON cho client hien len form
 */
@Slf4j
@RestController
@RequestMapping("/api/kyc")
@RequiredArgsConstructor
public class KycController {

    private final FptEkycService ekycService;
    private final UserRepository userRepo;
    private final CurrentUser currentUser;
    private final AuditService auditService;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @PostMapping(value = "/verify", consumes = "multipart/form-data")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> verify(
            @RequestParam("front") MultipartFile front,
            @RequestParam("back") MultipartFile back) {

        // 1. Goi FPT cho mat truoc
        Map<String, Object> frontData = ekycService.recognize(front);
        String type = String.valueOf(frontData.getOrDefault("type", ""));
        if (!type.toLowerCase().contains("front")) {
            throw new BusinessException("Vui long upload dung anh MAT TRUOC CCCD");
        }

        // 2. Goi FPT cho mat sau
        Map<String, Object> backData = ekycService.recognize(back);
        String backType = String.valueOf(backData.getOrDefault("type", ""));
        if (!backType.toLowerCase().contains("back")) {
            throw new BusinessException("Vui long upload dung anh MAT SAU CCCD");
        }

        // 3. Lay thong tin can thiet tu mat truoc
        String id = str(frontData.get("id"));
        String name = str(frontData.get("name"));
        String dob = str(frontData.get("dob"));
        String sex = str(frontData.get("sex"));
        String address = str(frontData.get("address"));
        String home = str(frontData.get("home"));
        String nationality = str(frontData.get("nationality"));
        String doe = str(frontData.get("doe"));   // ngay het han

        if (id == null || id.isBlank()) {
            throw new BusinessException("Khong doc duoc so CCCD tu anh");
        }

        // 4. Kiem tra so CCCD da ton tai cho user khac chua (tranh trung)
        Long uid = currentUser.getId();
        userRepo.findAll().stream()
                .filter(u -> !u.getId().equals(uid))
                .filter(u -> id.equals(u.getCccdNumber()))
                .findFirst()
                .ifPresent(u -> {
                    throw new BusinessException("So CCCD nay da duoc dang ky boi tai khoan khac");
                });

        // 5. Luu 2 anh xuong disk de co URL
        String frontUrl = saveImage(front);
        String backUrl = saveImage(back);

        // 6. Cap nhat vao profile user hien tai
        User user = userRepo.findById(uid)
                .orElseThrow(() -> new BusinessException("Khong tim thay user"));
        user.setCccdNumber(id);
        user.setCccdFrontUrl(frontUrl);
        user.setCccdBackUrl(backUrl);
        if (name != null && !name.isBlank()) {
            user.setFullName(name);
        }
        userRepo.save(user);

        auditService.log(uid, user.getEmail(), "KYC_VERIFY", "User", uid,
                "eKYC thanh cong, CCCD=" + id);

        // 6. Tra ve day du thong tin cho client
        Map<String, Object> result = new HashMap<>();
        result.put("id", id);
        result.put("name", name);
        result.put("dob", dob);
        result.put("sex", sex);
        result.put("nationality", nationality);
        result.put("home", home);
        result.put("address", address);
        result.put("doe", doe);
        result.put("issueDate", str(backData.get("issue_date")));
        result.put("issueLoc", str(backData.get("issue_loc")));
        result.put("features", str(backData.get("features")));
        result.put("cccdFrontUrl", frontUrl);
        result.put("cccdBackUrl", backUrl);
        result.put("verified", true);

        return ResponseEntity.ok(ApiResponse.ok("Xac thuc CCCD thanh cong", result));
    }

    private String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private String saveImage(MultipartFile file) {
        try {
            Path dir = Paths.get(uploadDir, "images").toAbsolutePath();
            Files.createDirectories(dir);
            String original = file.getOriginalFilename();
            String ext = (original != null && original.contains("."))
                    ? original.substring(original.lastIndexOf('.'))
                    : ".jpg";
            String filename = UUID.randomUUID().toString().replace("-", "") + ext;
            Path dest = dir.resolve(filename);
            file.transferTo(dest);
            return "/uploads/images/" + filename;
        } catch (IOException e) {
            throw new BusinessException("Khong luu duoc anh CCCD: " + e.getMessage());
        }
    }
}
