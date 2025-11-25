package com.example.ogani.service;

import com.example.ogani.config.GeminiConfig;
import com.example.ogani.dtos.response.ChatAiResponse;
import com.example.ogani.dtos.response.ChatHistoryDTO;
import com.example.ogani.models.ChatHistory;
import com.example.ogani.models.Order;
import com.example.ogani.models.Product;
import com.example.ogani.models.User;
import com.example.ogani.repository.ChatHistoryRepository;
import com.example.ogani.repository.OrderRepository;
import com.example.ogani.repository.ProductRepository;
import com.example.ogani.repository.UserRepository;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@Slf4j
public class GeminiChatService {

    @Autowired
    private GeminiConfig geminiConfig;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private ChatHistoryRepository chatHistoryRepository;
    
    @Autowired
    private UserRepository userRepository;

    private OkHttpClient client;
    private Gson gson;
    
    private String cachedProductContext = null;
    private long lastCacheTime = 0;
    private static final long CACHE_DURATION = 5 * 60 * 1000;

    @PostConstruct
    public void init() {
        this.client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
        this.gson = new Gson();
    }

    @Transactional
    public ChatAiResponse chat(String userMessage, Long userId) throws IOException {
        return chat(userMessage, userId, null);
    }

    @Transactional
    public ChatAiResponse chat(String userMessage, Long userId, String sessionId) throws IOException {
        if (sessionId == null || sessionId.isEmpty()) {
            sessionId = UUID.randomUUID().toString();
        }

        User user = null;
        if (userId != null) {
            user = userRepository.findById(userId).orElse(null);
        }

        // Lấy 20 đoạn chat gần nhất (tăng từ 10 lên 20 để có đủ context)
        List<ChatHistory> recentChats = getRecentChatHistory(userId, 20);

        // Kiểm tra câu hỏi có liên quan không (bỏ qua nếu có lịch sử chat)
        if (!hasRecentContext(recentChats) && !isRelevantQuestion(userMessage)) {
            ChatAiResponse offTopicResponse = createOffTopicResponse(userMessage);
            saveChatHistory(user, userMessage, offTopicResponse.getReply(), false, sessionId, ChatHistory.MessageType.OFF_TOPIC);
            return offTopicResponse;
        }

        // Build conversation context CHI TIẾT
        String conversationContext = buildDetailedConversationContext(recentChats);

        // Build context từ DB
        String productContext = getCachedProductContext();
        String orderContext = "";
        List<Order> userOrders = List.of();
        
        if (userId != null) {
            userOrders = orderRepository.getOrderByUser(userId);
            orderContext = buildOrderContext(userOrders);
        }

        // Build prompt với conversation history ĐẦY ĐỦ
        String systemPrompt = buildEnhancedSystemPrompt(productContext, orderContext, conversationContext);
        String fullPrompt = systemPrompt + "\n\n👤 Khách hàng vừa hỏi: " + userMessage;

        // Gọi Gemini API
        String geminiResponse = callGeminiAPIWithRetry(fullPrompt);

        // Lưu vào DB
        saveChatHistory(user, userMessage, geminiResponse, false, sessionId, detectMessageType(userMessage));

        // Build response
        ChatAiResponse response = new ChatAiResponse();
        response.setReply(geminiResponse);
        
        // Tìm sản phẩm dựa trên cả message hiện tại VÀ lịch sử
        response.setRelatedProducts(findRelatedProductsWithContext(userMessage, recentChats, productRepository.findAll()));
        response.setRelatedOrders(findRelatedOrders(userMessage, userOrders));

        return response;
    }

    /**
     * Kiểm tra có lịch sử chat gần đây không
     */
    private boolean hasRecentContext(List<ChatHistory> recentChats) {
        return recentChats != null && !recentChats.isEmpty();
    }

