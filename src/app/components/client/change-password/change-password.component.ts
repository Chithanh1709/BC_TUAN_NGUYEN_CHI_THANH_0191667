import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/_service/auth.service';
import { StorageService } from 'src/app/_service/storage.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent {
  passwordForm: FormGroup;
  userEmail = '';
  loading = false;
  successMessage = '';
  errorMessage = '';
  token: string = '';
  showNewPassword = false;
  showConfirmPassword = false;
  showOldPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService,
    private storageService: StorageService
  ) {
    this.passwordForm = this.fb.group({
      oldpassword: ['', [Validators.required, Validators.minLength(6)]],
      matkhau: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.userEmail = this.route.snapshot.queryParamMap.get('email') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('matkhau')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }


  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleOldPasswordVisibility()
  {
    this.showOldPassword = !this.showOldPassword;
  }


  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmitPassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const username = this.storageService.getUser().username;
    const {oldpassword, matkhau, confirmPassword } = this.passwordForm.value;
    console.log("Changing password for user:", username);
    console.log("Old password:", oldpassword);
    console.log("New password:", matkhau);
    console.log("Confirm password:", confirmPassword);

    this.authService.changePassword(username, oldpassword, matkhau).subscribe({

      next: (res: any) => {

        if (res.status === 'success' || res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.',
            life: 3000
          });


          this.loading = false;


          setTimeout(() => {
            this.router.navigate(['/']), {
              state: { showLoginModal: true }
            }
          }, 1200);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Thông báo',
            detail: res.message || 'Không thể đổi mật khẩu',
          });
          this.loading = false;
        }
      },
      error: (err) => {
        const message =
          err?.error?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: message,
          life: 4000
        });
        this.loading = false;
      }

    });
  }


}
