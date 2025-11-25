import { state } from '@angular/animations';
import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/_service/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {

  passwordForm: FormGroup;
  userEmail = '';
  loading = false;
  successMessage = '';
  errorMessage = '';
  token: string = '';
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.passwordForm = this.fb.group({
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


  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmitPassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const { matkhau, confirmPassword } = this.passwordForm.value;

    this.authService.resetPasssword(this.token, matkhau, confirmPassword).subscribe({
      next: (res: any) => {

        if (res.status === 'success' || res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.',
            life: 3000
          });


          this.loading = false;


          setTimeout(() => {
            this.router.navigate(['/']), {
              state: {showLoginModal: true}
            }
          }, 1200);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Thông báo',
            detail: res.message || 'Không thể đặt lại mật khẩu.',
          });
          this.loading = false;
        }
      },
      error: (err) => {
        const message =
          err?.error?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.';
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
