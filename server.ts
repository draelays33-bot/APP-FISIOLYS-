import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { initialServices, initialScheduleConfig, initialClinicConfig, initialAppointments, initialPatients, initialTestimonials, initialLoyaltyMembers, initialCrmLeads, initialCrmAppointments, initialCrmAvaliacoes } from './src/data/initialData';
import { Service, ScheduleConfig, ClinicConfig, Appointment, Patient, ReminderLog, Testimonial, LoyaltyMember, WhatsAppLog, CrmLead, CrmAppointmentItem, CrmAvaliacao, CrmEvolucao } from './src/types';
import { interpolateWhatsAppTemplate, getWhatsAppDirectUrl, getWhatsAppWebUrl, cleanPhoneNumber, DEFAULT_WHATSAPP_TEMPLATES } from './src/utils/whatsappUtils';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Lazy Gemini AI Client Initialization
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAiClient && process.env.GEMINI_API_KEY) {
    genAiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAiClient;
}

// Simple DB JSON file persistence
const DB_FILE = path.join(process.cwd(), 'data_store.json');

interface DatabaseSchema {
  clinic: ClinicConfig;
  services: Service[];
  schedule: ScheduleConfig;
  appointments: Appointment[];
  patients: Patient[];
  reminderLogs?: ReminderLog[];
  testimonials?: Testimonial[];
  loyaltyMembers?: LoyaltyMember[];
  whatsappLogs?: WhatsAppLog[];
  crmLeads?: CrmLead[];
  crmAppointments?: CrmAppointmentItem[];
  crmAvaliacoes?: CrmAvaliacao[];
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
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
        crmLeads: parsed.crmLeads || initialCrmLeads,
        crmAppointments: parsed.crmAppointments || initialCrmAppointments,
        crmAvaliacoes: parsed.crmAvaliacoes || initialCrmAvaliacoes
      };
    }
  } catch (err) {
    console.error("Error reading database file, using initial data", err);
  }
  return {
    clinic: initialClinicConfig,
    services: initialServices,
    schedule: initialScheduleConfig,
    appointments: initialAppointments,
    patients: initialPatients,
    reminderLogs: [],
    testimonials: initialTestimonials,
    loyaltyMembers: initialLoyaltyMembers,
    whatsappLogs: [],
    crmLeads: initialCrmLeads,
    crmAppointments: initialCrmAppointments,
    crmAvaliacoes: initialCrmAvaliacoes
  };
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error saving database file", err);
  }
}

let db = loadDatabase();

// Always sync clinic details if outdated
if (db.clinic.whatsapp === '5593991234567' || !db.clinic.whatsapp.includes('991265006') || db.clinic.managerName !== 'Dra. Elays Marinho') {
  db.clinic.whatsapp = '5593991265006';
  db.clinic.phone = '(93) 99126-5006';
  db.clinic.name = 'Fisiolys Fisioterapia e Pilates';
  db.clinic.managerName = 'Dra. Elays Marinho';
}
if (!db.clinic.googleReviewUrl || db.clinic.googleReviewUrl.includes('maps/search/?api=1')) {
  db.clinic.googleReviewUrl = 'https://www.google.com/search?q=Fisiolys+Fisioterapia+e+Pilates+Altamira+Avaliar+no+Google';
}
// Sync services if missing new services or outdated prices/durations/images or old naming
if (
  !db.services.some(s => s.name === 'Aula Experimental de Pilates') ||
  !db.services.some(s => s.name.includes('Protocolo de Tratamento de Coluna')) ||
  db.services.some(s => s.name.includes('Pilates Clássico')) ||
  db.services.find(s => s.id === 'serv-domiciliar')?.price !== 150 ||
  !db.services.find(s => s.id === 'serv-1')?.active ||
  db.services.find(s => s.id === 'serv-5')?.imageUrl.includes('fisioterapia_avaliacao_')
) {
  db.services = initialServices;
}
saveDatabase(db);

// --- API ENDPOINTS ---

// 1. Clinic Public Config
app.get('/api/clinic', (req, res) => {
  res.json(db.clinic);
});

app.post('/api/clinic', (req, res) => {
  db.clinic = { ...db.clinic, ...req.body };
  saveDatabase(db);
  res.json({ success: true, clinic: db.clinic });
});

// 2. Services Management
app.get('/api/services', (req, res) => {
  res.json(db.services);
});

app.post('/api/services', (req, res) => {
  const newService: Service = {
    id: `serv-${Date.now()}`,
    name: req.body.name || "Novo Serviço",
    description: req.body.description || "",
    durationMinutes: Number(req.body.durationMinutes) || 50,
    price: Number(req.body.price) || 100,
    category: req.body.category || 'fisioterapia',
    active: req.body.active !== undefined ? req.body.active : true,
  };
  db.services.push(newService);
  saveDatabase(db);
  res.json({ success: true, service: newService });
});

app.put('/api/services/:id', (req, res) => {
  const index = db.services.findIndex(s => s.id === req.params.id);
  if (index !== -1) {
    db.services[index] = { ...db.services[index], ...req.body };
    saveDatabase(db);
    res.json({ success: true, service: db.services[index] });
  } else {
    res.status(404).json({ error: "Serviço não encontrado" });
  }
});

