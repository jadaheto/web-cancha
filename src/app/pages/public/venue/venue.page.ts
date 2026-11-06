import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalStore } from '../../../core/services/portal.store';
import { SpinnerComponent } from '../../../ui/atoms/spinner.component';
import { CourtCardComponent } from '../../../ui/molecules/court-card.component';
import { MapComponent, MapMarker } from '../../../ui/molecules/map.component';
import { MediaUrlPipe } from '../../../ui/pipes/media-url.pipe';

/** Detalle de una sede: ubicación, servicios y zonas reservables. */
@Component({
  selector: 'cs-venue-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, SpinnerComponent, CourtCardComponent, MapComponent, MediaUrlPipe],
  template: `
    <cs-spinner *ngIf="store.loading()"></cs-spinner>

    <div class="container-app section" *ngIf="!store.loading() && !venue()">
      <div class="empty">
        <i class="bi bi-building-x"></i>
        <h2>Sede no encontrada</h2>
        <p>Al parecer esta sede no existe en nuestros registros.</p>
        <a routerLink="/" class="cs-btn cs-btn-primary">Ver todas las sedes</a>
      </div>
    </div>

    <ng-container *ngIf="venue() as v">
      <section class="cover" [style.background-image]="v.image ? 'linear-gradient(180deg, rgba(15,52,97,.15), rgba(15,52,97,.85)), url(' + (v.image | mediaUrl) + ')' : null">
        <div class="container-app cover-inner">
          <a routerLink="/" class="back"><i class="bi bi-arrow-left"></i> Sedes</a>
          <h1>{{ v.name }}</h1>
          <p *ngIf="v.address || v.location"><i class="bi bi-geo-alt"></i> {{ v.address || v.location }}</p>
          <div class="chips"><span class="chip" *ngFor="let s of v.sports">{{ s }}</span></div>
        </div>
      </section>

      <div class="container-app layout">
        <section>
          <div class="head">
            <h2>Zonas</h2>
            <span class="text-muted">{{ courts().length }} disponibles</span>
          </div>
          <div class="sport-tabs" *ngIf="v.sports.length > 1">
            <button type="button" [class.on]="!sport()" (click)="sport.set('')">Todas las zonas</button>
            <button type="button" *ngFor="let s of v.sports" [class.on]="sport() === s" (click)="sport.set(s)">{{ s }}</button>
          </div>
          <div class="courts">
            <cs-court-card *ngFor="let c of courts()" [court]="c" [showVenue]="false"></cs-court-card>
          </div>

          <div class="map-block">
            <h2>Ubicación</h2>
            <cs-map *ngIf="markers().length; else noMap" [markers]="markers()" [height]="340"></cs-map>
            <ng-template #noMap>
              <div class="no-map"><i class="bi bi-geo"></i> Esta sede aún no tiene su ubicación registrada en el mapa.</div>
            </ng-template>
          </div>
        </section>

        <aside>
          <div class="box">
            <h3>Información de la sede</h3>
            <ul class="info">
              <li *ngIf="v.address || v.location"><i class="bi bi-geo-alt"></i><span>{{ v.address || v.location }}</span></li>
              <li><i class="bi bi-grid-3x3-gap"></i><span>{{ v.courts.length }} {{ v.courts.length === 1 ? 'zona' : 'zonas' }}</span></li>
              <li *ngIf="v.minRate > 0"><i class="bi bi-cash-coin"></i><span>Desde {{ v.minRate | currency:'COP':'symbol-narrow':'1.0-0' }} por hora</span></li>
              <li *ngIf="store.brand()?.whatsapp as wa"><i class="bi bi-whatsapp"></i><span>{{ wa }}</span></li>
            </ul>
            <a *ngIf="mapsUrl() as url" class="cs-btn cs-btn-outline w-100" [href]="url" target="_blank" rel="noopener">
              <i class="bi bi-map"></i> Cómo llegar
            </a>
          </div>

          <div class="box" *ngIf="v.services.length">
            <h3>Servicios de la sede</h3>
            <div class="services">
              <span *ngFor="let s of v.services"><i class="bi bi-check2-circle"></i> {{ s }}</span>
            </div>
          </div>
        </aside>
      </div>
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .cover {
      background: var(--cs-gradient-diagonal, linear-gradient(135deg,#19559b,#1fb5e5 55%,#94bd1f));
      background-size: cover; background-position: center; color: #fff; padding: 3.5rem 0 2rem;
    }
    .cover-inner { display: flex; flex-direction: column; gap: .4rem; }
    .cover h1 { color: #fff; margin: .3rem 0 0; font-size: clamp(1.8rem, 4.5vw, 2.8rem); }
    .cover p { margin: 0; opacity: .9; }
    .back { color: #fff; opacity: .85; font-size: .9rem; }
    .chips { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .4rem; }
    .chip { background: rgba(255,255,255,.2); color: #fff; font-size: .78rem; font-weight: 500; padding: .2rem .7rem; border-radius: 999px; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 1.5rem; padding-top: 2rem; align-items: start; }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .head h2 { margin: 0; font-size: 1.4rem; }
    .courts { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.1rem; }
    .sport-tabs { display: flex; gap: .5rem; overflow-x: auto; padding-bottom: .4rem; margin-bottom: 1rem; }
    .sport-tabs button {
      border: 1px solid var(--cs-gray-200,#e9ecef); background: #fff; color: var(--cs-navy-900,#0f3461);
      padding: .45rem 1rem; border-radius: 999px; font: inherit; font-size: .88rem; cursor: pointer; white-space: nowrap;
    }
    .sport-tabs button.on { background: var(--cs-navy,#19559b); border-color: var(--cs-navy,#19559b); color: #fff; }
    aside { display: flex; flex-direction: column; gap: 1rem; position: sticky; top: 88px; }
    .box { background: #fff; border-radius: 18px; padding: 1.2rem; box-shadow: 0 3px 15px rgba(15,52,97,.07); }
    .box h3 { margin: 0 0 .8rem; font-size: 1rem; }
    .info { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-direction: column; gap: .6rem; font-size: .9rem; }
    .info li { display: flex; gap: .6rem; }
    .info i { color: var(--cs-sky,#1fb5e5); }
    .services { display: flex; flex-direction: column; gap: .45rem; font-size: .9rem; }
    .services i { color: var(--cs-green,#94bd1f); }
    .map-block { margin-top: 2rem; }
    .map-block h2 { font-size: 1.4rem; margin: 0 0 1rem; }
    .no-map { background: #fff; border-radius: 16px; padding: 1.2rem; color: var(--cs-gray-600,#6c757d); font-size: .9rem; }
    .empty { text-align: center; background: #fff; border-radius: 18px; padding: 3rem 1rem; }
    .empty i { font-size: 2.6rem; color: var(--cs-navy-300,#6f93c2); }
    .section { padding: 2rem 16px; }
    @media (max-width: 900px) { .layout { grid-template-columns: minmax(0, 1fr); } aside { position: static; order: -1; } }
  `],
})
export class VenuePage {
  readonly store = inject(PortalStore);
  /** Segmento :slug de la ruta (withComponentInputBinding). */
  readonly slug = input.required<string>();
  readonly sport = signal('');

  readonly venue = computed(() => this.store.venueBySlug(this.slug()));
  readonly courts = computed(() =>
    (this.venue()?.courts ?? []).filter((c) => !this.sport() || c.sportType === this.sport()),
  );
  /** Un pin por cada zona de la sede con ubicación registrada. */
  readonly markers = computed<MapMarker[]>(() =>
    (this.venue()?.courts ?? [])
      .filter((c) => c.map?.lat != null && c.map?.lng != null)
      .map((c) => ({
        lat: Number(c.map!.lat), lng: Number(c.map!.lng), label: c.name,
        detail: c.sportType, link: `/cancha/${c.id}`,
      })),
  );

  readonly mapsUrl = computed(() => {
    const v = this.venue();
    const geo = v?.courts.map((x) => x.map).find((m) => m?.lat && m?.lng);
    if (geo) return `https://www.google.com/maps/dir/?api=1&destination=${geo.lat},${geo.lng}`;
    const q = v?.address || v?.location;
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + ', Sucre, Colombia')}` : null;
  });
}
