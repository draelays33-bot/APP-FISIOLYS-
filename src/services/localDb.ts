import {
  ClinicConfig,
  Service,
  ScheduleConfig,
  Appointment,
  Patient,
  AppointmentStatus,
  SlotInfo,
  ReminderLog,
  Testimonial,
  LoyaltyMember,
  PaymentMethod
} from '../types';

import {
  initialClinicConfig,
  initialServices,
  initialScheduleConfig,
  initialAppointments,
  initialPatients,
  initialTestimonials,
  initialLoyaltyMembers
} from '../data/initialData';

const STORAGE_KEY = 'fisiolys_local_db_v1';

interface LocalDBData {
  clinic: ClinicConfig;
  services: Service[];
  schedule: ScheduleConfig;
  appointments: Appointment[];
  patients: Patient[];
  reminderLogs: ReminderLog[];
  testimonials: Testimonial[];
  loyaltyMembers: LoyaltyMember[];
}

function loadLocalData(): LocalDBData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        clinic: parsed.clinic || initialClinicConfig,
        services: parsed.services || initialServices,
        schedule: parsed.schedule || initialScheduleConfig,
        appointments: parsed.appointments || initialAppointments,
        patients: parsed.patients || initialPatients,
        reminderLogs: parsed.reminderLogs || [],
        testimonials: parsed.testimonials || initialTestimonials,
        loyaltyMembers: parsed.loyaltyMembers || initialLoyaltyMembers,
      };
    }
  } catch (err) {
    console.warn("Could not load local storage data, using initial data:", err);
  }

  const initialData: LocalDBData = {
    clinic: initialClinicConfig,
    services: initialServices,
    schedule: initialScheduleConfig,
    appointments: initialAppointments,
    patients: initialPatients,
    reminderLogs: [],
    testimonials: initialTestimonials,
    loyaltyMembers: initialLoyaltyMembers,
  };
  saveLocalData(initialData);
  return initialData;
}

function saveLocalData(data: LocalDBData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Could not save to local storage:", err);
  }
}

