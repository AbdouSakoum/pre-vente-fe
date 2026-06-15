import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" *ngIf="open" (click)="closed.emit()"></div>
    <div class="drawer" [class.open]="open">
      <div class="drawer-header">
        <h3>{{ title }}</h3>
        <button class="btn-icon" (click)="closed.emit()">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="drawer-body">
        <ng-content></ng-content>
      </div>
      <div class="drawer-footer" *ngIf="showFooter">
        <button class="btn-secondary" (click)="closed.emit()">Annuler</button>
        <button class="btn-primary" (click)="saved.emit()" [disabled]="saving">
          <span class="material-icons">{{ saving ? 'hourglass_top' : 'save' }}</span>
          {{ saving ? 'Enregistrement...' : saveLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:200; }
    .drawer {
      position:fixed; right:-460px; top:0; width:440px; height:100vh;
      background:#fff; z-index:300; display:flex; flex-direction:column;
      box-shadow:-4px 0 24px rgba(0,0,0,0.12);
      transition:right 0.25s ease;
    }
    .drawer.open { right:0; }
    .drawer-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:20px 24px; border-bottom:1px solid #e2e8f0; flex-shrink:0;
    }
    .drawer-header h3 { margin:0; font-size:16px; font-weight:600; color:#1e293b; }
    .drawer-body { flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:18px; }
    .drawer-footer {
      padding:16px 24px; border-top:1px solid #e2e8f0;
      display:flex; justify-content:flex-end; gap:10px; flex-shrink:0;
    }
    .btn-primary {
      display:flex; align-items:center; gap:8px;
      padding:10px 20px; background:#3b82f6; color:#fff;
      border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:500;
    }
    .btn-primary:hover { background:#2563eb; }
    .btn-primary:disabled { background:#93c5fd; cursor:not-allowed; }
    .btn-secondary {
      padding:10px 20px; background:#f1f5f9; color:#475569;
      border:none; border-radius:8px; cursor:pointer; font-size:14px;
    }
    .btn-secondary:hover { background:#e2e8f0; }
    .btn-icon {
      width:34px; height:34px; border:none; background:transparent;
      border-radius:6px; cursor:pointer; display:inline-flex;
      align-items:center; justify-content:center; color:#64748b;
    }
    .btn-icon:hover { background:#f1f5f9; }
    .btn-icon .material-icons { font-size:20px; }
  `]
})
export class DrawerComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() saving = false;
  @Input() saveLabel = 'Enregistrer';
  @Input() showFooter = true;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
}
