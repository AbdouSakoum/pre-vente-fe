import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User { id: string; name: string; email: string; role: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('user');
    if (stored) this.currentUser.set(JSON.parse(stored));
  }

  private getTenant(): string {
    const hostname = window.location.hostname;
    if (hostname === 'localhost') return 'demo';
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return 'demo';
    const parts = hostname.split('.');
    if (parts.length < 2) return 'demo';
    return parts[0];
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User; must_change_password: boolean }>(`${environment.apiUrl}/auth/login`, { email, password }, {
      headers: { 'X-Tenant': this.getTenant() }
    }).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        if (res.must_change_password) {
          localStorage.setItem('must_change_password', 'true');
        } else {
          localStorage.removeItem('must_change_password');
        }
        this.currentUser.set(res.user);
      })
    );
  }

  get mustChangePassword(): boolean {
    return localStorage.getItem('must_change_password') === 'true';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  get role(): string { return this.currentUser()?.role || ''; }
  get isAdmin(): boolean { return this.role === 'admin'; }
  get isStockManager(): boolean { return this.role === 'stock_manager'; }
  get isPreSeller(): boolean { return this.role === 'pre_seller'; }
  get isDelivery(): boolean { return this.role === 'delivery'; }
  get isLoggedIn(): boolean { return !!this.currentUser(); }
}
