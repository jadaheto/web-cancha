import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LogoComponent } from '../atoms/logo.component';

interface NavItem { label: string; icon: string; route: string; }

/** Organismo: barra lateral de navegación del panel. */
@Component({
  selector: 'cs-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LogoComponent],
  template: `
    <aside class="cs-sidebar">
      <div class="brand">
        <cs-logo variant="white" [height]="64"></cs-logo>
      </div>
      <nav>
        <a *ngFor="let item of items"
           [routerLink]="item.route"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: item.route === '/admin' }"
           (click)="navigate.emit()">
          <i [class]="'bi bi-' + item.icon"></i>
          <span>{{ item.label }}</span>
        </a>
      </nav>
      <div class="foot">
        <span class="cs-eyebrow">Comfasucre · de todos</span>
      </div>
    </aside>
  `,
  styles: [`
    .cs-sidebar { display: flex; flex-direction: column; height: 100%; }
    .brand { padding: 1.25rem 1rem; }
    nav { display: flex; flex-direction: column; gap: .25rem; padding: .5rem; flex: 1; }
    nav a {
      display: flex; align-items: center; gap: .75rem; padding: .7rem .9rem;
      border-radius: .6rem; color: rgba(255,255,255,.85); text-decoration: none;
      font-weight: 500; transition: background .15s, color .15s;
    }
    nav a:hover { background: rgba(255,255,255,.1); color: #fff; text-decoration: none; }
    nav a.active { background: var(--cs-sky, #1fb5e5); color: #0f3461; }
    nav a i { font-size: 1.15rem; }
    .foot { padding: 1rem; }
    .foot .cs-eyebrow { color: rgba(255,255,255,.55); }
  `],
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();
  readonly items: NavItem[] = [
    { label: 'Dashboard', icon: 'speedometer2', route: '/admin' },
    { label: 'Reservas', icon: 'calendar-check', route: '/admin/reservations' },
    { label: 'Pagos', icon: 'cash-coin', route: '/admin/payments' },
    { label: 'Canchas', icon: 'geo-alt', route: '/admin/courts' },
    { label: 'Usuarios', icon: 'people', route: '/admin/users' },
    { label: 'Analítica', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Configuración', icon: 'gear', route: '/admin/settings' },
  ];
}
