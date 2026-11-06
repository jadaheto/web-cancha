// Tipos compartidos del cliente (reflejan los contratos de la API).

export type Category = 'A' | 'B' | 'C' | 'D';
export type TimeSlot = 'day' | 'afternoon' | 'night';

export interface Admin {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  admin: Admin;
}

export interface Brand {
  name: string;
  tagline: string;
  primaryColor: string;
  primaryColorText: string;
  secondaryColor: string;
  secondaryColorText: string;
  whatsapp: string;
  email: string;
  address: string;
  logo: string;
  favicon: string;
  facebook: string;
  instagram: string;
  twitter: string;
}

export interface SlotRates {
  day?: number | null;
  afternoon?: number | null;
  night?: number | null;
}

export interface RateMatrix {
  A?: SlotRates;
  B?: SlotRates;
  C?: SlotRates;
  D?: SlotRates;
}

export interface Court {
  id: string;
  name: string;
  sportType: string;
  status: string;
  courtType?: string | null;
  venueName?: string | null;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  additionalInfo?: string | null;
  images: string[];
  attributes: string[];
  venueServices: string[];
  map?: { lat: number | null; lng: number | null; address: string | null } | null;
  hourlyRate: number;
  rates: RateMatrix;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  category: Category;
  documentNumber?: string | null;
  documentType?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid';

export interface Reservation {
  id: string;
  courtId: string;
  courtName?: string | null;
  userId?: string | null;
  userName?: string | null;
  userPhone?: string | null;
  userEmail?: string | null;
  userDocument?: string | null;
  userCategory: Category;
  categoryPrice?: number | null;
  startTime: string;
  endTime: string;
  durationHours: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  totalAmount: number;
  notes?: string | null;
  verifiedAt?: string | null;
  paidAt?: string | null;
  createdAt?: string;
}

export interface AvailabilitySlot {
  start: string;   // HH:mm
  end: string;     // HH:mm
  available: boolean;
  reason: 'reserved' | 'past' | null;
  slotLabel: string;
}

export interface Availability {
  courtId: string;
  date: string;
  slots: AvailabilitySlot[];
}

/** Sede agrupada a partir de las canchas (venueName). */
export interface Venue {
  slug: string;
  name: string;
  address: string | null;
  location: string | null;
  image: string | null;
  lat: number | null;
  lng: number | null;
  sports: string[];
  services: string[];
  courts: Court[];
  minRate: number;
}

export interface PriceQuote {
  courtId: string;
  slot: TimeSlot;
  slotLabel: string;
  category: Category;
  ratePerHour: number;
  hours: number;
  total: number;
}

export interface AnalyticsSummary {
  totalReservations: number;
  confirmed: number;
  cancelled: number;
  pending: number;
  totalRevenue: number;
  confirmedRevenue: number;
  totalUsers: number;
  occupancyRate: number;
}

export interface DailyPoint { date: string; count: number; revenue: number; }
export interface MonthlyPoint { month: string; revenue: number; count: number; }
export interface TopCourt {
  id: string; name: string; sportType: string; reservationCount: number; revenue: number;
}
