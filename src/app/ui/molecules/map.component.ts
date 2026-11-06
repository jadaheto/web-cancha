import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy,
  Output, ViewChild, inject,
} from '@angular/core';
import { Router } from '@angular/router';
import type * as Leaflet from 'leaflet';

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  /** Texto secundario del popup (dirección, deporte…). */
  detail?: string | null;
  /** Ruta interna a la que lleva el popup (p. ej. /sede/x). */
  link?: string | null;
}

/** Centro por defecto: Sincelejo, Sucre. */
const DEFAULT_CENTER: [number, number] = [9.3047, -75.3978];

/**
 * Molécula: mapa (Leaflet + OpenStreetMap, sin API key).
 * - Modo lectura: muestra los `markers` y ajusta el zoom para verlos todos.
 * - Modo selección (`pickable`): un clic o arrastrar el pin emite `picked`.
 * Leaflet se carga de forma diferida para no pesar en las páginas sin mapa.
 */
@Component({
  selector: 'cs-map',
  standalone: true,
  template: `<div #host class="map" [style.height.px]="height"></div>`,
  styles: [`
    :host { display: block; }
    .map { width: 100%; border-radius: 16px; overflow: hidden; z-index: 0; background: var(--cs-navy-50, #eef3f9); }
    :host ::ng-deep .cs-pin {
      width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
      background: var(--cs-navy, #19559b); border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,.3);
    }
    :host ::ng-deep .cs-pin::after {
      content: ''; position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #fff; top: 7px; left: 7px;
    }
    :host ::ng-deep .leaflet-popup-content { font-family: 'Poppins', sans-serif; margin: 10px 14px; }
    :host ::ng-deep .cs-pop strong { display: block; color: var(--cs-navy-900, #0f3461); }
    :host ::ng-deep .cs-pop small { color: #6c757d; }
    :host ::ng-deep .cs-pop a { display: inline-block; margin-top: 4px; font-weight: 600; cursor: pointer; }
  `],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() markers: MapMarker[] = [];
  @Input() height = 320;
  @Input() pickable = false;
  @Input() zoom = 15;
  @Output() picked = new EventEmitter<{ lat: number; lng: number }>();

  @ViewChild('host', { static: true }) private host!: ElementRef<HTMLDivElement>;
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private L: typeof Leaflet | null = null;
  private map: Leaflet.Map | null = null;
  private layer: Leaflet.LayerGroup | null = null;

  async ngAfterViewInit(): Promise<void> {
    const mod = await import('leaflet');
    this.L = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as typeof Leaflet);
    const L = this.L;
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.host.nativeElement, { scrollWheelZoom: this.pickable, attributionControl: true })
        .setView(DEFAULT_CENTER, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(this.map);
      this.layer = L.layerGroup().addTo(this.map);
      if (this.pickable) {
        this.map.on('click', (e: Leaflet.LeafletMouseEvent) => this.emitPick(e.latlng.lat, e.latlng.lng));
      }
    });
    this.render();
    // El contenedor puede cambiar de tamaño al terminar de pintar la página.
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  ngOnChanges(): void {
    this.render();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private emitPick(lat: number, lng: number): void {
    const round = (n: number) => Math.round(n * 1e6) / 1e6;
    this.zone.run(() => this.picked.emit({ lat: round(lat), lng: round(lng) }));
  }

  private render(): void {
    const L = this.L;
    if (!L || !this.map || !this.layer) return;
    this.layer.clearLayers();
    const icon = L.divIcon({ className: '', html: '<div class="cs-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
    const valid = this.markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));

    for (const m of valid) {
      const marker = L.marker([m.lat, m.lng], { icon, draggable: this.pickable });
      if (this.pickable) {
        marker.on('dragend', () => { const p = marker.getLatLng(); this.emitPick(p.lat, p.lng); });
      } else {
        marker.bindPopup(this.popup(m));
      }
      marker.addTo(this.layer);
    }

    if (valid.length === 1) {
      this.map.setView([valid[0].lat, valid[0].lng], this.zoom);
    } else if (valid.length > 1) {
      this.map.fitBounds(L.latLngBounds(valid.map((m) => [m.lat, m.lng] as [number, number])), { padding: [40, 40], maxZoom: 16 });
    }
  }

  /** Popup construido con nodos DOM (sin innerHTML con datos del usuario). */
  private popup(m: MapMarker): HTMLElement {
    const box = document.createElement('div');
    box.className = 'cs-pop';
    const title = document.createElement('strong');
    title.textContent = m.label;
    box.appendChild(title);
    if (m.detail) {
      const d = document.createElement('small');
      d.textContent = m.detail;
      box.appendChild(d);
    }
    const link = m.link;
    if (link) {
      const a = document.createElement('a');
      a.textContent = 'Ver →';
      a.addEventListener('click', () => this.zone.run(() => this.router.navigateByUrl(link)));
      box.appendChild(document.createElement('br'));
      box.appendChild(a);
    }
    const gmaps = document.createElement('a');
    gmaps.textContent = 'Cómo llegar';
    gmaps.href = `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`;
    gmaps.target = '_blank';
    gmaps.rel = 'noopener';
    gmaps.style.marginLeft = link ? '12px' : '0';
    if (!link) box.appendChild(document.createElement('br'));
    box.appendChild(gmaps);
    return box;
  }
}
