package com.rentalms.controller;

import com.rentalms.dto.ApiResponse;
import com.rentalms.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );
    private static final Set<String> ALLOWED_VIDEO_TYPES = Set.of(
            "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"
    );
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5 MB
    private static final long MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

    @PostMapping("/image")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER','TENANT')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) throw new BusinessException("File không được để trống");
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("Chỉ chấp nhận ảnh JPG, PNG, GIF, WEBP");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BusinessException("Ảnh không được vượt quá 5MB");
        }

        String url = saveFile(file, "images");
        return ResponseEntity.ok(ApiResponse.ok("Upload ảnh thành công", Map.of("url", url)));
    }

    @PostMapping("/video")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadVideo(
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) throw new BusinessException("File không được để trống");
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_VIDEO_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("Chỉ chấp nhận video MP4, WEBM, MOV, AVI");
        }
        if (file.getSize() > MAX_VIDEO_SIZE) {
            throw new BusinessException("Video không được vượt quá 50MB");
        }

        String url = saveFile(file, "videos");
        return ResponseEntity.ok(ApiResponse.ok("Upload video thành công", Map.of("url", url)));
    }

    private String saveFile(MultipartFile file, String subDir) throws IOException {
        Path dir = Paths.get(uploadDir, subDir).toAbsolutePath();
        Files.createDirectories(dir);

        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf('.'))
                : "";
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;

        Path dest = dir.resolve(filename);
        file.transferTo(dest);

        String url = "/uploads/" + subDir + "/" + filename;
        log.info("File saved: {}", dest);
        return url;
    }
}
