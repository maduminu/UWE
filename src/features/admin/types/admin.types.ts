export type AdminTab =
  | 'analytics'
  | 'batches'
  | 'demos'
  | 'series'
  | 'jobs'
  | 'staff'
  | 'users'
  | 'leads'
  | 'slips'
  | 'banner'
  | 'coupons'
  | 'reviews'
  | 'instructors'
  | 'mastermind';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

export interface CourseRecord {
  id: string;
  slug: string;
  name: string;
  badge: string;
  price: number;
  priceDisplay: string;
  currency: string;
  nextBatchDate: string;
  seatsLeft: number;
  totalSeats?: number;
  zoomLink?: string;
  batchId?: string;
  color: string;
  dirty: boolean;
}

export interface LeadRecord {
  id: string;
  fullId: string;
  name: string;
  phone: string;
  email?: string;
  program: string;
  date: string;
  status: 'NEW' | 'CONTACTED' | 'ENROLLED' | 'REJECTED';
  value: string;
}

export interface AnnouncementRecord {
  id: string;
  enabled: boolean;
  text: string;
  type: string;
  dirty: boolean;
}
