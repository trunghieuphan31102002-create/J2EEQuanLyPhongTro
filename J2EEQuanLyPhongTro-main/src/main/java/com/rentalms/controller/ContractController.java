package com.rentalms.controller;

import com.rentalms.config.CurrentUser;
import com.rentalms.dto.ApiResponse;
import com.rentalms.dto.ContractDTO;
import com.rentalms.entity.Contract;
import com.rentalms.service.ContractDocService;
import com.rentalms.service.ContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;
    private final ContractDocService contractDocService;
    private final CurrentUser currentUser;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Contract>> create(
            @Valid @RequestBody ContractDTO.CreateRequest req) {
        return ResponseEntity.status(201)
                .body(ApiResponse.ok("Tao hop dong thanh cong",
                        contractService.create(req, currentUser.getId())));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ContractDTO.Response>>> getMyContracts() {
        var user = currentUser.get();
        List<Contract> contracts = switch (user.getRole()) {
            case OWNER   -> contractService.getByOwner(user.getId());
            case MANAGER -> contractService.getByManager(user.getId());
            case TENANT  -> contractService.getByTenant(user.getId());
            default      -> contractService.getByOwner(user.getId());
        };
        return ResponseEntity.ok(ApiResponse.ok(
                contracts.stream().map(contractService::toResponse).toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Contract>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.findById(id)));
    }

    @PutMapping("/{id}/terminate")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Contract>> terminate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Ket thuc hop dong thanh cong",
                contractService.terminate(id, currentUser.getId())));
    }

    @PutMapping("/{id}/renew")
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Contract>> renew(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        LocalDate newEnd = LocalDate.parse(body.get("newEndDate"));
        return ResponseEntity.ok(ApiResponse.ok("Gia han hop dong thanh cong",
                contractService.renew(id, newEnd, currentUser.getId())));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadDocx(@PathVariable Long id) throws Exception {
        byte[] docx = contractDocService.generateDocx(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=HopDong-" + id + ".docx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(docx);
    }
}
