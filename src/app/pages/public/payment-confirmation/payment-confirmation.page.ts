import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GatewayResult, Reservation } from '../../../core/models';
import { PublicService } from '../../../core/services/public.service';
import { ButtonComponent } from '../../../ui/atoms/button.component';
import { SpinnerComponent } from '../../../ui/atoms/spinner.component';

type Step = 'ok' | 'wait' | 'fail' | 'na';
const MAX_POLLS = 24; // 2 minutos (cada 5 s)

/**
 * Página de confirmación de pago de Comfasucre. ePayco redirige aquí al terminar
 * (URL de respuesta) y se muestra una DOBLE confirmación:
 *  1. ePayco: lo que reporta la pasarela para la transacción (consultado por el backend).
 *  2. Comfasucre: que el pago se recibió y la reserva quedó confirmada en nuestro sistema.
 * Mientras alguna esté pendiente, se vuelve a consultar cada 5 s.
 */
@Component({
  selector: 'cs-payment-confirmation-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink, ButtonComponent, SpinnerComponent],
  templateUrl: './payment-confirmation.page.html',
  styleUrl: './payment-confirmation.page.scss',
})
export class PaymentConfirmationPage implements OnInit {
  private readonly api = inject(PublicService);
  private readonly destroyRef = inject(DestroyRef);

  /** :id de la ruta, ?invoice= que agrega la URL de respuesta y ?ref_payco= de ePayco. */
  readonly id = input<string>();
  readonly invoice = input<string>();
  readonly ref_payco = input<string>();

  readonly reservation = signal<Reservation | null>(null);
  readonly gateway = signal<GatewayResult | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly paying = signal(false);
  readonly error = signal<string | null>(null);
  readonly polls = signal(0);
  readonly checkedAt = signal<Date | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly number = computed(() => {
    const id = this.reservation()?.id ?? '';
    return `RSV-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  });

  readonly isCash = computed(() => this.reservation()?.paymentMethod === 'caja');
  readonly isFree = computed(() => (this.reservation()?.totalAmount ?? 0) <= 0);

  /** Paso 1: confirmación de ePayco (o de caja / sin costo). */
  readonly epaycoStep = computed<Step>(() => {
    const r = this.reservation();
    if (!r) return 'wait';
    if (this.isFree()) return 'na';
    if (this.isCash()) return r.paymentStatus === 'paid' ? 'ok' : 'wait';
    const g = this.gateway();
    if (g?.status === 'approved') return 'ok';
    if (g?.status === 'rejected') return 'fail';
    if (r.paymentStatus === 'paid') return 'ok';
    return this.polls() >= MAX_POLLS ? 'fail' : 'wait';
  });

  /** Paso 2: confirmación de Comfasucre (reserva pagada y confirmada en nuestro sistema). */
  readonly ourStep = computed<Step>(() => {
    const r = this.reservation();
    if (!r) return 'wait';
    if (r.status === 'cancelled') return 'fail';
    if (r.paymentStatus === 'paid' || (this.isFree() && r.status === 'confirmed')) return 'ok';
    if (this.epaycoStep() === 'fail') return 'fail';
    return 'wait';
  });

  readonly overall = computed<Step>(() => {
    const a = this.epaycoStep();
    const b = this.ourStep();
    if (b === 'ok' && (a === 'ok' || a === 'na')) return 'ok';
    if (a === 'fail' || b === 'fail') return 'fail';
    return 'wait';
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => { if (this.timer) clearTimeout(this.timer); });
    this.fetch();
  }

  private fetch(): void {
    const id = this.id() || this.invoice();
    if (!id) { this.loading.set(false); this.notFound.set(true); return; }
    this.api.paymentConfirmation(id, this.ref_payco() || undefined).subscribe({
      next: ({ reservation, gateway }) => {
        this.reservation.set(reservation);
        this.gateway.set(gateway);
        this.checkedAt.set(new Date());
        this.loading.set(false);
        if (this.overall() === 'wait' && this.polls() < MAX_POLLS) {
          this.polls.update((n) => n + 1);
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

  print(): void {
    window.print();
  }
}
