import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  private getTenant(): string {
    const hostname = window.location.hostname;
    if (hostname === 'localhost') return 'demo';
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return 'demo';
    const parts = hostname.split('.');
    if (parts.length < 2) return 'demo';
    return parts[0];
  }

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    const base: any = { 'X-Tenant': this.getTenant() };
    if (token) base['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(base);
  }

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, { headers: this.headers() });
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  patch<T>(path: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`, { headers: this.headers() });
  }

  postForm<T>(path: string, form: FormData): Observable<T> {
    const token = localStorage.getItem('token');
    const tenant = this.getTenant();
    const headers = new HttpHeaders({ 'X-Tenant': tenant, ...(token ? { Authorization: `Bearer ${token}` } : {}) });
    return this.http.post<T>(`${this.base}${path}`, form, { headers });
  }

  putForm<T>(path: string, form: FormData): Observable<T> {
    const token = localStorage.getItem('token');
    const tenant = this.getTenant();
    const headers = new HttpHeaders({ 'X-Tenant': tenant, ...(token ? { Authorization: `Bearer ${token}` } : {}) });
    return this.http.put<T>(`${this.base}${path}`, form, { headers });
  }
}
