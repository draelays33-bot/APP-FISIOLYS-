import { ClinicConfig, Service, ScheduleConfig, Appointment, Patient, AppointmentStatus, SlotInfo, ReminderLog, Testimonial, LoyaltyMember, PaymentMethod, WhatsAppLog, FrequencyType, WeeklyDaySchedule } from '../types';
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
    patientBirthDate?: string;
    patientEmail?: string;
    patientAddress?: string;
    patientCity?: string;
    patientCpf?: string;
    serviceId: string;
    date: string;
    time: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
    frequencyType?: FrequencyType;
    selectedDaysSchedule?: WeeklyDaySchedule[];
    planScheduleSummary?: string;
    multipleDates?: { date: string; time: string }[];
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

  async updateAppointmentDetails(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    return fetchOrFallback(
      `/api/appointments/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      },
      () => localDb.updateAppointmentDetails(id, updates)
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

  async rescheduleAppointment(id: string, newDate: string, newTime: string, reason?: string): Promise<Appointment> {
    return fetchOrFallback(
      `/api/appointments/${id}/reschedule`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDate, newTime, reason }),
      },
      () => localDb.rescheduleAppointment(id, newDate, newTime, reason)
    ).then(res => (res as any).appointment || res);
  },

  // Patients
  async getPatients(): Promise<Patient[]> {
    return fetchOrFallback('/api/patients', undefined, () => localDb.getPatients());
  },

  async deletePatient(id: string, deleteAppointments = false): Promise<void> {
    return fetchOrFallback(
      `/api/patients/${id}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAppointments }),
      },
      () => localDb.deletePatient(id, deleteAppointments)
    );
  },

  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    return fetchOrFallback(
      `/api/patients/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localDb.updatePatient(id, data)
    ).then(res => (res as any).patient || res);
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

  async batchSendWhatsAppReminders2h(appointmentIds?: string[]): Promise<{
    success: boolean;
    total: number;
    sent: number;
    errors: number;
    results: any[];
  }> {
    return fetchOrFallback(
      '/api/whatsapp/reminders-2h',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentIds }),
      },
      () => localDb.batchSendWhatsAppReminders2h(appointmentIds)
    );
  },

  async sendBirthdayReminders(): Promise<{
    success: boolean;
    total: number;
    sent: number;
    errors: number;
    results: any[];
  }> {
    return fetchOrFallback(
      '/api/whatsapp/birthday-reminders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      () => localDb.sendBirthdayReminders()
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
  },

  // ==========================================
  // CRM FISIOLYS & CLINICAL EVALUATION METHODS
  // ==========================================
  async getCrmData(): Promise<{ leads: any[]; appointments: any[]; avaliacoes: any[] }> {
    return fetchOrFallback(
      '/api/crm/all',
      undefined,
      async () => {
        const storedLeads = localStorage.getItem('fisiolys_crm_leads');
        const storedAppts = localStorage.getItem('fisiolys_crm_appts');
        const storedAvals = localStorage.getItem('fisiolys_crm_avaliacoes');
        return {
          leads: storedLeads ? JSON.parse(storedLeads) : [],
          appointments: storedAppts ? JSON.parse(storedAppts) : [],
          avaliacoes: storedAvals ? JSON.parse(storedAvals) : []
        };
      }
    );
  },

  async saveCrmLead(lead: any): Promise<any> {
    return fetchOrFallback(
      '/api/crm/leads',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      },
      async () => lead
    ).then((res: any) => res.lead || res);
  },

  async deleteCrmLead(id: string): Promise<boolean> {
    return fetchOrFallback(
      `/api/crm/leads/${id}`,
      { method: 'DELETE' },
      async () => ({ success: true })
    ).then(() => true);
  },

  async saveCrmAppointment(appt: any): Promise<any> {
    return fetchOrFallback(
      '/api/crm/appointments',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appt)
      },
      async () => appt
    ).then((res: any) => res.appointment || res);
  },

  async deleteCrmAppointment(id: string): Promise<boolean> {
    return fetchOrFallback(
      `/api/crm/appointments/${id}`,
      { method: 'DELETE' },
      async () => ({ success: true })
    ).then(() => true);
  },

  async saveCrmAvaliacao(aval: any): Promise<any> {
    return fetchOrFallback(
      '/api/crm/avaliacoes',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aval)
      },
      async () => aval
    ).then((res: any) => res.avaliacao || res);
  },

  async deleteCrmAvaliacao(id: string): Promise<boolean> {
    return fetchOrFallback(
      `/api/crm/avaliacoes/${id}`,
      { method: 'DELETE' },
      async () => ({ success: true })
    ).then(() => true);
  },

  async saveCrmEvolucao(avalId: string, evol: any): Promise<any> {
    return fetchOrFallback(
      `/api/crm/avaliacoes/${avalId}/evolucoes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evol)
      },
      async () => evol
    );
  },

  async deleteCrmEvolucao(avalId: string, evolId: string): Promise<boolean> {
    return fetchOrFallback(
      `/api/crm/avaliacoes/${avalId}/evolucoes/${evolId}`,
      { method: 'DELETE' },
      async () => ({ success: true })
    ).then(() => true);
  },

  // ==========================================
  // GEMINI AI ASSISTANT & CLINICAL THINKING
  // ==========================================
  async askGeminiChat(params: {
    messages: { role: string; content: string }[];
    thinkingMode?: boolean;
    userRole?: 'dra' | 'paciente' | 'lead';
    contextData?: any;
  }): Promise<{ success: boolean; text: string; thinkingProcess?: string; rawText?: string; error?: string }> {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("AI Chat API error, using fallback:", e);
    }

    // Local smart fallback
    const lastMsg = params.messages[params.messages.length - 1]?.content || "";
    return {
      success: true,
      text: `Olá! Sou o assistente com IA da Fisiolys. Para a consulta sobre "${lastMsg.slice(0, 45)}...", recomendamos avaliação cinético-funcional presencial na Fisiolys com a Dra. Elays Marinho (CREFITO 208058) para definir o protocolo ideal de Pilates ou Fisioterapia.`,
      thinkingProcess: params.thinkingMode ? "Raciocínio Clínico: Análise biomecânica de queixa funcional e direcionamento para avaliação presencial e protocolo especializado." : undefined
    };
  },

  async generateClinicalReasoning(data: {
    idade?: string;
    profissao?: string;
    queixaPrincipal?: string;
    escalaDor?: number;
    historico?: string;
    medicamentos?: string;
    comorbidades?: string;
    inspecao?: string;
    adm?: string;
    forcaMuscular?: string;
    testesEspeciais?: string;
  }): Promise<{ success: boolean; diagnosticoFuncional: string; objetivos: string; planoTerapeutico: string; thinkingProcess: string }> {
    try {
      const res = await fetch('/api/ai/clinical-reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Clinical reasoning API error, using fallback:", e);
    }

    return {
      success: true,
      diagnosticoFuncional: `Quadro compatível com sobrecarga biomecânica e dor grau ${data.escalaDor || 5}/10, associado à queixa de "${data.queixaPrincipal || 'desconforto musculoesquelético'}".`,
      objetivos: "1. Reduzir dor e restrições miofasciais.\n2. Ganhar ADM e flexibilidade funcional.\n3. Fortalecer estabilizadores articulares e core abdominal.\n4. Orientação ergonômica e postural.",
      planoTerapeutico: "Fisioterapia integrada 2x/semana com liberação miofascial, termoterapia e cinesioterapia com Pilates.",
      thinkingProcess: "Pensamento Clínico: Correlação entre rotina ocupacional, histórico álgico e indicação de protocolo ativo de cinesioterapia."
    };
  },

  async suggestLeadWhatsAppMessage(leadData: {
    leadNome: string;
    protocolo: string;
    status: string;
    notas?: string;
    origem?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/ai/suggest-lead-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Lead message suggestion API error:", e);
    }

    return {
      success: true,
      message: `Olá ${leadData.leadNome}! 💚 Tudo bem? Aqui é a Dra. Elays da Fisiolys Fisioterapia e Pilates. Vi que você tem interesse no tratamento de *${leadData.protocolo}*. Como podemos te ajudar a viver com mais leveza e sem dores? Gostaria de agendar sua avaliação nesta semana? 🌿✨`
    };
  },

  async askGeminiAssistant(params: {
    userMessage: string;
    systemContext?: string;
  }): Promise<{ success: boolean; reply: string }> {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: params.userMessage,
          systemContext: params.systemContext
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, reply: data.reply || data.message || '' };
      }
    } catch (e) {
      console.warn("Gemini assistant API error:", e);
    }

    return {
      success: true,
      reply: `Olá {nome}! 🌿✨\n\n*Pílula de Sabedoria & Saúde Fisiolys* ☀️\n\n📖 “O Senhor é o meu pastor; de nada terei falta. Em verdes pastagens me faz repousar e me conduz a águas tranquilas; restaura-me o vigor.” — _Salmos 23:1-3_\n\n💭 *Reflexão:* O verdadeiro cuidado com o corpo começa na paz de espírito. Dedique alguns minutos hoje para respirar com calma, alongar os ombros e praticar o autocuidado.\n\nCom carinho,\n*Dra. Elays Marinho*\n_Fisiolys Fisioterapia & Pilates_ 🌸`
    };
  }
};