    /**
     * Build conversation context CHI TIẾT với đầy đủ thông tin
     */
    private String buildDetailedConversationContext(List<ChatHistory> recentChats) {
        if (recentChats == null || recentChats.isEmpty()) {
            return "";
        }

        StringBuilder context = new StringBuilder("\n📜 === LỊCH SỬ HỘI THOẠI ===\n");
        context.append("⚠️ QUAN TRỌNG: Đọc kỹ lịch sử này để hiểu ngữ cảnh cuộc trò chuyện!\n\n");
        
        // Reverse để hiển thị từ cũ đến mới
        List<ChatHistory> reversedChats = recentChats.stream()
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .collect(Collectors.toList());

        int turnNumber = 1;
        for (ChatHistory chat : reversedChats) {
            if (chat.getIsUserMessage()) {
                context.append(String.format("[Lượt %d] 👤 Khách: %s\n", turnNumber, chat.getMessage()));
            } else if (chat.getResponse() != null && !chat.getResponse().isEmpty()) {
                // Giữ TOÀN BỘ response của bot để AI hiểu rõ context
                context.append(String.format("[Lượt %d] 🤖 Bot: %s\n\n", turnNumber, chat.getResponse()));
                turnNumber++;
            }
        }
        
        context.append("=== KẾT THÚC LỊCH SỬ ===\n\n");
        return context.toString();
    }

    /**
     * Build enhanced system prompt với context awareness
     */
    private String buildEnhancedSystemPrompt(String productContext, String orderContext, String conversationContext) {
        return String.format("""
                🤖 Bạn là trợ lý bán hàng THÔNG MINH của Ogani - cửa hàng thực phẩm hữu cơ.
                
                ⚠️ QUY TẮC QUAN TRỌNG:
                1. ĐỌC KỸ LỊCH SỬ HỘI THOẠI để hiểu đầy đủ ngữ cảnh
                2. NẾU khách hỏi về "nó", "cái đó", "sản phẩm đó" → TÌM trong lịch sử xem đang nói về gì
                3. NẾU khách nói "2 gói", "3 cái" → TÌM sản phẩm được nhắc đến gần nhất trong lịch sử
                4. NẾU khách nói "đặt hàng", "thêm vào giỏ" → XÁC ĐỊNH sản phẩm từ ngữ cảnh trước đó
                5. NẾU khách nói "thanh toán" → KIỂM TRA xem có đơn hàng nào được đề cập không
                6. TIẾP TỤC cuộc hội thoại một cách TỰ NHIÊN, MẠCH LẠC
                7. CHỈ trả lời về sản phẩm, đơn hàng, dịch vụ Ogani
                
                %s
                
                📦 THÔNG TIN SẢN PHẨM HIỆN CÓ:
                %s
                
                %s
                
                🎯 NHIỆM VỤ CỦA BẠN:
                ✅ Dựa vào LỊCH SỬ để trả lời chính xác
                ✅ Nhớ sản phẩm khách đang quan tâm
                ✅ Gợi nhớ thông tin đã nói trước đó
                ✅ Hướng dẫn đặt hàng cụ thể
                ✅ Tính toán tổng tiền nếu cần
                ✅ Xác nhận lại thông tin quan trọng
                
                📝 FORMAT TRẢ LỜI:
                - Tham chiếu lịch sử: "Như đã nói ở trên...", "Bạn đang hỏi về rau cải ngọt đúng không?"
                - Xác nhận: "Bạn muốn đặt 2 gói rau cải ngọt (12,000đ/gói) = 24,000đ đúng không?"
                - Hướng dẫn tiếp: "Để đặt hàng, bạn cần..."
                - Ngắn gọn (tối đa 150 từ)
                - Dùng emoji: 🛒 📦 ✅ ❌ 💰 🚚
                
                💡 VÍ DỤ XỬ LÝ NGỮ CẢNH:
                
                Khách: "rau xanh có gì"
                Bot: "Có rau cải ngọt 300g giá 12,000đ"
                
                Khách: "giá có đắt không"
                → Bot phải hiểu "giá" = giá rau cải ngọt (12,000đ)
                
                Khách: "đặt 2 gói"
                → Bot phải hiểu = đặt 2 gói rau cải ngọt
                → Tính: 2 × 12,000 = 24,000đ
                
                Khách: "thêm vào giỏ hàng"
                → Bot phải nhớ: đang có 2 gói rau cải ngọt
                
                Khách: "thanh toán"
                → Bot phải nhớ: giỏ có 2 gói rau cải ngọt = 24,000đ
                
                ⚡ BẮT ĐẦU TRẢ LỜI:
                Hãy đọc kỹ lịch sử và trả lời câu hỏi tiếp theo một cách MẠCH LẠC, TỰ NHIÊN!
                """,
                conversationContext.isEmpty() ? "" : conversationContext,
                limitContext(productContext, 2000),
                orderContext.isEmpty() ? "" : "📋 THÔNG TIN ĐƠN HÀNG:\n" + limitContext(orderContext, 1000)
        );
    }