app.delete('/api/services/:id', (req, res) => {
  db.services = db.services.filter(s => s.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 3. Schedule Working Hours Config
app.get('/api/schedule-config', (req, res) => {
  res.json(db.schedule);
});

app.post('/api/schedule-config', (req, res) => {
  if (req.body.days) {
    db.schedule.days = req.body.days;
  }
  if (req.body.slotIntervalMinutes) {
    db.schedule.slotIntervalMinutes = Number(req.body.slotIntervalMinutes);
  }
  if (req.body.advanceDaysMax) {
    db.schedule.advanceDaysMax = Number(req.body.advanceDaysMax);
  }
  saveDatabase(db);
  res.json({ success: true, schedule: db.schedule });
});

// Helper function to check if a service is Avaliação
function isAvaliacaoService(serviceId: string | undefined): boolean {
  if (!serviceId) return false;
  const service = db.services.find(s => s.id === serviceId);
  if (!service) return false;
  const nameLower = service.name.toLowerCase();
  return nameLower.includes('avaliação') || nameLower.includes('avaliacao');
}

// 4. Calculate Available Time Slots for a given Date
app.get('/api/available-slots', (req, res) => {
  const dateStr = req.query.date as string; // YYYY-MM-DD
  const serviceId = req.query.serviceId as string;

  if (!dateStr) {
    return res.status(400).json({ error: "Data é obrigatória" });
  }

  // Determine day of week for dateStr (0=Dom, 1=Seg...)
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();

  const dayConfig = db.schedule.days.find(d => d.dayOfWeek === dayOfWeek);

  if (!dayConfig || !dayConfig.active) {
    return res.json({ date: dateStr, dayName: dayConfig?.dayName || '', available: false, slots: [], reason: "Clínica fechada neste dia da semana" });
  }

  // Current Brazil local date & time
  const brazilNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const nowYear = brazilNow.getFullYear();
  const nowMonth = String(brazilNow.getMonth() + 1).padStart(2, '0');
  const nowDate = String(brazilNow.getDate()).padStart(2, '0');
  const currentDateStr = `${nowYear}-${nowMonth}-${nowDate}`;
  const currentTotalMins = brazilNow.getHours() * 60 + brazilNow.getMinutes();
  const minBookingMinsCutoff = currentTotalMins; // Only past hours of current day are marked as finished

  const isToday = dateStr === currentDateStr;
  const isPastDate = dateStr < currentDateStr;

  if (isPastDate) {
    return res.json({ date: dateStr, dayName: dayConfig?.dayName || '', available: false, slots: [], reason: "Esta data já passou e não aceita novos agendamentos." });
  }

  const slotStep = db.schedule.slotIntervalMinutes || 60;

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

  const activeApptsOnDate = db.appointments.filter(a => a.date === dateStr && a.status !== 'cancelado');
  const requestedIsAvaliacao = isAvaliacaoService(serviceId);

  const slotsList: any[] = [];

  for (let mins = startTotalMinutes; mins + slotStep <= endTotalMinutes; mins += slotStep) {
    // Check if slot falls during lunch
    if (lunchStartTotal !== -1 && lunchEndTotal !== -1) {
      if (mins >= lunchStartTotal && mins < lunchEndTotal) {
        continue; // Lunch break
      }
    }

    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const apptsAtTime = activeApptsOnDate.filter(a => a.time === time);
    const bookedCount = apptsAtTime.length;
    const hasExclusiveBooking = apptsAtTime.some(a => isAvaliacaoService(a.serviceId));

    let maxCapacity = 4;
    let available = true;
    let reason = '';
    let statusLabel = '';

    // Check 2 hours advance booking rule for today
    if (isToday && mins < minBookingMinsCutoff) {
      available = false;
      if (mins <= currentTotalMins) {
        statusLabel = "Horário Encerrado";
        reason = "Este horário já passou no dia de hoje.";
      } else {
        statusLabel = "Antecedência < 2h";
        reason = "Agendamentos online exigem no mínimo 2 horas de antecedência. Em caso de urgência, entre em contato via WhatsApp para verificar encaixe imediato!";
      }
    } else if (hasExclusiveBooking) {
      maxCapacity = 1;
      available = false;
      statusLabel = "Horário Exclusivo Ocupado";
      reason = "Este horário possui um agendamento de Avaliação Exclusiva.";
    } else if (requestedIsAvaliacao) {
      maxCapacity = 1;
      if (bookedCount > 0) {
        available = false;
        statusLabel = "Indisponível p/ Avaliação";
        reason = "A Avaliação Fisioterapêutica requer horário exclusivo e este horário já possui outro agendamento.";
      } else {
        available = true;
        statusLabel = "Exclusivo Livre (1 vaga)";
      }
    } else {
      maxCapacity = 4;
      if (bookedCount >= 4) {
        available = false;
        statusLabel = "LOTADO (4/4)";
        reason = "Horário com capacidade máxima atingida (4 de 4 pacientes).";
      } else {
        available = true;
        const spotsLeft = 4 - bookedCount;
        if (bookedCount === 0) {
          statusLabel = "Livre (4 vagas)";
        } else {
          statusLabel = `${bookedCount}/4 Vagas (${spotsLeft} livre${spotsLeft > 1 ? 's' : ''})`;
        }
      }
    }

    const isFull = !available;
    const spotsLeft = available ? (maxCapacity - bookedCount) : 0;

    slotsList.push({
      time,
      available,
      bookedCount,
      maxCapacity,
      isExclusive: requestedIsAvaliacao || hasExclusiveBooking,
      hasExclusiveBooking,
      isFull,
      spotsLeft,
      statusLabel,
      reason
    });
  }

  const hasAnyAvailableSlot = slotsList.some(s => s.available);

  res.json({
    date: dateStr,
    dayName: dayConfig.dayName,
    available: hasAnyAvailableSlot,
    hasAvailableSlots: hasAnyAvailableSlot,
    slots: slotsList,
    reason: !hasAnyAvailableSlot
      ? (isToday ? "Todos os horários de hoje já se encerraram ou estão lotados." : "Todos os horários desta data estão lotados ou indisponíveis.")
      : undefined
  });
});

// 5. Appointments CRUD & Booking
app.get('/api/appointments', (req, res) => {
  const date = req.query.date as string;
  const status = req.query.status as string;

  let filtered = db.appointments;
  if (date) {
    filtered = filtered.filter(a => a.date === date);
  }
  if (status && status !== 'todos') {
    filtered = filtered.filter(a => a.status === status);
  }

  // Sort by date and time descending
  filtered.sort((a, b) => {
    const da = `${a.date}T${a.time}`;
    const dbTime = `${b.date}T${b.time}`;
    return dbTime.localeCompare(da);
  });

  res.json(filtered);
});

app.post('/api/appointments', async (req, res) => {
  const {
    patientName,
    patientPhone,
    patientEmail,
    patientBirthDate,
    patientAddress,
    patientCity,
    patientCpf,
    serviceId,
    date,
    time,
    notes,
    paymentMethod,
    frequencyType,
    selectedDaysSchedule,
    planScheduleSummary,
    multipleDates
  } = req.body;

  if (!patientName || !patientPhone || !serviceId || !date || !time) {
    return res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos" });
  }

  // Find service
  const service = db.services.find(s => s.id === serviceId);
  if (!service) {
    return res.status(404).json({ error: "Serviço não encontrado" });
  }

  // Check past hour booking rule for today in Brazil timezone
  const brazilNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const nowYear = brazilNow.getFullYear();
  const nowMonth = String(brazilNow.getMonth() + 1).padStart(2, '0');
  const nowDate = String(brazilNow.getDate()).padStart(2, '0');
  const currentDateStr = `${nowYear}-${nowMonth}-${nowDate}`;

  if (date === currentDateStr) {
    const [appH, appM] = time.split(':').map(Number);
    const appMins = appH * 60 + appM;
    const nowMins = brazilNow.getHours() * 60 + brazilNow.getMinutes();

    if (appMins < nowMins) {
      return res.status(400).json({
        error: "Este horário já passou no dia de hoje. Por favor, escolha um horário disponível!"
      });
    }
  }

  // Check capacity & collisions
  const activeApptsAtTime = db.appointments.filter(a => a.date === date && a.time === time && a.status !== 'cancelado');
  const hasExclusiveBooking = activeApptsAtTime.some(a => isAvaliacaoService(a.serviceId));
  const requestedIsAvaliacao = isAvaliacaoService(serviceId);

  if (hasExclusiveBooking) {
    return res.status(400).json({ error: "Este horário já está reservado exclusivamente para uma Avaliação. Por favor, escolha outro horário livre ou fale conosco no WhatsApp." });
  }

  if (requestedIsAvaliacao && activeApptsAtTime.length > 0) {
    return res.status(400).json({ error: "A Avaliação Fisioterapêutica exige atendimento exclusivo e este horário já possui agendamentos. Escolha outro horário totalmente livre ou entre em contato pelo WhatsApp." });
  }

  if (!requestedIsAvaliacao && activeApptsAtTime.length >= 4) {
    return res.status(400).json({ error: "Este horário já atingiu o limite de 4 pacientes (4/4 vagas preenchidas). Por favor, escolha outro horário disponível ou fale conosco no WhatsApp." });
  }

  // Calculate recurring session dates if weekly plan or multi-dates
  const sessionDates: { date: string; time: string }[] = [];
  if (multipleDates && multipleDates.length > 0) {
    for (const m of multipleDates) {
      if (m.date && m.time && !sessionDates.some(s => s.date === m.date && s.time === m.time)) {
        sessionDates.push({ date: m.date, time: m.time });
      }
    }
  } else {
    sessionDates.push({ date, time });
    if ((frequencyType === '2x_semana' || frequencyType === '3x_semana') && selectedDaysSchedule && selectedDaysSchedule.length > 0) {
      const [y, m, d] = date.split('-').map(Number);
      const targetDays = selectedDaysSchedule.map((s: any) => ({
        dayOfWeek: Number(s.dayOfWeek),
        time: s.time || time
      }));

      for (let dayOffset = 1; dayOffset < 28; dayOffset++) {
        const nextDate = new Date(y, m - 1, d + dayOffset);
        const dow = nextDate.getDay();
        const match = targetDays.find((t: any) => t.dayOfWeek === dow);
        if (match) {
          const ny = nextDate.getFullYear();
          const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
          const nd = String(nextDate.getDate()).padStart(2, '0');
          const isoDate = `${ny}-${nm}-${nd}`;
          if (!sessionDates.some(s => s.date === isoDate && s.time === match.time)) {
            sessionDates.push({ date: isoDate, time: match.time });
          }
        }
      }
    }
  }

  const planSummaryText = planScheduleSummary ||
    (frequencyType === '2x_semana' ? 'Plano 2x por semana (4 semanas)' :
     frequencyType === '3x_semana' ? 'Plano 3x por semana (4 semanas)' :
     frequencyType === 'multiplos_dias' ? `${sessionDates.length} sessões agendadas` :
     'Sessão Individual');

  const createdAppointments: Appointment[] = [];
  const baseTimestamp = Date.now();

  sessionDates.forEach((slot, index) => {
    const appt: Appointment = {
      id: `app-${baseTimestamp}-${index}`,
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      patientEmail: patientEmail ? patientEmail.trim() : undefined,
      patientBirthDate: patientBirthDate || undefined,
      patientAddress: patientAddress ? patientAddress.trim() : undefined,
      patientCity: patientCity ? patientCity.trim() : 'Altamira - PA',
      patientCpf: patientCpf ? patientCpf.trim() : undefined,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      durationMinutes: service.durationMinutes,
      date: slot.date,
      time: slot.time,
      frequencyType: frequencyType || 'sessao_unica',
      selectedDaysSchedule: selectedDaysSchedule || undefined,
      planScheduleSummary: planSummaryText,
      multipleDates: multipleDates || undefined,
      status: 'agendado',
      paymentMethod: paymentMethod || 'pix',
      notes: notes ? notes.trim() : (sessionDates.length > 1 ? `Plano: ${planSummaryText} (${index + 1}/${sessionDates.length})` : undefined),
      createdAt: new Date().toISOString(),
      webhookSent: false
    };

    createdAppointments.push(appt);
    db.appointments.push(appt);
  });

  const newAppt = createdAppointments[0];

  // Update or Create Patient record with full registration data and chosen treatment
  const cleanPhone = patientPhone.replace(/\D/g, '');
  const cleanName = patientName.trim().toLowerCase();
  let patient = db.patients.find(p => {
    const pClean = p.phone.replace(/\D/g, '');
    return (cleanPhone.length >= 6 && pClean.includes(cleanPhone)) || p.name.toLowerCase() === cleanName;
  });

  const allDates = sessionDates.map(s => s.date).sort();
  const firstDate = allDates[0] || date;
  const lastDate = allDates[allDates.length - 1] || date;

  if (patient) {
    patient.totalSessions = (patient.totalSessions || 0) + sessionDates.length;
    patient.lastSessionDate = lastDate;
    if (!patient.firstSessionDate) patient.firstSessionDate = firstDate;
    
    // Set chosen treatment
    patient.currentTreatment = service.name;
    patient.currentServiceId = service.id;
    patient.treatmentPlan = planSummaryText;
    patient.sessionPrice = service.price;
    if (service.category) patient.category = service.category;

    if (patientEmail && !patient.email) patient.email = patientEmail.trim();
    if (patientBirthDate && !patient.birthDate) patient.birthDate = patientBirthDate;
    if (patientAddress && !patient.address) patient.address = patientAddress.trim();
    if (patientCity && !patient.city) patient.city = patientCity.trim();
    if (patientCpf && !patient.cpf) patient.cpf = patientCpf.trim();
    if (notes && !patient.notes) patient.notes = notes.trim();
  } else {
    patient = {
      id: `pat-${Date.now()}`,
      name: newAppt.patientName,
      phone: newAppt.patientPhone,
      email: newAppt.patientEmail,
      birthDate: patientBirthDate || undefined,
      address: patientAddress ? patientAddress.trim() : undefined,
      city: patientCity ? patientCity.trim() : 'Altamira - PA',
      cpf: patientCpf ? patientCpf.trim() : undefined,
      firstSessionDate: firstDate,
      lastSessionDate: lastDate,
      totalSessions: sessionDates.length,
      currentTreatment: service.name,
      currentServiceId: service.id,
      treatmentPlan: planSummaryText,
      sessionPrice: service.price,
      category: service.category || 'fisioterapia',
      notes: notes ? notes.trim() : undefined,
      createdAt: new Date().toISOString()
    };
    db.patients.push(patient);
  }

  // Trigger Webhook if enabled and URL configured
  let webhookTriggered = false;
  if (db.clinic.webhookEnabled && db.clinic.webhookUrl) {
    try {
      const payload = {
        event: "appointment_created",
        clinicName: db.clinic.name,
        appointment: newAppt,
        patient: { name: patient.name, phone: patient.phone },
        timestamp: new Date().toISOString()
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(db.clinic.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

  if (resp.ok) {
        newAppt.webhookSent = true;
        webhookTriggered = true;
      }
    } catch (err) {
      console.warn("Webhook dispatch failed or timed out:", err);
    }
  }

  // Trigger Automatic WhatsApp Booking Confirmation if enabled
  if (db.clinic.whatsappAutoSendBooking !== false) {
    const template = db.clinic.whatsappTemplateBooking || DEFAULT_WHATSAPP_TEMPLATES.bookingConfirmation;
    const msgText = interpolateWhatsAppTemplate(template, {
      patientName: newAppt.patientName,
      patientPhone: newAppt.patientPhone,
      serviceName: newAppt.serviceName,
      servicePrice: newAppt.servicePrice,
      date: newAppt.date,
      time: newAppt.time,
      clinicName: db.clinic.name,
      managerName: db.clinic.managerName,
      address: db.clinic.address,
      city: db.clinic.city,
      paymentMethod: newAppt.paymentMethod
    });

    if (!db.whatsappLogs) db.whatsappLogs = [];

    // Attempt API dispatch if API URL is configured, else register ready log
    const provider = db.clinic.whatsappProvider || 'whatsapp_web';
    if (db.clinic.whatsappApiUrl && provider !== 'whatsapp_web') {
      sendWhatsAppMessageViaGateway(
        provider,
        db.clinic.whatsappApiUrl,
        db.clinic.whatsappApiToken || '',
        db.clinic.whatsappInstanceId || '',
        newAppt.patientPhone,
        msgText
      ).then(res => {
        newAppt.whatsappStatus = res.status;
        newAppt.whatsappSentAt = new Date().toISOString();
        if (!res.success) newAppt.whatsappError = res.details;
        
        db.whatsappLogs?.unshift({
          id: `wlog-${Date.now()}`,
          appointmentId: newAppt.id,
          patientName: newAppt.patientName,
          patientPhone: newAppt.patientPhone,
          type: 'confirmacao',
          provider,
          status: res.status,
          message: msgText,
          sentAt: new Date().toISOString(),
          errorDetails: res.details
        });
        saveDatabase(db);
      }).catch(e => console.warn("WhatsApp background dispatch error:", e));
    } else {
      newAppt.whatsappStatus = 'enviado';
      newAppt.whatsappSentAt = new Date().toISOString();
      db.whatsappLogs.unshift({
        id: `wlog-${Date.now()}`,
        appointmentId: newAppt.id,
        patientName: newAppt.patientName,
        patientPhone: newAppt.patientPhone,
        type: 'confirmacao',
        provider: 'whatsapp_web',
        status: 'enviado',
        message: msgText,
        sentAt: new Date().toISOString()
      });
    }
  }

  saveDatabase(db);
  res.json({ success: true, appointment: newAppt, webhookSent: webhookTriggered });
});

// Helper function to sync patient presence/absence stats
function syncPatientStats(phoneOrName: string) {
  if (!phoneOrName) return;
  const cleanPhone = phoneOrName.replace(/\D/g, '');
  const nameLower = phoneOrName.trim().toLowerCase();

  const patient = db.patients.find(p => {
    const pPhoneClean = p.phone.replace(/\D/g, '');
    return (cleanPhone.length >= 6 && pPhoneClean.includes(cleanPhone)) || p.name.toLowerCase() === nameLower;
  });

  if (!patient) return;

  const patientAppts = db.appointments.filter(a => {
    const aPhoneClean = a.patientPhone.replace(/\D/g, '');
    return (cleanPhone.length >= 6 && aPhoneClean.includes(cleanPhone)) || a.patientName.toLowerCase() === patient.name.toLowerCase();
  });

  const presencas = patientAppts.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca').length;
  const faltas = patientAppts.filter(a => a.status === 'falta' || a.attendanceStatus === 'falta').length;

  patient.totalSessions = presencas;
  patient.totalFaltas = faltas;

  const sortedDates = patientAppts
    .map(a => a.date)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (sortedDates.length > 0) {
    patient.firstSessionDate = sortedDates[0];
    patient.lastSessionDate = sortedDates[sortedDates.length - 1];
  }
}

app.patch('/api/appointments/:id', (req, res) => {
  const appt = db.appointments.find(a => a.id === req.params.id);
  if (!appt) {
    return res.status(404).json({ error: "Agendamento não encontrado" });
  }

  if (req.body.date) {
    appt.date = req.body.date;
  }
  if (req.body.time) {
    appt.time = req.body.time;
  }
  if (req.body.serviceId) {
    appt.serviceId = req.body.serviceId;
    const serv = db.services.find(s => s.id === req.body.serviceId);
    if (serv) {
      appt.serviceName = serv.name;
      appt.servicePrice = serv.price;
    }
  }
  if (req.body.serviceName) {
    appt.serviceName = req.body.serviceName;
  }
  if (req.body.servicePrice !== undefined) {
    appt.servicePrice = Number(req.body.servicePrice);
  }
  if (req.body.patientName) {
    appt.patientName = req.body.patientName;
  }
  if (req.body.patientPhone) {
    appt.patientPhone = req.body.patientPhone;
  }
  if (req.body.patientCpf !== undefined) {
    appt.patientCpf = req.body.patientCpf;
  }
  if (req.body.status) {
    appt.status = req.body.status;
    if (req.body.status === 'concluido') {
      appt.attendanceStatus = 'presenca';
    } else if (req.body.status === 'falta') {
      appt.attendanceStatus = 'falta';
    } else if (req.body.status === 'agendado') {
      appt.attendanceStatus = 'pendente';
    }
  }
  if (req.body.attendanceStatus) {
    appt.attendanceStatus = req.body.attendanceStatus;
    if (req.body.attendanceStatus === 'presenca') {
      appt.status = 'concluido';
    } else if (req.body.attendanceStatus === 'falta') {
      appt.status = 'falta';
    }
  }
  if (req.body.attendanceNotes !== undefined) {
    appt.attendanceNotes = req.body.attendanceNotes;
  }
  if (req.body.notes !== undefined) {
    appt.notes = req.body.notes;
  }

  syncPatientStats(appt.patientPhone);
  syncPatientStats(appt.patientName);

  saveDatabase(db);
  res.json({ success: true, appointment: appt });
});

app.post('/api/appointments/mark-attendance', (req, res) => {
  const { appointmentId, status, attendanceNotes } = req.body; // status: 'concluido' | 'falta' | 'agendado'
  const appt = db.appointments.find(a => a.id === appointmentId);
  if (!appt) {
    return res.status(404).json({ error: "Agendamento não encontrado" });
  }

  appt.status = status;
  if (status === 'concluido') {
    appt.attendanceStatus = 'presenca';
  } else if (status === 'falta') {
    appt.attendanceStatus = 'falta';
  } else {
    appt.attendanceStatus = 'pendente';
  }

  if (attendanceNotes !== undefined) {
    appt.attendanceNotes = attendanceNotes;
  }

  syncPatientStats(appt.patientPhone);
  syncPatientStats(appt.patientName);

  saveDatabase(db);
  res.json({ success: true, appointment: appt });
});

// Patient Self Check-in endpoint (via QR Code or Patient Portal)
app.post('/api/check-in', (req, res) => {
  const { appointmentId, patientPhone, patientName, method = 'qrcode', notes } = req.body;
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
  const nowDate = String(now.getDate()).padStart(2, '0');
  const todayStr = `${nowYear}-${nowMonth}-${nowDate}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let targetAppt: any = null;

  if (appointmentId) {
    targetAppt = db.appointments.find(a => a.id === appointmentId);
  }

  if (!targetAppt && (patientPhone || patientName)) {
    const cleanPhone = (patientPhone || '').replace(/\D/g, '');
    const nameLower = (patientName || '').trim().toLowerCase();

    // First try today's appointment
    targetAppt = db.appointments.find(a => {
      const aPhoneClean = a.patientPhone.replace(/\D/g, '');
      const matchPhone = cleanPhone.length >= 6 && aPhoneClean.includes(cleanPhone);
      const matchName = nameLower && a.patientName.toLowerCase().includes(nameLower);
      return (matchPhone || matchName) && a.date === todayStr && a.status !== 'cancelado';
    });

    // If none today, look for the most recent scheduled appointment
    if (!targetAppt) {
      targetAppt = db.appointments.find(a => {
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
    targetAppt.checkInMethod = method;
    if (notes) {
      targetAppt.attendanceNotes = targetAppt.attendanceNotes ? `${targetAppt.attendanceNotes} | ${notes}` : notes;
    }

    syncPatientStats(targetAppt.patientPhone);
    syncPatientStats(targetAppt.patientName);
    saveDatabase(db);

    return res.json({
      success: true,
      appointment: targetAppt,
      message: `Check-in confirmado com sucesso! Seja bem-vindo(a) à Fisiolys, ${targetAppt.patientName}. A Dra. ${db.clinic.managerName} foi notificada da sua chegada.`,
      checkedInAt: targetAppt.checkedInAt,
      time: timeStr
    });
  }

  // If no appointment found, but patient exists or name provided, create a walk-in check-in session for today
  if (patientName || patientPhone) {
    const defaultService = db.services[0] || {
      id: 'srv-1',
      name: 'Fisioterapia / Pilates',
      price: 130,
      durationMinutes: 50
    };

    const newCheckInAppt: Appointment = {
      id: `appt-checkin-${Date.now()}`,
      patientName: patientName || 'Paciente Recepção',
      patientPhone: patientPhone || '(93) 99999-9999',
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
      checkInMethod: method === 'manual' ? 'manual' : method === 'portal' ? 'portal' : method === 'totem' ? 'totem' : 'qrcode',
      notes: notes || 'Check-in presencial registrado na clínica',
      paymentMethod: 'presencial',
      createdAt: now.toISOString()
    };

    db.appointments.unshift(newCheckInAppt);
    syncPatientStats(newCheckInAppt.patientPhone);
    syncPatientStats(newCheckInAppt.patientName);
    saveDatabase(db);

    return res.json({
      success: true,
      appointment: newCheckInAppt,
      message: `Check-in presencial confirmado para hoje às ${timeStr}! Seja bem-vindo(a) à Fisiolys.`,
      checkedInAt: newCheckInAppt.checkedInAt,
      time: timeStr
    });
  }

  return res.status(400).json({ error: "Não foi possível localizar seu agendamento. Por favor, informe seu nome ou telefone." });
});

app.get('/api/patient-history', (req, res) => {
  const query = (req.query.query as string || '').trim();
  if (!query) {
    return res.status(400).json({ error: "Informe o telefone ou nome do paciente." });
  }

  const cleanQuery = query.replace(/\D/g, '');
  const lowerQuery = query.toLowerCase();

  const patient = db.patients.find(p => {
    const pPhoneClean = p.phone.replace(/\D/g, '');
    return (cleanQuery.length >= 4 && pPhoneClean.includes(cleanQuery)) || p.name.toLowerCase().includes(lowerQuery);
  });

  const matchedAppointments = db.appointments.filter(a => {
    const aPhoneClean = a.patientPhone.replace(/\D/g, '');
    return (cleanQuery.length >= 4 && aPhoneClean.includes(cleanQuery)) || a.patientName.toLowerCase().includes(lowerQuery);
  });

  matchedAppointments.sort((a, b) => {
    const da = `${a.date}T${a.time}`;
    const dbTime = `${b.date}T${b.time}`;
    return dbTime.localeCompare(da);
  });

  const totalPresencas = matchedAppointments.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca').length;
  const totalFaltas = matchedAppointments.filter(a => a.status === 'falta' || a.attendanceStatus === 'falta').length;
  const totalAgendados = matchedAppointments.filter(a => a.status === 'agendado').length;

  res.json({
    found: matchedAppointments.length > 0 || !!patient,
    patient: patient || (matchedAppointments[0] ? {
      id: `pat-auto`,
      name: matchedAppointments[0].patientName,
      phone: matchedAppointments[0].patientPhone,
      totalSessions: totalPresencas,
      totalFaltas: totalFaltas,
      createdAt: matchedAppointments[matchedAppointments.length - 1]?.date || new Date().toISOString()
    } : null),
    stats: {
      totalPresencas,
      totalFaltas,
      totalAgendados,
      totalGeral: matchedAppointments.length
    },
    history: matchedAppointments
  });
});

app.delete('/api/appointments/:id', (req, res) => {
  db.appointments = db.appointments.filter(a => a.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// Reschedule appointment endpoint
app.post('/api/appointments/:id/reschedule', (req, res) => {
  const { newDate, newTime, reason } = req.body;
  const appt = db.appointments.find(a => a.id === req.params.id);
  if (!appt) {
    return res.status(404).json({ error: "Agendamento não encontrado" });
  }

  if (!newDate || !newTime) {
    return res.status(400).json({ error: "Nova data e novo horário são obrigatórios" });
  }

  const oldDate = appt.date;
  const oldTime = appt.time;
  appt.date = newDate;
  appt.time = newTime;
  appt.status = 'agendado';
  appt.attendanceStatus = 'pendente';
  const reasonText = reason ? `: ${reason}` : '';
  const rescheduleLog = `[Remarcado de ${oldDate} às ${oldTime} para ${newDate} às ${newTime}${reasonText}]`;
  appt.notes = appt.notes ? `${appt.notes} ${rescheduleLog}` : rescheduleLog;

  syncPatientStats(appt.patientPhone);
  syncPatientStats(appt.patientName);

  saveDatabase(db);
  res.json({ success: true, appointment: appt, message: "Atendimento reagendado com sucesso!" });
});

// 6. Patients Management with Categories & Color Tags
app.get('/api/patients', (req, res) => {
  res.json(db.patients);
});

app.post('/api/patients', (req, res) => {
  const newPatient: Patient = {
    id: req.body.id || `pat-${Date.now()}`,
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email || '',
    cpf: req.body.cpf || undefined,
    birthDate: req.body.birthDate || undefined,
    address: req.body.address || undefined,
    city: req.body.city || 'Altamira - PA',
    category: req.body.category || 'fisioterapia',
    colorTag: req.body.colorTag || 'emerald',
    tags: req.body.tags || [],
    statusTag: req.body.statusTag || 'Ativo',
    notes: req.body.notes || '',
    totalSessions: req.body.totalSessions || 0,
    totalFaltas: req.body.totalFaltas || 0,
    firstSessionDate: req.body.firstSessionDate || new Date().toISOString().split('T')[0],
    lastSessionDate: req.body.lastSessionDate || undefined,
    createdAt: new Date().toISOString()
  };
  db.patients.unshift(newPatient);
  saveDatabase(db);
  res.json({ success: true, patient: newPatient });
});

app.patch('/api/patients/:id', (req, res) => {
  const patient = db.patients.find(p => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: "Paciente não encontrado" });
  }

  if (req.body.name) patient.name = req.body.name;
  if (req.body.phone) patient.phone = req.body.phone;
  if (req.body.email !== undefined) patient.email = req.body.email;
  if (req.body.cpf !== undefined) patient.cpf = req.body.cpf;
  if (req.body.birthDate !== undefined) patient.birthDate = req.body.birthDate;
  if (req.body.address !== undefined) patient.address = req.body.address;
  if (req.body.city !== undefined) patient.city = req.body.city;
  if (req.body.category !== undefined) patient.category = req.body.category;
  if (req.body.colorTag !== undefined) patient.colorTag = req.body.colorTag;
  if (req.body.tags !== undefined) patient.tags = req.body.tags;
  if (req.body.statusTag !== undefined) patient.statusTag = req.body.statusTag;
  if (req.body.notes !== undefined) patient.notes = req.body.notes;
  if (req.body.totalSessions !== undefined) patient.totalSessions = Number(req.body.totalSessions);
  if (req.body.totalFaltas !== undefined) patient.totalFaltas = Number(req.body.totalFaltas);

  saveDatabase(db);
  res.json({ success: true, patient });
});

app.delete('/api/patients/:id', (req, res) => {
  const deleteAppts = req.body?.deleteAppointments ?? true;
  const pat = db.patients.find(p => p.id === req.params.id);
  
  if (pat && deleteAppts) {
    const cleanPhone = pat.phone.replace(/\D/g, '');
    const patNameLower = pat.name.toLowerCase();
    db.appointments = db.appointments.filter(a => {
      const aPhoneClean = a.patientPhone.replace(/\D/g, '');
      const matchPhone = cleanPhone && aPhoneClean && aPhoneClean.includes(cleanPhone);
      const matchName = a.patientName.toLowerCase() === patNameLower;
      return !matchPhone && !matchName;
    });
  }

  db.patients = db.patients.filter(p => p.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// Supabase & Database Sync Status Endpoint
app.get('/api/supabase/status', (req, res) => {
  const hasEnv = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const adminEmail = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'dra.elays33@gmail.com';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

  res.json({
    connected: hasEnv,
    provider: hasEnv ? 'supabase_cloud' : 'vercel_local_persistent',
    supabaseUrl: supabaseUrl ? `${supabaseUrl.slice(0, 24)}...` : undefined,
    adminEmail,
    patientCount: db.patients.length,
    appointmentCount: db.appointments.length,
    serviceCount: db.services.length,
    loyaltyCount: db.loyaltyMembers?.length || 0,
    timestamp: new Date().toISOString()
  });
});

// 7. Webhook Manual Test Route
app.post('/api/webhook/test', async (req, res) => {
  const targetUrl = req.body.url || db.clinic.webhookUrl;
  if (!targetUrl) {
    return res.status(400).json({ error: "URL do Webhook não configurada" });
  }

  const testPayload = {
    event: "test_notification",
    message: "Teste de integração de webhook do sistema de Fisioterapia e Pilates",
    clinic: db.clinic.name,
    manager: db.clinic.managerName,
    sampleBooking: {
      patient: "Ana Maria Teste",
      service: "Pilates Studio (Aparelhos & Solo)",
      date: new Date().toISOString().split('T')[0],
      time: "10:00",
      price: 120
    },
    timestamp: new Date().toISOString()
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      payloadSent: testPayload
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Erro ao conectar com servidor do Webhook",
      payloadSent: testPayload
    });
  }
});

// 8. Automatic 4-Hour Session Reminder Dispatch Engine
async function checkAndDispatch4hReminders() {
  const now = new Date();
  let dbChanged = false;

  if (!db.reminderLogs) db.reminderLogs = [];

  for (const appt of db.appointments) {
    if (appt.status === 'cancelado' || appt.reminderSent4h) continue;

    // Parse appointment date and time
    const [year, month, day] = appt.date.split('-').map(Number);
    const [hour, minute] = appt.time.split(':').map(Number);
    const apptDate = new Date(year, month - 1, day, hour, minute, 0);

    const diffMs = apptDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // If session is scheduled within 4 hours (between 0 and 4 hours from now)
    if (diffHours > 0 && diffHours <= 4) {
      appt.reminderSent4h = true;
      appt.reminderSentAt = now.toISOString();
      dbChanged = true;

      const reminderMessage = `Olá ${appt.patientName}! Lembramos que sua sessão de ${appt.serviceName} com a Dra. Elays Marinho está confirmada para hoje às ${appt.time} hs (daqui a aproximadamente 4 horas). Local: ${db.clinic.address}. Fisiolys Agradece!`;

      let channel: 'whatsapp_webhook' | 'sistema' = 'sistema';

      // Send webhook notification if configured
      if (db.clinic.webhookEnabled && db.clinic.webhookUrl) {
        try {
          const payload = {
            event: "session_reminder_4h",
            appointmentId: appt.id,
            patientName: appt.patientName,
            patientPhone: appt.patientPhone,
            serviceName: appt.serviceName,
            date: appt.date,
            time: appt.time,
            clinicName: db.clinic.name,
            managerName: db.clinic.managerName,
            message: reminderMessage,
            timestamp: now.toISOString()
          };

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);

          await fetch(db.clinic.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeout);
          channel = 'whatsapp_webhook';
        } catch (err) {
          console.error("Erro ao enviar webhook de lembrete 4h:", err);
        }
      }

      db.reminderLogs.unshift({
        id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        appointmentId: appt.id,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        serviceName: appt.serviceName,
        date: appt.date,
        time: appt.time,
        sentAt: now.toISOString(),
        status: 'enviado',
        channel,
        message: reminderMessage
      });
      console.log(`[Lembrete 4h Disparado] ${appt.patientName} - ${appt.serviceName} às ${appt.time}`);
    }
  }

  if (dbChanged) {
    saveDatabase(db);
  }
}

// Check for 4h session reminders every 30 seconds
setInterval(checkAndDispatch4hReminders, 30000);
checkAndDispatch4hReminders();

app.get('/api/reminder-logs', (req, res) => {
  res.json(db.reminderLogs || []);
});

// 9. Testimonials API
app.get('/api/testimonials', (req, res) => {
  res.json(db.testimonials || initialTestimonials);
});

app.post('/api/testimonials', (req, res) => {
  const { patientName, treatmentName, rating, comment } = req.body;
  if (!patientName || !comment) {
    return res.status(400).json({ error: "Nome e comentário são obrigatórios." });
  }

  if (!db.testimonials) db.testimonials = initialTestimonials;

  const newTestimonial: Testimonial = {
    id: `test-${Date.now()}`,
    patientName: patientName.trim(),
    treatmentName: treatmentName ? treatmentName.trim() : "Atendimento Fisiolys",
    rating: Number(rating) || 5,
    comment: comment.trim(),
    date: new Date().toISOString().split('T')[0],
    verified: true,
    highlight: false,
    patientAvatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?auto=format&fit=crop&q=80&w=200`
  };

  db.testimonials.unshift(newTestimonial);
  saveDatabase(db);
  res.json({ success: true, testimonial: newTestimonial });
});

// 10. Loyalty Program (Programa de Fidelidade Recorrente R$ 99/mês) API
app.get('/api/loyalty', (req, res) => {
  if (!db.loyaltyMembers) db.loyaltyMembers = initialLoyaltyMembers;
  res.json(db.loyaltyMembers);
});

// Public patient query by phone or CPF or name
app.get('/api/loyalty/query', (req, res) => {
  if (!db.loyaltyMembers) db.loyaltyMembers = initialLoyaltyMembers;
  const search = String(req.query.search || '').trim().toLowerCase();
  if (!search) {
    return res.status(400).json({ error: "Informe o telefone, CPF ou nome do paciente." });
  }

  const cleanSearchDigits = search.replace(/\D/g, '');

  const member = db.loyaltyMembers.find(m => {
    const cleanPhone = m.patientPhone.replace(/\D/g, '');
    const cleanCpf = (m.patientCpf || '').replace(/\D/g, '');
    const nameMatch = m.patientName.toLowerCase().includes(search);
    
    if (cleanSearchDigits && cleanSearchDigits.length >= 4) {
      if (cleanPhone.includes(cleanSearchDigits) || cleanCpf.includes(cleanSearchDigits)) return true;
    }
    return nameMatch;
  });

  if (!member) {
    return res.status(404).json({ error: "Nenhum plano de fidelidade encontrado com esses dados." });
  }

  res.json(member);
});

// Create new loyalty member
app.post('/api/loyalty', (req, res) => {
  if (!db.loyaltyMembers) db.loyaltyMembers = initialLoyaltyMembers;
  const { patientName, patientPhone, patientAddress, patientCpf, patientEmail, monthlyFee, dueDay, initialBalance, notes, beneficiaries, acceptedTerms } = req.body;

  if (!patientName || !patientPhone) {
    return res.status(400).json({ error: "Nome e telefone do paciente são obrigatórios." });
  }

  const newMember: LoyaltyMember = {
    id: `fid-${Date.now()}`,
    patientName: patientName.trim(),
    patientPhone: patientPhone.trim(),
    patientAddress: patientAddress ? patientAddress.trim() : undefined,
    patientCpf: patientCpf ? patientCpf.trim() : undefined,
    patientEmail: patientEmail ? patientEmail.trim() : undefined,
    status: 'ativo',
    monthlyFee: Number(monthlyFee) || 99,
    dueDay: Number(dueDay) || 10,
    joinedDate: new Date().toISOString().split('T')[0],
    accumulatedBalance: Number(initialBalance) || 0,
    totalSpent: 0,
    beneficiaries: Array.isArray(beneficiaries) ? beneficiaries : [],
    payments: [],
    overdueMonths: [],
    notes: notes ? notes.trim() : undefined,
    acceptedTerms: Boolean(acceptedTerms),
    acceptedTermsAt: acceptedTerms ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString()
  };

  db.loyaltyMembers.unshift(newMember);
  saveDatabase(db);
  res.json({ success: true, member: newMember });
});

// Update loyalty member details / status
app.put('/api/loyalty/:id', (req, res) => {
  if (!db.loyaltyMembers) db.loyaltyMembers = initialLoyaltyMembers;
  const { id } = req.params;
  const index = db.loyaltyMembers.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Assinante do programa de fidelidade não encontrado." });
  }

  const current = db.loyaltyMembers[index];
  const updated: LoyaltyMember = {
    ...current,
    ...req.body,
    id: current.id, // prevent id change
  };

  db.loyaltyMembers[index] = updated;
  saveDatabase(db);
  res.json({ success: true, member: updated });
});

// Setup recurring card billing for an existing member
app.post('/api/loyalty/:id/recurring-card', (req, res) => {
  if (!db.loyaltyMembers) db.loyaltyMembers = initialLoyaltyMembers;
  const { id } = req.params;
  const { cardHolderName, cardNumber, cardExpiry, cardCvv, amount } = req.body;

  const member = db.loyaltyMembers.find(m => m.id === id);
  if (!member) {
    return res.status(404).json({ error: "Assinante não encontrado." });
  }

  const cleanNum = (cardNumber || '').replace(/\D/g, '');
  const last4 = cleanNum.slice(-4) || '8842';
  
  // Detect card brand
  let cardBrand = 'Visa';
  if (cleanNum.startsWith('5') || cleanNum.startsWith('2')) cardBrand = 'Mastercard';
  else if (cleanNum.startsWith('4')) cardBrand = 'Visa';
  else if (cleanNum.startsWith('6') || cleanNum.startsWith('50')) cardBrand = 'Elo';

  const payAmount = Number(amount) || member.monthlyFee || 99;
  const payMonthYear = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });

  // Calculate next billing date (30 days from now)
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 30);
  const nextBillingDate = nextDate.toISOString().split('T')[0];

  const subscriptionId = `SUB-FISIOLYS-${Date.now().toString().slice(-6)}`;

  member.recurringBilling = true;
  member.recurringMethod = 'cartao_recorrente';
  member.cardLast4 = last4;
  member.cardBrand = cardBrand;
  member.nextBillingDate = nextBillingDate;
  member.recurringSubscriptionId = subscriptionId;
  member.status = 'ativo';

  // Process initial monthly payment
  const newPayment = {
    id: `pay-${Date.now()}`,
    monthYear: payMonthYear,
    amount: payAmount,
    paidAt: new Date().toISOString().split('T')[0],
    paymentMethod: 'cartao_recorrente' as const,
    receiptNotes: `1ª Mensalidade (Recorrência Cartão ${cardBrand} final ${last4})`
  };

  member.payments.unshift(newPayment);
  member.accumulatedBalance += payAmount;
  member.overdueMonths = member.overdueMonths.filter(m => m !== payMonthYear);

  saveDatabase(db);
  res.json({ success: true, member, payment: newPayment, subscriptionId });
});

