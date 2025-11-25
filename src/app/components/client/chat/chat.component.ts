// src/app/components/chat/chat.component.ts
import { Component, OnInit } from '@angular/core';
import { ChatMessage, ChatResponse, ChatService } from 'src/app/_service/chat.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  userMessage = '';
  messages: { text: string, isUser: boolean, timestamp: Date, isHtml?: boolean, safeHtml?: SafeHtml }[] = [];
  isLoading = false;
  isChatOpen = false;
  hasNewMessage = false;

  constructor(
    private chatService: ChatService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.messages.push({
      text: 'Xin chào! Tôi có thể giúp gì cho bạn?',
      isUser: false,
      timestamp: new Date()
    });
  }

  sendMessage() {
    if (!this.userMessage.trim() || this.isLoading) return;

    const userMessage = this.userMessage.trim();
    
    this.messages.push({ 
      text: userMessage, 
      isUser: true, 
      timestamp: new Date() 
    });
    
    this.isLoading = true;
    
    const chatMessage: ChatMessage = {
      message: userMessage,
      userId: this.getUserId()
    };

    this.chatService.sendMessage(chatMessage).subscribe({
      next: (response: ChatResponse) => {
        const formattedResponse = this.formatBotResponse(response.answer);
        this.messages.push({ 
          text: response.answer, 
          isUser: false, 
          timestamp: new Date(),
          isHtml: true,
          safeHtml: this.sanitizer.bypassSecurityTrustHtml(formattedResponse)
        });
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Lỗi:', error);
        this.messages.push({ 
          text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.', 
          isUser: false, 
          timestamp: new Date() 
        });
        this.scrollToBottom();
      },
      complete: () => {
        this.isLoading = false;
        this.userMessage = '';
      }
    });

    this.userMessage = '';
  }

  private formatBotResponse(text: string): string {
    if (!text) return text;

    // Format sản phẩm: chỉ hiển thị tên, giá và link
    // Pattern với khoảng trắng linh hoạt
    const productPattern = /(\d+\.\s+[^\n]+)\s*\n\s*Link:\s*(http:\/\/localhost:4200\/product\/\d+)\s*\n\s*ID:\s*\d+\s*\n\s*Giá:\s*([^\n]+)\s*\n\s*Loại:\s*[^\n]+/g;
    
    console.log('Original text:', text);
    text = text.replace(productPattern, (match, name, link, price) => {
      console.log('Match found:', { match, name, link, price });
      return `
        <div class="product-item">
          <div class="product-info">
            <div class="product-name">${name}</div>
            <div class="product-price">${price}</div>
          </div>
          <a href="${link}" target="_blank" rel="noopener noreferrer" class="product-link">
            🔗 Bấm để xem chi tiết sản phẩm
          </a>
        </div>
      `;
    });

    // Format markdown-like to HTML
    return text
      // Bold text: **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* -> <em>text</em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Headers: **HEADER** -> <div class="message-header">HEADER</div>
      .replace(/\*\*([^*\n]+)\*\*\s*\n/g, '<div class="message-header">$1</div>')
      // Lists: * item -> <li>item</li>
      .replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>')
      // Wrap lists in <ul>
      .replace(/(<li>.*<\/li>)/s, '<ul class="message-list">$1</ul>')
      // Line breaks
      .replace(/\n/g, '<br>')
      // Products sections
      .replace(/SẢN PHẨM (\d+):/g, '<div class="product-header">SẢN PHẨM $1:</div>');
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      this.hasNewMessage = false;
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  // Các methods khác giữ nguyên...
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  }

  private getUserId(): string {
    return localStorage.getItem('userId') || 'user-' + Date.now();
  }

  clearChat() {
    this.messages = [{
      text: 'Xin chào! Tôi có thể giúp gì cho bạn?',
      isUser: false,
      timestamp: new Date()
    }];
  }
}