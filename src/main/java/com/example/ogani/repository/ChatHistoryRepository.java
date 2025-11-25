package com.example.ogani.repository;

import com.example.ogani.models.ChatHistory;
import com.example.ogani.models.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {
    
    // Lấy 10 tin nhắn gần nhất của user
    @Query("SELECT ch FROM ChatHistory ch WHERE ch.user.uid = :userId " +
           "ORDER BY ch.createdAt DESC")
    List<ChatHistory> findLatestByUserId(@Param("userId") Long userId, Pageable pageable);
    
    // Lấy lịch sử theo session
    @Query("SELECT ch FROM ChatHistory ch WHERE ch.sessionId = :sessionId " +
           "ORDER BY ch.createdAt ASC")
    List<ChatHistory> findBySessionId(@Param("sessionId") String sessionId);
    
    // Lấy tất cả lịch sử của user
    List<ChatHistory> findByUserOrderByCreatedAtDesc(User user);
    
    // Đếm số tin nhắn của user hôm nay
    @Query("SELECT COUNT(ch) FROM ChatHistory ch WHERE ch.user.uid = :userId " +
           "AND ch.createdAt >= :startDate")
    Long countTodayMessages(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate);
    
    // Xóa lịch sử cũ (sau 30 ngày)
    @Query("DELETE FROM ChatHistory ch WHERE ch.createdAt < :beforeDate")
    void deleteOldHistory(@Param("beforeDate") LocalDateTime beforeDate);
    
    // Lấy lịch sử trong khoảng thời gian
    @Query("SELECT ch FROM ChatHistory ch WHERE ch.user.uid = :userId " +
           "AND ch.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY ch.createdAt DESC")
    List<ChatHistory> findByUserAndDateRange(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}
