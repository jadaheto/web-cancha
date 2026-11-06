import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Reservation } from '../../../core/models';
import { PublicService } from '../../../core/services/public.service';
import { ButtonComponent } from '../../../ui/atoms/button.component';
import { SpinnerComponent } from '../../../ui/atoms/spinner.component';

type View = 'confirmed' | 'checking' | 'unpaid' | 'cancelled';

/**
 * Estado de una reserva. Es la URL de respuesta de ePayco
 * (`/reserva?invoice=<id>`) y la confirmación de reservas sin costo.
 * Mientras el pago esté pendiente consulta el estado cada pocos segundos.
 */
@Component({
  selector: 'cs-reservation-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink, ButtonComponent, SpinnerComponent],
  template: `
    <div class="container-app wrap">
      <cs-spinner *ngIf="loading()"></cs-spinner>

      <div class="card" *ngIf="notFound()">
        <i class="bi bi-question-circle ico muted"></i>
        <h1>No encontramos tu reserva</h1>
        <p class="text-muted">Verifica el enlace o comunícate con nosotros.</p>
        <a routerLink="/" class="cs-btn cs-btn-primary">Ir al inicio</a>
      </div>

      <div class="card" *ngIf="reservation() as r">
        <ng-container [ngSwitch]="view()">
          <ng-container *ngSwitchCase="'confirmed'">
            <i class="bi bi-check-circle-fill ico ok"></i>
            <h1>¡Reserva confirmada!</h1>
            <p class="text-muted">Te enviamos el detalle por WhatsApp{{ r.userPhone ? ' al ' + r.userPhone : '' }}.</p>
          </ng-container>
          <ng-container *ngSwitchCase="'checking'">
            <cs-spinner></cs-spinner>
            <h1>Estamos confirmando tu pago</h1>
            <p class="text-muted">Esto puede tardar unos segundos. No cierres esta página.</p>
          </ng-container>
          <ng-container *ngSwitchCase="'unpaid'">
            <i class="bi bi-exclamation-circle-fill ico warn"></i>
            <h1>No pudimos completar el pago</h1>
            <p class="text-muted">Tu horario sigue pre-reservado. Puedes intentar pagar de nuevo.</p>
          </ng-container>
          <ng-container *ngSwitchCase="'cancelled'">
            <i class="bi bi-x-circle-fill ico bad"></i>
            <h1>Reserva cancelada</h1>
          </ng-container>
        </ng-container>

        <dl class="detail">
          <div><dt>N.º de reserva</dt><dd>{{ number() }}</dd></div>
          <div><dt>Zona</dt><dd>{{ r.courtName }}</dd></div>
          <div><dt>Fecha</dt><dd class="cap">{{ r.startTime | date:'EEEE d \\'de\\' MMMM y':'America/Bogota':'es-CO' }}</dd></div>
          <div><dt>Horario</dt><dd>{{ r.startTime | date:'HH:mm':'America/Bogota' }} – {{ r.endTime | date:'HH:mm':'America/Bogota' }}</dd></div>
          <div><dt>A nombre de</dt><dd>{{ r.userName }}</dd></div>
          <div class="total"><dt>Total</dt><dd>{{ r.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</dd></div>
        </dl>

        <div *ngIf="error()" class="cs-alert cs-alert-danger">{{ error() }}</div>

        <div class="actions">
          <cs-button *ngIf="view() === 'unpaid'" icon="credit-card" [loading]="paying()" (clicked)="retryPayment()">Pagar ahora</cs-button>
          <a [routerLink]="['/cancha', r.courtId]" class="cs-btn cs-btn-outline">Reservar otro horario</a>
          <a routerLink="/" class="cs-btn cs-btn-ghost">Ir al inicio</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap { padding-top: 2.5rem; display: flex; justify-content: center; }
    .card { background: #fff; border-radius: 22px; padding: 2rem 1.6rem; width: 100%; max-width: 520px; text-align: center; box-shadow: 0 6px 24px rgba(15,52,97,.1); }
    .ico { font-size: 3.4rem; }
    .ok { color: var(--cs-green, #94bd1f); } .warn { color: var(--cs-warning, #f0ad4e); } .bad { color: var(--cs-danger, #dc3545); }
    .muted { color: var(--cs-navy-300, #6f93c2); }
    h1 { font-size: 1.5rem; margin: .6rem 0 .3rem; }
    .detail { text-align: left; margin: 1.5rem 0 1rem; padding: 1rem 1.1rem; background: var(--cs-gray-50, #f8f9fb); border-radius: 16px; }
    .detail div { display: flex; justify-content: space-between; gap: 1rem; padding: .4rem 0; border-bottom: 1px solid var(--cs-gray-100, #f1f3f5); font-size: .9rem; }
    .detail div:last-child { border-bottom: 0; }
    dt { color: var(--cs-gray-600, #6c757d); } dd { margin: 0; font-weight: 500; text-align: right; color: var(--cs-navy-900, #0f3461); }
    .cap::first-letter { text-transform: uppercase; }
    .total dd { font-size: 1.1rem; font-weight: 700; }
    .actions { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; }
  `],
})
export class ReservationPage implements OnInit {
  private readonly api = inject(PublicService);
  private readonly destroyRef = inject(DestroyRef);

  /** :id de la ruta o ?invoice= que agrega ePayco a la URL de respuesta. */
  readonly id = input<string>();
  readonly invoice = input<string>();
  /** Referencia de la transacción que ePayco agrega a la URL de respuesta. */
  readonly ref_payco = input<string>();

  readonly reservation = signal<Reservation | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly paying = signal(false);
  readonly error = signal<string | null>(null);
  private polls = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly number = computed(() => {
    const id = this.reservation()?.id ?? '';
    return `RSV-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  });

  readonly view = computed<View>(() => {
    const r = this.reservation();
    if (!r) return 'checking';
    if (r.status === 'cancelled') return 'cancelled';
    if (r.paymentStatus === 'paid' || !r.totalAmount || r.totalAmount <= 0) return 'confirmed';
    if (r.paymentStatus === 'pending' && this.polls < 12) return 'checking';
    return 'unpaid';
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => { if (this.timer) clearTimeout(this.timer); });
    this.fetch();
  }

  private fetch(): void {
    const id = this.id() || this.invoice();
    if (!id) { this.loading.set(false); this.notFound.set(true); return; }
    // Mientras no esté pagada, el backend consulta el pago en la pasarela (con el
    // ref_payco que agrega ePayco al volver, si llega) y confirma si corresponde.
    const ref = (this.ref_payco() ?? '').trim();
    const current = this.reservation();
    const shouldVerify = !current || current.paymentStatus !== 'paid';
    const request = shouldVerify ? this.api.verifyPayment(id, ref) : this.api.reservation(id);
    request.subscribe({
      next: (r) => {
        this.reservation.set(r);
        this.loading.set(false);
        // Mientras ePayco confirma (webhook), consulta de nuevo cada 5 s (máx. 1 min).
        if (this.view() === 'checking') {
          this.polls++;
          this.timer = setTimeout(() => this.fetch(), 5000);
        }
      },
      error: () => { this.loading.set(false); this.notFound.set(true); },
    });
  }

  retryPayment(): void {
    const r = this.reservation();
    if (!r) return;
    this.paying.set(true);
    this.error.set(null);
    this.api.initPayment(r.id).subscribe({
      next: (p) => { window.location.href = p.checkoutUrl; },
      error: (err) => {
        this.paying.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo iniciar el pago. Intenta de nuevo.');
      },
    });
  }
}
