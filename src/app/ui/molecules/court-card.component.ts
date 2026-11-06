import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Court } from '../../core/models';
import { minCourtRate } from '../../core/services/portal.store';
import { MediaUrlPipe } from '../pipes/media-url.pipe';

/** Molécula: tarjeta de zona/cancha reservable del portal. */
@Component({
  selector: 'cs-court-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, MediaUrlPipe],
  template: `
    <a class="card" [routerLink]="['/cancha', court.id]">
      <div class="img" [style.background-image]="court.images.length ? 'url(' + (court.images[0] | mediaUrl) + ')' : null">
        <i *ngIf="!court.images.length" class="bi bi-dribbble"></i>
        <span class="sport">{{ court.sportType }}</span>
      </div>
      <div class="body">
        <h3>{{ court.name }}</h3>
        <p class="meta" *ngIf="showVenue && court.venueName"><i class="bi bi-geo-alt"></i> {{ court.venueName }}</p>
        <p class="meta" *ngIf="court.courtType"><i class="bi bi-bounding-box"></i> {{ court.courtType }}</p>
        <div class="foot">
          <div class="price" *ngIf="rate > 0">
            <small>Desde (aprox.)</small>
            <strong>{{ rate | currency:'COP':'symbol-narrow':'1.0-0' }}</strong><small>/hora</small>
          </div>
          <span class="go">Reservar <i class="bi bi-arrow-right"></i></span>
        </div>
      </div>
    </a>
  `,
  styles: [`
    :host { display: block; }
    .card {
      display: flex; flex-direction: column; height: 100%; background: #fff; border-radius: 18px; overflow: hidden;
      box-shadow: 0 3px 15px rgba(15,52,97,.08); color: inherit; text-decoration: none; transition: transform .15s, box-shadow .15s;
    }
    .card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(15,52,97,.14); text-decoration: none; }
    .img {
      height: 160px; background: var(--cs-gradient-blue, linear-gradient(135deg,#19559b,#1fb5e5)); background-size: cover;
      background-position: center; display: grid; place-items: center; position: relative;
    }
    .img i { font-size: 2.6rem; color: rgba(255,255,255,.75); }
    .sport {
      position: absolute; top: .7rem; left: .7rem; background: rgba(255,255,255,.95); color: var(--cs-navy-900,#0f3461);
      font-size: .75rem; font-weight: 600; padding: .25rem .65rem; border-radius: 999px;
    }
    .body { padding: 1rem 1.1rem 1.1rem; display: flex; flex-direction: column; gap: .3rem; flex: 1; }
    h3 { margin: 0; font-size: 1.05rem; }
    .meta { margin: 0; color: var(--cs-gray-600,#6c757d); font-size: .85rem; }
    .foot { margin-top: auto; padding-top: .6rem; display: flex; align-items: flex-end; justify-content: space-between; gap: .5rem; }
    .price small { color: var(--cs-gray-600,#6c757d); font-size: .75rem; }
    .price small:first-child { display: block; }
    .price strong { color: var(--cs-navy,#19559b); font-size: 1.1rem; }
    .go { color: var(--cs-navy,#19559b); font-weight: 600; font-size: .9rem; white-space: nowrap; }
  `],
})
export class CourtCardComponent {
  @Input({ required: true }) court!: Court;
  @Input() showVenue = true;
  get rate(): number { return minCourtRate(this.court); }
}
