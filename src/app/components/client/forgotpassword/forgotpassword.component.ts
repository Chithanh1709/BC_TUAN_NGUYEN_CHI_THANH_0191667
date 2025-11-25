import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/_service/auth.service';


@Component({
  selector: 'app-forgotpassword',

  templateUrl: './forgotpassword.component.html',
  styleUrls: ['./forgotpassword.component.css']
})
export class ForgotpasswordComponent {

  emailForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmitEmail() {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const email = this.emailForm.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMessage =
          res.message || 'Yêu cầu đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email.';
        this.messageService.add({severity:'success', summary: 'Thành công', detail: 'Vui lòng kiểm tra email để đặt lại mật khẩu!'});
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err.error?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại sau.';
      }
    });
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }
}