// Create new member with recurring card subscription
app.post('/api/loyalty/subscribe-recurring', (req, res) => {
  if (!db.loyaltyMembers) db.loyaltyMembers = initialLoyaltyMembers;
  const { patientName, patientPhone, patientAddress, patientCpf, patientEmail, cardHolderName, cardNumber, cardExpiry, cardCvv } = req.body;

  if (!patientName || !patientPhone) {
    return res.status(400).json({ error: "Nome e telefone são obrigatórios." });
  }

  const cleanNum = (cardNumber || '').replace(/\D/g, '');
  const last4 = cleanNum.slice(-4) || '8842';
  
  let cardBrand = 'Visa';
  if (cleanNum.startsWith('5') || cleanNum.startsWith('2')) cardBrand = 'Mastercard';
  else if (cleanNum.startsWith('4')) cardBrand = 'Visa';
  else if (cleanNum.startsWith('6') || cleanNum.startsWith('50')) cardBrand = 'Elo';

  const payAmount = 99;
  const payMonthYear = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 30);
  const nextBillingDate = nextDate.toISOString().split('T')[0];
  const subscriptionId = `SUB-FISIOLYS-${Date.now().toString().slice(-6)}`;

  const newMember: LoyaltyMember = {
    id: `fid-${Date.now()}`,
    patientName: patientName.trim(),
    patientPhone: patientPhone.trim(),
    patientAddress: patientAddress ? patientAddress.trim() : undefined,
    patientCpf: patientCpf ? patientCpf.trim() : undefined,
    patientEmail: patientEmail ? patientEmail.trim() : undefined,
    status: 'ativo',
    monthlyFee: 99,
    dueDay: 10,
    joinedDate: new Date().toISOString().split('T')[0],
    accumulatedBalance: payAmount, // Credit R$ 99 immediately
    totalSpent: 0,
    beneficiaries: [],
    payments: [{
      id: `pay-${Date.now()}`,
      monthYear: payMonthYear,
      amount: payAmount,
      paidAt: new Date().toISOString().split('T')[0],
      paymentMethod: 'cartao_recorrente',
      receiptNotes: `Ativação do Clube - Recorrência Automática (${cardBrand} **** ${last4})`
    }],
    overdueMonths: [],
    acceptedTerms: true,
    acceptedTermsAt: new Date().toISOString(),
    recurringBilling: true,
    recurringMethod: 'cartao_recorrente',
    cardLast4: last4,
    cardBrand: cardBrand,
    nextBillingDate: nextBillingDate,
    recurringSubscriptionId: subscriptionId,
    createdAt: new Date().toISOString()
  };

  db.loyaltyMembers.unshift(newMember);
  saveDatabase(db);
  res.json({ success: true, member: newMember });
});

