import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const AUTH_API = "http://localhost:8080/api/auth/";
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http:HttpClient) { }

  register(username: string, email: string, password: string):Observable<any>{
    return this.http.post(AUTH_API + 'register',{username,email,password},httpOptions);
  }

  login(username: string,password: string):Observable<any>{
    return this.http.post(AUTH_API+ "login",{username,password},httpOptions);
  }

  logout():Observable<any>{
    return this.http.post(AUTH_API + "logout",{},httpOptions);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(AUTH_API + 'forgot-password', { email }, httpOptions);
  }

  resetPasssword(token: string, password: string, confirmPassword: string): Observable<any> {
    return this.http.post(AUTH_API + 'reset-password', { token, password, confirmPassword }, httpOptions);
  }

  changePassword(username: string,oldPassword: string, newPassword: string): Observable<any> {
    return this.http.post(AUTH_API + 'change-password', { username,oldPassword, newPassword }, httpOptions);
  }
}
