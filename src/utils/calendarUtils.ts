import { CrmAppointmentItem, ClinicConfig } from '../types';

/**
 * Formats a date and time into Google Calendar / iCalendar standard UTC/Local format: YYYYMMDDTHHmmss
 */
export function formatCalendarDateTime(dateStr: string, timeStr: string, durationMinutes = 60): { start: string; end: string } {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = (timeStr || '09:00').split(':').map(Number);

    const startDate = new Date(year, month - 1, day, hours, minutes, 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, '0');

    const formatISO = (d: Date) => 
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    return {
      start: formatISO(startDate),
      end: formatISO(endDate),
    };
  } catch (e) {
    const cleanDate = dateStr.replace(/-/g, '');
    const cleanTime = (timeStr || '0900').replace(/:/g, '');
    return {
      start: `${cleanDate}T${cleanTime}00`,
      end: `${cleanDate}T${cleanTime}00`,
    };
  }
}

/**
 * Creates a direct Google Calendar Web & Mobile Intent URL
 */
export function createGoogleCalendarUrl(
  appt: {
    pacienteNome: string;
    protocolo: string;
    data: string;
    horario: string;
    telefone?: string;
  },
  clinic: Partial<ClinicConfig> = {}
): string {
  const { start, end } = formatCalendarDateTime(appt.data, appt.horario);
  const title = encodeURIComponent(`Fisiolys: ${appt.protocolo} - ${appt.pacienteNome}`);
  const details = encodeURIComponent(
    `Atendimento Fisioterapêutico / Pilates na Fisiolys Clínica.\n` +
    `Paciente: ${appt.pacienteNome}\n` +
    `Telefone: ${appt.telefone || 'Não informado'}\n` +
    `Procedimento: ${appt.protocolo}\n` +
    `Fisioterapeuta Responsável: ${clinic.managerName || 'Dra. Elays Marinho (CREFITO 208058)'}\n` +
    `WhatsApp da Clínica: ${clinic.phone || '(93) 99126-5006'}`
  );
  const location = encodeURIComponent(
    `${clinic.name || 'Fisiolys Fisioterapia e Pilates'}, ${clinic.address || 'Av. Coronel José Porfírio, nº 3025 - Recreio'}, ${clinic.city || 'Altamira - PA'}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

/**
 * Generates an .ics (iCalendar) file for native Android / iPhone / Google Chrome calendar direct touch
 */
export function downloadIcsCalendarEvent(
  appt: {
    id?: string;
    pacienteNome: string;
    protocolo: string;
    data: string;
    horario: string;
    telefone?: string;
  },
  clinic: Partial<ClinicConfig> = {}
) {
  const { start, end } = formatCalendarDateTime(appt.data, appt.horario);
  const clinicName = clinic.name || 'Fisiolys Fisioterapia e Pilates';
  const clinicAddress = clinic.address || 'Av. Coronel José Porfírio, nº 3025 - Recreio, Altamira - PA';
  const uid = appt.id || `fisiolys-${Date.now()}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fisiolys CRM//Agenda Clinica//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@fisiolys.com.br`,
    `DTSTAMP:${start}Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Fisiolys: ${appt.protocolo} - ${appt.pacienteNome}`,
    `DESCRIPTION:Consulta Fisiolys Clínica\\nPaciente: ${appt.pacienteNome}\\nTelefone: ${appt.telefone || ''}\\nProcedimento: ${appt.protocolo}\\nFisioterapeuta: ${clinic.managerName || 'Dra. Elays Marinho'}\\nContato: ${clinic.phone || '(93) 99126-5006'}`,
    `LOCATION:${clinicAddress}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de Consulta Fisiolys',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Agendamento_${appt.pacienteNome.replace(/\s+/g, '_')}_${appt.data}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generates an .ics file containing all appointments for batch import into native mobile calendars
 */
export function downloadFullClinicIcs(
  appointments: {
    id: string;
    pacienteNome: string;
    protocolo: string;
    data: string;
    horario: string;
    situacao: string;
  }[],
  clinic: Partial<ClinicConfig> = {}
) {
  const clinicName = clinic.name || 'Fisiolys Fisioterapia e Pilates';
  const clinicAddress = clinic.address || 'Av. Coronel José Porfírio, nº 3025 - Recreio, Altamira - PA';

  const events = appointments.map((appt) => {
    const { start, end } = formatCalendarDateTime(appt.data, appt.horario);
    return [
      'BEGIN:VEVENT',
      `UID:${appt.id}@fisiolys.com.br`,
      `DTSTAMP:${start}Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:Fisiolys: ${appt.protocolo} - ${appt.pacienteNome}`,
      `DESCRIPTION:Atendimento Fisiolys Clínica\\nPaciente: ${appt.pacienteNome}\\nProcedimento: ${appt.protocolo}\\nSituação: ${appt.situacao}\\nResponsável: ${clinic.managerName || 'Dra. Elays Marinho'}`,
      `LOCATION:${clinicAddress}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fisiolys CRM//Agenda Clinica Completa//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Agenda_Completa_Fisiolys_${new Date().toISOString().split('T')[0]}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Triggers direct touch native mobile calendar opening
 */
export function openDirectTouchMobileCalendar(
  appt: {
    id?: string;
    pacienteNome: string;
    protocolo: string;
    data: string;
    horario: string;
    telefone?: string;
  },
  clinic: Partial<ClinicConfig> = {}
) {
  // On mobile Chrome / Android / iOS:
  // Open Google Calendar URL directly with intent / web template
  const googleUrl = createGoogleCalendarUrl(appt, clinic);
  window.open(googleUrl, '_blank');
}

/**
 * Creates and opens a 1-touch direct mobile calendar appointment for a Lead
 */
export function openDirectScheduleForLead(
  lead: {
    nome: string;
    telefone: string;
    protocolo?: string;
    notas?: string;
  },
  clinic: Partial<ClinicConfig> = {}
) {
  // Default to today or tomorrow at 09:00
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  const appt = {
    pacienteNome: lead.nome,
    protocolo: lead.protocolo || 'Pilates / Fisioterapia Fisiolys',
    data: dateStr,
    horario: '09:00',
    telefone: lead.telefone
  };

  openDirectTouchMobileCalendar(appt, clinic);
}