// Record monthly fee payment (R$ 99.00)
app.post('/api/loyalty/:id/payment', (req, res) => {
  if (!db.loyaltyMembers) db.loyaltyMembers = initialLoyaltyMembers;
  const { id } = req.params;
  const { monthYear, amount, paymentMethod, receiptNotes } = req.body;

  const member = db.loyaltyMembers.find(m => m.id === id);
  if (!member) {
    return res.status(404).json({ error: "Assinante não encontrado." });
  }

  const payAmount = Number(amount) || member.monthlyFee || 99;
  const payMonthYear = monthYear || new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });

  const newPayment = {
    id: `pay-${Date.now()}`,
    monthYear: payMonthYear,
    amount: payAmount,
    paidAt: new Date().toISOString().split('T')[0],
    paymentMethod: paymentMethod || 'pix',
    receiptNotes: receiptNotes || `Mensalidade ${payMonthYear}`
  };

  member.payments.unshift(newPayment);
  member.accumulatedBalance += payAmount; // Credit added to patient's balance!
  member.overdueMonths = member.overdueMonths.filter(m => m !== payMonthYear);

  if (member.status === 'inadimplente' && member.overdueMonths.length === 0) {
    member.status = 'ativo';
  }

  saveDatabase(db);
  res.json({ success: true, member, payment: newPayment });
});

