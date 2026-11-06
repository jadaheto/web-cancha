import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PortalStore } from '../../core/services/portal.store';
import { LogoComponent } from '../atoms/logo.component';

/** Plantilla del portal público: barra superior, contenido y pie de página. */
@Component({
  selector: 'cs-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  template: `
    <header class="pnav">
      <div class="container-app pnav-inner">
        <a routerLink="/" class="brand" aria-label="Inicio"><cs-logo variant="color" [height]="50"></cs-logo></a>
        <nav class="links">
          <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }"><i class="bi bi-house"></i><span>Inicio</span></a>
          <a routerLink="/" fragment="sedes"><i class="bi bi-building"></i><span>Sedes</span></a>
          <a routerLink="/" fragment="zonas"><i class="bi bi-grid-3x3-gap"></i><span>Zonas</span></a>
          <a *ngIf="store.brand()?.whatsapp as wa" class="wa" [href]="'https://wa.me/' + wa.replace('+', '')" target="_blank" rel="noopener">
            <i class="bi bi-whatsapp"></i><span>Contáctanos</span>
          </a>
        </nav>
      </div>
    </header>

    <main><router-outlet></router-outlet></main>

    <footer class="pfoot">
      <div class="container-app pfoot-inner">
        <div>
          <cs-logo variant="white" [height]="64"></cs-logo>
          <p class="muted">{{ store.brand()?.tagline || 'Reserva canchas y espacios deportivos de la Caja.' }}</p>
        </div>
        <div class="contact" *ngIf="store.brand() as b">
          <span *ngIf="b.email"><i class="bi bi-envelope"></i> {{ b.email }}</span>
          <span *ngIf="b.whatsapp"><i class="bi bi-whatsapp"></i> {{ b.whatsapp }}</span>
          <span *ngIf="b.address"><i class="bi bi-geo-alt"></i> {{ b.address }}</span>
          <div class="social">
            <a *ngIf="b.facebook" [href]="b.facebook" target="_blank" rel="noopener" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
            <a *ngIf="b.instagram" [href]="b.instagram" target="_blank" rel="noopener" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
            <a *ngIf="b.twitter" [href]="b.twitter" target="_blank" rel="noopener" aria-label="X"><i class="bi bi-twitter-x"></i></a>
          </div>
        </div>
      </div>
      <div class="cs-brand-bar"></div>
    </footer>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; background: var(--cs-gray-50, #f8f9fb); }
    main { flex: 1; }
    .pnav { background: #fff; position: sticky; top: 0; z-index: 50; box-shadow: 0 2px 12px rgba(15,52,97,.07); }
    .pnav-inner { display: flex; align-items: center; justify-content: space-between; height: 72px; gap: 1rem; }
    .links { display: flex; gap: .25rem; align-items: center; }
    .links a {
      display: inline-flex; align-items: center; gap: .4rem; padding: .5rem .8rem; border-radius: 999px;
      color: var(--cs-navy-900, #0f3461); font-weight: 500; font-size: .92rem; text-decoration: none;
    }
    .links a:hover, .links a.on { background: var(--cs-navy-50, #eef3f9); }
    .links a.wa { background: var(--cs-green, #94bd1f); color: #fff; }
    .links a.wa:hover { filter: brightness(.95); }
    .pfoot { background: var(--cs-navy-900, #0f3461); color: #fff; margin-top: 3rem; }
    .pfoot-inner { display: flex; justify-content: space-between; gap: 2rem; flex-wrap: wrap; padding: 2rem 16px; }
    .muted { color: rgba(255,255,255,.7); font-size: .9rem; max-width: 340px; }
    .contact { display: flex; flex-direction: column; gap: .4rem; color: rgba(255,255,255,.85); font-size: .9rem; }
    .social { display: flex; gap: .8rem; font-size: 1.2rem; margin-top: .3rem; }
    .social a { color: #fff; }
    @media (max-width: 720px) {
      .links a span { display: none; }
      .links a { padding: .55rem .65rem; }
    }
  `],
})
export class PublicLayoutComponent implements OnInit {
  readonly store = inject(PortalStore);
  ngOnInit(): void { this.store.load(); }
}
