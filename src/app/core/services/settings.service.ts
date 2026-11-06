import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Brand } from '../models';

/** Horario de atención del portal (horas enteras, Bogotá). */
export interface Schedule { openHour: number; closeHour: number; isDefault: boolean; }

const DEFAULT_BRAND: Brand = {
  name: 'Comfasucre',
  tagline: 'Tu mejor opción en deportes',
  primaryColor: '#19559B',
  primaryColorText: '#FFFFFF',
  secondaryColor: '#1FB5E5',
  secondaryColorText: '#0F3461',
  whatsapp: '',
  email: '',
  address: '',
  logo: '',
  favicon: '',
  facebook: '',
  instagram: '',
  twitter: '',
};

/** Gestiona la configuración de marca y la aplica a las variables CSS en vivo. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly base = `${environment.apiUrl}/settings`;
  readonly brand = signal<Brand>(DEFAULT_BRAND);

  constructor(private readonly http: HttpClient) {}

  getBrand(): Observable<Brand> {
    return this.http.get<Brand>(`${this.base}/brand`).pipe(tap((b) => this.applyBrand(b)));
  }

  updateBrand(payload: Partial<Brand>): Observable<Brand> {
    return this.http.put<Brand>(`${this.base}/brand`, payload).pipe(tap((b) => this.applyBrand(b)));
  }

  getSchedule(): Observable<Schedule> {
    return this.http.get<Schedule>(`${this.base}/schedule`);
  }

  updateSchedule(payload: { openHour: number; closeHour: number }): Observable<Schedule> {
    return this.http.put<Schedule>(`${this.base}/schedule`, payload);
  }

  resetSchedule(): Observable<Schedule> {
    return this.http.delete<Schedule>(`${this.base}/schedule`);
  }

  /** Aplica los colores de marca a las variables CSS :root. */
  applyBrand(brand: Brand): void {
    this.brand.set(brand);
    const root = document.documentElement;
    if (brand.primaryColor) root.style.setProperty('--cs-navy', brand.primaryColor);
    if (brand.secondaryColor) root.style.setProperty('--cs-sky', brand.secondaryColor);
  }
}
