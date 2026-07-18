package com.rentalms.service;

import com.rentalms.entity.Contract;
import com.rentalms.entity.User;
import com.rentalms.entity.Room;
import com.rentalms.exception.NotFoundException;
import com.rentalms.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ContractDocService {

    private final ContractRepository contractRepo;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final NumberFormat VND_FMT = NumberFormat.getInstance(new Locale("vi", "VN"));

    @Transactional(readOnly = true)
    public byte[] generateDocx(Long contractId) throws IOException {
        Contract contract = contractRepo.findById(contractId)
                .orElseThrow(() -> new NotFoundException("Khong tim thay hop dong id: " + contractId));

        User owner = contract.getOwner();
        User tenant = contract.getTenant();
        Room room = contract.getRoom();
        String buildingName = room.getBuilding().getName();
        String buildingAddress = room.getBuilding().getAddress();

        try (XWPFDocument doc = new XWPFDocument()) {
            // ===== HEADER =====
            addCenteredText(doc, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 13, true);
            addCenteredText(doc, "Độc lập – Tự do – Hạnh phúc", 12, false);
            addCenteredText(doc, "──────────────", 12, false);
            addEmptyLine(doc);

            addCenteredText(doc, "HỢP ĐỒNG THUÊ PHÒNG TRỌ", 16, true);
            addCenteredText(doc, "(Số: HD-" + contract.getId() + "/" + LocalDate.now().getYear() + ")", 11, false);
            addEmptyLine(doc);

            // ===== CAN CU =====
            addText(doc, "Căn cứ Bộ luật Dân sự năm 2015;", 11, false, true);
            addText(doc, "Căn cứ theo nhu cầu và khả năng thực tế của hai bên;", 11, false, true);
            addText(doc, "Hôm nay, ngày " + LocalDate.now().format(DATE_FMT) + ", tại " + buildingAddress + ", chúng tôi gồm:", 11, false, false);
            addEmptyLine(doc);

            // ===== BEN A =====
            addText(doc, "BÊN A (Bên cho thuê):", 12, true, false);
            addInfoRow(doc, "Họ và tên", owner.getFullName());
            addInfoRow(doc, "Số điện thoại", owner.getPhone() != null ? owner.getPhone() : ".....................");
            addInfoRow(doc, "Số CCCD/CMND", owner.getCccdNumber() != null ? owner.getCccdNumber() : ".....................");
            addInfoRow(doc, "Email", owner.getEmail());
            addInfoRow(doc, "Địa chỉ cho thuê", buildingAddress);
            addEmptyLine(doc);

            // ===== BEN B =====
            addText(doc, "BÊN B (Bên thuê):", 12, true, false);
            addInfoRow(doc, "Họ và tên", tenant.getFullName());
            addInfoRow(doc, "Số điện thoại", tenant.getPhone() != null ? tenant.getPhone() : ".....................");
            addInfoRow(doc, "Số CCCD/CMND", tenant.getCccdNumber() != null ? tenant.getCccdNumber() : ".....................");
            addInfoRow(doc, "Email", tenant.getEmail());
            addEmptyLine(doc);

            addText(doc, "Hai bên thỏa thuận ký hợp đồng thuê phòng trọ với các điều khoản sau:", 11, false, false);
            addEmptyLine(doc);

            // ===== DIEU 1 =====
            addText(doc, "ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG", 12, true, false);
            addText(doc, "Bên A đồng ý cho Bên B thuê phòng trọ với thông tin như sau:", 11, false, false);
            addInfoRow(doc, "Tên tòa nhà/khu trọ", buildingName);
            addInfoRow(doc, "Phòng số", room.getRoomNo());
            addInfoRow(doc, "Diện tích", room.getArea() != null ? room.getArea() + " m²" : "............ m²");
            addInfoRow(doc, "Địa chỉ", buildingAddress);
            if (room.getAmenities() != null) {
                addInfoRow(doc, "Tiện ích", room.getAmenities());
            }
            addEmptyLine(doc);

            // ===== DIEU 2 =====
            addText(doc, "ĐIỀU 2: THỜI HẠN THUÊ", 12, true, false);
            addInfoRow(doc, "Thời gian thuê", "Từ ngày " + contract.getStartDate().format(DATE_FMT)
                    + " đến ngày " + contract.getEndDate().format(DATE_FMT));
            addInfoRow(doc, "Chu kỳ thanh toán", contract.getRentCycle() != null ? contract.getRentCycle() : "MONTHLY");
            addEmptyLine(doc);

            // ===== DIEU 3 =====
            addText(doc, "ĐIỀU 3: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN", 12, true, false);
            addInfoRow(doc, "Giá thuê hàng tháng", formatVND(contract.getMonthlyRent()) + " VNĐ");
            addInfoRow(doc, "Tiền đặt cọc", contract.getDeposit() != null ? formatVND(contract.getDeposit()) + " VNĐ" : ".....................");
            addText(doc, "- Bên B thanh toán tiền thuê phòng trước ngày 05 hàng tháng.", 11, false, false);
            addText(doc, "- Phương thức thanh toán: Tiền mặt hoặc chuyển khoản ngân hàng.", 11, false, false);
            if (contract.getLateFeePercent() != null && contract.getLateFeePercent() > 0) {
                addText(doc, "- Phí phạt trả chậm: " + (int)(contract.getLateFeePercent() * 100) + "% trên số tiền còn nợ.", 11, false, false);
            }
            addEmptyLine(doc);

            // ===== DIEU 4 =====
            addText(doc, "ĐIỀU 4: TRÁCH NHIỆM CỦA BÊN A", 12, true, false);
            addText(doc, "1. Giao phòng đúng hiện trạng đã thỏa thuận.", 11, false, false);
            addText(doc, "2. Đảm bảo quyền sử dụng phòng ổn định cho Bên B trong thời hạn hợp đồng.", 11, false, false);
            addText(doc, "3. Bảo trì, sửa chữa các hư hỏng không phải do Bên B gây ra.", 11, false, false);
            addText(doc, "4. Thông báo trước ít nhất 30 ngày nếu muốn chấm dứt hợp đồng trước hạn.", 11, false, false);
            addEmptyLine(doc);

            // ===== DIEU 5 =====
            addText(doc, "ĐIỀU 5: TRÁCH NHIỆM CỦA BÊN B", 12, true, false);
            addText(doc, "1. Thanh toán đầy đủ và đúng hạn tiền thuê phòng, tiền điện, nước và các chi phí phát sinh.", 11, false, false);
            addText(doc, "2. Giữ gìn phòng ở sạch sẽ, không tự ý sửa chữa, cải tạo khi chưa có sự đồng ý của Bên A.", 11, false, false);
            addText(doc, "3. Không được cho người khác ở ghép hoặc chuyển nhượng hợp đồng khi chưa được Bên A đồng ý.", 11, false, false);
            addText(doc, "4. Chấp hành nội quy khu trọ và quy định pháp luật về cư trú.", 11, false, false);
            addText(doc, "5. Thông báo trước ít nhất 30 ngày nếu muốn chấm dứt hợp đồng trước hạn.", 11, false, false);
            addEmptyLine(doc);

            // ===== DIEU 6 =====
            addText(doc, "ĐIỀU 6: ĐIỀU KHOẢN CHUNG", 12, true, false);
            addText(doc, "1. Hợp đồng có hiệu lực kể từ ngày ký.", 11, false, false);
            addText(doc, "2. Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.", 11, false, false);
            addText(doc, "3. Mọi tranh chấp phát sinh sẽ được giải quyết trên tinh thần hợp tác. Nếu không thỏa thuận được, sẽ đưa ra cơ quan có thẩm quyền giải quyết.", 11, false, false);

            if (contract.getPolicy() != null && !contract.getPolicy().isBlank()) {
                addEmptyLine(doc);
                addText(doc, "ĐIỀU KHOẢN BỔ SUNG:", 12, true, false);
                addText(doc, contract.getPolicy(), 11, false, false);
            }

            addEmptyLine(doc);
            addEmptyLine(doc);

            // ===== CHU KY =====
            XWPFTable sigTable = doc.createTable(3, 2);
            sigTable.setWidth("100%");
            // Remove borders for clean look
            setCell(sigTable, 0, 0, "BÊN A (Bên cho thuê)", true, ParagraphAlignment.CENTER);
            setCell(sigTable, 0, 1, "BÊN B (Bên thuê)", true, ParagraphAlignment.CENTER);
            setCell(sigTable, 1, 0, "(Ký, ghi rõ họ tên)", false, ParagraphAlignment.CENTER);
            setCell(sigTable, 1, 1, "(Ký, ghi rõ họ tên)", false, ParagraphAlignment.CENTER);
            setCell(sigTable, 2, 0, "\n\n\n" + owner.getFullName(), false, ParagraphAlignment.CENTER);
            setCell(sigTable, 2, 1, "\n\n\n" + tenant.getFullName(), false, ParagraphAlignment.CENTER);

            // Remove table borders
            sigTable.getCTTbl().getTblPr().unsetTblBorders();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }

    // ===== Helper Methods =====

    private void addCenteredText(XWPFDocument doc, String text, int fontSize, boolean bold) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        p.setSpacingAfter(0);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(fontSize);
        run.setBold(bold);
        run.setFontFamily("Times New Roman");
    }

    private void addText(XWPFDocument doc, String text, int fontSize, boolean bold, boolean italic) {
        XWPFParagraph p = doc.createParagraph();
        p.setSpacingAfter(60);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(fontSize);
        run.setBold(bold);
        run.setItalic(italic);
        run.setFontFamily("Times New Roman");
    }

    private void addInfoRow(XWPFDocument doc, String label, String value) {
        XWPFParagraph p = doc.createParagraph();
        p.setSpacingAfter(40);
        XWPFRun labelRun = p.createRun();
        labelRun.setText("- " + label + ": ");
        labelRun.setFontSize(11);
        labelRun.setBold(true);
        labelRun.setFontFamily("Times New Roman");
        XWPFRun valueRun = p.createRun();
        valueRun.setText(value);
        valueRun.setFontSize(11);
        valueRun.setFontFamily("Times New Roman");
    }

    private void addEmptyLine(XWPFDocument doc) {
        XWPFParagraph p = doc.createParagraph();
        p.setSpacingAfter(0);
        p.createRun().setText("");
    }

    private void setCell(XWPFTable table, int row, int col, String text, boolean bold, ParagraphAlignment align) {
        XWPFTableCell cell = table.getRow(row).getCell(col);
        cell.removeParagraph(0);
        XWPFParagraph p = cell.addParagraph();
        p.setAlignment(align);
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setFontSize(11);
        run.setBold(bold);
        run.setFontFamily("Times New Roman");
    }

    private String formatVND(BigDecimal amount) {
        if (amount == null) return "0";
        return VND_FMT.format(amount);
    }
}
