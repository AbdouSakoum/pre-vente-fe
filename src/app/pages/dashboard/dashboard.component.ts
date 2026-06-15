import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTableModule],
  template: `
    <h2>Tableau de bord</h2>
    <div class="stats-grid">
      <mat-card class="stat-card" *ngFor="let s of orderStats">
        <mat-card-content>
          <div class="stat-value">{{ s.count }}</div>
          <div class="stat-label">{{ statusLabel(s.status) }}</div>
        </mat-card-content>
      </mat-card>
      <mat-card class="stat-card">
        <mat-card-content>
          <div class="stat-value">{{ warehouseTotal }}</div>
          <div class="stat-label">Unités entrepôt</div>
        </mat-card-content>
      </mat-card>
    </div>

    <h3>Livreurs</h3>
    <div class="card">
      <table class="data-table">
        <thead><tr><th>Livreur</th><th>Email</th></tr></thead>
        <tbody>
          <tr *ngFor="let d of drivers">
            <td>{{ d.name }}</td>
            <td>{{ d.email }}</td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="!drivers.length" class="empty-state" style="padding:24px;text-align:center;color:#94a3b8">Aucun livreur</div>
    </div>
  `,
  styles: [`
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:16px; margin-bottom:24px; }
    .stat-card { text-align:center; }
    .stat-value { font-size:36px; font-weight:bold; color:#3b82f6; }
    .stat-label { font-size:13px; color:#64748b; margin-top:4px; }
    .full-width { width:100%; }
  `]
})
export class DashboardComponent implements OnInit {
  orderStats: { status: string; count: number }[] = [];
  warehouseTotal = 0;
  drivers: any[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.get<any>('/dashboard').subscribe(data => {
      this.orderStats = (data.orders_by_status || []).map((s: any) => ({ status: s.status, count: +s.count }));
      this.warehouseTotal = data.warehouse_total || 0;
      this.drivers = [...(data.drivers || [])];
      this.cdr.detectChanges();
    });
  }

  statusLabel(s: string): string {
    const map: any = { pending: 'En attente', assigned: 'Assignées', in_progress: 'En cours', delivered: 'Livrées', cancelled: 'Annulées' };
    return map[s] || s;
  }
}
