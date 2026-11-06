import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Brand } from '../../core/models';
import { Schedule, SettingsService } from '../../core/services/settings.service';
import { ButtonComponent } from '../../ui/atoms/button.component';
import { SpinnerComponent } from '../../ui/atoms/spinner.component';
import { PageHeaderComponent } from '../../ui/molecules/page-header.component';

@Component({
  selector: 'cs-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, SpinnerComponent, PageHeaderComponent],
  template: `
    <cs-page-header title="Configuración" subtitle="Identidad del portal y horario de atención"></cs-page-header>

    <cs-spinner *ngIf="loading()"></cs-spinner>

    <form *ngIf="!loading()" [formGroup]="form" (ngSubmit)="save()" class="grid grid-2">
      <div class="cs-card">
        <h3>Identidad</h3>
        <label class="cs-label">Nombre</label>
        <input class="cs-input" formControlName="name" />
        <label class="cs-label mt-2">Eslogan</label>
        <input class="cs-input" formControlName="tagline" />

        <div class="grid grid-2 mt-2">
          <div>
            <label class="cs-label">Color primario</label>
            <input class="cs-input color" type="color" formControlName="primaryColor" (input)="preview()" />
          </div>
          <div>
            <label class="cs-label">Color secundario</label>
            <input class="cs-input color" type="color" formControlName="secondaryColor" (input)="preview()" />
          </div>
        </div>
      </div>

      <div class="cs-card">
        <h3>Contacto y redes</h3>
        <label class="cs-label">Correo</label>
        <input class="cs-input" formControlName="email" />
        <label class="cs-label mt-2">WhatsApp</label>
        <input class="cs-input" formControlName="whatsapp" />
        <label class="cs-label mt-2">Dirección</label>
        <input class="cs-input" formControlName="address" />
        <div class="grid grid-2 mt-2">
          <div><label class="cs-label">Facebook</label><input class="cs-input" formControlName="facebook" /></div>
          <div><label class="cs-label">Instagram</label><input class="cs-input" formControlName="instagram" /></div>
        </div>
      </div>

      <div class="actions">
        <div *ngIf="saved()" class="cs-alert cs-alert-success">Cambios guardados.</div>
        <div *ngIf="error()" class="cs-alert cs-alert-danger">{{ error() }}</div>
        <cs-button type="submit" [loading]="saving()" icon="check-lg">Guardar cambios</cs-button>
      </div>
    </form>

    <!-- Horario de atención del portal -->
    <form *ngIf="!loading()" [formGroup]="scheduleForm" (ngSubmit)="saveSchedule()" class="cs-card schedule mt-3">
      <h3><i class="bi bi-clock"></i> Horario de atención</h3>
      <p class="text-muted">
        Define desde qué hora y hasta qué hora se puede reservar en el portal (bloques de 1 hora).
        <span *ngIf="scheduleDefault()" class="cs-badge cs-badge-gray">Valor por defecto</span>
      </p>
      <div class="grid grid-2">
        <div>
          <label class="cs-label" for="s-open">Apertura</label>
          <select id="s-open" class="cs-select" formControlName="openHour">
            <option *ngFor="let h of openHours" [ngValue]="h">{{ label(h) }}</option>
          </select>
        </div>
        <div>
          <label class="cs-label" for="s-close">Cierre</label>
          <select id="s-close" class="cs-select" formControlName="closeHour">
            <option *ngFor="let h of closeHours" [ngValue]="h" [disabled]="h <= scheduleForm.controls.openHour.value">{{ label(h) }}</option>
          </select>
        </div>
      </div>
      <p class="hint">
        Último turno: {{ label(scheduleForm.controls.closeHour.value - 1) }} – {{ label(scheduleForm.controls.closeHour.value) }} ·
        {{ scheduleForm.controls.closeHour.value - scheduleForm.controls.openHour.value }} turnos por día por cancha.
      </p>
      <div *ngIf="scheduleSaved()" class="cs-alert cs-alert-success">Horario guardado. El portal ya muestra los nuevos turnos.</div>
      <div *ngIf="scheduleError()" class="cs-alert cs-alert-danger">{{ scheduleError() }}</div>
      <div class="flex gap-1">
        <cs-button type="submit" [loading]="savingSchedule()" [disabled]="scheduleForm.controls.openHour.value >= scheduleForm.controls.closeHour.value" icon="check-lg">Guardar horario</cs-button>
        <cs-button *ngIf="!scheduleDefault()" variant="outline" icon="arrow-counterclockwise" (clicked)="resetSchedule()">Restablecer (6:00 – 23:00)</cs-button>
      </div>
    </form>
  `,
  styles: [`
    h3 { margin-top: 0; }
    .color { height: 44px; padding: .25rem; }
    .schedule h3 i { color: var(--cs-sky); }
    .schedule .hint { font-size: .85rem; color: var(--cs-gray-600); margin: .8rem 0; }
    .actions { grid-column: 1 / -1; display: flex; flex-direction: column; gap: .5rem; align-items: flex-start; }
  `],
})
export class SettingsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SettingsService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [''], tagline: [''], primaryColor: ['#19559B'], secondaryColor: ['#1FB5E5'],
    email: [''], whatsapp: [''], address: [''], facebook: [''], instagram: [''],
  });

  readonly openHours = Array.from({ length: 24 }, (_, i) => i);
  readonly closeHours = Array.from({ length: 24 }, (_, i) => i + 1);
  readonly scheduleForm = this.fb.nonNullable.group({ openHour: [6], closeHour: [23] });
  readonly scheduleDefault = signal(true);
  readonly savingSchedule = signal(false);
  readonly scheduleSaved = signal(false);
  readonly scheduleError = signal<string | null>(null);

  label(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  saveSchedule(): void {
    this.savingSchedule.set(true);
    this.scheduleSaved.set(false);
    this.scheduleError.set(null);
    this.service.updateSchedule(this.scheduleForm.getRawValue()).subscribe({
      next: (s) => this.afterSchedule(s),
      error: (err) => { this.savingSchedule.set(false); this.scheduleError.set(err?.error?.message ?? 'No se pudo guardar el horario'); },
    });
  }

  resetSchedule(): void {
    this.savingSchedule.set(true);
    this.scheduleError.set(null);
    this.service.resetSchedule().subscribe({
      next: (s) => this.afterSchedule(s),
      error: (err) => { this.savingSchedule.set(false); this.scheduleError.set(err?.error?.message ?? 'No se pudo restablecer'); },
    });
  }

  private afterSchedule(s: Schedule): void {
    this.savingSchedule.set(false);
    this.scheduleSaved.set(true);
    this.scheduleDefault.set(s.isDefault);
    this.scheduleForm.setValue({ openHour: s.openHour, closeHour: s.closeHour });
  }

  ngOnInit(): void {
    this.service.getSchedule().subscribe({
      next: (s) => { this.scheduleDefault.set(s.isDefault); this.scheduleForm.setValue({ openHour: s.openHour, closeHour: s.closeHour }); },
      error: () => undefined,
    });
    this.service.getBrand().subscribe({
      next: (b) => { this.form.patchValue(b); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  preview(): void {
    this.service.applyBrand({
      ...this.service.brand(),
      primaryColor: this.form.value.primaryColor!,
      secondaryColor: this.form.value.secondaryColor!,
    });
  }

  save(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.service.updateBrand(this.form.getRawValue() as Partial<Brand>).subscribe({
      next: () => { this.saving.set(false); this.saved.set(true); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message ?? 'No se pudo guardar'); },
    });
  }
}
