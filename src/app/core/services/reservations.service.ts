import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PriceQuote, Reservation, ReservationStatus } from '../models';

export interface ReservationFilters {
  date?: string;
  courtId?: string;
  status?: string;
}

export interface QuotePayload {
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  category?: string;
  documentNumber?: string;
}

export interface CreateReservationPayload extends QuotePayload {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  isAffiliate?: boolean;
  userId?: string;
  notes?: string;
  /** Token de verificación del celular (portal público). */
  phoneToken?: string;
}

export type AdminPaymentMethod = 'caja' | 'epayco';

export interface AdminReservationPayload extends CreateReservationPayload {
  paymentMethod: AdminPaymentMethod;
  /** N.º de recibo de caja (opcional). */
  cashReference?: string;
}

@Injectable({ providedIn: 'root' })
export class ReservationsService {
  private readonly base = `${environment.apiUrl}/reservations`;
  constructor(private readonly http: HttpClient) {}

  list(filters: ReservationFilters = {}): Observable<Reservation[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params = params.set(k, v);
    });
    return this.http.get<Reservation[]>(this.base, { params });
  }
  /** Pagos hechos y confirmados. */
  payments(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.base}/payments`);
  }
  get(id: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.base}/${id}`);
  }
  quote(payload: QuotePayload): Observable<PriceQuote> {
    return this.http.post<PriceQuote>(`${this.base}/quote`, payload);
  }
  /** Reserva desde el panel: pagada en caja o con link de ePayco (devuelve checkoutUrl). */
  create(payload: AdminReservationPayload): Observable<Reservation & { checkoutUrl: string | null; paymentError?: string | null }> {
    return this.http.post<Reservation & { checkoutUrl: string | null; paymentError?: string | null }>(this.base, payload);
  }
  /** Registra el pago recibido en caja. */
  cashPayment(id: string, reference?: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/${id}/cash-payment`, reference ? { reference } : {});
  }
  /** Consulta el pago en la pasarela y lo aplica si corresponde. */
  verifyPayment(id: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/${id}/verify-payment`, {});
  }
  updateStatus(id: string, status: ReservationStatus): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.base}/${id}/status`, { status });
  }
  sendVerification(id: string): Observable<{ sent: boolean; expiresAt: string }> {
    return this.http.post<{ sent: boolean; expiresAt: string }>(`${this.base}/${id}/send-verification`, {});
  }
  verify(id: string, code: string): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.base}/${id}/verify`, { code });
  }
  initPayment(id: string): Observable<{ reference: string; checkoutUrl: string; status: string }> {
    return this.http.post<{ reference: string; checkoutUrl: string; status: string }>(
      `${this.base}/${id}/payment`,
      {},
    );
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
