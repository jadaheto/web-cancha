import { Injectable, computed, inject, signal } from '@angular/core';
import { Brand, Court, Venue } from '../models';
import { PublicService } from './public.service';
import { MapMarker } from '../../ui/molecules/map.component';

const DEFAULT_VENUE = 'Comfasucre';

/** Convierte un nombre de sede en un segmento de URL legible. */
export function venueSlug(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'sede';
}

/** Tarifa mínima por hora visible de una cancha (para "Desde $..."). */
export function minCourtRate(c: Court): number {
  const values: number[] = [];
  for (const cat of Object.values(c.rates ?? {})) {
    for (const v of Object.values(cat ?? {})) if (typeof v === 'number' && v > 0) values.push(v);
  }
  if (c.hourlyRate > 0) values.push(c.hourlyRate);
  return values.length ? Math.min(...values) : 0;
}

/**
 * Estado del portal público: marca y catálogo de canchas, agrupadas en sedes
 * (como en iCancha: Centro → Sedes → Zonas/Canchas). Se carga una sola vez.
 */
@Injectable({ providedIn: 'root' })
export class PortalStore {
  private readonly api = inject(PublicService);

  readonly brand = signal<Brand | null>(null);
  readonly courts = signal<Court[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  private loaded = false;

  readonly venues = computed<Venue[]>(() => {
    const map = new Map<string, Venue>();
    for (const c of this.courts()) {
      const name = c.venueName?.trim() || DEFAULT_VENUE;
      const slug = venueSlug(name);
      let v = map.get(slug);
      if (!v) {
        v = { slug, name, address: null, location: null, image: null, lat: null, lng: null, sports: [], services: [], courts: [], minRate: 0 };
        map.set(slug, v);
      }
      v.courts.push(c);
      v.address ??= c.address || null;
      v.location ??= c.location || null;
      v.image ??= c.images?.[0] ?? null;
      if (v.lat === null && c.map?.lat != null && c.map?.lng != null) {
        v.lat = Number(c.map.lat);
        v.lng = Number(c.map.lng);
      }
      v.address ??= c.map?.address || null;
      if (c.sportType && !v.sports.includes(c.sportType)) v.sports.push(c.sportType);
      for (const s of c.venueServices ?? []) if (!v.services.includes(s)) v.services.push(s);
      const rate = minCourtRate(c);
      if (rate > 0 && (v.minRate === 0 || rate < v.minRate)) v.minRate = rate;
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly sports = computed(() =>
    [...new Set(this.courts().map((c) => c.sportType).filter(Boolean))].sort(),
  );

  /** Pines del mapa de sedes (las que tienen ubicación registrada). */
  readonly venueMarkers = computed<MapMarker[]>(() =>
    this.venues()
      .filter((v) => v.lat !== null && v.lng !== null)
      .map((v) => ({
        lat: v.lat!, lng: v.lng!, label: v.name,
        detail: v.address || v.location || v.sports.join(' · '),
        link: `/sede/${v.slug}`,
      })),
  );

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.api.brand().subscribe({ next: (b) => this.brand.set(b), error: () => undefined });
    this.api.courts().subscribe({
      next: (c) => { this.courts.set(c); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set(true); this.loaded = false; },
    });
  }

  venueBySlug(slug: string): Venue | null {
    return this.venues().find((v) => v.slug === slug) ?? null;
  }
}