    /**
     * Lưu lịch sử chat vào DB
     */
    private void saveChatHistory(User user, String message, String response, 
                                 boolean isUserMessage, String sessionId, 
                                 ChatHistory.MessageType messageType) {
        ChatHistory chatHistory = new ChatHistory();
        chatHistory.setUser(user);
        chatHistory.setMessage(message);
        chatHistory.setResponse(response);
        chatHistory.setIsUserMessage(isUserMessage);
        chatHistory.setSessionId(sessionId);
        chatHistory.setMessageType(messageType);
        
        chatHistoryRepository.save(chatHistory);
        log.info("Saved chat history: userId={}, isUser={}, sessionId={}", 
                user != null ? user.getUid() : "guest", isUserMessage, sessionId);
    }

    /**
     * Lấy lịch sử chat gần nhất
     */
    private List<ChatHistory> getRecentChatHistory(Long userId, int limit) {
        if (userId == null) {
            return List.of();
        }
        
        return chatHistoryRepository.findLatestByUserId(userId, PageRequest.of(0, limit));
    }

    /**
     * Phát hiện loại tin nhắn
     */
    private ChatHistory.MessageType detectMessageType(String message) {
        String lowerMessage = message.toLowerCase();
        
        if (lowerMessage.contains("sản phẩm") || lowerMessage.contains("mua") || 
            lowerMessage.contains("giá") || lowerMessage.contains("tồn kho")) {
            return ChatHistory.MessageType.PRODUCT_QUERY;
        }
        
        if (lowerMessage.contains("đơn hàng") || lowerMessage.contains("đơn") || 
            lowerMessage.contains("order") || lowerMessage.contains("#")) {
            return ChatHistory.MessageType.ORDER_QUERY;
        }
        
        if (lowerMessage.contains("hỗ trợ") || lowerMessage.contains("giúp") || 
            lowerMessage.contains("liên hệ") || lowerMessage.contains("khiếu nại")) {
            return ChatHistory.MessageType.SUPPORT;
        }
        
        return ChatHistory.MessageType.TEXT;
    }

    private boolean isRelevantQuestion(String message) {
        String lowerMessage = message.toLowerCase();
        
        String[] relevantKeywords = {
            "sản phẩm", "mua", "giá", "bán", "hàng", "rau", "củ", "quả", "trái cây",
            "thực phẩm", "organic", "hữu cơ", "tươi", "táo", "cà chua", "cải", "xà lách",
            "đơn hàng", "đơn", "order", "giao hàng", "ship", "thanh toán", "mã đơn",
            "trạng thái", "kiểm tra", "theo dõi", "hủy đơn", "cod", "vnpay",
            "giao", "nhận", "vận chuyển", "phí ship", "freeship", "khuyến mãi",
            "giảm giá", "voucher", "mã giảm", "ưu đãi",
            "tư vấn", "hỏi", "giúp", "liên hệ", "hotline", "support", "chăm sóc",
            "đổi trả", "bảo hành", "hoàn tiền", "khiếu nại",
            "tài khoản", "đăng nhập", "đăng ký", "quên mật khẩu", "thông tin",
            "địa chỉ", "cập nhật", "profile",
            "danh mục", "loại", "category", "phân loại", "menu",
            "nó", "đó", "cái đó", "cái này", "như vậy", "thế", "vậy", "ấy",
            "đặt", "thêm", "giỏ", "cart", "checkout", "gói", "cái", "kg", "gram"
        };
        
        for (String keyword : relevantKeywords) {
            if (lowerMessage.contains(keyword)) {
                return true;
            }
        }
        
        if (lowerMessage.matches(".*\\d+.*")) {
            return true;
        }
        
        return false;
    }

