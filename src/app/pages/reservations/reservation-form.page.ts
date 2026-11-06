import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Availability, Category, Court, PriceQuote, Reservation } from '../../core/models';
import { CourtsService } from '../../core/services/courts.service';
import { PublicService } from '../../core/services/public.service';
import { AdminPaymentMethod, ReservationsService } from '../../core/services/reservations.service';
import { ButtonComponent } from '../../ui/atoms/button.component';
import { SpinnerComponent } from '../../ui/atoms/spinner.component';
import { PageHeaderComponent } from '../../ui/molecules/page-header.component';
import { PaymentLinkComponent } from '../../ui/molecules/payment-link.component';

const TZ = 'America/Bogota';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

/**
 * Nueva reserva desde el panel (atención presencial o telefónica).
 * Pago en CAJA → queda pagada y confirmada al instante (con n.º de recibo).
 * Pago con ePAYCO → se genera el link de pago para enviárselo al cliente.
 */
@Component({
  selector: 'cs-reservation-form-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, RouterLink, ButtonComponent, SpinnerComponent, PageHeaderComponent, PaymentLinkComponent],
  template: `
    <cs-page-header title="Nueva reserva" subtitle="Reserva atendida en sede o por teléfono, pagada en caja o con ePayco"></cs-page-header>

    <!-- Resultado -->
    <div class="cs-card result" *ngIf="created() as r">
      <ng-container *ngIf="r.paymentStatus === 'paid' || r.totalAmount <= 0; else link">
        <i class="bi bi-check-circle-fill ok"></i>
        <h2>Reserva {{ r.paymentMethod === 'caja' ? 'pagada en caja' : 'confirmada' }}</h2>
        <p class="text-muted">{{ r.courtName }} · {{ r.userName }} · {{ r.totalAmount | currency:'COP':'symbol-narrow':'1.0-0' }}
          <span *ngIf="r.paymentReference"> · Recibo {{ r.paymentReference }}</span></p>
        <p class="text-muted" *ngIf="r.userPhone">Se envió la confirmación por WhatsApp al {{ r.userPhone }}.</p>
      </ng-container>
      <ng-template #link>
        <h2>Reserva creada · pendiente de pago</h2>
        <p class="text-muted">{{ r.courtName }} · {{ r.userName }}</p>
        <div class="cs-alert cs-alert-warning" *ngIf="paymentError() as e">
          No se pudo generar el link de pago ({{ e }}). La reserva quedó guardada: genera el link desde
          <a routerLink="/admin/reservations">Reservas</a> con el botón <i class="bi bi-link-45deg"></i>.
        </div>
        <cs-payment-link *ngIf="checkoutUrl() as url" [url]="url" [amount]="r.totalAmount"
                         [phone]="r.userPhone ?? null" [customerName]="r.userName ?? null"
                         [description]="'tu reserva en ' + (r.courtName || 'Comfasucre')"></cs-payment-link>
      </ng-template>
      <div class="flex gap-1 mt-2 center">
        <cs-button icon="plus-lg" (clicked)="reset()">Otra reserva</cs-button>
        <a routerLink="/admin/reservations" class="cs-btn cs-btn-outline">Ver reservas</a>
      </div>
    </div>

    <form *ngIf="!created()" [formGroup]="form" (ngSubmit)="submit()" class="layout">
      <div class="cs-card">
        <h3>1. Cancha y horario</h3>
        <div class="grid grid-2">
          <div>
            <label class="cs-label" for="r-court">Cancha</label>
            <select id="r-court" class="cs-select" formControlName="courtId" (change)="loadSlots()">
              <option value="">Selecciona…</option>
              <option *ngFor="let c of courts()" [value]="c.id">{{ c.name }} · {{ c.venueName || c.sportType }}</option>
            </select>
          </div>
          <div>
            <label class="cs-label" for="r-date">Fecha</label>
            <input id="r-date" class="cs-input" type="date" formControlName="date" [min]="min" (change)="loadSlots()" />
          </div>
        </div>

        <cs-spinner *ngIf="loadingSlots()"></cs-spinner>
        <ng-container *ngIf="!loadingSlots() && availability() as a">
          <p class="hint">Toca la hora de inicio y luego las contiguas para reservar varias horas.</p>
          <div class="slots">
            <button type="button" *ngFor="let s of a.slots; let i = index" class="slot"
                    [class.sel]="isSelected(i)" [disabled]="!s.available" (click)="toggle(i)">
              {{ s.start }}<small>{{ s.available ? s.slotLabel : (s.reason === 'reserved' ? 'Reservado' : '—') }}</small>
            </button>
          </div>
          <p *ngIf="!a.slots.length" class="text-muted">No hay horarios para esta fecha.</p>
        </ng-container>
      </div>

      <div class="cs-card">
        <h3>2. Cliente</h3>
        <div class="grid grid-2">
          <div>
            <label class="cs-label" for="r-doc">Documento</label>
            <input id="r-doc" class="cs-input" formControlName="documentNumber" inputmode="numeric" (blur)="refreshQuote()" />
          </div>
          <div>
            <label class="cs-label" for="r-cat">Categoría</label>
            <select id="r-cat" class="cs-select" formControlName="category" (change)="refreshQuote()">
              <option value="">Automática (por documento)</option>
              <option *ngFor="let c of categories" [value]="c">Categoría {{ c }}</option>
            </select>
          </div>
          <div>
            <label class="cs-label" for="r-name">Nombre y apellido</label>
            <input id="r-name" class="cs-input" formControlName="customerName" />
          </div>
          <div>
            <label class="cs-label" for="r-phone">Celular (WhatsApp)</label>
            <input id="r-phone" class="cs-input" formControlName="customerPhone" inputmode="numeric" maxlength="10" placeholder="3001234567" />
          </div>
          <div>
            <label class="cs-label" for="r-email">Email (opcional)</label>
            <input id="r-email" class="cs-input" type="email" formControlName="customerEmail" />
          </div>
        </div>
      </div>

      <div class="cs-card">
        <h3>3. Pago</h3>
        <div class="methods" role="radiogroup" aria-label="Medio de pago">
          <label class="method" [class.on]="form.controls.paymentMethod.value === 'caja'">
            <input type="radio" formControlName="paymentMethod" value="caja" />
            <i class="bi bi-cash-coin"></i>
            <span><strong>Pagada en caja</strong><small>Efectivo o datáfono en la sede. Queda pagada y confirmada.</small></span>
          </label>
          <label class="method" [class.on]="form.controls.paymentMethod.value === 'epayco'">
            <input type="radio" formControlName="paymentMethod" value="epayco" />
            <i class="bi bi-credit-card"></i>
            <span><strong>Pago con ePayco</strong><small>Se genera un link de pago para enviarle al cliente.</small></span>
          </label>
        </div>
        <div *ngIf="form.controls.paymentMethod.value === 'caja'" class="mt-1">
          <label class="cs-label" for="r-rc">N.º de recibo de caja (opcional)</label>
          <input id="r-rc" class="cs-input" formControlName="cashReference" placeholder="RC-000123" />
        </div>

        <div class="summary" *ngIf="selection() as s">
          <div>
            <small>{{ form.controls.date.value }} · {{ s.start }} – {{ s.end }} · {{ s.hours }} h</small>
            <small *ngIf="quote() as q">Categoría {{ q.category }} · Franja {{ q.slotLabel }} · {{ q.ratePerHour | currency:'COP':'symbol-narrow':'1.0-0' }}/h</small>
          </div>
          <strong>{{ (quote()?.total ?? 0) | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
        </div>

        <div *ngIf="error()" class="cs-alert cs-alert-danger mt-1">{{ error() }}</div>
        <cs-button class="mt-2" type="submit" [block]="true" [loading]="saving()" [disabled]="!canSubmit()"
                   [icon]="form.controls.paymentMethod.value === 'caja' ? 'check2-circle' : 'link-45deg'">
          {{ form.controls.paymentMethod.value === 'caja' ? 'Registrar reserva pagada en caja' : 'Crear reserva y generar link de pago' }}
        </cs-button>
      </div>
    </form>
  `,
  styles: [`
    .layout { display: grid; gap: 1rem; }
    h3 { margin-top: 0; }
    .hint { font-size: .8rem; color: var(--cs-gray-600); margin: .8rem 0 .5rem; }
    .slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: .4rem; }
    .slot { display: flex; flex-direction: column; align-items: center; padding: .5rem .2rem; border-radius: 10px; border: 1px solid var(--cs-sky-300, #79d3f0);
      background: var(--cs-sky-50, #edf9fe); font: inherit; font-weight: 600; cursor: pointer; color: var(--cs-navy-900); }
    .slot small { font-weight: 400; font-size: .68rem; color: var(--cs-gray-600); }
    .slot.sel { background: var(--cs-navy); border-color: var(--cs-navy); color: #fff; }
    .slot.sel small { color: rgba(255,255,255,.85); }
    .slot:disabled { background: var(--cs-gray-100); border-color: var(--cs-gray-100); color: var(--cs-gray-500); cursor: not-allowed; }
    .methods { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
    .method { display: flex; gap: .7rem; align-items: flex-start; padding: .9rem; border: 2px solid var(--cs-gray-200); border-radius: 14px; cursor: pointer; }
    .method.on { border-color: var(--cs-navy); background: var(--cs-navy-50, #eef3f9); }
    .method input { margin-top: .3rem; }
    .method i { font-size: 1.4rem; color: var(--cs-navy); }
    .method small { display: block; color: var(--cs-gray-600); font-size: .78rem; font-weight: 400; }
    .summary { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; padding: .9rem 1rem; border-radius: 12px; background: var(--cs-navy-50, #eef3f9); }
    .summary small { display: block; color: var(--cs-gray-700); }
    .summary strong { font-size: 1.3rem; color: var(--cs-navy-900); }
    .result { text-align: center; max-width: 640px; margin: 0 auto; }
    .result .ok { font-size: 3rem; color: var(--cs-green, #94bd1f); }
    .center { justify-content: center; }
    @media (max-width: 700px) { .methods { grid-template-columns: 1fr; } }
  `],
})
export class ReservationFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly courtsApi = inject(CourtsService);
  private readonly publicApi = inject(PublicService);
  private readonly api = inject(ReservationsService);

  readonly categories: Category[] = ['A', 'B', 'C', 'D'];
  readonly min = today();
  readonly courts = signal<Court[]>([]);
  readonly availability = signal<Availability | null>(null);
  readonly loadingSlots = signal(false);
  readonly selStart = signal<number | null>(null);
  readonly selEnd = signal<number | null>(null);
  readonly quote = signal<PriceQuote | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly created = signal<Reservation | null>(null);
  readonly checkoutUrl = signal<string | null>(null);
  readonly paymentError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    courtId: ['', Validators.required],
    date: [today(), Validators.required],
    documentNumber: ['', [Validators.required, Validators.pattern(/^\d{5,12}$/)]],
    category: [''],
    customerName: ['', [Validators.required, Validators.minLength(3)]],
    customerPhone: ['', Validators.pattern(/^3\d{9}$/)],
    customerEmail: ['', Validators.email],
    paymentMethod: ['caja' as AdminPaymentMethod, Validators.required],
    cashReference: [''],
  });

  readonly selection = computed(() => {
    const a = this.availability();
    const s = this.selStart();
    const e = this.selEnd();
    if (!a || s === null || e === null) return null;
    return { start: a.slots[s].start, end: a.slots[e].end, hours: e - s + 1 };
  });

  ngOnInit(): void {
    this.courtsApi.list().subscribe((c) => this.courts.set(c.filter((x) => x.status === 'active')));
  }

  canSubmit(): boolean {
    return this.form.valid && !!this.selection() && !!this.quote();
  }

  loadSlots(): void {
    const { courtId, date } = this.form.getRawValue();
    this.selStart.set(null);
    this.selEnd.set(null);
    this.quote.set(null);
    this.availability.set(null);
    if (!courtId || !date) return;
    this.loadingSlots.set(true);
    this.publicApi.availability(courtId, date).subscribe({
      next: (a) => { this.availability.set(a); this.loadingSlots.set(false); },
      error: () => this.loadingSlots.set(false),
    });
  }

  isSelected(i: number): boolean {
    const s = this.selStart();
    const e = this.selEnd();
    return s !== null && e !== null && i >= s && i <= e;
  }

  toggle(i: number): void {
    const slots = this.availability()?.slots ?? [];
    const s = this.selStart();
    const e = this.selEnd();
    if (s !== null && e !== null && i === e + 1 && slots[i]?.available) this.selEnd.set(i);
    else if (s !== null && e !== null && i === s - 1 && slots[i]?.available) this.selStart.set(i);
    else if (s === i && e === i) { this.selStart.set(null); this.selEnd.set(null); }
    else { this.selStart.set(i); this.selEnd.set(i); }
    this.refreshQuote();
  }

  refreshQuote(): void {
    const sel = this.selection();
    const v = this.form.getRawValue();
    if (!sel || !v.courtId) { this.quote.set(null); return; }
    this.api.quote({
      courtId: v.courtId, date: v.date, startTime: sel.start, endTime: sel.end,
      category: v.category || undefined, documentNumber: v.documentNumber || undefined,
    }).subscribe({ next: (q) => this.quote.set(q), error: () => this.quote.set(null) });
  }

  submit(): void {
    const sel = this.selection();
    if (!sel || this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.api.create({
      courtId: v.courtId, date: v.date, startTime: sel.start, endTime: sel.end,
      customerName: v.customerName.trim(),
      customerPhone: v.customerPhone || undefined,
      customerEmail: v.customerEmail || undefined,
      documentNumber: v.documentNumber,
      category: v.category || undefined,
      isAffiliate: v.category ? true : undefined,
      paymentMethod: v.paymentMethod,
      cashReference: v.paymentMethod === 'caja' ? v.cashReference.trim() || undefined : undefined,
    }).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.checkoutUrl.set(r.checkoutUrl);
        this.paymentError.set(r.paymentError ?? null);
        this.created.set(r);
      },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message ?? 'No se pudo crear la reserva'); },
    });
  }

  reset(): void {
    this.created.set(null);
    this.checkoutUrl.set(null);
    this.paymentError.set(null);
    this.form.patchValue({ documentNumber: '', category: '', customerName: '', customerPhone: '', customerEmail: '', cashReference: '' });
    this.loadSlots();
  }
}
