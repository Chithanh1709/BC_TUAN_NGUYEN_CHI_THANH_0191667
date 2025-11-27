package com.example.ogani.dtos.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.*;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ReviewRequest {
    @NotNull(message = "Product ID không được để trống")
    private Long productId;

    @NotNull(message = "Order ID không được để trống")
    private Long orderId;

    @NotBlank(message = "Tên người đánh giá không được để trống")
    private String reviewerName;

    @NotNull(message = "Rating không được để trống")
    @Min(value = 1, message = "Rating tối thiểu là 1")
    @Max(value = 5, message = "Rating tối đa là 5")
    private Integer reviewRating;

    @NotBlank(message = "Comment không được để trống")
    @Size(max = 5000, message = "Comment không được vượt quá 5000 ký tự")
    private String reviewComment;
}