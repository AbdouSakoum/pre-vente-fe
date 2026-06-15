import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  private base = `${environment.apiUrl}/tenant`;

  constructor(private http: HttpClient) {}

  getSubdomain(): string {
    const hostname = window.location.hostname;
    if (hostname === 'localhost') return 'demo';
    // IP address — pas de sous-domaine
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return 'demo';
    const parts = hostname.split('.');
    if (parts.length < 2) return 'demo';
    return parts[0];
  }

  getInfo(subdomain: string): Observable<TenantInfo> {
    return this.http.get<TenantInfo>(`${this.base}/info?subdomain=${subdomain}`);
  }
}
