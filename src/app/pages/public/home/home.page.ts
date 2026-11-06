import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PortalStore } from '../../../core/services/portal.store';
import { SpinnerComponent } from '../../../ui/atoms/spinner.component';
import { CourtCardComponent } from '../../../ui/molecules/court-card.component';
import { MapComponent } from '../../../ui/molecules/map.component';
import { MediaUrlPipe } from '../../../ui/pipes/media-url.pipe';

/** Inicio del portal: hero con buscador, sedes del centro deportivo y zonas. */
@Component({
  selector: 'cs-home-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, FormsModule, RouterLink, SpinnerComponent, CourtCardComponent, MapComponent, MediaUrlPipe],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  readonly store = inject(PortalStore);

  readonly venueFilter = signal('');
  readonly sportFilter = signal('');

  readonly filteredCourts = computed(() => {
    const venue = this.venueFilter();
    const sport = this.sportFilter();
    const venueCourts = venue ? this.store.venueBySlug(venue)?.courts ?? [] : this.store.courts();
    return venueCourts.filter((c) => !sport || c.sportType === sport);
  });

  search(): void {
    document.getElementById('zonas')?.scrollIntoView({ behavior: 'smooth' });
  }

  clear(): void {
    this.venueFilter.set('');
    this.sportFilter.set('');
  }
}
