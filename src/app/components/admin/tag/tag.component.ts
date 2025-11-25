import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TagService } from 'src/app/_service/tag.service';

@Component({
  selector: 'app-tag',
  templateUrl: './tag.component.html',
  styleUrls: ['./tag.component.css'],
  providers: [MessageService]

})
export class TagComponent implements OnInit {

  listTag: any;

  displayForm: boolean = false;

  deleteForm: boolean = false;

  onUpdate: boolean = false;

  tagForm: any = {
    id: null,
    name: null
  }

  constructor(private tagService: TagService, private messageService: MessageService) {

  }

  ngOnInit(): void {
    this.getList();
  }


  getList() {
    this.tagService.getListTag().subscribe({
      next: res => {
        this.listTag = res;
      }, error: err => {
        console.log(err);
      }
    })
  }

  showForm() {
    this.onUpdate = false;
    this.tagForm = {
      id: null,
      name: null
    }
    this.displayForm = true;
  }

  onUpdateForm(id: number, name: string) {
    this.onUpdate = true;
    this.displayForm = true;
    this.tagForm.id = id;
    this.tagForm.name = name;
  }
  onDelete(id: number, name: string) {
    this.deleteForm = true;
    this.tagForm.id = id;
    this.tagForm.name = name;
  }

  createTag() {
    const { name } = this.tagForm;

    this.tagService.createTag(name).subscribe({
      next: (res) => {
        this.getList();
        this.displayForm = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: res.message || 'Thêm tag thành công!'
        });
      },
      error: (err) => {
        // ✅ Lấy thông báo chi tiết từ backend nếu có
        const msg = err.error?.message || `Tag '${name}' đã tồn tại, vui lòng nhập tên khác!`;
        this.messageService.add({
          severity: 'error',
          summary: 'Thông báo',
          detail: msg
        });
      }
    });
  }


  updateTag() {
    const { id, name } = this.tagForm;
    // Kiểm tra trùng tên (không tính chính tag đang sửa)
    const isDuplicate = this.listTag?.some(
      (tag: any) => tag.name?.trim().toLowerCase() === name?.trim().toLowerCase() && tag.id !== id
    );
    if (isDuplicate) {
      this.showWarn("Tên danh mục đã tồn tại!");
      return;
    }
    this.tagService.updateTag(id, name).subscribe({
      next: res => {
        this.getList();
        this.messageService.add({ severity: 'success', summary: 'Thông báo', detail: 'Cập nhật danh mục thành công!' });
        this.displayForm = false;
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Thông báo', detail: err.message });
      }
    });
  }

  enableTag(id: number, currentStatus: boolean) {
    this.tagService.enableTag(id).subscribe({
      next: res => {
        this.getList();
        const message = currentStatus
          ? 'Hủy kích hoạt thành công!'
          : 'Kích hoạt thành công!';
        this.messageService.add({
          severity: 'success',
          summary: 'Thông báo',
          detail: message
        });
      },
      error: err => {
        this.messageService.add({
          severity: 'error',
          summary: 'Thông báo',
          detail: err.message
        });
      }
    });
  }


  deleteTag() {
    const { id } = this.tagForm;
    this.tagService.deleteTag(id).subscribe({
      next: res => {
        this.getList();
        this.messageService.add({ severity: 'success', summary: 'Thông báo', detail: 'Xóa danh mục thành công!!' });
        this.deleteForm = false;
      }, error: err => {
        this.messageService.add({ severity: 'error', summary: 'Thông báo', detail: err.message });
      }
    })
  }




  showSuccess(text: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: text });
  }
  showError(text: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: text });
  }

  showWarn(text: string) {
    this.messageService.add({ severity: 'warn', summary: 'Warn', detail: text });
  }

}
