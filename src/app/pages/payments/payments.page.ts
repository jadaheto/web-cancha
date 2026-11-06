import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Reservation } from '../../core/models';
import { ReservationsService } from '../../core/services/reservations.service';
import { BadgeComponent } from '../../ui/atoms/badge.component';
import { SpinnerComponent } from '../../ui/atoms/spinner.component';
import { EmptyStateComponent } from '../../ui/molecules/empty-state.component';
import { PageHeaderComponent } from '../../ui/molecules/page-header.component';

/** Lista de pagos hechos y confirmados (reservas con pago en estado 'paid'). */
@Component({
  selector: 'cs-payments-page',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe, DatePipe,
    BadgeComponent, SpinnerComponent, EmptyStateComponent, PageHeaderComponent,
  ],
  template: `
    <cs-page-header title="Pagos" subtitle="Pagos hechos y confirmados"></cs-page-header>

    <cs-spinner *ngIf="loading()"></cs-spinner>

    <ng-container *ngIf="!loading()">
      <div class="grid grid-2 mb-2">
        <div class="cs-card cs-stat cs-stat--green">
          <div class="cs-stat-value">{{ total() | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
          <div class="cs-stat-label">Total recaudado (confirmado)</div>
        </div>
        <div class="cs-card cs-stat">
          <div class="cs-stat-value">{{ items().length }}</div>
          <div class="cs-stat-label">Pagos confirmados</div>
        </div>
      </div>

      <div class="cs-card">
        <div class="cs-table-wrap" *ngIf="items().length; else empty"><table class="cs-table cs-table--striped">
          <thead>
            <tr>
              <th>Cliente</th><th>Cancha</th><th>Reserva</th>
              <th>Método</th><th>Referencia</th><th>Pagado el</th>
              <th class="right">Monto</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of items()">
              <td>
                <strong>{{ p.userName }}</strong>
                <small class="text-muted d-block" *ngIf="p.userDocument">Doc. {{ p.userDocument }}</small>
              </td>
              <td>{{ p.courtName }}</td>
              <td>{{ p.startTime | date:'short' }}</td>
              <td>{{ p.paymentMethod === 'caja' ? 'Caja' : p.paymentMethod === 'epayco' ? 'ePayco' : (p.paymentMethod || '—') }}</td>
              <td><code class="ref">{{ p.paymentReference || '—' }}</code></td>
              <td>{{ p.paidAt ? (p.paidAt | date:'short') : '—' }}</td>
              <td class="right">{{ p.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
              <td><cs-badge [status]="p.paymentStatus"></cs-badge></td>
            </tr>
          </tbody>
        </table></div>
        <ng-template #empty>
          <cs-empty-state icon="cash-coin" title="Sin pagos" message="Todavía no hay pagos confirmados."></cs-empty-state>
        </ng-template>
      </div>
    </ng-container>
  `,
  styles: [`
    .right { text-align: right; }
    .d-block { display: block; }
    .ref { font-size: .8rem; color: var(--cs-navy, #19559b); }
  `],
})
export class PaymentsPage implements OnInit {
  private readonly service = inject(ReservationsService);
  readonly loading = signal(true);
  readonly items = signal<Reservation[]>([]);
  readonly total = computed(() => this.items().reduce((sum, p) => sum + (p.totalAmount || 0), 0));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.payments().subscribe({
      next: (list) => { this.items.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