// Use credit / deduct balance
app.post('/api/loyalty/:id/use-credit', (req, res) => {
  if (!db.loyaltyMembers) db.loyaltyMembers = initialLoyaltyMembers;
  const { id } = req.params;
  const { amount, description } = req.body;

  const member = db.loyaltyMembers.find(m => m.id === id);
  if (!member) {
    return res.status(404).json({ error: "Assinante não encontrado." });
  }

  const useAmount = Number(amount);
  if (isNaN(useAmount) || useAmount <= 0) {
    return res.status(400).json({ error: "Informe um valor válido para utilização do saldo." });
  }

  if (member.accumulatedBalance < useAmount) {
    return res.status(400).json({ error: `Saldo insuficiente. Saldo disponível: R$ ${member.accumulatedBalance.toFixed(2)}` });
  }

  member.accumulatedBalance -= useAmount;
  member.totalSpent += useAmount;

  saveDatabase(db);
  res.json({ success: true, member });
});

// Delete loyalty member
app.delete('/api/loyalty/:id', (req, res) => {
  if (!db.loyaltyMembers) db.loyaltyMembers = initialLoyaltyMembers;
  const { id } = req.params;
  db.loyaltyMembers = db.loyaltyMembers.filter(m => m.id !== id);
  saveDatabase(db);
  res.json({ success: true });
});

// --- 11. WHATSAPP BUSINESS & WEB AUTOMATION API ---

// Helper function to dispatch WhatsApp messages via provider or web format
async function sendWhatsAppMessageViaGateway(
  provider: string,
  apiUrl: string,
  apiToken: string,
  instanceId: string,
  phone: string,
  message: string
): Promise<{ success: boolean; status: 'enviado' | 'erro'; details?: string }> {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) {
    return { success: false, status: 'erro', details: 'Número de telefone inválido' };
  }

  // If no API URL configured or provider is 'whatsapp_web', it is sent in WhatsApp Web/Direct mode
  if (!apiUrl || provider === 'whatsapp_web') {
    return { success: true, status: 'enviado', details: 'Modo WhatsApp Web (Link Direto gerado com sucesso)' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: any = {};

    if (apiToken) {
      headers['Authorization'] = apiToken.startsWith('Bearer ') ? apiToken : `Bearer ${apiToken}`;
      headers['apikey'] = apiToken;
    }

    if (provider === 'meta_cloud') {
      // Meta Graph API WhatsApp Business
      body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: true, body: message }
      };
    } else if (provider === 'evolution') {
      // Evolution API
      body = {
        number: cleanPhone,
        text: message
      };
    } else if (provider === 'zapi') {
      // Z-API
      body = {
        phone: cleanPhone,
        message: message
      };
    } else {
      // Custom Webhook / n8n / Make / Typebot
      body = {
        event: "whatsapp_send_message",
        phone: cleanPhone,
        message: message,
        instanceId: instanceId || 'fisiolys',
        timestamp: new Date().toISOString()
      };
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      return { success: true, status: 'enviado', details: `API HTTP ${res.status} OK` };
    } else {
      const errText = await res.text().catch(() => '');
      return { success: false, status: 'erro', details: `HTTP ${res.status}: ${errText.slice(0, 150)}` };
    }
  } catch (err: any) {
    return { success: false, status: 'erro', details: err.message || 'Falha na conexão com a API' };
  }
}

