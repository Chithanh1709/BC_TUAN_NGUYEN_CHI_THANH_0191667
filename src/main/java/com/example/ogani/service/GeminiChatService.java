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
import java.util.Base64;

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

        // ✅ LƯU TIN NHẮN CỦA USER TRƯỚC KHI XỬ LÝ
        saveChatHistory(user, userMessage, null, true, sessionId, detectMessageType(userMessage));

        // Lấy 20 đoạn chat gần nhất (bao gồm cả tin nhắn vừa lưu)
        List<ChatHistory> recentChats = getRecentChatHistory(userId, 20);

        // Kiểm tra câu hỏi có liên quan không (bỏ qua nếu có lịch sử chat)
        if (!hasRecentContext(recentChats) && !isRelevantQuestion(userMessage)) {
            ChatAiResponse offTopicResponse = createOffTopicResponse(userMessage);
            // Lưu response off-topic
            saveChatHistory(user, null, offTopicResponse.getReply(), false, sessionId, ChatHistory.MessageType.OFF_TOPIC);
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

        // ✅ LƯU RESPONSE CỦA BOT
        saveChatHistory(user, null, geminiResponse, false, sessionId, detectMessageType(userMessage));

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
        context.append("⚠️ QUAN TRỌNG: Đọc kỹ lịch sử để hiểu CHÍNH XÁC ngữ cảnh!\n\n");
        
        // Sắp xếp từ cũ đến mới
        List<ChatHistory> sortedChats = recentChats.stream()
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .collect(Collectors.toList());

        // Nhóm tin nhắn theo cặp user-bot
        for (int i = 0; i < sortedChats.size(); i++) {
            ChatHistory chat = sortedChats.get(i);
            
            if (chat.getIsUserMessage() && chat.getMessage() != null) {
                context.append(String.format("👤 Khách: %s\n", chat.getMessage()));
                
                // Tìm response của bot ngay sau đó
                if (i + 1 < sortedChats.size()) {
                    ChatHistory botResponse = sortedChats.get(i + 1);
                    if (!botResponse.getIsUserMessage() && botResponse.getResponse() != null) {
                        context.append(String.format("🤖 Bot: %s\n\n", botResponse.getResponse()));
                        i++; // Skip bot response ở lần lặp tiếp theo
                    }
                }
            }
        }
        
        context.append("=== KẾT THÚC LỊCH SỬ ===\n\n");
        return context.toString();
    }

    /**
     * Build enhanced system prompt với context awareness MẠNH HƠN
     */
    private String buildEnhancedSystemPrompt(String productContext, String orderContext, String conversationContext) {
        // SỬ DỤNG + thay vì String.format để tránh lỗi với emoji và ký tự đặc biệt
        StringBuilder prompt = new StringBuilder();
        
        prompt.append("🤖 Bạn là trợ lý bán hàng THÔNG MINH của Ogani - cửa hàng thực phẩm hữu cơ.\n\n");
        
        prompt.append("⚠️ QUY TẮC QUAN TRỌNG - ĐỌC KỸ:\n");
        prompt.append("1. PHẢI ĐỌC TOÀN BỘ LỊCH SỬ HỘI THOẠI để hiểu ngữ cảnh\n");
        prompt.append("2. Khi khách nói \"mua thử\", \"đặt\", \"thêm vào giỏ\" → TÌM sản phẩm đã được nhắc đến GẦN NHẤT\n");
        prompt.append("3. Khi khách hỏi về \"nó\", \"cái đó\" → XEM LỊCH SỬ để biết đang nói về sản phẩm nào\n");
        prompt.append("4. Khi khách nói số lượng (2 gói, 3 cái) → KẾT HỢP với sản phẩm trong context\n");
        prompt.append("5. LUÔN THAM CHIẾU lại thông tin đã nói trước đó\n");
        prompt.append("6. TIẾP TỤC cuộc trò chuyện một cách TỰ NHIÊN, MẠCH LẠC\n");
        prompt.append("7. CHỈ trả lời về sản phẩm, đơn hàng, dịch vụ Ogani\n\n");
        
        // Thêm conversation context
        if (!conversationContext.isEmpty()) {
            prompt.append(conversationContext);
        }
        
        prompt.append("📦 THÔNG TIN SẢN PHẨM HIỆN CÓ:\n");
        prompt.append(limitContext(productContext, 2000));
        prompt.append("\n\n");
        
        // Thêm order context nếu có
        if (!orderContext.isEmpty()) {
            prompt.append("📋 THÔNG TIN ĐƠN HÀNG:\n");
            prompt.append(limitContext(orderContext, 1000));
            prompt.append("\n\n");
        }
        
        prompt.append("🎯 NHIỆM VỤ CỦA BẠN:\n");
        prompt.append("✅ Đọc TOÀN BỘ lịch sử để tìm sản phẩm được nhắc đến\n");
        prompt.append("✅ Khi khách nói \"mua thử\" → XÁC ĐỊNH sản phẩm từ câu hỏi TRƯỚC ĐÓ\n");
        prompt.append("✅ Nhớ và tham chiếu thông tin đã nói\n");
        prompt.append("✅ Gợi ý số lượng, tính tiền\n");
        prompt.append("✅ HƯỚNG DẪN quy trình đặt hàng CHI TIẾT\n");
        prompt.append("✅ Xác nhận lại thông tin QUAN TRỌNG\n\n");
        
        prompt.append("🛒 QUY TRÌNH ĐẶT HÀNG (QUAN TRỌNG):\n");
        prompt.append("Khi khách muốn đặt hàng, PHẢI hướng dẫn theo các bước sau:\n\n");
        
        prompt.append("📝 BƯỚC 1: Xác nhận sản phẩm & số lượng\n");
        prompt.append("- Xác nhận rõ tên sản phẩm, số lượng\n");
        prompt.append("- Tính tổng tiền: [Số lượng] × [Giá] = [Tổng]\n");
        prompt.append("- VD: \"2 gói rau cải ngọt × 12,000đ = 24,000đ\"\n\n");
        
        prompt.append("🔐 BƯỚC 2: Kiểm tra đăng nhập\n");
        prompt.append("- Hỏi: \"Bạn đã có tài khoản Ogani chưa ạ?\"\n");
        prompt.append("- Nếu CHƯA → Hướng dẫn đăng ký:\n");
        prompt.append("  \"Bạn cần đăng ký tài khoản trước nhé:\n");
        prompt.append("   1. Vào trang chủ Ogani\n");
        prompt.append("   2. Click 'Đăng ký'\n");
        prompt.append("   3. Điền thông tin: Email, Mật khẩu, Họ tên, SĐT\n");
        prompt.append("   4. Xác thực email\"\n\n");
        
        prompt.append("- Nếu ĐÃ CÓ → Hướng dẫn đăng nhập:\n");
        prompt.append("  \"Bạn vui lòng đăng nhập để tiếp tục đặt hàng nhé:\n");
        prompt.append("   1. Vào trang chủ Ogani\n");
        prompt.append("   2. Click 'Đăng nhập'\n");
        prompt.append("   3. Nhập Email và Mật khẩu\"\n\n");
        
        prompt.append("🛍️ BƯỚC 3: Thêm sản phẩm vào giỏ hàng\n");
        prompt.append("\"Sau khi đăng nhập, bạn làm theo các bước sau:\n");
        prompt.append(" 1. Tìm sản phẩm [Tên sản phẩm]\n");
        prompt.append(" 2. Click vào sản phẩm để xem chi tiết\n");
        prompt.append(" 3. Chọn số lượng: [Số lượng]\n");
        prompt.append(" 4. Click 'Thêm vào giỏ hàng' 🛒\n");
        prompt.append(" 5. Kiểm tra giỏ hàng (icon giỏ hàng ở góc phải)\"\n\n");
        
        prompt.append("💳 BƯỚC 4: Thanh toán\n");
        prompt.append("\"Để thanh toán, bạn làm tiếp:\n");
        prompt.append(" 1. Vào 'Giỏ hàng' (icon giỏ hàng)\n");
        prompt.append(" 2. Kiểm tra lại sản phẩm và số lượng\n");
        prompt.append(" 3. Click 'Thanh toán'\n");
        prompt.append(" 4. Điền thông tin giao hàng:\n");
        prompt.append("    - Họ tên người nhận\n");
        prompt.append("    - Số điện thoại\n");
        prompt.append("    - Địa chỉ giao hàng\n");
        prompt.append(" 5. Chọn phương thức thanh toán:\n");
        prompt.append("    ✅ COD (Thanh toán khi nhận hàng)\n");
        prompt.append("    ✅ VNPay (Thanh toán online)\n");
        prompt.append("    ✅ Chuyển khoản\n");
        prompt.append(" 6. Xác nhận đơn hàng\"\n\n");
        
        prompt.append("📦 BƯỚC 5: Xác nhận & Theo dõi\n");
        prompt.append("\"Sau khi đặt hàng thành công:\n");
        prompt.append(" ✅ Bạn sẽ nhận email xác nhận đơn hàng\n");
        prompt.append(" ✅ Mã đơn hàng: #[số]\n");
        prompt.append(" ✅ Theo dõi tại: 'Tài khoản' → 'Đơn hàng của tôi'\n");
        prompt.append(" ✅ Thời gian giao: 2-3 ngày\n");
        prompt.append(" ✅ Phí ship: Miễn phí đơn từ 200,000đ\"\n\n");
        
        prompt.append("📝 VÍ DỤ XỬ LÝ NGỮ CẢNH CỤ THỂ:\n\n");
        
        prompt.append("[Ví dụ 1: Khách mua thử]\n");
        prompt.append("👤 Khách: \"rau xanh có gì\"\n");
        prompt.append("🤖 Bot: \"Có rau cải ngọt 300g - 12,000đ\"\n\n");
        prompt.append("👤 Khách: \"tôi muốn mua thử\"\n");
        prompt.append("✅ Bot trả lời:\n");
        prompt.append("\"Dạ, bạn muốn mua thử rau cải ngọt 300g (12,000đ) đúng không ạ?\n\n");
        prompt.append("Để đặt hàng, bạn cần:\n");
        prompt.append("1️⃣ Đăng nhập tài khoản Ogani (hoặc đăng ký nếu chưa có)\n");
        prompt.append("2️⃣ Thêm rau cải ngọt vào giỏ hàng\n");
        prompt.append("3️⃣ Điền thông tin giao hàng\n");
        prompt.append("4️⃣ Chọn phương thức thanh toán (COD/VNPay)\n\n");
        prompt.append("Bạn đã có tài khoản Ogani chưa ạ? 😊\"\n\n");
        
        prompt.append("[Ví dụ 2: Khách muốn đặt hàng ngay]\n");
        prompt.append("👤 Khách: \"đặt 3 gói rau cải\"\n");
        prompt.append("✅ Bot trả lời:\n");
        prompt.append("\"Dạ, bạn muốn đặt 3 gói rau cải ngọt đúng không ạ?\n");
        prompt.append("💰 Tổng tiền: 3 × 12,000đ = 36,000đ\n\n");
        prompt.append("📝 HƯỚNG DẪN ĐẶT HÀNG:\n\n");
        prompt.append("🔐 Bước 1: Đăng nhập\n");
        prompt.append("- Vào trang Ogani → Click 'Đăng nhập'\n");
        prompt.append("- Hoặc đăng ký nếu chưa có tài khoản\n\n");
        prompt.append("🛒 Bước 2: Thêm vào giỏ\n");
        prompt.append("- Tìm 'Rau cải ngọt 300g'\n");
        prompt.append("- Chọn số lượng: 3\n");
        prompt.append("- Click 'Thêm vào giỏ hàng'\n\n");
        prompt.append("💳 Bước 3: Thanh toán\n");
        prompt.append("- Vào giỏ hàng → Click 'Thanh toán'\n");
        prompt.append("- Điền địa chỉ giao hàng\n");
        prompt.append("- Chọn COD hoặc VNPay\n");
        prompt.append("- Xác nhận đơn hàng\n\n");
        prompt.append("Bạn đã sẵn sàng đặt hàng chưa ạ? 😊\"\n\n");
        
        prompt.append("📋 FORMAT TRẢ LỜI:\n");
        prompt.append("- LUÔN xác nhận sản phẩm cụ thể từ lịch sử\n");
        prompt.append("- LUÔN tính tiền nếu có số lượng\n");
        prompt.append("- LUÔN hướng dẫn quy trình đặt hàng CHI TIẾT khi cần\n");
        prompt.append("- Chia thành các bước rõ ràng với số thứ tự\n");
        prompt.append("- Dùng emoji: 🛒 📦 ✅ ❌ 💰 🚚 🔐 💳\n");
        prompt.append("- Ngắn gọn nhưng ĐẦY ĐỦ thông tin\n");
        prompt.append("- Kết thúc bằng câu hỏi để tiếp tục hội thoại\n\n");
        
        prompt.append("⚡ LƯU Ý ĐẶC BIỆT:\n");
        prompt.append("- NẾU khách muốn đặt hàng → PHẢI hướng dẫn ĐẦY ĐỦ quy trình\n");
        prompt.append("- NẾU khách chưa đăng nhập → Nhắc nhở đăng nhập/đăng ký\n");
        prompt.append("- NẾU khách hỏi về thanh toán → Giải thích CHI TIẾT các phương thức\n");
        prompt.append("- NẾU khách hỏi về giao hàng → Nói rõ thời gian và phí ship\n");
        prompt.append("- LUÔN đề cập đến việc cần đăng nhập trước khi đặt hàng\n\n");
        
        prompt.append("💡 CÁC THÔNG TIN BỔ SUNG:\n");
        prompt.append("- Miễn phí ship cho đơn từ 200,000đ\n");
        prompt.append("- Giao hàng trong 2-3 ngày\n");
        prompt.append("- Hỗ trợ đổi trả trong 7 ngày\n");
        prompt.append("- Hotline: 1900-xxxx (8h-22h)\n");
        prompt.append("- Email: support@ogani.com\n\n");
        
        prompt.append("⚡ BẮT ĐẦU TRẢ LỜI:\n");
        prompt.append("Hãy đọc KỸ lịch sử và trả lời CHÍNH XÁC, HƯỚNG DẪN CHI TIẾT quy trình đặt hàng!\n");
        
        return prompt.toString();
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
                    String imageData = null;
                if (p.getImages() != null && !p.getImages().isEmpty()) {
                    // Nếu dữ liệu ảnh được lưu dưới dạng byte[] thì chuyển sang Base64 string để phù hợp với imageUrl
                    byte[] data = p.getImages().iterator().next().getData(); // Hoặc getUrl() nếu lưu URL thay vì byte[]
                    if (data != null) {
                        imageData = "data:image/png;base64," + Base64.getEncoder().encodeToString(data);
                    }
                }
                info.setImageUrl(imageData); // Set null nếu không có ảnh
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
                .limit(10)
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
        // URL đã bao gồm API key
        String url = geminiConfig.getApiUrl() + "?key=" + geminiConfig.getApiKey();
        
        log.debug("Calling Gemini API: {}", geminiConfig.getApiUrl());

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

        // Generation config
        JsonObject generationConfig = new JsonObject();
        generationConfig.addProperty("maxOutputTokens", 600);
        generationConfig.addProperty("temperature", 0.7);
        generationConfig.addProperty("topP", 0.9);
        generationConfig.addProperty("topK", 40);
        requestBody.add("generationConfig", generationConfig);

        log.debug("Request body: {}", requestBody.toString());

        RequestBody body = RequestBody.create(
                requestBody.toString(),
                MediaType.parse("application/json"));

        Request request = new Request.Builder()
                .url(url)
                .post(body)
                .addHeader("Content-Type", "application/json")
                .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "";
            
            if (!response.isSuccessful()) {
                log.error("Gemini API error [{}]: {}", response.code(), responseBody);
                
                if (response.code() == 404) {
                    throw new IOException("Gemini API endpoint not found. Please check the URL configuration.");
                }
                
                if (response.code() == 429) {
                    throw new IOException("API quota exceeded. Please try again later.");
                }
                
                if (response.code() == 401) {
                    throw new IOException("Invalid API key. Please check your configuration.");
                }
                
                throw new IOException("Gemini API failed: " + response.code() + " - " + responseBody);
            }

            log.debug("Response body: {}", responseBody);
            
            JsonObject jsonResponse = gson.fromJson(responseBody, JsonObject.class);

            return jsonResponse
                    .getAsJsonArray("candidates")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("content")
                    .getAsJsonArray("parts")
                    .get(0).getAsJsonObject()
                    .get("text").getAsString();
        } catch (Exception e) {
            log.error("Error calling Gemini API: ", e);
            throw e;
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