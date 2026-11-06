import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpParams } from '@angular/common/http';
import { Availability, Brand, Court, PaymentConfirmation, PriceQuote, Reservation } from '../models';
import { CreateReservationPayload, QuotePayload } from './reservations.service';

/** Endpoints públicos (sin autenticación) para el portal. */
@Injectable({ providedIn: 'root' })
export class PublicService {
  private readonly base = `${environment.apiUrl}/public`;
  constructor(private readonly http: HttpClient) {}

  brand(): Observable<Brand> {
    return this.http.get<Brand>(`${this.base}/brand`);
  }
  courts(): Observable<Court[]> {
    return this.http.get<Court[]>(`${this.base}/courts`);
  }
  court(id: string): Observable<Court> {
    return this.http.get<Court>(`${this.base}/courts/${id}`);
  }
  /** Grilla de horarios (bloques de 1 h) con su disponibilidad. */
  availability(id: string, date: string): Observable<Availability> {
    const params = new HttpParams().set('date', date);
    return this.http.get<Availability>(`${this.base}/courts/${id}/availability`, { params });
  }
  /** Pide al backend consultar el pago en ePayco con el ref_payco del retorno. */
  verifyPayment(id: string, refPayco?: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/reservations/${id}/verify-payment`, refPayco ? { refPayco } : {});
  }
  /** Doble confirmación: resultado de ePayco + estado de la reserva en Comfasucre. */
  paymentConfirmation(id: string, refPayco?: string): Observable<PaymentConfirmation> {
    return this.http.post<PaymentConfirmation>(`${this.base}/reservations/${id}/payment-confirmation`, refPayco ? { refPayco } : {});
  }
  reservation(id: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.base}/reservations/${id}`);
  }
  /** Envía el código de verificación al celular (WhatsApp vía n8n). */
  sendPhoneCode(phone: string): Observable<{ sent: boolean; phone: string; retryAfterSeconds: number }> {
    return this.http.post<{ sent: boolean; phone: string; retryAfterSeconds: number }>(`${this.base}/phone/send-code`, { phone });
  }
  /** Valida el código; devuelve el token para reservar con ese celular. */
  verifyPhoneCode(phone: string, code: string): Observable<{ token: string; expiresAt: string }> {
    return this.http.post<{ token: string; expiresAt: string }>(`${this.base}/phone/verify`, { phone, code });
  }
  quote(payload: QuotePayload): Observable<PriceQuote> {
    return this.http.post<PriceQuote>(`${this.base}/reservations/quote`, payload);
  }
  createReservation(payload: CreateReservationPayload): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/reservations`, payload);
  }
  sendVerification(id: string): Observable<{ sent: boolean; expiresAt: string }> {
    return this.http.post<{ sent: boolean; expiresAt: string }>(
      `${this.base}/reservations/${id}/send-verification`, {},
    );
  }
  verify(id: string, code: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/reservations/${id}/verify`, { code });
  }
  /** Inicia el pago y devuelve la URL del checkout de ePayco. */
  initPayment(id: string): Observable<{ reference: string; checkoutUrl: string; status: string }> {
    return this.http.post<{ reference: string; checkoutUrl: string; status: string }>(
      `${this.base}/reservations/${id}/payment`, {},
    );
  }
}
