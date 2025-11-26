package com.example.ogani.service;

import com.example.ogani.repository.ExcelReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelReportService {

    private final ExcelReportRepository excelReportRepository;

    /**
     * Tạo báo cáo doanh thu Excel theo tuần/tháng/quý/năm
     */
    public byte[] generateRevenueReport(String type) throws IOException {
        log.info("Generating revenue report for type: {}", type);
        
        Workbook workbook = new XSSFWorkbook();
        LocalDate now = LocalDate.now();
        
        // Tạo các sheet theo loại báo cáo
        switch (type.toLowerCase()) {
            case "week":
                generateWeeklySheets(workbook, now);
                break;
            case "month":
                generateMonthlySheets(workbook, now);
                break;
            case "quarter":
                generateQuarterlySheets(workbook, now);
                break;
            case "year":
                generateYearlySheet(workbook, now);
                break;
            default:
                generateMonthlySheets(workbook, now);
        }
        
        // Write to byte array
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        
        log.info("Revenue report generated successfully");
        return outputStream.toByteArray();
    }

    /**
     * Tạo sheets cho các tuần trong tháng (5 tuần)
     */
    private void generateWeeklySheets(Workbook workbook, LocalDate now) {
        YearMonth yearMonth = YearMonth.from(now);
        LocalDate firstOfMonth = yearMonth.atDay(1);
        LocalDate lastOfMonth = yearMonth.atEndOfMonth();
        
        WeekFields weekFields = WeekFields.of(Locale.forLanguageTag("vi-VN"));
        
        // Chia tháng thành các tuần
        List<WeekPeriod> weeks = new ArrayList<>();
        LocalDate weekStart = firstOfMonth;
        
        int weekNumber = 1;
        while (weekStart.isBefore(lastOfMonth) || weekStart.isEqual(lastOfMonth)) {
            LocalDate weekEnd = weekStart.plusDays(6);
            if (weekEnd.isAfter(lastOfMonth)) {
                weekEnd = lastOfMonth;
            }
            
            weeks.add(new WeekPeriod(weekNumber, weekStart, weekEnd));
            weekStart = weekEnd.plusDays(1);
            weekNumber++;
        }
        
        log.info("Creating {} weekly sheets for month {}/{}", weeks.size(), now.getMonthValue(), now.getYear());
        
        // Tạo sheet cho mỗi tuần
        for (WeekPeriod week : weeks) {
            String sheetName = String.format("Tuần %d", week.weekNumber);
            createProductRevenueSheet(
                workbook, 
                sheetName, 
                week.startDate.atStartOfDay(), 
                week.endDate.plusDays(1).atStartOfDay(),
                String.format("TUẦN %d THÁNG %02d/%d", week.weekNumber, now.getMonthValue(), now.getYear())
            );
        }
    }

    /**
     * Tạo sheets cho các tháng trong năm (12 tháng)
     */
    private void generateMonthlySheets(Workbook workbook, LocalDate now) {
        int currentYear = now.getYear();
        
        log.info("Creating 12 monthly sheets for year {}", currentYear);
        
        for (int month = 1; month <= 12; month++) {
            YearMonth yearMonth = YearMonth.of(currentYear, month);
            LocalDate startDate = yearMonth.atDay(1);
            LocalDate endDate = yearMonth.atEndOfMonth();
            
            String sheetName = String.format("Tháng %02d", month);
            createProductRevenueSheet(
                workbook,
                sheetName,
                startDate.atStartOfDay(),
                endDate.plusDays(1).atStartOfDay(),
                String.format("THÁNG %02d/%d", month, currentYear)
            );
        }
    }

    /**
     * Tạo sheets cho các quý trong năm (4 quý)
     */
    private void generateQuarterlySheets(Workbook workbook, LocalDate now) {
        int currentYear = now.getYear();
        
        log.info("Creating 4 quarterly sheets for year {}", currentYear);
        
        for (int quarter = 1; quarter <= 4; quarter++) {
            int startMonth = (quarter - 1) * 3 + 1;
            int endMonth = startMonth + 2;
            
            LocalDate startDate = LocalDate.of(currentYear, startMonth, 1);
            LocalDate endDate = YearMonth.of(currentYear, endMonth).atEndOfMonth();
            
            String sheetName = String.format("Quý %d", quarter);
            createProductRevenueSheet(
                workbook,
                sheetName,
                startDate.atStartOfDay(),
                endDate.plusDays(1).atStartOfDay(),
                String.format("QUÝ %d NĂM %d", quarter, currentYear)
            );
        }
    }

    /**
     * Tạo sheet cho năm hiện tại
     */
    private void generateYearlySheet(Workbook workbook, LocalDate now) {
        int currentYear = now.getYear();
        
        log.info("Creating yearly sheet for year {}", currentYear);
        
        LocalDate startDate = LocalDate.of(currentYear, 1, 1);
        LocalDate endDate = LocalDate.of(currentYear, 12, 31);
        
        createProductRevenueSheet(
            workbook,
            String.format("Năm %d", currentYear),
            startDate.atStartOfDay(),
            endDate.plusDays(1).atStartOfDay(),
            String.format("NĂM %d", currentYear)
        );
    }

    /**
     * Tạo sheet với dữ liệu sản phẩm
     */
    private void createProductRevenueSheet(
            Workbook workbook, 
            String sheetName, 
            LocalDateTime startDate, 
            LocalDateTime endDate,
            String title) {
        
        Sheet sheet = workbook.createSheet(sheetName);
        
        // Styles
        CellStyle titleStyle = createTitleStyle(workbook);
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle currencyStyle = createCurrencyStyle(workbook);
        CellStyle normalStyle = createNormalStyle(workbook);
        CellStyle totalStyle = createTotalStyle(workbook);
        
        int rowNum = 0;
        
        // ===== TIÊU ĐỀ =====
        Row titleRow = sheet.createRow(rowNum++);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("DOANH THU " + title);
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 4));
        
        // Ngày xuất
        Row dateRow = sheet.createRow(rowNum++);
        Cell dateCell = dateRow.createCell(0);
        dateCell.setCellValue("Ngày xuất: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        dateCell.setCellStyle(normalStyle);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 4));
        
        // Kỳ báo cáo
        Row periodRow = sheet.createRow(rowNum++);
        Cell periodCell = periodRow.createCell(0);
        periodCell.setCellValue(String.format("Từ ngày: %s đến %s", 
            startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
            endDate.minusDays(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
        ));
        periodCell.setCellStyle(normalStyle);
        sheet.addMergedRegion(new CellRangeAddress(2, 2, 0, 4));
        
        rowNum++; // Empty row
        
        // ===== HEADER =====
        Row headerRow = sheet.createRow(rowNum++);
        String[] headers = {"STT", "Tên mặt hàng", "Danh mục", "Số lượt bán", "Số tiền"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        // ===== DỮ LIỆU =====
        log.info("Fetching data from {} to {} for sheet: {}", startDate, endDate, sheetName);
        
        List<Object[]> results = excelReportRepository.getProductRevenueByMonth(startDate, endDate);
        
        List<ProductRevenueDTO> products = results.stream()
            .map(row -> new ProductRevenueDTO(
                (String) row[0],  // productName
                (String) row[1],  // categoryName
                ((Number) row[2]).intValue(),  // totalQuantity
                ((Number) row[3]).doubleValue() // totalRevenue
            ))
            .collect(Collectors.toList());
        
        log.info("Found {} products for sheet: {}", products.size(), sheetName);
        
        int stt = 1;
        double totalRevenue = 0;
        int totalQuantity = 0;
        
        for (ProductRevenueDTO product : products) {
            Row row = sheet.createRow(rowNum++);
            
            // STT
            Cell sttCell = row.createCell(0);
            sttCell.setCellValue(stt++);
            sttCell.setCellStyle(normalStyle);
            
            // Tên mặt hàng
            Cell nameCell = row.createCell(1);
            nameCell.setCellValue(product.getProductName());
            nameCell.setCellStyle(normalStyle);
            
            // Danh mục
            Cell categoryCell = row.createCell(2);
            categoryCell.setCellValue(product.getCategoryName());
            categoryCell.setCellStyle(normalStyle);
            
            // Số lượt bán
            Cell quantityCell = row.createCell(3);
            quantityCell.setCellValue(product.getTotalQuantity());
            quantityCell.setCellStyle(normalStyle);
            
            // Số tiền
            Cell revenueCell = row.createCell(4);
            revenueCell.setCellValue(product.getTotalRevenue());
            revenueCell.setCellStyle(currencyStyle);
            
            totalQuantity += product.getTotalQuantity();
            totalRevenue += product.getTotalRevenue();
        }
        
        // ===== TỔNG CỘNG =====
        if (products.size() > 0) {
            rowNum++; // Empty row
            Row totalRow = sheet.createRow(rowNum++);
            
            Cell totalLabelCell = totalRow.createCell(0);
            totalLabelCell.setCellValue("TỔNG CỘNG");
            totalLabelCell.setCellStyle(totalStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowNum - 1, rowNum - 1, 0, 2));
            
            Cell totalQuantityCell = totalRow.createCell(3);
            totalQuantityCell.setCellValue(totalQuantity);
            totalQuantityCell.setCellStyle(totalStyle);
            
            Cell totalRevenueCell = totalRow.createCell(4);
            totalRevenueCell.setCellValue(totalRevenue);
            totalRevenueCell.setCellStyle(totalStyle);
        }
        
        // ===== AUTO-SIZE COLUMNS =====
        sheet.setColumnWidth(0, 2000);  // STT
        sheet.setColumnWidth(1, 10000); // Tên mặt hàng
        sheet.setColumnWidth(2, 6000);  // Danh mục
        sheet.setColumnWidth(3, 4000);  // Số lượt bán
        sheet.setColumnWidth(4, 6000);  // Số tiền
    }

    // ===== CELL STYLES =====

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 18);
        font.setColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0\" ₫\""));
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createNormalStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createTotalStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0\" ₫\""));
        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBorderTop(BorderStyle.MEDIUM);
        style.setBorderLeft(BorderStyle.MEDIUM);
        style.setBorderRight(BorderStyle.MEDIUM);
        return style;
    }

    // ===== DTO & HELPER CLASSES =====
    
    @lombok.Data
    @lombok.AllArgsConstructor
    private static class ProductRevenueDTO {
        private String productName;
        private String categoryName;
        private int totalQuantity;
        private double totalRevenue;
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    private static class WeekPeriod {
        private int weekNumber;
        private LocalDate startDate;
        private LocalDate endDate;
    }
}