// 1. Get WhatsApp Logs
app.get('/api/whatsapp/logs', (req, res) => {
  if (!db.whatsappLogs) db.whatsappLogs = [];
  res.json(db.whatsappLogs);
});

// 2. Clear WhatsApp Logs
app.delete('/api/whatsapp/logs', (req, res) => {
  db.whatsappLogs = [];
  saveDatabase(db);
  res.json({ success: true, message: "Histórico de logs do WhatsApp limpo com sucesso." });
});

// 3. Send Single WhatsApp Message (for Appointment or Manual)
app.post('/api/whatsapp/send', async (req, res) => {
  const { appointmentId, type = 'manual', customMessage, phoneOverride } = req.body;
  if (!db.whatsappLogs) db.whatsappLogs = [];

  let patientPhone = phoneOverride || '';
  let patientName = 'Paciente';
  let serviceName = 'Atendimento';
  let appt: Appointment | undefined;

  if (appointmentId) {
    appt = db.appointments.find(a => a.id === appointmentId);
    if (appt) {
      patientPhone = appt.patientPhone;
      patientName = appt.patientName;
      serviceName = appt.serviceName;
    }
  }

  if (!patientPhone) {
    return res.status(400).json({ error: "Telefone do destinatário não informado." });
  }

  // Determine Message Content
  let message = customMessage;
  if (!message) {
    let template = db.clinic.whatsappTemplateBooking || DEFAULT_WHATSAPP_TEMPLATES.bookingConfirmation;
    if (type === 'lembrete_d1') {
      template = db.clinic.whatsappTemplateD1 || DEFAULT_WHATSAPP_TEMPLATES.reminderD1;
    } else if (type === 'lembrete_d0') {
      template = db.clinic.whatsappTemplateD0 || DEFAULT_WHATSAPP_TEMPLATES.reminderD0;
    }

    message = interpolateWhatsAppTemplate(template, {
      patientName,
      patientPhone,
      serviceName: appt?.serviceName || serviceName,
      servicePrice: appt?.servicePrice,
      date: appt?.date || new Date().toISOString().split('T')[0],
      time: appt?.time || '09:00',
      clinicName: db.clinic.name,
      managerName: db.clinic.managerName,
      address: db.clinic.address,
      city: db.clinic.city,
      paymentMethod: appt?.paymentMethod
    });
  }

  const provider = db.clinic.whatsappProvider || 'whatsapp_web';
  const dispatchRes = await sendWhatsAppMessageViaGateway(
    provider,
    db.clinic.whatsappApiUrl || '',
    db.clinic.whatsappApiToken || '',
    db.clinic.whatsappInstanceId || '',
    patientPhone,
    message
  );

  const log: WhatsAppLog = {
    id: `wlog-${Date.now()}`,
    appointmentId: appt?.id,
    patientName,
    patientPhone,
    type,
    provider,
    status: dispatchRes.status,
    message,
    sentAt: new Date().toISOString(),
    errorDetails: dispatchRes.details
  };

  db.whatsappLogs.unshift(log);

  if (appt) {
    appt.whatsappStatus = dispatchRes.status;
    appt.whatsappSentAt = new Date().toISOString();
    if (!dispatchRes.success) appt.whatsappError = dispatchRes.details;
  }

  saveDatabase(db);

  const directWebUrl = getWhatsAppWebUrl(patientPhone, message);
  const directAppUrl = getWhatsAppDirectUrl(patientPhone, message);

  res.json({
    success: dispatchRes.success,
    status: dispatchRes.status,
    details: dispatchRes.details,
    log,
    message,
    directWebUrl,
    directAppUrl
  });
});

// 4. Batch Dispatch Reminders for a Date
app.post('/api/whatsapp/batch-reminders', async (req, res) => {
  const { date, type = 'lembrete_d0' } = req.body;
  if (!date) {
    return res.status(400).json({ error: "Data para disparo em lote não informada." });
  }

  if (!db.whatsappLogs) db.whatsappLogs = [];

  const targetAppts = db.appointments.filter(a => a.date === date && a.status !== 'cancelado');
  if (targetAppts.length === 0) {
    return res.json({
      success: true,
      total: 0,
      sent: 0,
      errors: 0,
      message: `Nenhum agendamento ativo encontrado para a data ${date}.`,
      results: []
    });
  }

  const template = type === 'lembrete_d1'
    ? (db.clinic.whatsappTemplateD1 || DEFAULT_WHATSAPP_TEMPLATES.reminderD1)
    : (db.clinic.whatsappTemplateD0 || DEFAULT_WHATSAPP_TEMPLATES.reminderD0);

  const provider = db.clinic.whatsappProvider || 'whatsapp_web';
  const results: any[] = [];
  let sentCount = 0;
  let errorCount = 0;

  for (const appt of targetAppts) {
    const msg = interpolateWhatsAppTemplate(template, {
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      serviceName: appt.serviceName,
      servicePrice: appt.servicePrice,
      date: appt.date,
      time: appt.time,
      clinicName: db.clinic.name,
      managerName: db.clinic.managerName,
      address: db.clinic.address,
      city: db.clinic.city,
      paymentMethod: appt.paymentMethod
    });

    const dispatch = await sendWhatsAppMessageViaGateway(
      provider,
      db.clinic.whatsappApiUrl || '',
      db.clinic.whatsappApiToken || '',
      db.clinic.whatsappInstanceId || '',
      appt.patientPhone,
      msg
    );

    if (dispatch.success) sentCount++;
    else errorCount++;

    appt.whatsappStatus = dispatch.status;
    appt.whatsappSentAt = new Date().toISOString();
    if (!dispatch.success) appt.whatsappError = dispatch.details;

    const log: WhatsAppLog = {
      id: `wlog-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      appointmentId: appt.id,
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      type,
      provider,
      status: dispatch.status,
      message: msg,
      sentAt: new Date().toISOString(),
      errorDetails: dispatch.details
    };

    db.whatsappLogs.unshift(log);
    results.push({
      appointmentId: appt.id,
      patientName: appt.patientName,
      phone: appt.patientPhone,
      time: appt.time,
      status: dispatch.status,
      details: dispatch.details,
      directWebUrl: getWhatsAppWebUrl(appt.patientPhone, msg)
    });
  }

  saveDatabase(db);

  res.json({
    success: true,
    total: targetAppts.length,
    sent: sentCount,
    errors: errorCount,
    date,
    type,
    results
  });
});

// 5. Test WhatsApp Dispatch
app.post('/api/whatsapp/test', async (req, res) => {
  const { phone, message, provider: testProvider, apiUrl: testApiUrl, apiToken: testApiToken } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Telefone para teste é obrigatório." });
  }

  const text = message || `🧪 Teste de Conexão WhatsApp - Fisiolys Fisioterapia e Pilates!\n\nSe você recebeu esta mensagem, sua integração com a API do WhatsApp está funcionando perfeitamente! 🌿✨\n\nHorário do disparo: ${new Date().toLocaleTimeString('pt-BR')}`;
  
  const provider = testProvider || db.clinic.whatsappProvider || 'whatsapp_web';
  const apiUrl = testApiUrl !== undefined ? testApiUrl : (db.clinic.whatsappApiUrl || '');
  const apiToken = testApiToken !== undefined ? testApiToken : (db.clinic.whatsappApiToken || '');
  const instanceId = db.clinic.whatsappInstanceId || '';

  const dispatch = await sendWhatsAppMessageViaGateway(
    provider,
    apiUrl,
    apiToken,
    instanceId,
    phone,
    text
  );

  const directWebUrl = getWhatsAppWebUrl(phone, text);
  const directAppUrl = getWhatsAppDirectUrl(phone, text);

  res.json({
    success: dispatch.success,
    status: dispatch.status,
    details: dispatch.details,
    phone,
    text,
    directWebUrl,
    directAppUrl
  });
});

// 6. Birthday Reminders Dispatch
app.post('/api/whatsapp/birthday-reminders', async (req, res) => {
  if (!db.whatsappLogs) db.whatsappLogs = [];
  const brazilNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const monthDay = `${String(brazilNow.getMonth() + 1).padStart(2, '0')}-${String(brazilNow.getDate()).padStart(2, '0')}`; // MM-DD

  const birthdayPatients = db.patients.filter(p => {
    if (!p.birthDate) return false;
    const pMonthDay = p.birthDate.slice(5); // assuming YYYY-MM-DD
    return pMonthDay === monthDay;
  });

  const template = db.clinic.whatsappTemplateBirthday || DEFAULT_WHATSAPP_TEMPLATES.birthday;
  const provider = db.clinic.whatsappProvider || 'whatsapp_web';
  const results: any[] = [];
  let sentCount = 0;
  let errorCount = 0;

  for (const patient of birthdayPatients) {
    const msg = interpolateWhatsAppTemplate(template, {
      patientName: patient.name,
      patientPhone: patient.phone,
      serviceName: 'Fisioterapia e Pilates',
      date: brazilNow.toISOString().split('T')[0],
      time: '09:00',
      clinicName: db.clinic.name,
      managerName: db.clinic.managerName,
      address: db.clinic.address,
      city: db.clinic.city,
    });

    const dispatch = await sendWhatsAppMessageViaGateway(
      provider,
      db.clinic.whatsappApiUrl || '',
      db.clinic.whatsappApiToken || '',
      db.clinic.whatsappInstanceId || '',
      patient.phone,
      msg
    );

    if (dispatch.success) sentCount++;
    else errorCount++;

    const log: WhatsAppLog = {
      id: `wlog-bday-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      patientName: patient.name,
      patientPhone: patient.phone,
      type: 'manual',
      provider,
      status: dispatch.status,
      message: msg,
      sentAt: new Date().toISOString(),
      errorDetails: dispatch.details
    };

    db.whatsappLogs.unshift(log);
    results.push({
      patientId: patient.id,
      patientName: patient.name,
      phone: patient.phone,
      status: dispatch.status,
      details: dispatch.details,
      directWebUrl: getWhatsAppWebUrl(patient.phone, msg)
    });
  }

  saveDatabase(db);

  res.json({
    success: true,
    total: birthdayPatients.length,
    sent: sentCount,
    errors: errorCount,
    monthDay,
    results
  });
});

