import { ClinicConfig, Service, ScheduleConfig, Appointment, Patient, AppointmentStatus, SlotInfo, ReminderLog, Testimonial, LoyaltyMember, PaymentMethod } from '../types';

export const api = {
  // Clinic Config
  async getClinic(): Promise<ClinicConfig> {
    const res = await fetch('/api/clinic');
    if (!res.ok) throw new Error('Falha ao carregar dados da clínica');
    return res.json();
  },

  async updateClinic(data: Partial<ClinicConfig>): Promise<ClinicConfig> {
    const res = await fetch('/api/clinic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar dados da clínica');
    const result = await res.json();
    return result.clinic;
  },

  // Services
  async getServices(): Promise<Service[]> {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error('Falha ao obter lista de serviços');
    return res.json();
  },

  async createService(data: Omit<Service, 'id'>): Promise<Service> {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao cadastrar serviço');
    const result = await res.json();
    return result.service;
  },

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar serviço');
    const result = await res.json();
    return result.service;
  },

  async deleteService(id: string): Promise<void> {
    const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir serviço');
  },

  // Schedule Config
  async getScheduleConfig(): Promise<ScheduleConfig> {
    const res = await fetch('/api/schedule-config');
    if (!res.ok) throw new Error('Falha ao obter horários de atendimento');
    return res.json();
  },

  async updateScheduleConfig(data: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
    const res = await fetch('/api/schedule-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao salvar horários');
    const result = await res.json();
    return result.schedule;
  },

  // Available Slots
  async getAvailableSlots(date: string, serviceId?: string): Promise<{ date: string; dayName: string; available: boolean; slots: SlotInfo[]; reason?: string }> {
    const url = `/api/available-slots?date=${encodeURIComponent(date)}${serviceId ? `&serviceId=${encodeURIComponent(serviceId)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao verificar horários disponíveis');
    return res.json();
  },

  // Appointments
  async getAppointments(date?: string, status?: string): Promise<Appointment[]> {
    let url = '/api/appointments';
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao carregar agendamentos');
    return res.json();
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
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Falha ao realizar agendamento');
    }
    return result;
  },

  async updateAppointmentStatus(id: string, status: AppointmentStatus, notes?: string): Promise<Appointment> {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error('Falha ao atualizar agendamento');
    const result = await res.json();
    return result.appointment;
  },

  async deleteAppointment(id: string): Promise<void> {
    const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao remover agendamento');
  },

  // Patients
  async getPatients(): Promise<Patient[]> {
    const res = await fetch('/api/patients');
    if (!res.ok) throw new Error('Falha ao buscar lista de pacientes');
    return res.json();
  },

  // Webhook test
  async testWebhook(url?: string): Promise<{ success: boolean; status?: number; error?: string; payloadSent: any }> {
    const res = await fetch('/api/webhook/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  // 4-Hour Reminder Logs
  async getReminderLogs(): Promise<ReminderLog[]> {
    const res = await fetch('/api/reminder-logs');
    if (!res.ok) throw new Error('Falha ao obter histórico de lembretes');
    return res.json();
  },

  // Testimonials
  async getTestimonials(): Promise<Testimonial[]> {
    const res = await fetch('/api/testimonials');
    if (!res.ok) throw new Error('Falha ao buscar depoimentos');
    return res.json();
  },

  async addTestimonial(data: { patientName: string; treatmentName?: string; rating: number; comment: string }): Promise<Testimonial> {
    const res = await fetch('/api/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao enviar depoimento');
    }
    const result = await res.json();
    return result.testimonial;
  },

  // Loyalty Program API
  async getLoyaltyMembers(): Promise<LoyaltyMember[]> {
    const res = await fetch('/api/loyalty');
    if (!res.ok) throw new Error('Falha ao obter lista do programa de fidelidade');
    return res.json();
  },

  async queryLoyaltyMember(search: string): Promise<LoyaltyMember> {
    const res = await fetch(`/api/loyalty/query?search=${encodeURIComponent(search)}`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Assinante não encontrado');
    return result;
  },

  async createLoyaltyMember(data: Partial<LoyaltyMember>): Promise<LoyaltyMember> {
    const res = await fetch('/api/loyalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao cadastrar assinante');
    return result.member;
  },

  async updateLoyaltyMember(id: string, data: Partial<LoyaltyMember>): Promise<LoyaltyMember> {
    const res = await fetch(`/api/loyalty/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao atualizar assinante');
    return result.member;
  },

  async recordLoyaltyPayment(id: string, data: { monthYear?: string; amount?: number; paymentMethod?: string; receiptNotes?: string }): Promise<{ member: LoyaltyMember }> {
    const res = await fetch(`/api/loyalty/${id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao registrar pagamento');
    return result;
  },

  async setupRecurringCard(id: string, data: { cardHolderName: string; cardNumber: string; cardExpiry: string; cardCvv: string; amount?: number }): Promise<{ member: LoyaltyMember }> {
    const res = await fetch(`/api/loyalty/${id}/recurring-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao ativar cobrança recorrente no cartão');
    return result;
  },

  async subscribeRecurringCard(data: { patientName: string; patientPhone: string; patientAddress?: string; patientCpf?: string; patientEmail?: string; cardHolderName: string; cardNumber: string; cardExpiry: string; cardCvv: string }): Promise<{ member: LoyaltyMember }> {
    const res = await fetch('/api/loyalty/subscribe-recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao processar assinatura recorrente');
    return result;
  },

  async useLoyaltyCredit(id: string, data: { amount: number; description?: string }): Promise<{ member: LoyaltyMember }> {
    const res = await fetch(`/api/loyalty/${id}/use-credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao utilizar saldo');
    return result;
  },

  async deleteLoyaltyMember(id: string): Promise<void> {
    const res = await fetch(`/api/loyalty/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao remover assinante');
  }
};
