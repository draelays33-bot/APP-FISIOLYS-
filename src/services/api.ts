import { ClinicConfig, Service, ScheduleConfig, Appointment, Patient, AppointmentStatus, SlotInfo, ReminderLog, Testimonial, LoyaltyMember, PaymentMethod, WhatsAppLog } from '../types';
import { localDb } from './localDb';

// Helper function to attempt API request, and fallback to localDb if server is offline or on static hosting (like Netlify)
async function fetchOrFallback<T>(
  url: string,
  options: RequestInit | undefined,
  fallbackFn: () => T | Promise<T>
): Promise<T> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (err) {
    // Server is unreachable or running on static hosting (e.g., Netlify)
  }
  return fallbackFn();
}

export const api = {
  // Clinic Config
  async getClinic(): Promise<ClinicConfig> {
    return fetchOrFallback('/api/clinic', undefined, () => localDb.getClinic());
  },

  async updateClinic(data: Partial<ClinicConfig>): Promise<ClinicConfig> {
    return fetchOrFallback(
      '/api/clinic',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.updateClinic(data)
    ).then(res => (res as any).clinic || res);
  },

  // Services
  async getServices(): Promise<Service[]> {
    return fetchOrFallback('/api/services', undefined, () => localDb.getServices());
  },

  async createService(data: Omit<Service, 'id'>): Promise<Service> {
    return fetchOrFallback(
      '/api/services',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.createService(data)
    ).then(res => (res as any).service || res);
  },

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    return fetchOrFallback(
      `/api/services/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.updateService(id, data)
    ).then(res => (res as any).service || res);
  },

  async deleteService(id: string): Promise<void> {
    return fetchOrFallback(
      `/api/services/${id}`,
      { method: 'DELETE' },
      () => localDb.deleteService(id)
    );
  },

  // Schedule Config
  async getScheduleConfig(): Promise<ScheduleConfig> {
    return fetchOrFallback('/api/schedule-config', undefined, () => localDb.getScheduleConfig());
  },

  async updateScheduleConfig(data: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
    return fetchOrFallback(
      '/api/schedule-config',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.updateScheduleConfig(data)
    ).then(res => (res as any).schedule || res);
  },

  // Available Slots
  async getAvailableSlots(date: string, serviceId?: string): Promise<{ date: string; dayName: string; available: boolean; slots: SlotInfo[]; reason?: string }> {
    const url = `/api/available-slots?date=${encodeURIComponent(date)}${serviceId ? `&serviceId=${encodeURIComponent(serviceId)}` : ''}`;
    return fetchOrFallback(url, undefined, () => localDb.getAvailableSlots(date, serviceId));
  },

  // Appointments
  async getAppointments(date?: string, status?: string): Promise<Appointment[]> {
    let url = '/api/appointments';
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;

    return fetchOrFallback(url, undefined, () => localDb.getAppointments(date, status));
  },

  async createAppointment(data: {
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    serviceId: string;
    date: string;
    time: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
  }): Promise<{ appointment: Appointment; webhookSent: boolean }> {
    return fetchOrFallback(
      '/api/appointments',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.createAppointment(data)
    );
  },

  async updateAppointmentStatus(id: string, status: AppointmentStatus, notes?: string, attendanceStatus?: 'presenca' | 'falta' | 'pendente'): Promise<Appointment> {
    return fetchOrFallback(
      `/api/appointments/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, attendanceStatus }),
      },
      () => localDb.updateAppointmentStatus(id, status, notes, attendanceStatus)
    ).then(res => (res as any).appointment || res);
  },

  async markAttendance(appointmentId: string, status: 'concluido' | 'falta' | 'agendado', attendanceNotes?: string): Promise<Appointment> {
    return fetchOrFallback(
      '/api/appointments/mark-attendance',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, status, attendanceNotes }),
      },
      () => localDb.markAttendance(appointmentId, status, attendanceNotes)
    ).then(res => (res as any).appointment || res);
  },

  async checkInPatient(params: {
    appointmentId?: string;
    patientPhone?: string;
    patientName?: string;
    method?: 'qrcode' | 'totem' | 'portal' | 'manual';
    notes?: string;
  }): Promise<{ success: boolean; appointment: Appointment; message: string; checkedInAt: string }> {
    return fetchOrFallback(
      '/api/check-in',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      },
      () => localDb.checkInPatient(params)
    );
  },

  async getPatientHistory(query: string): Promise<{
    found: boolean;
    patient: Patient | null;
    stats: {
      totalPresencas: number;
      totalFaltas: number;
      totalAgendados: number;
      totalGeral: number;
    };
    history: Appointment[];
  }> {
    return fetchOrFallback(
      `/api/patient-history?query=${encodeURIComponent(query)}`,
      undefined,
      () => localDb.getPatientHistory(query)
    );
  },

  async deleteAppointment(id: string): Promise<void> {
    return fetchOrFallback(
      `/api/appointments/${id}`,
      { method: 'DELETE' },
      () => localDb.deleteAppointment(id)
    );
  },

  // Patients
  async getPatients(): Promise<Patient[]> {
    return fetchOrFallback('/api/patients', undefined, () => localDb.getPatients());
  },

  // Webhook test
  async testWebhook(url?: string): Promise<{ success: boolean; status?: number; error?: string; payloadSent: any }> {
    return fetchOrFallback(
      '/api/webhook/test',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      },
      async () => {
        if (!url) return { success: false, error: 'URL do Webhook não fornecida', payloadSent: null };
        try {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'teste_webhook', timestamp: new Date().toISOString() })
          });
          return { success: true, payloadSent: { event: 'teste_webhook' } };
        } catch (e: any) {
          return { success: false, error: e.message || 'Falha ao disparar webhook', payloadSent: null };
        }
      }
    );
  },

  // 4-Hour Reminder Logs
  async getReminderLogs(): Promise<ReminderLog[]> {
    return fetchOrFallback('/api/reminder-logs', undefined, () => localDb.getReminderLogs());
  },

  // Testimonials
  async getTestimonials(): Promise<Testimonial[]> {
    return fetchOrFallback('/api/testimonials', undefined, () => localDb.getTestimonials());
  },

  async addTestimonial(data: { patientName: string; treatmentName?: string; rating: number; comment: string }): Promise<Testimonial> {
    return fetchOrFallback(
      '/api/testimonials',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.addTestimonial(data)
    ).then(res => (res as any).testimonial || res);
  },

  // Loyalty Program API
  async getLoyaltyMembers(): Promise<LoyaltyMember[]> {
    return fetchOrFallback('/api/loyalty', undefined, () => localDb.getLoyaltyMembers());
  },

  async queryLoyaltyMember(search: string): Promise<LoyaltyMember> {
    return fetchOrFallback(
      `/api/loyalty/query?search=${encodeURIComponent(search)}`,
      undefined,
      () => localDb.queryLoyaltyMember(search)
    );
  },

  async createLoyaltyMember(data: Partial<LoyaltyMember>): Promise<LoyaltyMember> {
    return fetchOrFallback(
      '/api/loyalty',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.createLoyaltyMember(data)
    ).then(res => (res as any).member || res);
  },

  async updateLoyaltyMember(id: string, data: Partial<LoyaltyMember>): Promise<LoyaltyMember> {
    return fetchOrFallback(
      `/api/loyalty/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.updateLoyaltyMember(id, data)
    ).then(res => (res as any).member || res);
  },

  async recordLoyaltyPayment(id: string, data: { monthYear?: string; amount?: number; paymentMethod?: 'pix' | 'cartao' | 'cartao_recorrente' | 'dinheiro' | 'outro'; receiptNotes?: string }): Promise<{ member: LoyaltyMember }> {
    return fetchOrFallback(
      `/api/loyalty/${id}/payment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.recordLoyaltyPayment(id, data)
    );
  },

  async setupRecurringCard(id: string, data: { cardHolderName: string; cardNumber: string; cardExpiry: string; cardCvv: string; amount?: number }): Promise<{ member: LoyaltyMember }> {
    return fetchOrFallback(
      `/api/loyalty/${id}/recurring-card`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.setupRecurringCard(id, data)
    );
  },

  async subscribeRecurringCard(data: { patientName: string; patientPhone: string; patientAddress?: string; patientCpf?: string; patientEmail?: string; cardHolderName: string; cardNumber: string; cardExpiry: string; cardCvv: string }): Promise<{ member: LoyaltyMember }> {
    return fetchOrFallback(
      '/api/loyalty/subscribe-recurring',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.subscribeRecurringCard(data)
    );
  },

  async useLoyaltyCredit(id: string, data: { amount: number; description?: string }): Promise<{ member: LoyaltyMember }> {
    return fetchOrFallback(
      `/api/loyalty/${id}/use-credit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.useLoyaltyCredit(id, data)
    );
  },

  async deleteLoyaltyMember(id: string): Promise<void> {
    return fetchOrFallback(
      `/api/loyalty/${id}`,
      { method: 'DELETE' },
      () => localDb.deleteLoyaltyMember(id)
    );
  },

  // WhatsApp Operations
  async getWhatsAppLogs(): Promise<WhatsAppLog[]> {
    return fetchOrFallback('/api/whatsapp/logs', undefined, () => localDb.getWhatsAppLogs());
  },

  async clearWhatsAppLogs(): Promise<void> {
    return fetchOrFallback(
      '/api/whatsapp/logs',
      { method: 'DELETE' },
      () => localDb.clearWhatsAppLogs()
    );
  },

  async sendWhatsAppMessage(params: {
    appointmentId?: string;
    type?: 'confirmacao' | 'lembrete_d1' | 'lembrete_d0' | 'manual';
    customMessage?: string;
    phoneOverride?: string;
  }): Promise<{ success: boolean; status: 'enviado' | 'erro'; details?: string; log: WhatsAppLog; directWebUrl: string; directAppUrl: string; message: string }> {
    return fetchOrFallback(
      '/api/whatsapp/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      },
      () => localDb.sendWhatsAppMessage(params)
    );
  },

  async batchSendWhatsAppReminders(date: string, type: 'lembrete_d0' | 'lembrete_d1' = 'lembrete_d0'): Promise<{
    success: boolean;
    total: number;
    sent: number;
    errors: number;
    date: string;
    type: string;
    results: any[];
  }> {
    return fetchOrFallback(
      '/api/whatsapp/batch-reminders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type }),
      },
      () => localDb.batchSendWhatsAppReminders(date, type)
    );
  },

  async testWhatsApp(params: {
    phone: string;
    message?: string;
    provider?: string;
    apiUrl?: string;
    apiToken?: string;
  }): Promise<{ success: boolean; status: string; details?: string; phone: string; text: string; directWebUrl: string; directAppUrl: string }> {
    return fetchOrFallback(
      '/api/whatsapp/test',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      },
      async () => {
        return {
          success: true,
          status: 'enviado',
          details: 'Teste simulado localmente',
          phone: params.phone,
          text: params.message || 'Teste WhatsApp',
          directWebUrl: `https://web.whatsapp.com/send?phone=${params.phone.replace(/\D/g, '')}&text=${encodeURIComponent(params.message || 'Teste')}`,
          directAppUrl: `https://wa.me/${params.phone.replace(/\D/g, '')}?text=${encodeURIComponent(params.message || 'Teste')}`
        };
      }
    );
  }
};