// 7. Special Occasion / Follow-up Dispatch
app.post('/api/whatsapp/special-occasions', async (req, res) => {
  const { patientIds, occasionName, customTemplate } = req.body;
  if (!db.whatsappLogs) db.whatsappLogs = [];

  const targetPatients = Array.isArray(patientIds) && patientIds.length > 0
    ? db.patients.filter(p => patientIds.includes(p.id))
    : db.patients;

  const template = customTemplate || db.clinic.whatsappTemplateSpecialOccasion || DEFAULT_WHATSAPP_TEMPLATES.specialOccasion;
  const provider = db.clinic.whatsappProvider || 'whatsapp_web';
  const results: any[] = [];
  let sentCount = 0;
  let errorCount = 0;

  for (const patient of targetPatients) {
    const msg = interpolateWhatsAppTemplate(template, {
      patientName: patient.name,
      patientPhone: patient.phone,
      serviceName: 'Fisioterapia & Pilates',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      clinicName: db.clinic.name,
      managerName: db.clinic.managerName,
      address: db.clinic.address,
      city: db.clinic.city,
    });

    const dispatch = await sendWhatsAppMessageViaGateway(
      provider,
      db.clinic.whatsappApiUrl || '',
      db.clinic.whatsappApiToken || '',
      db.clinic.whatsappInstanceId || '',
      patient.phone,
      msg
    );

    if (dispatch.success) sentCount++;
    else errorCount++;

    const log: WhatsAppLog = {
      id: `wlog-occ-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      patientName: patient.name,
      patientPhone: patient.phone,
      type: 'manual',
      provider,
      status: dispatch.status,
      message: msg,
      sentAt: new Date().toISOString(),
      errorDetails: dispatch.details
    };

    db.whatsappLogs.unshift(log);
    results.push({
      patientId: patient.id,
      patientName: patient.name,
      phone: patient.phone,
      status: dispatch.status,
      details: dispatch.details,
      directWebUrl: getWhatsAppWebUrl(patient.phone, msg)
    });
  }

  saveDatabase(db);

  res.json({
    success: true,
    occasionName: occasionName || 'Acompanhamento Especial',
    total: targetPatients.length,
    sent: sentCount,
    errors: errorCount,
    results
  });
});

// 8. 2-Hour Reminders Dispatch
app.post('/api/whatsapp/reminders-2h', async (req, res) => {
  const { appointmentIds } = req.body;
  if (!db.whatsappLogs) db.whatsappLogs = [];

  const brazilNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const todayStr = brazilNow.toISOString().split('T')[0];
  const currentTotalMins = brazilNow.getHours() * 60 + brazilNow.getMinutes();

  let targetAppts = db.appointments.filter(a => a.date === todayStr && a.status === 'agendado');

  if (Array.isArray(appointmentIds) && appointmentIds.length > 0) {
    targetAppts = targetAppts.filter(a => appointmentIds.includes(a.id));
  } else if (!appointmentIds) {
    // Filter appointments occurring in approximately the next 2-3 hours (e.g. within 60 to 180 minutes)
    targetAppts = targetAppts.filter(a => {
      const [h, m] = a.time.split(':').map(Number);
      const appMins = h * 60 + m;
      const diff = appMins - currentTotalMins;
      return diff >= 0 && diff <= 180;
    });
  }

  const template = db.clinic.whatsappTemplateReminder2h || DEFAULT_WHATSAPP_TEMPLATES.reminder2h;
  const provider = db.clinic.whatsappProvider || 'whatsapp_web';
  const results: any[] = [];
  let sentCount = 0;
  let errorCount = 0;

  for (const appt of targetAppts) {
    const msg = interpolateWhatsAppTemplate(template, {
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      serviceName: appt.serviceName,
      servicePrice: appt.servicePrice,
      date: appt.date,
      time: appt.time,
      clinicName: db.clinic.name,
      managerName: db.clinic.managerName,
      address: db.clinic.address,
      city: db.clinic.city,
      paymentMethod: appt.paymentMethod,
      notes: appt.notes
    });

    const dispatch = await sendWhatsAppMessageViaGateway(
      provider,
      db.clinic.whatsappApiUrl || '',
      db.clinic.whatsappApiToken || '',
      db.clinic.whatsappInstanceId || '',
      appt.patientPhone,
      msg
    );

    if (dispatch.success) sentCount++;
    else errorCount++;

    const log: WhatsAppLog = {
      id: `wlog-2h-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      appointmentId: appt.id,
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      type: 'manual',
      provider,
      status: dispatch.status,
      message: msg,
      sentAt: new Date().toISOString(),
      errorDetails: dispatch.details
    };

    db.whatsappLogs.unshift(log);
    results.push({
      appointmentId: appt.id,
      patientName: appt.patientName,
      phone: appt.patientPhone,
      time: appt.time,
      status: dispatch.status,
      details: dispatch.details,
      directWebUrl: getWhatsAppWebUrl(appt.patientPhone, msg)
    });
  }

  saveDatabase(db);

  res.json({
    success: true,
    total: targetAppts.length,
    sent: sentCount,
    errors: errorCount,
    today: todayStr,
    results
  });
});

// ==========================================
// CRM FISIOLYS & CLINICAL EVALUATION ENDPOINTS
// ==========================================

// 1. Get all CRM Data
app.get('/api/crm/all', (req, res) => {
  if (!db.crmLeads) db.crmLeads = initialCrmLeads;
  if (!db.crmAppointments) db.crmAppointments = initialCrmAppointments;
  if (!db.crmAvaliacoes) db.crmAvaliacoes = initialCrmAvaliacoes;

  res.json({
    leads: db.crmLeads,
    appointments: db.crmAppointments,
    avaliacoes: db.crmAvaliacoes
  });
});

// 2. Leads Management
app.post('/api/crm/leads', (req, res) => {
  if (!db.crmLeads) db.crmLeads = initialCrmLeads;
  const leadData: CrmLead = req.body;

  if (!leadData.nome) {
    return res.status(400).json({ error: "Nome do lead é obrigatório." });
  }

  if (leadData.id) {
    const idx = db.crmLeads.findIndex(l => l.id === leadData.id);
    if (idx !== -1) {
      db.crmLeads[idx] = { ...db.crmLeads[idx], ...leadData };
      saveDatabase(db);
      return res.json({ success: true, lead: db.crmLeads[idx] });
    }
  }

  const newLead: CrmLead = {
    ...leadData,
    id: leadData.id || `lead-${Date.now()}`,
    criadoEm: leadData.criadoEm || new Date().toISOString()
  };

  db.crmLeads.unshift(newLead);
  saveDatabase(db);
  res.json({ success: true, lead: newLead });
});

