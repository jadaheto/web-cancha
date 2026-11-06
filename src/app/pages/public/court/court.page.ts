import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Availability, AvailabilitySlot, Court, PriceQuote } from '../../../core/models';
import { PortalStore, minCourtRate, venueSlug } from '../../../core/services/portal.store';
import { PublicService } from '../../../core/services/public.service';
import { ButtonComponent } from '../../../ui/atoms/button.component';
import { SpinnerComponent } from '../../../ui/atoms/spinner.component';
import { MapComponent, MapMarker } from '../../../ui/molecules/map.component';
import { MediaUrlPipe } from '../../../ui/pipes/media-url.pipe';

const DAYS_AHEAD = 14;
const TZ = 'America/Bogota';

/** Fecha YYYY-MM-DD en la zona horaria de Colombia. */
function bogotaDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

interface DayChip { iso: string; weekday: string; day: string; month: string; }

/**
 * Detalle de una zona/cancha con el flujo de reserva tipo iCancha:
 * elegir día → elegir uno o varios bloques consecutivos de 1 h →
 * datos del cliente con documento (obligatorio) → consulta de categoría y
 * precio final → pago en ePayco. Antes de eso solo se muestra el "Desde"
 * aproximado de la cancha.
 */
@Component({
  selector: 'cs-court-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, ButtonComponent, SpinnerComponent, MapComponent, MediaUrlPipe],
  templateUrl: './court.page.html',
  styleUrl: './court.page.scss',
})
export class CourtPage implements OnInit {
  private readonly api = inject(PublicService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(PortalStore);

  /** Segmento :id de la ruta. */
  readonly id = input.required<string>();

  readonly court = signal<Court | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly photo = signal(0);

  readonly today = bogotaDate(new Date());
  readonly date = signal(this.today);
  readonly days: DayChip[] = this.buildDays();

  readonly availability = signal<Availability | null>(null);
  readonly loadingSlots = signal(false);
  readonly slotsError = signal<string | null>(null);

  /** Rango seleccionado (índices inclusivos en availability.slots). */
  readonly selStart = signal<number | null>(null);
  readonly selEnd = signal<number | null>(null);

  /** Cotización final (con la categoría del documento). */
  readonly quote = signal<PriceQuote | null>(null);
  readonly quoting = signal(false);
  readonly modal = signal<'closed' | 'summary' | 'paying'>('closed');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  private checkoutUrl: string | null = null;

  // Verificación del celular (OTP por WhatsApp)
  readonly codeSentTo = signal<string | null>(null);
  readonly sendingCode = signal(false);
  readonly verifyingCode = signal(false);
  readonly phoneToken = signal<string | null>(null);
  readonly resendIn = signal(0);
  readonly codeError = signal<string | null>(null);
  readonly codeCtrl = this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{4,8}$/)]);
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  readonly form = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.pattern(/^\s*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'-]+(\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.'-]+)+\s*$/)]],
    customerPhone: ['', [Validators.required, Validators.pattern(/^3\d{9}$/)]],
    customerEmail: ['', Validators.email],
    documentNumber: ['', [Validators.required, Validators.pattern(/^\d{5,12}$/)]],
  });

  readonly venueSlug = computed(() => venueSlug(this.court()?.venueName?.trim() || 'Comfasucre'));
  /** Valor aproximado "Desde" (la tarifa más baja configurada). */
  readonly fromRate = computed(() => { const c = this.court(); return c ? minCourtRate(c) : 0; });

  readonly marker = computed<MapMarker[]>(() => {
    const c = this.court();
    if (c?.map?.lat == null || c.map.lng == null) return [];
    return [{ lat: Number(c.map.lat), lng: Number(c.map.lng), label: c.name, detail: c.map.address || c.address || c.venueName }];
  });

  readonly selection = computed(() => {
    const a = this.availability();
    const s = this.selStart();
    const e = this.selEnd();
    if (!a || s === null || e === null) return null;
    const slots = a.slots.slice(s, e + 1);
    return { start: slots[0].start, end: slots[slots.length - 1].end, hours: slots.length };
  });

  constructor() {
    // Recarga los horarios cuando cambia la cancha o el día.
    effect(() => {
      const id = this.id();
      const date = this.date();
      untracked(() => this.loadSlots(id, date));
    });
    // Si cambia el celular, hay que verificarlo de nuevo.
    this.form.controls.customerPhone.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetPhone());
    this.destroyRef.onDestroy(() => { if (this.resendTimer) clearInterval(this.resendTimer); });
    // Si cambia el documento, la tarifa consultada deja de ser válida.
    this.form.controls.documentNumber.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.quote.set(null));
  }

  ngOnInit(): void {
    this.api.court(this.id()).subscribe({
      next: (c) => { this.court.set(c); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notFound.set(true); },
    });
  }

  // ---------- día y horarios ----------

  pickDate(iso: string): void {
    if (!iso || iso < this.today) return;
    this.date.set(iso);
  }

  private loadSlots(id: string, date: string): void {
    this.clearSelection();
    this.loadingSlots.set(true);
    this.slotsError.set(null);
    this.api.availability(id, date).subscribe({
      next: (a) => { this.availability.set(a); this.loadingSlots.set(false); },
      error: () => {
        this.availability.set(null);
        this.loadingSlots.set(false);
        this.slotsError.set('No pudimos consultar los horarios. Intenta de nuevo.');
      },
    });
  }

  isSelected(i: number): boolean {
    const s = this.selStart();
    const e = this.selEnd();
    return s !== null && e !== null && i >= s && i <= e;
  }

  /**
   * Selección de bloques: un clic elige un bloque; un clic en un bloque
   * contiguo libre extiende el rango; en un extremo lo recorta; cualquier
   * otro reinicia la selección.
   */
  toggleSlot(i: number, slot: AvailabilitySlot): void {
    if (!slot.available) return;
    this.quote.set(null);
    const s = this.selStart();
    const e = this.selEnd();
    const slots = this.availability()?.slots ?? [];

    if (s !== null && e !== null) {
      if (s === e && i === s) return this.clearSelection();
      if (i === s && e > s) { this.selStart.set(s + 1); return; }
      if (i === e && e > s) { this.selEnd.set(e - 1); return; }
      if (i === e + 1 && slots[i]?.available) { this.selEnd.set(i); return; }
      if (i === s - 1 && slots[i]?.available) { this.selStart.set(i); return; }
    }
    this.selStart.set(i);
    this.selEnd.set(i);
  }

  clearSelection(): void {
    this.selStart.set(null);
    this.selEnd.set(null);
    this.quote.set(null);
  }

  // ---------- resumen, tarifa y reserva ----------

  openSummary(): void {
    if (!this.selection()) return;
    this.error.set(null);
    this.modal.set('summary');
  }

  closeModal(): void {
    if (this.busy()) return;
    this.modal.set('closed');
  }

  /** Consulta la categoría del documento y el precio final de la reserva. */
  consultRate(): void {
    const sel = this.selection();
    if (!sel) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.quoting.set(true);
    this.error.set(null);
    this.api.quote({
      courtId: this.id(), date: this.date(), startTime: sel.start, endTime: sel.end,
      documentNumber: this.form.controls.documentNumber.value,
    }).subscribe({
      next: (q) => { this.quote.set(q); this.quoting.set(false); },
      error: (err) => {
        this.quoting.set(false);
        this.error.set(err?.error?.message ?? 'No pudimos consultar la tarifa. Intenta de nuevo.');
      },
    });
  }

  // ---------- verificación del celular ----------

  sendCode(): void {
    const phone = this.form.controls.customerPhone;
    if (phone.invalid) { phone.markAsTouched(); return; }
    this.sendingCode.set(true);
    this.codeError.set(null);
    this.api.sendPhoneCode(phone.value).subscribe({
      next: (r) => {
        this.sendingCode.set(false);
        this.codeSentTo.set(r.phone);
        this.codeCtrl.reset('');
        this.startResendCountdown(r.retryAfterSeconds);
      },
      error: (err) => {
        this.sendingCode.set(false);
        this.codeError.set(err?.error?.message ?? 'No se ha podido enviar el código al número indicado, intenta de nuevo.');
      },
    });
  }

  verifyCode(): void {
    if (this.codeCtrl.invalid) { this.codeCtrl.markAsTouched(); return; }
    this.verifyingCode.set(true);
    this.codeError.set(null);
    this.api.verifyPhoneCode(this.form.controls.customerPhone.value, this.codeCtrl.value).subscribe({
      next: (r) => { this.verifyingCode.set(false); this.phoneToken.set(r.token); },
      error: (err) => {
        this.verifyingCode.set(false);
        this.codeError.set(err?.error?.message ?? 'El código ingresado es incorrecto.');
      },
    });
  }

  private resetPhone(): void {
    this.phoneToken.set(null);
    this.codeSentTo.set(null);
    this.codeError.set(null);
    this.codeCtrl.reset('');
  }

  private startResendCountdown(seconds: number): void {
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendIn.set(seconds);
    this.resendTimer = setInterval(() => {
      this.resendIn.update((s) => Math.max(0, s - 1));
      if (this.resendIn() === 0 && this.resendTimer) { clearInterval(this.resendTimer); this.resendTimer = null; }
    }, 1000);
  }

  confirm(): void {
    const sel = this.selection();
    if (!sel || !this.quote() || !this.phoneToken()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    this.api.createReservation({
      courtId: this.id(), date: this.date(), startTime: sel.start, endTime: sel.end,
      customerName: v.customerName.trim().replace(/\s+/g, ' '),
      customerPhone: v.customerPhone,
      customerEmail: v.customerEmail || undefined,
      documentNumber: v.documentNumber,
      phoneToken: this.phoneToken()!,
    }).subscribe({
      next: (r) => {
        if (!r.totalAmount || r.totalAmount <= 0) {
          this.busy.set(false);
          this.modal.set('closed');
          void this.router.navigate(['/pago/confirmacion', r.id]);
          return;
        }
        this.modal.set('paying');
        this.api.initPayment(r.id).subscribe({
          next: (p) => {
            this.checkoutUrl = p.checkoutUrl;
            window.location.href = p.checkoutUrl;
          },
          error: (err) => {
            this.busy.set(false);
            this.error.set(err?.error?.message ?? 'No se pudo iniciar el pago. Intenta de nuevo.');
          },
        });
      },
      error: (err) => {
        this.busy.set(false);
        if (err?.status === 409) {
          this.error.set('No hemos podido reservar en esta hora debido a que ya fue reservada. Elige otro horario.');
          this.loadSlots(this.id(), this.date());
        } else {
          this.error.set(err?.error?.message ?? 'Ocurrió un error al intentar realizar la reserva.');
        }
      },
    });
  }

  goToCheckout(): void {
    if (this.checkoutUrl) window.location.href = this.checkoutUrl;
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  private buildDays(): DayChip[] {
    const out: DayChip[] = [];
    const base = new Date(`${this.today}T12:00:00-05:00`);
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(base.getTime() + i * 86_400_000);
      out.push({
        iso: bogotaDate(d),
        weekday: i === 0 ? 'Hoy' : d.toLocaleDateString('es-CO', { weekday: 'short', timeZone: TZ }).replace('.', ''),
        day: d.toLocaleDateString('es-CO', { day: 'numeric', timeZone: TZ }),
        month: d.toLocaleDateString('es-CO', { month: 'short', timeZone: TZ }).replace('.', ''),
      });
    }
    return out;
  }
}
