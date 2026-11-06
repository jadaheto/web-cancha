import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Category, Court, TimeSlot } from '../../core/models';
import { CourtsService } from '../../core/services/courts.service';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MediaService } from '../../core/services/media.service';
import { MapComponent, MapMarker } from '../../ui/molecules/map.component';
import { MediaUrlPipe } from '../../ui/pipes/media-url.pipe';
import { ButtonComponent } from '../../ui/atoms/button.component';
import { SpinnerComponent } from '../../ui/atoms/spinner.component';
import { PageHeaderComponent } from '../../ui/molecules/page-header.component';

const CATEGORIES: Category[] = ['A', 'B', 'C', 'D'];
const SLOTS: { key: TimeSlot; label: string }[] = [
  { key: 'day', label: 'Día (6–12)' },
  { key: 'afternoon', label: 'Tarde (12–18)' },
  { key: 'night', label: 'Noche (18–6)' },
];

@Component({
  selector: 'cs-court-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, SpinnerComponent, PageHeaderComponent, MapComponent, MediaUrlPipe],
  template: `
    <cs-page-header [title]="isNew ? 'Nueva cancha' : 'Editar cancha'"
                    subtitle="Datos del recurso y tarifas por categoría"></cs-page-header>

    <cs-spinner *ngIf="loading()"></cs-spinner>

    <form *ngIf="!loading()" [formGroup]="form" (ngSubmit)="submit()">
      <div class="grid grid-2">
        <div class="cs-card">
          <h3>Información</h3>
          <label class="cs-label">Nombre</label>
          <input class="cs-input" formControlName="name" placeholder="Cancha Sintética Principal" />

          <div class="grid grid-2 mt-2">
            <div>
              <label class="cs-label">Tipo / deporte</label>
              <input class="cs-input" formControlName="sportType" placeholder="Fútbol" />
            </div>
            <div>
              <label class="cs-label">Clasificación</label>
              <input class="cs-input" formControlName="courtType" placeholder="Cancha / Auditorio" />
            </div>
          </div>

          <label class="cs-label mt-2">Sede</label>
          <input class="cs-input" formControlName="venueName" placeholder="Complejo Deportivo Comfasucre" />

          <label class="cs-label mt-2">Descripción</label>
          <textarea class="cs-textarea" formControlName="description" rows="3"></textarea>

          <label class="cs-label mt-2">Estado</label>
          <select class="cs-select" formControlName="status">
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
        </div>

        <div class="cs-card" formGroupName="rates">
          <h3>Tarifas por categoría y franja</h3>
          <p class="text-muted">Valores por hora en pesos. Categoría A (afiliado) a D (particular).</p>
          <table class="rate-table">
            <thead>
              <tr><th></th><th *ngFor="let s of slots">{{ s.label }}</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let cat of categories" [formGroupName]="cat">
                <th>Cat. {{ cat }}</th>
                <td *ngFor="let s of slots">
                  <input class="cs-input" type="number" min="0" [formControlName]="s.key" placeholder="0" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-2 mt-2">
        <!-- Fotos -->
        <div class="cs-card">
          <h3>Fotos</h3>
          <p class="text-muted">JPG, PNG o WebP de máximo 5 MB. La primera foto es la portada en el portal.</p>
          <div class="photos">
            <div class="photo" *ngFor="let img of images(); let i = index; let first = first; let last = last">
              <img [src]="img | mediaUrl" [alt]="'Foto ' + (i + 1)" />
              <span class="cover" *ngIf="first">Portada</span>
              <div class="photo-actions">
                <button type="button" title="Mover a la izquierda" [disabled]="first" (click)="moveImage(i, -1)"><i class="bi bi-arrow-left"></i></button>
                <button type="button" title="Mover a la derecha" [disabled]="last" (click)="moveImage(i, 1)"><i class="bi bi-arrow-right"></i></button>
                <button type="button" title="Quitar" class="del" (click)="removeImage(i)"><i class="bi bi-trash"></i></button>
              </div>
            </div>
            <label class="add" [class.busy]="uploading()">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple (change)="onFiles($event)" [disabled]="uploading()" />
              <i class="bi" [class.bi-cloud-arrow-up]="!uploading()" [class.bi-hourglass-split]="uploading()"></i>
              <span>{{ uploading() ? 'Subiendo…' : 'Agregar fotos' }}</span>
            </label>
          </div>
          <div *ngIf="uploadError()" class="cs-alert cs-alert-danger mt-1">{{ uploadError() }}</div>
        </div>

        <!-- Ubicación -->
        <div class="cs-card" formGroupName="map">
          <h3>Ubicación en el mapa</h3>
          <p class="text-muted">Haz clic en el mapa (o arrastra el pin) para marcar dónde queda la cancha.</p>
          <cs-map [markers]="pin()" [pickable]="true" [height]="260" (picked)="setPin($event)"></cs-map>
          <div class="grid grid-2 mt-1">
            <div>
              <label class="cs-label">Latitud</label>
              <input class="cs-input" type="number" step="0.000001" formControlName="lat" placeholder="9.3047" />
            </div>
            <div>
              <label class="cs-label">Longitud</label>
              <input class="cs-input" type="number" step="0.000001" formControlName="lng" placeholder="-75.3978" />
            </div>
          </div>
          <label class="cs-label mt-1">Dirección</label>
          <input class="cs-input" formControlName="address" placeholder="Cra. 25 #23-49, Sincelejo" />
          <button type="button" class="link mt-1" *ngIf="pin().length" (click)="clearPin()"><i class="bi bi-x-circle"></i> Quitar ubicación</button>
        </div>
      </div>

      <!-- Detalles para el portal -->
      <div class="cs-card mt-2">
        <h3>Detalles para el portal</h3>
        <div class="grid grid-2">
          <div>
            <label class="cs-label">Atributos de la zona</label>
            <textarea class="cs-textarea" formControlName="attributes" rows="3" placeholder="Uno por línea: Techada, Iluminación LED, Grama sintética"></textarea>
          </div>
          <div>
            <label class="cs-label">Servicios de la sede</label>
            <textarea class="cs-textarea" formControlName="venueServices" rows="3" placeholder="Uno por línea: Parqueadero, Baños, Cafetería"></textarea>
          </div>
          <div>
            <label class="cs-label">Ciudad / barrio</label>
            <input class="cs-input" formControlName="location" placeholder="Sincelejo, Sucre" />
          </div>
          <div>
            <label class="cs-label">Información adicional</label>
            <textarea class="cs-textarea" formControlName="additionalInfo" rows="2" placeholder="Reglas de uso, calzado permitido…"></textarea>
          </div>
        </div>
      </div>

      <div *ngIf="error()" class="cs-alert cs-alert-danger mt-2">{{ error() }}</div>

      <div class="flex gap-1 mt-3">
        <cs-button type="submit" [loading]="saving()" [disabled]="form.invalid" icon="check-lg">Guardar</cs-button>
        <cs-button variant="outline" (clicked)="cancel()">Cancelar</cs-button>
      </div>
    </form>
  `,
  styles: [`
    h3 { margin-top: 0; }
    .rate-table { width: 100%; border-collapse: collapse; }
    .rate-table th { text-align: left; font-weight: 600; color: var(--cs-navy-900); padding: .35rem; font-size: .85rem; }
    .rate-table td { padding: .25rem; }
    .rate-table .cs-input { padding: .4rem .5rem; }
    .photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: .6rem; }
    .photo { position: relative; border-radius: 12px; overflow: hidden; aspect-ratio: 4 / 3; background: var(--cs-gray-100); }
    .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cover { position: absolute; top: 6px; left: 6px; background: var(--cs-navy); color: #fff; font-size: .7rem; padding: .1rem .5rem; border-radius: 999px; }
    .photo-actions { position: absolute; bottom: 0; left: 0; right: 0; display: flex; justify-content: center; gap: .25rem; padding: .3rem; background: linear-gradient(transparent, rgba(0,0,0,.55)); }
    .photo-actions button { border: 0; width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,.92); cursor: pointer; }
    .photo-actions button:disabled { opacity: .4; cursor: default; }
    .photo-actions .del { color: var(--cs-danger, #dc3545); }
    .add {
      aspect-ratio: 4 / 3; border: 2px dashed var(--cs-navy-300, #6f93c2); border-radius: 12px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: .2rem; color: var(--cs-navy); cursor: pointer; font-size: .82rem; font-weight: 500;
    }
    .add i { font-size: 1.5rem; }
    .add.busy { opacity: .6; cursor: progress; }
    .add input { display: none; }
    .link { border: 0; background: none; color: var(--cs-danger, #dc3545); cursor: pointer; padding: 0; font: inherit; font-size: .85rem; }
  `],
})
export class CourtFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CourtsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly media = inject(MediaService);

  readonly categories = CATEGORIES;
  readonly slots = SLOTS;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly images = signal<string[]>([]);
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  /** Coordenadas actuales del pin (se sincronizan con los campos lat/lng). */
  private readonly coords = signal<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  readonly pin = computed<MapMarker[]>(() => {
    const { lat, lng } = this.coords();
    return lat != null && lng != null ? [{ lat, lng, label: this.form.controls.name.value || 'Cancha' }] : [];
  });

  isNew = true;
  private id: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    sportType: ['', Validators.required],
    courtType: [''],
    venueName: [''],
    description: [''],
    status: ['active'],
    location: [''],
    additionalInfo: [''],
    attributes: [''],
    venueServices: [''],
    map: this.fb.group({
      lat: [null as number | null, [Validators.min(-90), Validators.max(90)]],
      lng: [null as number | null, [Validators.min(-180), Validators.max(180)]],
      address: [''],
    }),
    rates: this.fb.group(
      Object.fromEntries(
        CATEGORIES.map((cat) => [
          cat,
          this.fb.group({ day: [null as number | null], afternoon: [null as number | null], night: [null as number | null] }),
        ]),
      ),
    ),
  });

  constructor() {
    // Escribir lat/lng a mano también mueve el pin.
    this.form.controls.map.valueChanges.subscribe((m) => {
      const lat = toNum(m.lat);
      const lng = toNum(m.lng);
      this.coords.set({ lat, lng });
    });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.isNew = !this.id || this.id === 'new';
    if (!this.isNew && this.id) {
      this.loading.set(true);
      this.service.get(this.id).subscribe({
        next: (c) => { this.patch(c); this.loading.set(false); },
        error: () => { this.loading.set(false); this.error.set('No se pudo cargar la cancha'); },
      });
    }
  }

  private patch(c: Court): void {
    this.form.patchValue({
      name: c.name, sportType: c.sportType, courtType: c.courtType ?? '',
      venueName: c.venueName ?? '', description: c.description ?? '', status: c.status,
      location: c.location ?? '', additionalInfo: c.additionalInfo ?? '',
      attributes: (c.attributes ?? []).join('\n'), venueServices: (c.venueServices ?? []).join('\n'),
      map: { lat: toNum(c.map?.lat), lng: toNum(c.map?.lng), address: c.map?.address ?? c.address ?? '' },
    });
    this.images.set(c.images ?? []);
    CATEGORIES.forEach((cat) => {
      const r = c.rates?.[cat];
      if (r) this.form.get(['rates', cat])?.patchValue({ day: r.day ?? null, afternoon: r.afternoon ?? null, night: r.night ?? null });
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const payload = {
      ...v,
      attributes: toList(v.attributes),
      venueServices: toList(v.venueServices),
      images: this.images(),
      address: v.map.address?.trim() || undefined,
      map: { lat: toNum(v.map.lat), lng: toNum(v.map.lng), address: v.map.address?.trim() || null },
    } as unknown as Partial<Court>;
    const req = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.id!, payload);
    req.subscribe({
      next: () => { this.saving.set(false); void this.router.navigate(['/admin/courts']); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message ?? 'No se pudo guardar'); },
    });
  }

  cancel(): void { void this.router.navigate(['/admin/courts']); }

  // ---------- fotos ----------

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.uploadError.set(null);
    const bad = files.find((f) => !IMAGE_TYPES.includes(f.type) || f.size > MAX_IMAGE_BYTES);
    if (bad) {
      this.uploadError.set(`"${bad.name}" no es válida: solo JPG, PNG o WebP de máximo 5 MB.`);
      return;
    }
    this.uploadNext(files);
  }

  /** Sube las fotos una por una para no saturar la conexión. */
  private uploadNext(queue: File[]): void {
    const file = queue.shift();
    if (!file) { this.uploading.set(false); return; }
    this.uploading.set(true);
    this.media.uploadImage(file).subscribe({
      next: (r) => { this.images.update((list) => [...list, r.url]); this.uploadNext(queue); },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err?.error?.message ?? `No se pudo subir "${file.name}".`);
      },
    });
  }

  moveImage(i: number, delta: number): void {
    this.images.update((list) => {
      const next = [...list];
      const j = i + delta;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  removeImage(i: number): void {
    this.images.update((list) => list.filter((_, k) => k !== i));
  }

  // ---------- mapa ----------

  setPin(p: { lat: number; lng: number }): void {
    this.form.controls.map.patchValue({ lat: p.lat, lng: p.lng });
    this.form.markAsDirty();
  }

  clearPin(): void {
    this.form.controls.map.patchValue({ lat: null, lng: null });
  }
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Texto (una línea o coma por elemento) → lista sin vacíos ni duplicados. */
function toList(text: string): string[] {
  return [...new Set(text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];
}
