import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

/** Molécula: link de pago de ePayco listo para copiar, abrir o enviar por WhatsApp. */
@Component({
  selector: 'cs-payment-link',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <div class="box">
      <p class="lead"><i class="bi bi-link-45deg"></i> Link de pago de ePayco
        <span *ngIf="amount">· {{ amount | currency:'COP':'symbol-narrow':'1.0-0' }}</span></p>
      <div class="row">
        <input class="cs-input" [value]="url" readonly aria-label="Link de pago" (focus)="$any($event.target).select()" />
        <button type="button" class="cs-btn cs-btn-outline cs-btn-sm" (click)="copy()">
          <i class="bi" [class.bi-clipboard]="!copied()" [class.bi-clipboard-check]="copied()"></i> {{ copied() ? 'Copiado' : 'Copiar' }}
        </button>
      </div>
      <div class="row">
        <a *ngIf="waUrl()" class="cs-btn cs-btn-sm wa" [href]="waUrl()" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i> Enviar por WhatsApp</a>
        <a class="cs-btn cs-btn-ghost cs-btn-sm" [href]="url" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> Abrir</a>
      </div>
      <small>La reserva queda pendiente y se confirma sola cuando el cliente pague (se verifica con ePayco cada 2 minutos).</small>
    </div>
  `,
  styles: [`
    .box { border: 1px solid var(--cs-sky-100, #d6f1fb); background: var(--cs-sky-50, #edf9fe); border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; gap: .6rem; }
    .lead { margin: 0; font-weight: 600; color: var(--cs-navy-900, #0f3461); }
    .row { display: flex; gap: .5rem; flex-wrap: wrap; }
    .row .cs-input { flex: 1; min-width: 200px; font-size: .82rem; }
    .wa { background: #25d366; color: #fff; border-color: #25d366; }
    small { color: var(--cs-gray-600, #6c757d); font-size: .78rem; }
  `],
})
export class PaymentLinkComponent {
  @Input({ required: true }) url!: string;
  @Input() amount: number | null = null;
  @Input() phone: string | null = null;
  @Input() customerName: string | null = null;
  @Input() description = 'tu reserva';

  readonly copied = signal(false);

  waUrl(): string | null {
    const digits = (this.phone ?? '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    const to = digits.length === 10 ? `57${digits}` : digits;
    const text = `Hola${this.customerName ? ' ' + this.customerName.split(' ')[0] : ''}, este es el link para pagar ${this.description} en Comfasucre: ${this.url}`;
    return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      /* sin portapapeles: el campo se puede seleccionar a mano */
    }
  }
}
