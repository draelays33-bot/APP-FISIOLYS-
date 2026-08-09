export type ServiceCategory = 'pilates' | 'fisioterapia' | 'massoterapia' | 'aba' | 'outros';

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  category: ServiceCategory;
  active: boolean;
  imageUrl?: string;
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  dayName: string;
  active: boolean;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "18:00"
  lunchStart?: string; // e.g. "12:00"
  lunchEnd?: string;   // e.g. "13:00"
}

export interface ScheduleConfig {
  days: DaySchedule[];
  slotIntervalMinutes: number; // e.g. 50 ou 60
  advanceDaysMax: number;     // e.g. 30 dias para frente
}

export type AppointmentStatus = 'agendado' | 'concluido' | 'falta' | 'cancelado';

export type PaymentMethod = 'pix' | 'card_link' | 'presencial' | 'cartao_recorrente';

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: AppointmentStatus;
  attendanceStatus?: 'presenca' | 'falta' | 'pendente';
  attendanceNotes?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: string;
  webhookSent?: boolean;
  reminderSent4h?: boolean;
  reminderSentAt?: string;
}

export interface ReminderLog {
  id: string;
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  serviceName: string;
  date: string;
  time: string;
  sentAt: string;
  status: 'enviado' | 'erro';
  channel: 'whatsapp_webhook' | 'sistema';
  message: string;
}

export interface Testimonial {
  id: string;
  patientName: string;
  patientAvatar?: string;
  treatmentName: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
  verified: boolean;
  highlight?: boolean;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  firstSessionDate?: string;
  lastSessionDate?: string;
  totalSessions: number;
  totalFaltas?: number;
  notes?: string;
  createdAt: string;
}

export interface ClinicConfig {
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  managerName: string;
  webhookUrl: string;
  webhookEnabled: boolean;
  logoUrl?: string;
  googleReviewUrl?: string;
  customAppUrl?: string;
}

export type AppView = 'public' | 'admin';
export type AdminTab = 'dashboard' | 'agenda' | 'servicos' | 'horarios' | 'pacientes' | 'fidelidade' | 'financeiro' | 'qrcode' | 'webhook';

export type LoyaltyStatus = 'ativo' | 'inativo' | 'inadimplente';

export interface LoyaltyPayment {
  id: string;
  monthYear: string; // e.g. "08/2026"
  amount: number;    // e.g. 99
  paidAt: string;    // YYYY-MM-DD
  paymentMethod: 'pix' | 'cartao' | 'cartao_recorrente' | 'dinheiro' | 'outro';
  receiptNotes?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  relationship: string; // e.g. "Filho(a)", "Mãe/Pai (1º grau)", "Irmão(ã) / Avô(á) / Neto(a) (2º grau)"
  phone?: string;
}

export interface LoyaltyMember {
  id: string;
  patientName: string;
  patientPhone: string;
  patientAddress?: string;
  patientCpf?: string;
  patientEmail?: string;
  status: LoyaltyStatus;
  monthlyFee: number; // default 99
  dueDay: number; // e.g. 10
  joinedDate: string; // YYYY-MM-DD
  accumulatedBalance: number; // Saldo acumulado em R$
  totalSpent: number; // Total de saldo utilizado em R$
  beneficiaries: Beneficiary[];
  payments: LoyaltyPayment[];
  overdueMonths: string[]; // e.g. ["07/2026"]
  notes?: string;
  acceptedTerms?: boolean;
  acceptedTermsAt?: string;
  recurringBilling?: boolean;
  recurringMethod?: 'cartao_recorrente' | 'pix' | 'outro';
  cardLast4?: string;
  cardBrand?: string;
  nextBillingDate?: string;
  recurringSubscriptionId?: string;
  createdAt: string;
}

export interface SlotInfo {
  time: string;
  available: boolean;
  bookedCount: number;
  maxCapacity: number;
  isExclusive: boolean;
  hasExclusiveBooking: boolean;
  isFull: boolean;
  spotsLeft: number;
  statusLabel?: string;
  reason?: string;
}
