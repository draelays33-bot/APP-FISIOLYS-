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
  PaymentMethod,
  WhatsAppLog,
  FrequencyType,
  WeeklyDaySchedule
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

import {
  interpolateWhatsAppTemplate,
  getWhatsAppDirectUrl,
  getWhatsAppWebUrl,
  cleanPhoneNumber,
  DEFAULT_WHATSAPP_TEMPLATES
} from '../utils/whatsappUtils';

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
  whatsappLogs: WhatsAppLog[];
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
        whatsappLogs: parsed.whatsappLogs || [],
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
    whatsappLogs: [],
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
        isExclusive: false,
        hasExclusiveBooking: false,
        isFull: !available,
        spotsLeft: Math.max(0, maxCapacity - bookedCount),
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
  }): { appointment: Appointment; webhookSent: boolean } {
    const data = loadLocalData();
    const service = data.services.find(s => s.id === apptData.serviceId);

    const newAppt: Appointment = {
      id: `appt-${Date.now()}`,
      patientName: apptData.patientName,
      patientPhone: apptData.patientPhone,
      patientEmail: apptData.patientEmail || '',
      patientBirthDate: apptData.patientBirthDate || undefined,
      patientAddress: apptData.patientAddress || undefined,
      patientCity: apptData.patientCity || undefined,
      patientCpf: apptData.patientCpf || undefined,
      serviceId: apptData.serviceId,
      serviceName: service?.name || 'Serviço',
      servicePrice: service?.price || 0,
      durationMinutes: service?.durationMinutes || 50,
      date: apptData.date,
      time: apptData.time,
      frequencyType: apptData.frequencyType || 'sessao_unica',
      selectedDaysSchedule: apptData.selectedDaysSchedule,
      planScheduleSummary: apptData.planScheduleSummary,
      multipleDates: apptData.multipleDates,
      status: 'agendado',
      notes: apptData.notes || (apptData.planScheduleSummary ? `Plano/Frequência: ${apptData.planScheduleSummary}` : ''),
      paymentMethod: apptData.paymentMethod || 'pix',
      attendanceStatus: 'pendente',
      createdAt: new Date().toISOString()
    };

    data.appointments.push(newAppt);

    // Sync patient list with all registration fields
    const existingPatient = data.patients.find(p => p.phone === apptData.patientPhone || (apptData.patientEmail && p.email === apptData.patientEmail));
    if (existingPatient) {
      existingPatient.totalSessions += 1;
      existingPatient.lastSessionDate = apptData.date;
      if (apptData.patientBirthDate && !existingPatient.birthDate) existingPatient.birthDate = apptData.patientBirthDate;
      if (apptData.patientEmail && !existingPatient.email) existingPatient.email = apptData.patientEmail;
      if (apptData.patientAddress && !existingPatient.address) existingPatient.address = apptData.patientAddress;
      if (apptData.patientCity && !existingPatient.city) existingPatient.city = apptData.patientCity;
      if (apptData.patientCpf && !existingPatient.cpf) existingPatient.cpf = apptData.patientCpf;
    } else {
      data.patients.push({
        id: `pat-${Date.now()}`,
        name: apptData.patientName,
        phone: apptData.patientPhone,
        email: apptData.patientEmail || '',
        birthDate: apptData.patientBirthDate || undefined,
        address: apptData.patientAddress || undefined,
        city: apptData.patientCity || 'Altamira - PA',
        cpf: apptData.patientCpf || undefined,
        totalSessions: 1,
        lastSessionDate: apptData.date,
        firstSessionDate: apptData.date,
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

  updateAppointmentDetails(id: string, updates: Partial<Appointment>): Appointment {
    const data = loadLocalData();
    const appt = data.appointments.find(a => a.id === id);
    if (!appt) throw new Error('Agendamento não encontrado');

    if (updates.date !== undefined) appt.date = updates.date;
    if (updates.time !== undefined) appt.time = updates.time;
    if (updates.serviceId !== undefined) {
      appt.serviceId = updates.serviceId;
      const serv = data.services.find(s => s.id === updates.serviceId);
      if (serv) {
        appt.serviceName = serv.name;
        appt.servicePrice = serv.price;
      }
    }
    if (updates.serviceName !== undefined) appt.serviceName = updates.serviceName;
    if (updates.servicePrice !== undefined) appt.servicePrice = Number(updates.servicePrice);
    if (updates.patientName !== undefined) appt.patientName = updates.patientName;
    if (updates.patientPhone !== undefined) appt.patientPhone = updates.patientPhone;
    if (updates.patientCpf !== undefined) appt.patientCpf = updates.patientCpf;
    if (updates.notes !== undefined) appt.notes = updates.notes;
    if (updates.status !== undefined) {
      appt.status = updates.status;
      if (updates.status === 'concluido') {
        appt.attendanceStatus = 'presenca';
      } else if (updates.status === 'falta') {
        appt.attendanceStatus = 'falta';
      }
    }
    if (updates.attendanceStatus !== undefined) {
      appt.attendanceStatus = updates.attendanceStatus;
      if (updates.attendanceStatus === 'presenca') {
        appt.status = 'concluido';
      } else if (updates.attendanceStatus === 'falta') {
        appt.status = 'falta';
      }
    }

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
      appt.status = 'agendado';
    }

    if (attendanceNotes) {
      appt.notes = appt.notes ? `${appt.notes} | Obs: ${attendanceNotes}` : attendanceNotes;
    }

    saveLocalData(data);
    return appt;
  },

  checkInPatient(params: {
    appointmentId?: string;
    patientPhone?: string;
    patientName?: string;
    method?: 'qrcode' | 'totem' | 'portal' | 'manual';
    notes?: string;
  }): { success: boolean; appointment: Appointment; message: string; checkedInAt: string } {
    const data = loadLocalData();
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
    const nowDate = String(now.getDate()).padStart(2, '0');
    const todayStr = `${nowYear}-${nowMonth}-${nowDate}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let targetAppt: Appointment | undefined;

    if (params.appointmentId) {
      targetAppt = data.appointments.find(a => a.id === params.appointmentId);
    }

    if (!targetAppt && (params.patientPhone || params.patientName)) {
      const cleanPhone = (params.patientPhone || '').replace(/\D/g, '');
      const nameLower = (params.patientName || '').trim().toLowerCase();

      targetAppt = data.appointments.find(a => {
        const aPhoneClean = a.patientPhone.replace(/\D/g, '');
        const matchPhone = cleanPhone.length >= 6 && aPhoneClean.includes(cleanPhone);
        const matchName = nameLower && a.patientName.toLowerCase().includes(nameLower);
        return (matchPhone || matchName) && a.date === todayStr && a.status !== 'cancelado';
      });

      if (!targetAppt) {
        targetAppt = data.appointments.find(a => {
          const aPhoneClean = a.patientPhone.replace(/\D/g, '');
          const matchPhone = cleanPhone.length >= 6 && aPhoneClean.includes(cleanPhone);
          const matchName = nameLower && a.patientName.toLowerCase().includes(nameLower);
          return (matchPhone || matchName) && a.status !== 'cancelado';
        });
      }
    }

    if (targetAppt) {
      targetAppt.attendanceStatus = 'presenca';
      targetAppt.status = 'concluido';
      targetAppt.checkedInAt = now.toISOString();
      targetAppt.checkInMethod = params.method || 'qrcode';
      if (params.notes) {
        targetAppt.attendanceNotes = targetAppt.attendanceNotes ? `${targetAppt.attendanceNotes} | ${params.notes}` : params.notes;
      }
      saveLocalData(data);
      return {
        success: true,
        appointment: targetAppt,
        message: `Check-in confirmado com sucesso! Seja bem-vindo(a) à Fisiolys, ${targetAppt.patientName}.`,
        checkedInAt: targetAppt.checkedInAt
      };
    }

    // Create walk-in check-in session for today
    const defaultService = data.services[0] || {
      id: 'srv-1',
      name: 'Fisioterapia / Pilates',
      price: 130,
      durationMinutes: 50
    };

    const newCheckInAppt: Appointment = {
      id: `appt-checkin-${Date.now()}`,
      patientName: params.patientName || 'Paciente Recepção',
      patientPhone: params.patientPhone || '(93) 99999-9999',
      patientEmail: '',
      serviceId: defaultService.id,
      serviceName: defaultService.name,
      servicePrice: defaultService.price,
      durationMinutes: defaultService.durationMinutes,
      date: todayStr,
      time: timeStr,
      status: 'concluido',
      attendanceStatus: 'presenca',
      checkedInAt: now.toISOString(),
      checkInMethod: params.method || 'qrcode',
      notes: params.notes || 'Check-in presencial registrado na clínica',
      paymentMethod: 'presencial',
      createdAt: now.toISOString()
    };

    data.appointments.unshift(newCheckInAppt);
    saveLocalData(data);

    return {
      success: true,
      appointment: newCheckInAppt,
      message: `Check-in presencial confirmado para hoje às ${timeStr}! Seja bem-vindo(a) à Fisiolys.`,
      checkedInAt: newCheckInAppt.checkedInAt
    };
  },

  getPatientHistory(query: string) {
    const data = loadLocalData();
    const qLower = query.toLowerCase().trim();

    const patient = data.patients.find(p => p.name.toLowerCase().includes(qLower) || p.phone.includes(qLower) || (p.cpf && p.cpf.includes(qLower))) || null;

    const history = data.appointments.filter(a => a.patientName.toLowerCase().includes(qLower) || a.patientPhone.includes(qLower));

    const totalPresencas = history.filter(a => a.attendanceStatus === 'presenca' || a.status === 'concluido').length;
    const totalFaltas = history.filter(a => a.attendanceStatus === 'falta').length;
    const totalAgendados = history.filter(a => a.status === 'agendado' && a.attendanceStatus !== 'presenca' && a.attendanceStatus !== 'falta').length;

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

  rescheduleAppointment(id: string, newDate: string, newTime: string, reason?: string): Appointment {
    const data = loadLocalData();
    const appt = data.appointments.find(a => a.id === id);
    if (!appt) throw new Error('Agendamento não encontrado');

    const oldDate = appt.date;
    const oldTime = appt.time;
    appt.date = newDate;
    appt.time = newTime;
    appt.status = 'agendado';
    appt.attendanceStatus = 'pendente';
    const noteMsg = `Remarcado de ${oldDate} às ${oldTime} para ${newDate} às ${newTime}${reason ? ` (Motivo: ${reason})` : ''}`;
    appt.notes = appt.notes ? `${appt.notes} | ${noteMsg}` : noteMsg;

    saveLocalData(data);
    return appt;
  },

  getPatients(): Patient[] {
    const data = loadLocalData();
    return data.patients;
  },

  deletePatient(id: string, deleteAppointments = false): void {
    const data = loadLocalData();
    const patientToDelete = data.patients.find(p => p.id === id);
    if (!patientToDelete) return;

    data.patients = data.patients.filter(p => p.id !== id);
    if (deleteAppointments) {
      data.appointments = data.appointments.filter(
        a => a.patientPhone !== patientToDelete.phone && a.patientName.toLowerCase() !== patientToDelete.name.toLowerCase()
      );
    }
    saveLocalData(data);
  },

  updatePatient(id: string, update: Partial<Patient>): Patient {
    const data = loadLocalData();
    const idx = data.patients.findIndex(p => p.id === id);
    if (idx !== -1) {
      data.patients[idx] = { ...data.patients[idx], ...update };
      saveLocalData(data);
      return data.patients[idx];
    }
    throw new Error('Paciente não encontrado');
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
      date: new Date().toISOString().split('T')[0],
      verified: true
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

  recordLoyaltyPayment(id: string, payData: { monthYear?: string; amount?: number; paymentMethod?: 'pix' | 'cartao' | 'cartao_recorrente' | 'dinheiro' | 'outro'; receiptNotes?: string }): { member: LoyaltyMember } {
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
      paymentMethod: payData.paymentMethod || 'pix',
      receiptNotes: payData.receiptNotes
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

    member.recurringBilling = true;
    member.recurringMethod = 'cartao_recorrente';
    member.cardLast4 = cardData.cardNumber.slice(-4) || '4242';

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
          paymentMethod: 'cartao_recorrente'
        }],
        overdueMonths: [],
        notes: 'Assinatura realizada via Cartão Recorrente (Online)',
        createdAt: new Date().toISOString()
      };
      data.loyaltyMembers.push(member);
    }

    member.recurringBilling = true;
    member.recurringMethod = 'cartao_recorrente';
    member.cardLast4 = lastFourDigits;

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
  },

  // --- WHATSAPP OPERATIONS ---
  getWhatsAppLogs(): WhatsAppLog[] {
    const data = loadLocalData();
    return data.whatsappLogs || [];
  },

  clearWhatsAppLogs(): void {
    const data = loadLocalData();
    data.whatsappLogs = [];
    saveLocalData(data);
  },

  sendWhatsAppMessage(params: {
    appointmentId?: string;
    type?: 'confirmacao' | 'lembrete_d1' | 'lembrete_d0' | 'manual';
    customMessage?: string;
    phoneOverride?: string;
  }): { success: boolean; status: 'enviado' | 'erro'; details?: string; log: WhatsAppLog; directWebUrl: string; directAppUrl: string; message: string } {
    const data = loadLocalData();
    if (!data.whatsappLogs) data.whatsappLogs = [];

    let patientPhone = params.phoneOverride || '';
    let patientName = 'Paciente';
    let appt: Appointment | undefined;

    if (params.appointmentId) {
      appt = data.appointments.find(a => a.id === params.appointmentId);
      if (appt) {
        patientPhone = appt.patientPhone;
        patientName = appt.patientName;
      }
    }

    if (!patientPhone) {
      throw new Error("Telefone do destinatário não informado");
    }

    let message = params.customMessage;
    if (!message) {
      let template = data.clinic.whatsappTemplateBooking || DEFAULT_WHATSAPP_TEMPLATES.bookingConfirmation;
      if (params.type === 'lembrete_d1') {
        template = data.clinic.whatsappTemplateD1 || DEFAULT_WHATSAPP_TEMPLATES.reminderD1;
      } else if (params.type === 'lembrete_d0') {
        template = data.clinic.whatsappTemplateD0 || DEFAULT_WHATSAPP_TEMPLATES.reminderD0;
      }

      message = interpolateWhatsAppTemplate(template, {
        patientName,
        patientPhone,
        serviceName: appt?.serviceName || 'Atendimento',
        servicePrice: appt?.servicePrice,
        date: appt?.date || new Date().toISOString().split('T')[0],
        time: appt?.time || '09:00',
        clinicName: data.clinic.name,
        managerName: data.clinic.managerName,
        address: data.clinic.address,
        city: data.clinic.city,
        paymentMethod: appt?.paymentMethod
      });
    }

    const provider = data.clinic.whatsappProvider || 'whatsapp_web';
    const log: WhatsAppLog = {
      id: `wlog-${Date.now()}`,
      appointmentId: appt?.id,
      patientName,
      patientPhone,
      type: params.type || 'manual',
      provider,
      status: 'enviado',
      message,
      sentAt: new Date().toISOString(),
      errorDetails: 'Mensagem formatada com sucesso'
    };

    data.whatsappLogs.unshift(log);

    if (appt) {
      appt.whatsappStatus = 'enviado';
      appt.whatsappSentAt = new Date().toISOString();
    }

    saveLocalData(data);

    return {
      success: true,
      status: 'enviado',
      details: 'Pronto para envio',
      log,
      directWebUrl: getWhatsAppWebUrl(patientPhone, message),
      directAppUrl: getWhatsAppDirectUrl(patientPhone, message),
      message
    };
  },

  batchSendWhatsAppReminders(date: string, type: 'lembrete_d0' | 'lembrete_d1' = 'lembrete_d0'): {
    success: boolean;
    total: number;
    sent: number;
    errors: number;
    date: string;
    type: string;
    results: any[];
  } {
    const data = loadLocalData();
    if (!data.whatsappLogs) data.whatsappLogs = [];

    const targetAppts = data.appointments.filter(a => a.date === date && a.status !== 'cancelado');
    const template = type === 'lembrete_d1'
      ? (data.clinic.whatsappTemplateD1 || DEFAULT_WHATSAPP_TEMPLATES.reminderD1)
      : (data.clinic.whatsappTemplateD0 || DEFAULT_WHATSAPP_TEMPLATES.reminderD0);

    const provider = data.clinic.whatsappProvider || 'whatsapp_web';
    const results: any[] = [];

    for (const appt of targetAppts) {
      const msg = interpolateWhatsAppTemplate(template, {
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        serviceName: appt.serviceName,
        servicePrice: appt.servicePrice,
        date: appt.date,
        time: appt.time,
        clinicName: data.clinic.name,
        managerName: data.clinic.managerName,
        address: data.clinic.address,
        city: data.clinic.city,
        paymentMethod: appt.paymentMethod
      });

      appt.whatsappStatus = 'enviado';
      appt.whatsappSentAt = new Date().toISOString();

      const log: WhatsAppLog = {
        id: `wlog-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        appointmentId: appt.id,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        type,
        provider,
        status: 'enviado',
        message: msg,
        sentAt: new Date().toISOString()
      };

      data.whatsappLogs.unshift(log);
      results.push({
        appointmentId: appt.id,
        patientName: appt.patientName,
        phone: appt.patientPhone,
        time: appt.time,
        status: 'enviado',
        directWebUrl: getWhatsAppWebUrl(appt.patientPhone, msg)
      });
    }

    saveLocalData(data);

    return {
      success: true,
      total: targetAppts.length,
      sent: targetAppts.length,
      errors: 0,
      date,
      type,
      results
    };
  },

  batchSendWhatsAppReminders2h(appointmentIds?: string[]): {
    success: boolean;
    total: number;
    sent: number;
    errors: number;
    results: any[];
  } {
    const data = loadLocalData();
    if (!data.whatsappLogs) data.whatsappLogs = [];

    const todayStr = new Date().toISOString().split('T')[0];
    let targetAppts = data.appointments.filter(a => a.date === todayStr && a.status === 'agendado');

    if (Array.isArray(appointmentIds) && appointmentIds.length > 0) {
      targetAppts = targetAppts.filter(a => appointmentIds.includes(a.id));
    }

    const template = data.clinic.whatsappTemplateReminder2h || DEFAULT_WHATSAPP_TEMPLATES.reminder2h;
    const provider = data.clinic.whatsappProvider || 'whatsapp_web';
    const results: any[] = [];

    for (const appt of targetAppts) {
      const msg = interpolateWhatsAppTemplate(template, {
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        serviceName: appt.serviceName,
        servicePrice: appt.servicePrice,
        date: appt.date,
        time: appt.time,
        clinicName: data.clinic.name,
        managerName: data.clinic.managerName,
        address: data.clinic.address,
        city: data.clinic.city,
        paymentMethod: appt.paymentMethod
      });

      const log: WhatsAppLog = {
        id: `wlog-2h-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        appointmentId: appt.id,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        type: 'manual',
        provider,
        status: 'enviado',
        message: msg,
        sentAt: new Date().toISOString()
      };

      data.whatsappLogs.unshift(log);
      results.push({
        appointmentId: appt.id,
        patientName: appt.patientName,
        phone: appt.patientPhone,
        time: appt.time,
        status: 'enviado',
        directWebUrl: getWhatsAppWebUrl(appt.patientPhone, msg)
      });
    }

    saveLocalData(data);

    return {
      success: true,
      total: targetAppts.length,
      sent: targetAppts.length,
      errors: 0,
      results
    };
  },

  sendBirthdayReminders(): {
    success: boolean;
    total: number;
    sent: number;
    errors: number;
    results: any[];
  } {
    const data = loadLocalData();
    if (!data.whatsappLogs) data.whatsappLogs = [];

    const now = new Date();
    const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const birthdayPatients = data.patients.filter(p => {
      if (!p.birthDate) return false;
      return p.birthDate.slice(5) === monthDay;
    });

    const template = data.clinic.whatsappTemplateBirthday || DEFAULT_WHATSAPP_TEMPLATES.birthday;
    const provider = data.clinic.whatsappProvider || 'whatsapp_web';
    const results: any[] = [];

    for (const patient of birthdayPatients) {
      const msg = interpolateWhatsAppTemplate(template, {
        patientName: patient.name,
        patientPhone: patient.phone,
        serviceName: 'Fisioterapia & Pilates',
        date: now.toISOString().split('T')[0],
        time: '09:00',
        clinicName: data.clinic.name,
        managerName: data.clinic.managerName,
        address: data.clinic.address,
        city: data.clinic.city,
      });

      const log: WhatsAppLog = {
        id: `wlog-bday-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        patientName: patient.name,
        patientPhone: patient.phone,
        type: 'manual',
        provider,
        status: 'enviado',
        message: msg,
        sentAt: new Date().toISOString()
      };

      data.whatsappLogs.unshift(log);
      results.push({
        patientId: patient.id,
        patientName: patient.name,
        phone: patient.phone,
        status: 'enviado',
        directWebUrl: getWhatsAppWebUrl(patient.phone, msg)
      });
    }

    saveLocalData(data);

    return {
      success: true,
      total: birthdayPatients.length,
      sent: birthdayPatients.length,
      errors: 0,
      results
    };
  }
};
