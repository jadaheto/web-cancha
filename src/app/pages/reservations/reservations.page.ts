import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Reservation, ReservationStatus } from '../../core/models';
import { ReservationsService } from '../../core/services/reservations.service';
import { BadgeComponent } from '../../ui/atoms/badge.component';
import { SpinnerComponent } from '../../ui/atoms/spinner.component';
import { EmptyStateComponent } from '../../ui/molecules/empty-state.component';
import { PageHeaderComponent } from '../../ui/molecules/page-header.component';
import { PaymentLinkComponent } from '../../ui/molecules/payment-link.component';
import { ButtonComponent } from '../../ui/atoms/button.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'cs-reservations-page',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe, FormsModule,
    BadgeComponent, SpinnerComponent, EmptyStateComponent, PageHeaderComponent,
    RouterLink, ButtonComponent, PaymentLinkComponent,
  ],
  template: `
    <cs-page-header title="Reservas" subtitle="Gestiona las reservas de todos los recursos"></cs-page-header>
    <div class="top-actions">
      <a routerLink="/admin/reservations/new" class="cs-btn cs-btn-primary"><i class="bi bi-plus-lg"></i> Nueva reserva</a>
    </div>

    <div class="cs-card filters">
      <div>
        <label class="cs-label">Fecha</label>
        <input type="date" class="cs-input" [(ngModel)]="date" (change)="load()" />
      </div>
      <div>
        <label class="cs-label">Estado</label>
        <select class="cs-select" [(ngModel)]="status" (change)="load()">
          <option value="">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="confirmed">Confirmada</option>
          <option value="cancelled">Cancelada</option>
          <option value="completed">Completada</option>
        </select>
      </div>
      <button class="cs-btn cs-btn-ghost" (click)="clear()"><i class="bi bi-x-circle"></i> Limpiar</button>
    </div>

    <cs-spinner *ngIf="loading()"></cs-spinner>

    <div class="cs-card mt-2" *ngIf="!loading()">
      <div class="cs-table-wrap" *ngIf="items().length; else empty"><table class="cs-table cs-table--striped">
        <thead>
          <tr><th>Cancha</th><th>Cliente</th><th>Inicio</th><th>Horas</th><th>Estado</th><th>Pago</th><th class="right">Total</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of items()">
            <td>{{ r.courtName }}</td>
            <td>
              <strong>{{ r.userName }}</strong>
              <small class="text-muted d-block">Cat. {{ r.userCategory }}</small>
            </td>
            <td>{{ r.startTime | date:'short' }}</td>
            <td>{{ r.durationHours }}</td>
            <td><cs-badge [status]="r.status"></cs-badge></td>
            <td>
              <cs-badge [status]="r.paymentStatus"></cs-badge>
              <small class="text-muted d-block" *ngIf="r.paymentMethod">
                {{ r.paymentMethod === 'caja' ? 'Caja' : 'ePayco' }}<span class="ref" *ngIf="r.paymentStatus === 'paid' && r.paymentReference" [title]="r.paymentReference"> · {{ r.paymentReference }}</span>
              </small>
            </td>
            <td class="right">{{ r.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
            <td class="actions">
              <ng-container *ngIf="r.paymentStatus !== 'paid' && r.status !== 'cancelled' && r.totalAmount > 0">
                <button class="icon-btn" title="Registrar pago en caja" (click)="openCash(r)"><i class="bi bi-cash-coin"></i></button>
                <button class="icon-btn" title="Link de pago ePayco" (click)="paymentLink(r)"><i class="bi bi-link-45deg"></i></button>
                <button *ngIf="r.paymentStatus === 'pending'" class="icon-btn" title="Verificar pago en ePayco" (click)="verify(r)"><i class="bi bi-arrow-repeat"></i></button>
              </ng-container>
              <button *ngIf="r.status !== 'confirmed'" class="icon-btn ok" title="Confirmar"
                      (click)="setStatus(r, 'confirmed')"><i class="bi bi-check-circle"></i></button>
              <button *ngIf="r.status !== 'cancelled'" class="icon-btn danger" title="Cancelar"
                      (click)="setStatus(r, 'cancelled')"><i class="bi bi-x-circle"></i></button>
            </td>
          </tr>
        </tbody>
      </table></div>
      <ng-template #empty>
        <cs-empty-state icon="calendar-x" title="Sin reservas" message="No hay reservas para el filtro seleccionado."></cs-empty-state>
      </ng-template>
    </div>

    <!-- Modal: pago en caja / link de pago -->
    <div class="backdrop" *ngIf="modal() as m" (click)="closeModal()">
      <div class="modal cs-card" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <ng-container *ngIf="m.kind === 'cash'">
          <h3><i class="bi bi-cash-coin"></i> Registrar pago en caja</h3>
          <p class="text-muted">{{ m.r.courtName }} · {{ m.r.userName }} · <strong>{{ m.r.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></p>
          <label class="cs-label" for="cash-ref">N.º de recibo de caja (opcional)</label>
          <input id="cash-ref" class="cs-input" [(ngModel)]="cashRef" placeholder="RC-000123" />
          <p class="text-muted small">La reserva quedará pagada y confirmada, y se enviará el WhatsApp de confirmación al cliente.</p>
        </ng-container>
        <ng-container *ngIf="m.kind === 'link'">
          <h3>Link de pago</h3>
          <p class="text-muted">{{ m.r.courtName }} · {{ m.r.userName }}</p>
          <cs-payment-link *ngIf="m.url" [url]="m.url" [amount]="m.r.totalAmount" [phone]="m.r.userPhone ?? null"
                           [customerName]="m.r.userName ?? null" [description]="'tu reserva en ' + (m.r.courtName || 'Comfasucre')"></cs-payment-link>
        </ng-container>
        <div *ngIf="modalError()" class="cs-alert cs-alert-danger mt-1">{{ modalError() }}</div>
        <div class="flex gap-1 mt-2 end">
          <button class="cs-btn cs-btn-ghost" (click)="closeModal()">Cerrar</button>
          <cs-button *ngIf="m.kind === 'cash'" icon="check2-circle" [loading]="busy()" (clicked)="confirmCash(m.r)">Registrar pago</cs-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filters { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
    .right { text-align: right; } .actions { text-align: right; white-space: nowrap; }
    .d-block { display: block; }
    .icon-btn { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: .3rem .45rem; border-radius: .4rem; }
    .icon-btn.ok { color: #789a19; } .icon-btn.danger { color: #c8373d; }
    .icon-btn:hover { background: var(--cs-navy-50, #f0f4fa); }
    .icon-btn { color: var(--cs-navy); }
    .top-actions { display: flex; justify-content: flex-end; margin: -.5rem 0 1rem; }
    .backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(15,52,97,.5); display: grid; place-items: center; padding: 16px; }
    .modal { width: 100%; max-width: 520px; }
    .modal h3 { margin-top: 0; }
    .small { font-size: .8rem; }
    .ref { display: inline-block; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
    .end { justify-content: flex-end; }
  `],
})
export class ReservationsPage implements OnInit {
  private readonly service = inject(ReservationsService);
  readonly loading = signal(true);
  readonly items = signal<Reservation[]>([]);
  date = '';
  status = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.list({ date: this.date || undefined, status: this.status || undefined }).subscribe({
      next: (r) => { this.items.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  clear(): void { this.date = ''; this.status = ''; this.load(); }

  setStatus(r: Reservation, status: ReservationStatus): void {
    this.service.updateStatus(r.id, status).subscribe(() => this.load());
  }

  // ---------- pagos ----------
  readonly modal = signal<{ kind: 'cash' | 'link'; r: Reservation; url?: string } | null>(null);
  readonly busy = signal(false);
  readonly modalError = signal<string | null>(null);
  cashRef = '';

  openCash(r: Reservation): void {
    this.cashRef = '';
    this.modalError.set(null);
    this.modal.set({ kind: 'cash', r });
  }

  confirmCash(r: Reservation): void {
    this.busy.set(true);
    this.modalError.set(null);
    this.service.cashPayment(r.id, this.cashRef.trim() || undefined).subscribe({
      next: () => { this.busy.set(false); this.modal.set(null); this.load(); },
      error: (err) => { this.busy.set(false); this.modalError.set(err?.error?.message ?? 'No se pudo registrar el pago'); },
    });
  }

  paymentLink(r: Reservation): void {
    this.modalError.set(null);
    this.modal.set({ kind: 'link', r });
    this.service.initPayment(r.id).subscribe({
      next: (p) => this.modal.set({ kind: 'link', r, url: p.checkoutUrl }),
      error: (err) => this.modalError.set(err?.error?.message ?? 'No se pudo generar el link de pago'),
    });
  }

  verify(r: Reservation): void {
    this.service.verifyPayment(r.id).subscribe(() => this.load());
  }

  closeModal(): void {
    if (!this.busy()) { this.modal.set(null); this.load(); }
  }
}
