import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initialServices, initialScheduleConfig, initialClinicConfig, initialAppointments, initialPatients, initialTestimonials, initialLoyaltyMembers } from './src/data/initialData';
import { Service, ScheduleConfig, ClinicConfig, Appointment, Patient, ReminderLog, Testimonial, LoyaltyMember, WhatsAppLog } from './src/types';
import { interpolateWhatsAppTemplate, getWhatsAppDirectUrl, getWhatsAppWebUrl, cleanPhoneNumber, DEFAULT_WHATSAPP_TEMPLATES } from './src/utils/whatsappUtils';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

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
        whatsappLogs: parsed.whatsappLogs || []
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
    whatsappLogs: []
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

  // Current local date & time cutoff
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
  const nowDate = String(now.getDate()).padStart(2, '0');
  const currentDateStr = `${nowYear}-${nowMonth}-${nowDate}`;
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();
  const minBookingMinsCutoff = currentTotalMins + 120; // 2 hours minimum advance booking requirement

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
  const { patientName, patientPhone, patientEmail, serviceId, date, time, notes, paymentMethod } = req.body;

  if (!patientName || !patientPhone || !serviceId || !date || !time) {
    return res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos" });
  }

  // Find service
  const service = db.services.find(s => s.id === serviceId);
  if (!service) {
    return res.status(404).json({ error: "Serviço não encontrado" });
  }

  // Check 2 hours advance booking rule for today
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
  const nowDate = String(now.getDate()).padStart(2, '0');
  const currentDateStr = `${nowYear}-${nowMonth}-${nowDate}`;

  if (date === currentDateStr) {
    const [appH, appM] = time.split(':').map(Number);
    const appMins = appH * 60 + appM;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    if (appMins < nowMins + 120) {
      return res.status(400).json({
        error: "Agendamentos online exigem no mínimo 2 horas de antecedência. Em caso de urgência, entre em contato diretamente pelo WhatsApp para solicitar um encaixe!"
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

  const newAppt: Appointment = {
    id: `app-${Date.now()}`,
    patientName: patientName.trim(),
    patientPhone: patientPhone.trim(),
    patientEmail: patientEmail ? patientEmail.trim() : undefined,
    serviceId: service.id,
    serviceName: service.name,
    servicePrice: service.price,
    durationMinutes: service.durationMinutes,
    date,
    time,
    status: 'agendado',
    paymentMethod: paymentMethod || 'pix',
    notes: notes ? notes.trim() : undefined,
    createdAt: new Date().toISOString(),
    webhookSent: false
  };

  db.appointments.push(newAppt);

  // Update or Create Patient record
  let patient = db.patients.find(p => p.phone === newAppt.patientPhone || p.name.toLowerCase() === newAppt.patientName.toLowerCase());
  if (patient) {
    patient.totalSessions += 1;
    patient.lastSessionDate = date;
    if (patientEmail && !patient.email) patient.email = patientEmail;
  } else {
    patient = {
      id: `pat-${Date.now()}`,
      name: newAppt.patientName,
      phone: newAppt.patientPhone,
      email: newAppt.patientEmail,
      firstSessionDate: date,
      lastSessionDate: date,
      totalSessions: 1,
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

// 6. Patients Management
app.get('/api/patients', (req, res) => {
  res.json(db.patients);
});

app.post('/api/patients', (req, res) => {
  const newPatient: Patient = {
    id: `pat-${Date.now()}`,
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email,
    notes: req.body.notes,
    totalSessions: req.body.totalSessions || 0,
    firstSessionDate: req.body.firstSessionDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  db.patients.push(newPatient);
  saveDatabase(db);
  res.json({ success: true, patient: newPatient });
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