export const localDb = {
  getClinic(): ClinicConfig {
    const data = loadLocalData();
    return data.clinic;
  },

  updateClinic(update: Partial<ClinicConfig>): ClinicConfig {
    const data = loadLocalData();
    data.clinic = { ...data.clinic, ...update };
    saveLocalData(data);
    return data.clinic;
  },

  getServices(): Service[] {
    const data = loadLocalData();
    return data.services;
  },

  createService(serviceData: Omit<Service, 'id'>): Service {
    const data = loadLocalData();
    const newService: Service = {
      ...serviceData,
      id: `serv-${Date.now()}`
    };
    data.services.push(newService);
    saveLocalData(data);
    return newService;
  },

  updateService(id: string, update: Partial<Service>): Service {
    const data = loadLocalData();
    const idx = data.services.findIndex(s => s.id === id);
    if (idx !== -1) {
      data.services[idx] = { ...data.services[idx], ...update };
      saveLocalData(data);
      return data.services[idx];
    }
    throw new Error('Serviço não encontrado');
  },

  deleteService(id: string): void {
    const data = loadLocalData();
    data.services = data.services.filter(s => s.id !== id);
    saveLocalData(data);
  },

  getScheduleConfig(): ScheduleConfig {
    const data = loadLocalData();
    return data.schedule;
  },

  updateScheduleConfig(update: Partial<ScheduleConfig>): ScheduleConfig {
    const data = loadLocalData();
    data.schedule = { ...data.schedule, ...update };
    saveLocalData(data);
    return data.schedule;
  },

  getAvailableSlots(dateStr: string, serviceId?: string): { date: string; dayName: string; available: boolean; slots: SlotInfo[]; reason?: string } {
    const data = loadLocalData();
    if (!dateStr) return { date: dateStr, dayName: '', available: false, slots: [], reason: "Data é obrigatória" };

    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    const dayConfig = data.schedule.days.find(d => d.dayOfWeek === dayOfWeek);
    if (!dayConfig || !dayConfig.active) {
      return { date: dateStr, dayName: dayConfig?.dayName || '', available: false, slots: [], reason: "Clínica fechada neste dia da semana" };
    }

    const now = new Date();
    const currentDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTotalMins = now.getHours() * 60 + now.getMinutes();
    const minBookingMinsCutoff = currentTotalMins + 120;

    const isToday = dateStr === currentDateStr;
    const isPastDate = dateStr < currentDateStr;

    if (isPastDate) {
      return { date: dateStr, dayName: dayConfig?.dayName || '', available: false, slots: [], reason: "Esta data já passou e não aceita novos agendamentos." };
    }

    const slotStep = data.schedule.slotIntervalMinutes || 60;
    const [startH, startM] = dayConfig.startTime.split(':').map(Number);
    const [endH, endM] = dayConfig.endTime.split(':').map(Number);

    const startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;

    let lunchStartTotal = -1;
    let lunchEndTotal = -1;
    if (dayConfig.lunchStart && dayConfig.lunchEnd) {
      const [lsh, lsm] = dayConfig.lunchStart.split(':').map(Number);
      const [leh, lem] = dayConfig.lunchEnd.split(':').map(Number);
      lunchStartTotal = lsh * 60 + lsm;
      lunchEndTotal = leh * 60 + lem;
    }

    const activeApptsOnDate = data.appointments.filter(a => a.date === dateStr && a.status !== 'cancelado');
    const isAvaliacao = serviceId ? (data.services.find(s => s.id === serviceId)?.name.toLowerCase().includes('avaliação') || false) : false;

    const slotsList: SlotInfo[] = [];

    for (let mins = startTotalMinutes; mins + slotStep <= endTotalMinutes; mins += slotStep) {
      if (lunchStartTotal !== -1 && lunchEndTotal !== -1) {
        if (mins >= lunchStartTotal && mins < lunchEndTotal) continue;
      }

      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      const apptsAtTime = activeApptsOnDate.filter(a => a.time === time);
      const bookedCount = apptsAtTime.length;
      const hasExclusiveBooking = apptsAtTime.some(a => data.services.find(s => s.id === a.serviceId)?.name.toLowerCase().includes('avaliação'));

      let maxCapacity = 4;
      let available = true;
      let reason = '';
      let statusLabel = '';

      if (isToday && mins < minBookingMinsCutoff) {
        available = false;
        reason = mins <= currentTotalMins ? 'Horário já passou' : 'Antecedência mínima de 2h';
      } else if (hasExclusiveBooking) {
        available = false;
        reason = 'Horário reservado para Avaliação Individual';
      } else if (isAvaliacao && bookedCount > 0) {
        available = false;
        reason = 'Avaliação exige horário exclusivo';
      } else if (bookedCount >= maxCapacity) {
        available = false;
        reason = 'Horário esgotado (capacidade máxima atingida)';
      }

      if (available) {
        const remaining = maxCapacity - bookedCount;
        if (remaining === 1) statusLabel = 'Última vaga!';
        else if (remaining <= 2) statusLabel = 'Poucas vagas';
      }

      slotsList.push({
        time,
        available,
        bookedCount,
        maxCapacity,
        reason,
        statusLabel
      });
    }

    return {
      date: dateStr,
      dayName: dayConfig.dayName,
      available: slotsList.some(s => s.available),
      slots: slotsList
    };
  },

  getAppointments(date?: string, status?: string): Appointment[] {
    const data = loadLocalData();
    let result = [...data.appointments];
    if (date) result = result.filter(a => a.date === date);
    if (status) result = result.filter(a => a.status === status);
    return result;
  },

  createAppointment(apptData: {
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    serviceId: string;
    date: string;
    time: string;
    notes?: string;
    paymentMethod?: PaymentMethod;
  }): { appointment: Appointment; webhookSent: boolean } {
    const data = loadLocalData();
    const service = data.services.find(s => s.id === apptData.serviceId);

    const newAppt: Appointment = {
      id: `appt-${Date.now()}`,
      patientName: apptData.patientName,
      patientPhone: apptData.patientPhone,
      patientEmail: apptData.patientEmail || '',
      serviceId: apptData.serviceId,
      serviceName: service?.name || 'Serviço',
      date: apptData.date,
      time: apptData.time,
      status: 'confirmado',
      notes: apptData.notes || '',
      paymentMethod: apptData.paymentMethod || 'pix',
      attendanceStatus: 'pendente',
      createdAt: new Date().toISOString()
    };

    data.appointments.push(newAppt);

    // Sync patient list
    const existingPatient = data.patients.find(p => p.phone === apptData.patientPhone || (apptData.patientEmail && p.email === apptData.patientEmail));
    if (existingPatient) {
      existingPatient.totalAppointments += 1;
      existingPatient.lastAppointmentDate = apptData.date;
    } else {
      data.patients.push({
        id: `pat-${Date.now()}`,
        name: apptData.patientName,
        phone: apptData.patientPhone,
        email: apptData.patientEmail || '',
        totalAppointments: 1,
        lastAppointmentDate: apptData.date,
        createdAt: new Date().toISOString()
      });
    }

    saveLocalData(data);

    // Optional client-side webhook call if configured
    if (data.clinic.webhookEnabled && data.clinic.webhookUrl) {
      fetch(data.clinic.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'novo_agendamento',
          appointment: newAppt,
          clinic: data.clinic.name
        })
      }).catch(err => console.warn("Webhook failed in local mode:", err));
    }

    return { appointment: newAppt, webhookSent: false };
  },

  updateAppointmentStatus(id: string, status: AppointmentStatus, notes?: string, attendanceStatus?: 'presenca' | 'falta' | 'pendente'): Appointment {
    const data = loadLocalData();
    const appt = data.appointments.find(a => a.id === id);
    if (!appt) throw new Error('Agendamento não encontrado');

    appt.status = status;
    if (notes !== undefined) appt.notes = notes;
    if (attendanceStatus !== undefined) appt.attendanceStatus = attendanceStatus;

    saveLocalData(data);
    return appt;
  },

  markAttendance(appointmentId: string, status: 'concluido' | 'falta' | 'agendado', attendanceNotes?: string): Appointment {
    const data = loadLocalData();
    const appt = data.appointments.find(a => a.id === appointmentId);
    if (!appt) throw new Error('Agendamento não encontrado');

    if (status === 'concluido') {
      appt.attendanceStatus = 'presenca';
      appt.status = 'concluido';
    } else if (status === 'falta') {
      appt.attendanceStatus = 'falta';
      appt.status = 'cancelado';
    } else {
      appt.attendanceStatus = 'pendente';
      appt.status = 'confirmado';
    }

    if (attendanceNotes) {
      appt.notes = appt.notes ? `${appt.notes} | Obs: ${attendanceNotes}` : attendanceNotes;
    }

    saveLocalData(data);
    return appt;
  },

  getPatientHistory(query: string) {
    const data = loadLocalData();
    const qLower = query.toLowerCase().trim();

    const patient = data.patients.find(p => p.name.toLowerCase().includes(qLower) || p.phone.includes(qLower) || (p.cpf && p.cpf.includes(qLower))) || null;

    const history = data.appointments.filter(a => a.patientName.toLowerCase().includes(qLower) || a.patientPhone.includes(qLower));

    const totalPresencas = history.filter(a => a.attendanceStatus === 'presenca' || a.status === 'concluido').length;
    const totalFaltas = history.filter(a => a.attendanceStatus === 'falta').length;
    const totalAgendados = history.filter(a => a.status === 'confirmado' && a.attendanceStatus !== 'presenca' && a.attendanceStatus !== 'falta').length;

    return {
      found: history.length > 0 || patient !== null,
      patient,
      stats: {
        totalPresencas,
        totalFaltas,
        totalAgendados,
        totalGeral: history.length
      },
      history
    };
  },

  deleteAppointment(id: string): void {
    const data = loadLocalData();
    data.appointments = data.appointments.filter(a => a.id !== id);
    saveLocalData(data);
  },

  getPatients(): Patient[] {
    const data = loadLocalData();
    return data.patients;
  },

  getReminderLogs(): ReminderLog[] {
    const data = loadLocalData();
    return data.reminderLogs;
  },

  getTestimonials(): Testimonial[] {
    const data = loadLocalData();
    return data.testimonials;
  },

  addTestimonial(testimonialData: { patientName: string; treatmentName?: string; rating: number; comment: string }): Testimonial {
    const data = loadLocalData();
    const newTestimonial: Testimonial = {
      id: `test-${Date.now()}`,
      patientName: testimonialData.patientName,
      treatmentName: testimonialData.treatmentName || 'Tratamento',
      rating: testimonialData.rating,
      comment: testimonialData.comment,
      createdAt: new Date().toISOString()
    };
    data.testimonials.unshift(newTestimonial);
    saveLocalData(data);
    return newTestimonial;
  },

  getLoyaltyMembers(): LoyaltyMember[] {
    const data = loadLocalData();
    return data.loyaltyMembers;
  },

  queryLoyaltyMember(search: string): LoyaltyMember {
    const data = loadLocalData();
    const q = search.toLowerCase().trim();
    const member = data.loyaltyMembers.find(m =>
      m.patientName.toLowerCase().includes(q) ||
      m.patientPhone.includes(q) ||
      (m.patientCpf && m.patientCpf.includes(q))
    );
    if (!member) throw new Error('Assinante não encontrado');
    return member;
  },

  createLoyaltyMember(memberData: Partial<LoyaltyMember>): LoyaltyMember {
    const data = loadLocalData();
    const newMember: LoyaltyMember = {
      id: `fid-${Date.now()}`,
      patientName: memberData.patientName || 'Novo Assinante',
      patientPhone: memberData.patientPhone || '',
      patientCpf: memberData.patientCpf || '',
      status: memberData.status || 'ativo',
      monthlyFee: Number(memberData.monthlyFee) || 99,
      dueDay: Number(memberData.dueDay) || 10,
      joinedDate: new Date().toISOString().split('T')[0],
      accumulatedBalance: 0,
      totalSpent: 0,
      beneficiaries: memberData.beneficiaries || [],
      payments: [],
      overdueMonths: [],
      notes: memberData.notes || '',
      createdAt: new Date().toISOString()
    };
    data.loyaltyMembers.push(newMember);
    saveLocalData(data);
    return newMember;
  },

  updateLoyaltyMember(id: string, update: Partial<LoyaltyMember>): LoyaltyMember {
    const data = loadLocalData();
    const idx = data.loyaltyMembers.findIndex(m => m.id === id);
    if (idx !== -1) {
      data.loyaltyMembers[idx] = { ...data.loyaltyMembers[idx], ...update };
      saveLocalData(data);
      return data.loyaltyMembers[idx];
    }
    throw new Error('Assinante não encontrado');
  },

  recordLoyaltyPayment(id: string, payData: { monthYear?: string; amount?: number; paymentMethod?: string; receiptNotes?: string }): { member: LoyaltyMember } {
    const data = loadLocalData();
    const member = data.loyaltyMembers.find(m => m.id === id);
    if (!member) throw new Error('Assinante não encontrado');

    const amount = Number(payData.amount) || member.monthlyFee;
    const monthYear = payData.monthYear || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

    member.payments.push({
      id: `pay-${Date.now()}`,
      monthYear,
      amount,
      paidAt: new Date().toISOString().split('T')[0],
      paymentMethod: payData.paymentMethod || 'pix'
    });

    member.accumulatedBalance += amount;
    member.totalSpent += amount;
    member.overdueMonths = member.overdueMonths.filter(m => m !== monthYear);
    if (member.overdueMonths.length === 0 && member.status === 'inadimplente') {
      member.status = 'ativo';
    }

    saveLocalData(data);
    return { member };
  },

  setupRecurringCard(id: string, cardData: { cardHolderName: string; cardNumber: string; cardExpiry: string; cardCvv: string; amount?: number }): { member: LoyaltyMember } {
    const data = loadLocalData();
    const member = data.loyaltyMembers.find(m => m.id === id);
    if (!member) throw new Error('Assinante não encontrado');

    member.recurringCardConfig = {
      cardHolderName: cardData.cardHolderName,
      lastFourDigits: cardData.cardNumber.slice(-4) || '4242',
      expiryMonthYear: cardData.cardExpiry,
      active: true,
      lastBilledDate: new Date().toISOString().split('T')[0]
    };

    saveLocalData(data);
    return { member };
  },

  subscribeRecurringCard(subData: {
    patientName: string;
    patientPhone: string;
    patientAddress?: string;
    patientCpf?: string;
    patientEmail?: string;
    cardHolderName: string;
    cardNumber: string;
    cardExpiry: string;
    cardCvv: string;
  }): { member: LoyaltyMember } {
    const data = loadLocalData();
    const lastFourDigits = subData.cardNumber.replace(/\D/g, '').slice(-4) || '4242';

    let member = data.loyaltyMembers.find(m => m.patientPhone === subData.patientPhone);
    if (!member) {
      member = {
        id: `fid-${Date.now()}`,
        patientName: subData.patientName,
        patientPhone: subData.patientPhone,
        patientCpf: subData.patientCpf || '',
        status: 'ativo',
        monthlyFee: 99,
        dueDay: new Date().getDate(),
        joinedDate: new Date().toISOString().split('T')[0],
        accumulatedBalance: 99,
        totalSpent: 99,
        beneficiaries: [],
        payments: [{
          id: `pay-${Date.now()}`,
          monthYear: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
          amount: 99,
          paidAt: new Date().toISOString().split('T')[0],
          paymentMethod: 'cartao_credito'
        }],
        overdueMonths: [],
        notes: 'Assinatura realizada via Cartão Recorrente (Online)',
        createdAt: new Date().toISOString()
      };
      data.loyaltyMembers.push(member);
    }

    member.recurringCardConfig = {
      cardHolderName: subData.cardHolderName,
      lastFourDigits,
      expiryMonthYear: subData.cardExpiry,
      active: true,
      lastBilledDate: new Date().toISOString().split('T')[0]
    };

    saveLocalData(data);
    return { member };
  },

  useLoyaltyCredit(id: string, creditData: { amount: number; description?: string }): { member: LoyaltyMember } {
    const data = loadLocalData();
    const member = data.loyaltyMembers.find(m => m.id === id);
    if (!member) throw new Error('Assinante não encontrado');

    const amount = Number(creditData.amount);
    if (member.accumulatedBalance < amount) {
      throw new Error('Saldo insuficiente');
    }

    member.accumulatedBalance -= amount;
    saveLocalData(data);
    return { member };
  },

  deleteLoyaltyMember(id: string): void {
    const data = loadLocalData();
    data.loyaltyMembers = data.loyaltyMembers.filter(m => m.id !== id);
    saveLocalData(data);
  }
};