    private ChatAiResponse createOffTopicResponse(String userMessage) {
        ChatAiResponse response = new ChatAiResponse();
        
        String reply = "🤖 Xin lỗi, tôi là trợ lý ảo của **Ogani** - hệ thống bán thực phẩm hữu cơ.\n\n" +
                      "Tôi chỉ có thể hỗ trợ bạn về:\n\n" +
                      "✅ **Sản phẩm**: Tìm kiếm, tư vấn mua sắm\n" +
                      "✅ **Đơn hàng**: Tra cứu, kiểm tra trạng thái\n" +
                      "✅ **Giao hàng**: Thông tin vận chuyển, phí ship\n" +
                      "✅ **Thanh toán**: Hướng dẫn, phương thức\n" +
                      "✅ **Khuyến mãi**: Ưu đãi, giảm giá\n\n" +
                      "Bạn có cần tư vấn về sản phẩm hay đơn hàng không? 😊";
        
        String lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.contains("thời tiết") || lowerMessage.contains("weather")) {
            reply = "🤖 Xin lỗi, tôi không thể tra cứu thời tiết. Tôi chỉ hỗ trợ về **sản phẩm và đơn hàng** của Ogani.\n\n" +
                   "Bạn muốn tìm sản phẩm gì không? 🛒";
        } 
        else if (lowerMessage.contains("tin tức") || lowerMessage.contains("news")) {
            reply = "🤖 Tôi không cung cấp tin tức. Tôi là trợ lý mua sắm của **Ogani**.\n\n" +
                   "Bạn cần tư vấn sản phẩm thực phẩm hữu cơ không? 🥬🍎";
        }
        
