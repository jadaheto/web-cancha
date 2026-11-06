import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type LogoVariant = 'color' | 'white' | 'horizontal-color' | 'horizontal-white' | 'isotipo-color' | 'isotipo-white';

const FILES: Record<LogoVariant, string> = {
  // Logo vertical oficial: isotipo arriba y "Comfasucre de todos" debajo.
  color: 'comfasucre-logo-color-sm.png',
  white: 'comfasucre-logo-white-isocolor-sm.png',
  'horizontal-color': 'comfasucre-logo-horizontal-color-sm.png',
  'horizontal-white': 'comfasucre-logo-horizontal-white-sm.png',
  'isotipo-color': 'comfasucre-isotipo-color.png',
  'isotipo-white': 'comfasucre-isotipo-white.png',
};

/** Átomo: logo Comfasucre. Nunca se deforma (solo se fija la altura). */
@Component({
  selector: 'cs-logo',
  standalone: true,
  imports: [CommonModule],
  template: `<img [src]="src" alt="Comfasucre" [style.height.px]="height" />`,
  styles: [`img { width: auto; max-width: 100%; display: block; object-fit: contain; }`],
})
export class LogoComponent {
  @Input() variant: LogoVariant = 'horizontal-color';
  @Input() height = 40;
  get src(): string {
    return `/brand/logos/${FILES[this.variant]}`;
  }
}
