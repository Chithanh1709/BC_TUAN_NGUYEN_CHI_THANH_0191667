// src/app/components/chat/chat.component.ts
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChatMessage, ChatResponse, ChatService } from 'src/app/_service/chat.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatMessages') private chatMessagesContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  isChatOpen: boolean = false;
  userId: number | undefined;

  // Thêm biến để quản lý vị trí drag
  isDragging = false;
  dragPosition = { x: 0, y: 0 };
  initialPosition = { x: 0, y: 0 };

  constructor(
    private chatbotService: ChatService,
    private router: Router // Thêm Router
  ) {}

  ngOnInit(): void {
    // Lấy userId từ localStorage hoặc auth service
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.userId = user.uid;

    // Thêm tin nhắn chào mừng
    this.messages.push({
      type: 'bot',
      content: 'Xin chào! 👋 Tôi là trợ lý ảo của Ogani. Tôi có thể giúp bạn:\n\n✅ Tìm kiếm sản phẩm\n✅ Tư vấn mua hàng\n✅ Tra cứu đơn hàng\n✅ Kiểm tra trạng thái giao hàng\n\nBạn cần hỗ trợ gì không?',
      timestamp: new Date()
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading) {
      return;
    }

    const userMessage = this.userInput.trim();
    
    // Thêm tin nhắn của user
    this.messages.push({
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    this.userInput = '';
    this.isLoading = true;

    // Gửi đến API
    this.chatbotService.sendMessage(userMessage, this.userId).subscribe({
      next: (response) => {
        this.messages.push({
          type: 'bot',
          content: response.reply,
          timestamp: new Date(),
          products: response.relatedProducts,
          orders: response.relatedOrders
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.messages.push({
          type: 'bot',
          content: '❌ Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
          timestamp: new Date()
        });
        this.isLoading = false;
      }
    });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  scrollToBottom(): void {
    try {
      this.chatMessagesContainer.nativeElement.scrollTop = 
        this.chatMessagesContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  viewProduct(productId: number): void {
    // Navigate đến trang chi tiết sản phẩm
    this.router.navigate(['/product', productId]);
  }

  viewOrder(orderId: number): void {
    // Navigate đến trang chi tiết đơn hàng
    this.router.navigate(['/orders', orderId]);
  }

  // Thêm method để lấy ảnh sản phẩm
  getProductImage(product: any): string {
    if (product.imageUrl) {
      // Nếu là base64
      if (product.imageUrl.startsWith('data:image')) {
        return product.imageUrl;
      }
      // Nếu là URL
      return product.imageUrl;
    }
    // Ảnh mặc định nếu không có
    return 'assets/images/no-image.png';
  }

  // Format giá tiền
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  clearChat(): void {
    this.messages = [{
      type: 'bot',
      content: 'Đã xóa lịch sử chat. Bạn cần hỗ trợ gì không? 😊',
      timestamp: new Date()
    }];
  }

  // Method để format nội dung tin nhắn (thay thế \n thành <br>)
  formatMessageContent(content: string): string {
    if (!content) return '';
    return content.replace(/\n/g, '<br/>');
  }

  // Bắt đầu drag
  onDragStart(event: MouseEvent): void {
    if (this.isChatOpen) return; // Chỉ drag khi chat đóng
    
    this.isDragging = true;
    this.initialPosition = {
      x: event.clientX - this.dragPosition.x,
      y: event.clientY - this.dragPosition.y
    };
    
    event.preventDefault();
  }

  // Đang drag
  @HostListener('document:mousemove', ['$event'])
  onDrag(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    this.dragPosition = {
      x: event.clientX - this.initialPosition.x,
      y: event.clientY - this.initialPosition.y
    };
  }

  // Kết thúc drag
  @HostListener('document:mouseup')
  onDragEnd(): void {
    this.isDragging = false;
  }

  ngOnDestroy(): void {
    // Thực hiện cleanup nếu cần thiết
  }
}