        response.setReply(reply);
        return response;
    }

    /**
     * Tìm sản phẩm liên quan DựA TRÊN CẢ CONTEXT
     */
    private List<ChatAiResponse.ProductInfo> findRelatedProductsWithContext(
            String userMessage, 
            List<ChatHistory> recentChats, 
            List<Product> allProducts) {
        
        String lowerMessage = userMessage.toLowerCase();
        
        // Tìm sản phẩm được nhắc đến trong lịch sử gần nhất
        String contextKeywords = extractProductKeywordsFromHistory(recentChats);
        String combinedSearch = (lowerMessage + " " + contextKeywords).toLowerCase();

        return allProducts.stream()
                .filter(p -> {
                    String productName = p.getName().toLowerCase();
                    String productDesc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
                    String categoryName = p.getCategory() != null ? p.getCategory().getName().toLowerCase() : "";
                    
                    return combinedSearch.contains(productName) ||
                           productName.contains(lowerMessage) ||
                           productDesc.contains(lowerMessage) ||
                           categoryName.contains(lowerMessage);
                })
                .limit(4)
                .map(p -> {
                    ChatAiResponse.ProductInfo info = new ChatAiResponse.ProductInfo();
                    info.setId(p.getId());
                    info.setName(p.getName());
                    info.setDescription(p.getDescription());
                    info.setPrice(p.getPrice());
                    info.setQuantity(p.getQuantity());
                    info.setCategoryName(p.getCategory() != null ? p.getCategory().getName() : null);
                    return info;
                })
                .collect(Collectors.toList());
    }

    /**
     * Trích xuất từ khóa sản phẩm từ lịch sử
     */
    private String extractProductKeywordsFromHistory(List<ChatHistory> recentChats) {
        if (recentChats == null || recentChats.isEmpty()) {
            return "";
        }

        StringBuilder keywords = new StringBuilder();
        
        // Lấy 5 tin nhắn gần nhất
        recentChats.stream()
                .limit(5)
                .forEach(chat -> {
                    if (chat.getMessage() != null) {
                        keywords.append(" ").append(chat.getMessage());
                    }
                    if (chat.getResponse() != null) {
                        keywords.append(" ").append(chat.getResponse());
                    }
                });
        
        return keywords.toString();
    }

    private String getCachedProductContext() {
        long currentTime = System.currentTimeMillis();
        if (cachedProductContext == null || (currentTime - lastCacheTime) > CACHE_DURATION) {
            List<Product> products = productRepository.findAll();
            cachedProductContext = buildProductContext(products);
            lastCacheTime = currentTime;
        }
        return cachedProductContext;
    }

    private String limitContext(String context, int maxChars) {
        if (context == null) return "";
        if (context.length() > maxChars) {
            return context.substring(0, maxChars) + "...";
        }
        return context;
    }

    private String buildProductContext(List<Product> products) {
        if (products == null || products.isEmpty()) {
            return "Chưa có sản phẩm.";
        }
        
        StringBuilder context = new StringBuilder();
        int count = 0;
        for (Product p : products) {
            if (count++ > 30) break;
            
            context.append(String.format(
                "ID%d: %s - %,d VNĐ - Tồn: %d%s\n",
                p.getId(),
                p.getName(),
                p.getPrice(),
                p.getQuantity(),
                p.getCategory() != null ? " - " + p.getCategory().getName() : ""
            ));
        }
        return context.toString();
    }

    private String buildOrderContext(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return "";
        }

        StringBuilder context = new StringBuilder();
        int count = 0;
        for (Order order : orders) {
            if (count++ > 5) break;
            
            context.append(String.format(
                "Đơn #%d: %s - %,d VNĐ - %s",
                order.getId(),
                getOrderStatusText(order.getOrderStatus()),
                order.getTotalPrice(),
                order.getPayMethod()
            ));
            
            if (order.getOrderdetails() != null && !order.getOrderdetails().isEmpty()) {
                context.append(" - SP: ");
                context.append(order.getOrderdetails().stream()
                    .limit(3)
                    .map(od -> od.getName() + " x" + od.getQuantity())
                    .collect(Collectors.joining(", ")));
            }
            context.append("\n");
        }
        return context.toString();
    }

    private String callGeminiAPIWithRetry(String prompt) throws IOException {
        int maxRetries = 3;
        int retryDelay = 3000;

        for (int i = 0; i < maxRetries; i++) {
            try {
                return callGeminiAPI(prompt);
            } catch (IOException e) {
                if (e.getMessage().contains("429") && i < maxRetries - 1) {
                    log.warn("Rate limit hit, retrying in {}ms...", retryDelay);
                    try {
                        Thread.sleep(retryDelay);
                        retryDelay *= 2;
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IOException("Retry interrupted", ie);
                    }
                } else {
                    throw e;
                }
            }
        }
        
        throw new IOException("Max retries exceeded");
    }

    private String callGeminiAPI(String prompt) throws IOException {
        String url = geminiConfig.getApiUrl() + "?key=" + geminiConfig.getApiKey();

        JsonObject requestBody = new JsonObject();
        JsonArray contents = new JsonArray();
        JsonObject content = new JsonObject();
        JsonArray parts = new JsonArray();
        JsonObject part = new JsonObject();
        part.addProperty("text", prompt);
        parts.add(part);
        content.add("parts", parts);
        contents.add(content);
        requestBody.add("contents", contents);

        JsonObject generationConfig = new JsonObject();
        generationConfig.addProperty("maxOutputTokens", 600);
        generationConfig.addProperty("temperature", 0.7);
        generationConfig.addProperty("topP", 0.9);
        generationConfig.addProperty("topK", 40);
        requestBody.add("generationConfig", generationConfig);

        RequestBody body = RequestBody.create(
                requestBody.toString(),
                MediaType.parse("application/json"));

        Request request = new Request.Builder()
                .url(url)
                .post(body)
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "Unknown error";
                log.error("Gemini API error: {}", errorBody);
                
                if (response.code() == 429) {
                    throw new IOException("API quota exceeded");
                }
                
                throw new IOException("Gemini API failed: " + response.code());
            }

            String responseBody = response.body().string();
            JsonObject jsonResponse = gson.fromJson(responseBody, JsonObject.class);

            return jsonResponse
                    .getAsJsonArray("candidates")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("content")
                    .getAsJsonArray("parts")
                    .get(0).getAsJsonObject()
                    .get("text").getAsString();
        }
    }

    private String getOrderStatusText(Order.OrderStatus status) {
        return switch (status) {
            case PENDING -> "Chờ thanh toán";
            case CONFIRMED -> "Đã xác nhận";
            case PAID -> "Đã thanh toán";
            case SHIPPING -> "Đang giao";
            case COMPLETED -> "Hoàn thành";
            case CANCELLED -> "Đã hủy";
        };
    }

    private List<ChatAiResponse.OrderInfo> findRelatedOrders(String userMessage, List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return List.of();
        }

        String lowerMessage = userMessage.toLowerCase();

        return orders.stream()
                .filter(o -> 
                    lowerMessage.contains("#" + o.getId()) ||
                    lowerMessage.contains("đơn") ||
                    lowerMessage.contains(String.valueOf(o.getId()))
                )
                .limit(3)
                .map(o -> {
                    ChatAiResponse.OrderInfo info = new ChatAiResponse.OrderInfo();
                    info.setOrderId(o.getId());
                    info.setOrderStatus(getOrderStatusText(o.getOrderStatus()));
                    info.setTotalPrice(o.getTotalPrice());
                    info.setDateOrder(o.getDateOrder());
                    info.setPayMethod(o.getPayMethod());
                    
                    if (o.getOrderdetails() != null) {
                        List<ChatAiResponse.OrderDetailInfo> details = o.getOrderdetails().stream()
                            .map(od -> {
                                ChatAiResponse.OrderDetailInfo detail = new ChatAiResponse.OrderDetailInfo();
                                detail.setProductName(od.getName());
                                detail.setQuantity(od.getQuantity());
                                detail.setPrice(od.getPrice());
                                detail.setSubTotal(od.getSubTotal());
                                return detail;
                            })
                            .collect(Collectors.toList());
                        info.setOrderDetails(details);
                    }
                    
                    return info;
                })
                .collect(Collectors.toList());
    }
    
    public List<ChatHistoryDTO> getChatHistory(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return List.of();
        }
        
        List<ChatHistory> histories = chatHistoryRepository.findByUserOrderByCreatedAtDesc(user);
        
        return histories.stream()
                .map(h -> {
                    ChatHistoryDTO dto = new ChatHistoryDTO();
                    dto.setId(h.getId());
                    dto.setMessage(h.getMessage());
                    dto.setResponse(h.getResponse());
                    dto.setIsUserMessage(h.getIsUserMessage());
                    dto.setCreatedAt(h.getCreatedAt());
                    dto.setMessageType(h.getMessageType().toString());
                    return dto;
                })
                .collect(Collectors.toList());
    }
    
    @Transactional
    public void clearChatHistory(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            List<ChatHistory> histories = chatHistoryRepository.findByUserOrderByCreatedAtDesc(user);
            chatHistoryRepository.deleteAll(histories);
            log.info("Cleared chat history for userId: {}", userId);
        }
    }
}