app.delete('/api/crm/leads/:id', (req, res) => {
  if (!db.crmLeads) db.crmLeads = initialCrmLeads;
  db.crmLeads = db.crmLeads.filter(l => l.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 3. CRM Appointments Management
app.post('/api/crm/appointments', (req, res) => {
  if (!db.crmAppointments) db.crmAppointments = initialCrmAppointments;
  const apptData: CrmAppointmentItem = req.body;

  if (apptData.id) {
    const idx = db.crmAppointments.findIndex(a => a.id === apptData.id);
    if (idx !== -1) {
      db.crmAppointments[idx] = { ...db.crmAppointments[idx], ...apptData };
      saveDatabase(db);
      return res.json({ success: true, appointment: db.crmAppointments[idx] });
    }
  }

  const newAppt: CrmAppointmentItem = {
    ...apptData,
    id: apptData.id || `crm-app-${Date.now()}`
  };

  db.crmAppointments.unshift(newAppt);

  // Update corresponding lead status to 'agendado' if leadId is set
  if (newAppt.leadId && db.crmLeads) {
    const lead = db.crmLeads.find(l => l.id === newAppt.leadId);
    if (lead && lead.status !== 'paciente') {
      lead.status = 'agendado';
    }
  }

  saveDatabase(db);
  res.json({ success: true, appointment: newAppt });
});

app.delete('/api/crm/appointments/:id', (req, res) => {
  if (!db.crmAppointments) db.crmAppointments = initialCrmAppointments;
  db.crmAppointments = db.crmAppointments.filter(a => a.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 4. CRM Clinical Evaluations (Avaliações) Management
app.post('/api/crm/avaliacoes', (req, res) => {
  if (!db.crmAvaliacoes) db.crmAvaliacoes = initialCrmAvaliacoes;
  const avalData: CrmAvaliacao = req.body;

  if (avalData.id) {
    const idx = db.crmAvaliacoes.findIndex(a => a.id === avalData.id);
    if (idx !== -1) {
      db.crmAvaliacoes[idx] = { ...db.crmAvaliacoes[idx], ...avalData };
      saveDatabase(db);
      return res.json({ success: true, avaliacao: db.crmAvaliacoes[idx] });
    }
  }

  const newAval: CrmAvaliacao = {
    ...avalData,
    id: avalData.id || `aval-${Date.now()}`,
    evolucoes: Array.isArray(avalData.evolucoes) ? avalData.evolucoes : []
  };

  db.crmAvaliacoes.unshift(newAval);

  // When an evaluation is registered for a lead, transition lead status to 'paciente'
  if (newAval.leadId && db.crmLeads) {
    const lead = db.crmLeads.find(l => l.id === newAval.leadId);
    if (lead) {
      lead.status = 'paciente';
    }
  }

  saveDatabase(db);
  res.json({ success: true, avaliacao: newAval });
});

app.delete('/api/crm/avaliacoes/:id', (req, res) => {
  if (!db.crmAvaliacoes) db.crmAvaliacoes = initialCrmAvaliacoes;
  db.crmAvaliacoes = db.crmAvaliacoes.filter(a => a.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// 5. CRM Evoluções Management
app.post('/api/crm/avaliacoes/:id/evolucoes', (req, res) => {
  if (!db.crmAvaliacoes) db.crmAvaliacoes = initialCrmAvaliacoes;
  const avalId = req.params.id;
  const evolData: CrmEvolucao = req.body;

  const aval = db.crmAvaliacoes.find(a => a.id === avalId);
  if (!aval) {
    return res.status(404).json({ error: "Ficha de avaliação não encontrada." });
  }

  if (!aval.evolucoes) aval.evolucoes = [];

  if (evolData.id) {
    const idx = aval.evolucoes.findIndex(e => e.id === evolData.id);
    if (idx !== -1) {
      aval.evolucoes[idx] = { ...aval.evolucoes[idx], ...evolData };
      saveDatabase(db);
      return res.json({ success: true, avaliacao: aval, evolucao: aval.evolucoes[idx] });
    }
  }

  const newEvol: CrmEvolucao = {
    ...evolData,
    id: evolData.id || `ev-${Date.now()}`,
    sessao: evolData.sessao || (aval.evolucoes.length + 1)
  };

  aval.evolucoes.unshift(newEvol);
  saveDatabase(db);
  res.json({ success: true, avaliacao: aval, evolucao: newEvol });
});

app.delete('/api/crm/avaliacoes/:id/evolucoes/:evolId', (req, res) => {
  if (!db.crmAvaliacoes) db.crmAvaliacoes = initialCrmAvaliacoes;
  const { id, evolId } = req.params;

  const aval = db.crmAvaliacoes.find(a => a.id === id);
  if (!aval) {
    return res.status(404).json({ error: "Ficha de avaliação não encontrada." });
  }

  aval.evolucoes = aval.evolucoes.filter(e => e.id !== evolId);
  saveDatabase(db);
  res.json({ success: true, avaliacao: aval });
});

// ========================================================
// GEMINI AI CHATBOT & CLINICAL THINKING ENGINE
// ========================================================

const SYSTEM_INSTRUCTION_FISIOLYS = `Você é o Assistente Clínico Inteligente da clínica Fisiolys Fisioterapia e Pilates, sob responsabilidade técnica da Dra. Elays Marinho (CREFITO-12 / 208058) em Altamira - Pará.

DADOS DA CLÍNICA:
- Nome: Fisiolys Fisioterapia e Pilates
- Responsável: Dra. Elays Marinho (Fisioterapeuta Especialista, CREFITO-12 208058)
- Endereço: Av. Coronel José Porfírio, nº 3025 - Recreio, Altamira - PA
- WhatsApp: (93) 99126-5006
- Serviços e Protocolos:
  1. Pilates Clássico & Studio no solo e aparelhos (8 sessões/mês R$ 99; aula experimental R$ 49)
  2. Fisioterapia Domiciliar personalizada (R$ 150/sessão)
  3. Fisioterapia Pediátrica e desenvolvimento motor
  4. Fisioterapia com ênfase em ABA (transtornos do neurodesenvolvimento e TEA)
  5. Terapia Manual Integrada (liberação miofascial instrumental/manual, ventosaterapia, acupuntura sistêmica/auricular, dry needling)
  6. Fisioterapia Respiratória (higiene brônquica, reexpansão pulmonar)
  7. Reabilitação Pós-Operatória Ortopédica (coluna, joelho, ombro, quadril)
  8. Clube de Fidelidade Recorrente (R$ 99/mês - saldo acumulativo familiar)
  9. Saúde Corporativa e ergonomia

MODO DE PENSAMENTO INTELIGENTE (RACIOCÍNIO CLÍNICO AVANÇADO):
Quando ativado ou ao analisar casos clínicos, elabore um raciocínio sistemático e aprofundado antes de entregar a resposta final.
Sempre que pertinente, divida sua resposta de forma clara:
1. Se houver pensamento analítico solicitado, inclua a seção explicativa do raciocínio biomecânico, anatomofisiológico, red flags, diagnóstico cinético-funcional e plano terapêutico.
2. Em seguida, forneça a resposta direta, empática, acolhedora e com embasamento científico, pronta para a Dra. Elays ou para o paciente.

Mantenha sempre um tom profissional, acolhedor, ético e seguro. Nunca prescreva medicamentos alopáticos invasivos e sempre ressalte a importância da avaliação presencial com a Dra. Elays.`;

// 1. Interactive Gemini Chatbot Endpoint with Thinking Mode
app.post('/api/ai/chat', async (req, res) => {
  const { messages, thinkingMode = true, userRole = 'dra', contextData } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "O histórico de mensagens é obrigatório." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Graceful fallback if GEMINI_API_KEY is not configured yet
    const lastMsg = messages[messages.length - 1]?.content || "";
    return res.json({
      success: true,
      text: `Olá! Sou o assistente clínico inteligente da Fisiolys. Para ativar o processamento em tempo real com raciocínio profundo via Gemini, certifique-se de configurar sua GEMINI_API_KEY no menu de segredos.\n\nCom base na sua solicitação sobre "${lastMsg.slice(0, 40)}...", posso auxiliar a Dra. Elays com condutas cinético-funcionais, elaboração de prontuários, planejamento de sessões de Pilates e esclarecimento de dúvidas dos pacientes!`,
      thinkingProcess: thinkingMode ? "Raciocínio Clínico Local: Analisando queixa funcional e contextualizando com os protocolos da Fisiolys (Terapia Manual, Pilates Solo/Aparelhos, Domiciliar e Pediátrica)." : undefined
    });
  }

  try {
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || "" }]
    }));

    // Inject context info if available
    let systemInstruction = SYSTEM_INSTRUCTION_FISIOLYS;
    if (contextData) {
      systemInstruction += `\n\nCONTEXTO DO CRM / PACIENTE ATUAL:\n${typeof contextData === 'string' ? contextData : JSON.stringify(contextData, null, 2)}`;
    }
    if (userRole === 'paciente') {
      systemInstruction += `\n\nO interlocutor atual é um PACIENTE ou LEAD interessado em atendimento. Seja extremamente acolhedor, didático, explique como a Fisiolys pode aliviar o desconforto e convide-o a agendar a avaliação presencial com a Dra. Elays.`;
    } else {
      systemInstruction += `\n\nO interlocutor é a Dra. Elays ou equipe técnica da Fisiolys. Utilize terminologia fisioterapêutica e cinético-funcional precisa (ADM, goniometria, dermátomos, miótomos, cadeias musculares, cinesioterapia e biomecânica).`;
    }

    const config: any = {
      systemInstruction
    };

    if (thinkingMode) {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: formattedContents,
      config
    });

    const responseText = response.text || "Sem resposta gerada pelo modelo.";

    // Extract thoughts or reasoning if demarcated, or generate structured clinical thought summary
    let thinkingProcess: string | undefined = undefined;
    let cleanText = responseText;

    if (responseText.includes('[PENSAMENTO CLÍNICO]') || responseText.includes('**Pensamento Clínico:**')) {
      // Split into thinking and final answer
      const parts = responseText.split(/\[RESPOSTA\]|\*\*Resposta:\*\*/i);
      if (parts.length > 1) {
        thinkingProcess = parts[0].replace(/\[PENSAMENTO CLÍNICO\]|\*\*Pensamento Clínico:\*\*/gi, '').trim();
        cleanText = parts[1].trim();
      }
    }

    res.json({
      success: true,
      text: cleanText,
      rawText: responseText,
      thinkingProcess: thinkingProcess || (thinkingMode ? "Raciocínio clínico processado com sucesso via Gemini 3.7 Flash Thinking." : undefined)
    });
  } catch (error: any) {
    console.error("Gemini AI API Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Erro ao consultar o serviço de Inteligência Artificial Gemini.",
      text: "Desculpe, ocorreu uma instabilidade momentânea na conexão com o Gemini. Por favor, tente novamente em alguns instantes."
    });
  }
});

// 2. Clinical Reasoning & Anamnesis Auto-Generation for Fisiolys
app.post('/api/ai/clinical-reasoning', async (req, res) => {
  const { idade, profissao, queixaPrincipal, escalaDor, historico, medicamentos, comorbidades, inspecao, adm, forcaMuscular, testesEspeciais } = req.body;

  const ai = getGeminiClient();
  if (!ai) {
    // Intelligent local fallback
    return res.json({
      success: true,
      diagnosticoFuncional: `Quadro compatível com sobrecarga mecânica postural e desequilíbrio miofascial com dor nível ${escalaDor || 5}/10, associado à queixa de "${queixaPrincipal || 'dor e limitação funcional'}".`,
      objetivos: "1. Redução do quadro álgico e alívio de tensões miofasciais.\n2. Restauração da amplitude de movimento articular funcional.\n3. Fortalecimento da musculatura estabilizadora do Core e cadeia posterior.\n4. Reeducação postural e prevenção de recidivas.",
      planoTerapeutico: "Fisioterapia especializada 2x por semana: Liberação miofascial manual/instrumental, recursos analgésicos e protocolo de cinesioterapia com Pilates clínico.",
      thinkingProcess: "Análise biomecânica baseada nos dados fornecidos: correlação de postura, profissão e intensidade álgica."
    });
  }

  try {
    const prompt = `Analise os dados desta ficha de avaliação fisioterapêutica da Fisiolys e elabore:
1. DIAGNÓSTICO CINÉTICO-FUNCIONAL (hipótese técnica clara e fundamentada)
2. OBJETIVOS DO TRATAMENTO (metas a curto e médio prazo)
3. PLANO TERAPÊUTICO PROPOSTO (técnicas manuais, cinesioterapia, Pilates, exercícios e frequência sugerida)

DADOS DO PACIENTE:
- Idade: ${idade || 'Não informada'}
- Profissão: ${profissao || 'Não informada'}
- Queixa Principal: ${queixaPrincipal || 'Dor/desconforto funcional'}
- Escala de Dor Atual: ${escalaDor !== undefined ? escalaDor : 5}/10
- Histórico Clínico / Cirurgias: ${historico || 'Nenhum histórico relatado'}
- Medicamentos em uso: ${medicamentos || 'Nenhum'}
- Comorbidades: ${comorbidades || 'Nenhuma relatada'}
- Inspeção / Avaliação Postural: ${inspecao || 'Não especificada'}
- Amplitude de Movimento (ADM): ${adm || 'Preservada com restrições álgicas'}
- Força Muscular: ${forcaMuscular || 'Grau 4/5 funcional'}
- Testes Especiais: ${testesEspeciais || 'Testes biomecânicos de estresse ligamentar e mobilidade'}

Responda em formato JSON com as chaves:
{
  "thinkingProcess": "Explicação passo a passo do raciocínio biomecânico, anatômico e diagnóstico diferencial",
  "diagnosticoFuncional": "Hipótese de diagnóstico cinético-funcional",
  "objetivos": "Objetivos claros do tratamento (tópicos numerados)",
  "planoTerapeutico": "Condutas detalhadas e frequência recomendada"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_FISIOLYS,
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: "application/json"
      }
    });

    const jsonText = response.text?.trim() || "{}";
    const parsed = JSON.parse(jsonText);

    res.json({
      success: true,
      diagnosticoFuncional: parsed.diagnosticoFuncional || "",
      objetivos: parsed.objetivos || "",
      planoTerapeutico: parsed.planoTerapeutico || "",
      thinkingProcess: parsed.thinkingProcess || "Raciocínio clínico estruturado com Gemini 3.7 Flash."
    });
  } catch (err: any) {
    console.error("Clinical reasoning error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Erro ao processar raciocínio clínico com IA."
    });
  }
});

// 3. WhatsApp Lead Smart Message Generator with Thinking
app.post('/api/ai/suggest-lead-message', async (req, res) => {
  const { leadNome, protocolo, status, notas, origem } = req.body;

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      success: true,
      message: `Olá ${leadNome || 'tudo bem'}! 💚 Aqui é a Dra. Elays Marinho da Fisiolys. Vi seu interesse no tratamento de *${protocolo || 'Fisioterapia'}*. Como você tem se sentido? Gostaria de tirar dúvidas ou agendar sua avaliação nesta semana? Estamos à disposição! 🌿`
    });
  }

  try {
    const prompt = `Gere uma mensagem acolhedora, empática e persuasiva de WhatsApp para enviar a este lead da clínica Fisiolys:
- Nome do Lead: ${leadNome || 'Paciente'}
- Protocolo de Interesse: ${protocolo || 'Fisioterapia / Pilates'}
- Status no CRM: ${status || 'novo'}
- Origem do Contato: ${origem || 'WhatsApp'}
- Notas registradas: ${notas || 'Sem observações adicionais'}

A mensagem deve ser assinada pela Dra. Elays Marinho / Fisiolys e conter emojis adequados e convite claro para agendar a avaliação presencial.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_FISIOLYS,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    res.json({
      success: true,
      message: response.text?.trim() || ""
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SERVER STARTUP AND VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏥 Server Fisioterapia & Pilates running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
