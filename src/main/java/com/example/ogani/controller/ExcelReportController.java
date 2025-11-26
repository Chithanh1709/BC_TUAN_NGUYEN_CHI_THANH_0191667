package com.example.ogani.controller;

import com.example.ogani.service.ExcelReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/excel-report")
@CrossOrigin(origins = "*", maxAge = 3600)
@Tag(name = "Excel Report", description = "API xuất báo cáo Excel")
@RequiredArgsConstructor
@Slf4j
public class ExcelReportController {

    private final ExcelReportService excelReportService;

    @GetMapping("/revenue")
    @Operation(summary = "Xuất báo cáo doanh thu Excel", 
               description = "Type: week (tuần hiện tại), month (tháng hiện tại), quarter (quý hiện tại), year (năm hiện tại)")
    public ResponseEntity<ByteArrayResource> exportRevenueReport(
            @RequestParam(required = false, defaultValue = "month") String type) {
        
        try {
            log.info("Exporting revenue report - type: {}", type);
            
            // Validate type
            if (!type.matches("week|month|quarter|year")) {
                return ResponseEntity.badRequest().build();
            }
            
            byte[] excelBytes = excelReportService.generateRevenueReport(type);
            
            ByteArrayResource resource = new ByteArrayResource(excelBytes);
            
            // Tạo tên file
            String formatted = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            String fileName = String.format("BaoCaoDoanhThu_%s_%s.xlsx", 
                type, 
                formatted
            );
            
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(excelBytes.length)
                .body(resource);
            
        } catch (Exception e) {
            log.error("Error exporting revenue report: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
