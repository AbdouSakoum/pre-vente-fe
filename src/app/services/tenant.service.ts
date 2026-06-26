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

  getSubdomain(): string | null {
    const hostname = window.location.hostname;
    if (hostname === 'localhost') return null;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return null;
    const parts = hostname.split('.');
    if (parts.length < 3) return null;
    const sub = parts[0];
    // Sous-domaines réservés — pas des tenants
    if (['app', 'api', 'www'].includes(sub)) return null;
    return sub;
  }

  getInfo(subdomain: string): Observable<TenantInfo> {
    return this.http.get<TenantInfo>(`${this.base}/info?subdomain=${subdomain}`);
  }
}
