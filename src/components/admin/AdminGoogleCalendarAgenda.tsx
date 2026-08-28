import React, { useState, useMemo, useEffect } from 'react';
import { Appointment, Service, Patient, ClinicConfig, AppointmentStatus, ScheduleConfig } from '../../types';
import { api } from '../../services/api';
import { formatDatePtBR, formatCurrency } from '../../utils/qrUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  CalendarDays,
  CalendarRange,
  List,
  Phone,
  MessageSquare,
  User,
  IdCard,
  RotateCcw,
  FileText,
  Check,
  X,
  Sparkles,
  Activity,
  Layers,
  SlidersHorizontal,
  ChevronDown,
  Info,
  CalendarCheck,
  AlertTriangle,
  Edit3,
  Pencil
} from 'lucide-react';

export type CalendarViewType = 'day' | 'week' | 'month' | 'schedule';

interface AdminGoogleCalendarAgendaProps {
  appointments: Appointment[];
  patients: Patient[];
  services: Service[];
  schedule: ScheduleConfig;
  clinic: ClinicConfig;
  initialViewMode?: CalendarViewType;
  initialDate?: Date;
  onReload: () => void;
  onOpenPatientHistory?: (patient: Patient) => void;
}

export type CategoryKey = 'pilates' | 'fisioterapia' | 'avaliacao' | 'rpg' | 'massoterapia' | 'outros';

export interface CategoryColorDef {
  key: CategoryKey;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBg: string;
  cardBorder: string;
  accentColor: string;
  hex: string;
}

export const CATEGORY_COLORS: Record<CategoryKey, CategoryColorDef> = {
  pilates: {
    key: 'pilates',
    label: 'Pilates Clínico & Cinesiológico',
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white',
    badgeBorder: 'border-orange-600',
    cardBg: 'bg-orange-50/90 hover:bg-orange-100/90 text-orange-950',
    cardBorder: 'border-l-4 border-l-orange-500 border-t border-r border-b border-orange-200',
    accentColor: '#ea580c',
    hex: '#f97316',
  },
  fisioterapia: {
    key: 'fisioterapia',
    label: 'Fisioterapia & Reabilitação',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    badgeBorder: 'border-emerald-700',
    cardBg: 'bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-950',
    cardBorder: 'border-l-4 border-l-emerald-600 border-t border-r border-b border-emerald-200',
    accentColor: '#16a34a',
    hex: '#10b981',
  },
  avaliacao: {
    key: 'avaliacao',
    label: 'Avaliação Inicial & Anamnese',
    badgeBg: 'bg-sky-600',
    badgeText: 'text-white',
    badgeBorder: 'border-sky-700',
    cardBg: 'bg-sky-50/90 hover:bg-sky-100/90 text-sky-950',
    cardBorder: 'border-l-4 border-l-sky-600 border-t border-r border-b border-sky-200',
    accentColor: '#0284c7',
    hex: '#0ea5e9',
  },
  rpg: {
    key: 'rpg',
    label: 'RPG & Reeducação Postural',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white',
    badgeBorder: 'border-purple-700',
    cardBg: 'bg-purple-50/90 hover:bg-purple-100/90 text-purple-950',
    cardBorder: 'border-l-4 border-l-purple-600 border-t border-r border-b border-purple-200',
    accentColor: '#7c3aed',
    hex: '#8b5cf6',
  },
  massoterapia: {
    key: 'massoterapia',
    label: 'Massoterapia & Liberação',
    badgeBg: 'bg-rose-500',
    badgeText: 'text-white',
    badgeBorder: 'border-rose-600',
    cardBg: 'bg-rose-50/90 hover:bg-rose-100/90 text-rose-950',
    cardBorder: 'border-l-4 border-l-rose-500 border-t border-r border-b border-rose-200',
    accentColor: '#e11d48',
    hex: '#f43f5e',
  },
  outros: {
    key: 'outros',
    label: 'Demais Procedimentos',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-white',
    badgeBorder: 'border-amber-700',
    cardBg: 'bg-amber-50/90 hover:bg-amber-100/90 text-amber-950',
    cardBorder: 'border-l-4 border-l-amber-600 border-t border-r border-b border-amber-200',
    accentColor: '#d97706',
    hex: '#f59e0b',
  },
};

export function getAppointmentCategory(appt: Appointment, services: Service[]): CategoryKey {
  const sName = (appt.serviceName || '').toLowerCase();
  const serv = services.find(s => s.id === appt.serviceId);
  const sCat = (serv?.category || '').toLowerCase();

  if (sName.includes('pilates') || sCat.includes('pilates')) return 'pilates';
  if (sName.includes('avalia') || sName.includes('anamnese') || sName.includes('consulta')) return 'avaliacao';
  if (sName.includes('rpg') || sName.includes('postur') || sName.includes('coluna')) return 'rpg';
  if (sName.includes('massagem') || sName.includes('massoterapia') || sName.includes('libera')) return 'massoterapia';
  if (sName.includes('fisio') || sCat.includes('fisioterapia')) return 'fisioterapia';
  return 'outros';
}

export const AdminGoogleCalendarAgenda: React.FC<AdminGoogleCalendarAgendaProps> = ({
  appointments,
  patients,
  services,
  schedule,
  clinic,
  initialViewMode,
  initialDate,
  onReload,
  onOpenPatientHistory
}) => {
  // Current view mode: day, week, month, schedule (list)
  const [viewMode, setViewMode] = useState<CalendarViewType>(initialViewMode || 'week');
  const [currentDate, setCurrentDate] = useState<Date>(() => initialDate || new Date());

  // Synchronize when parent passes updated initialViewMode or initialDate
  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
    }
  }, [initialDate]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Record<CategoryKey, boolean>>({
    pilates: true,
    fisioterapia: true,
    avaliacao: true,
    rpg: true,
    massoterapia: true,
    outros: true,
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'presenca' | 'agendado' | 'falta'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Selected Appointment Modal & Action States
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Edit Appointment Modal State (Alterar data, horário e procedimento)
  const [editModalAppt, setEditModalAppt] = useState<Appointment | null>(null);
  const [editPatientName, setEditPatientName] = useState('');
  const [editPatientPhone, setEditPatientPhone] = useState('');
  const [editPatientCpf, setEditPatientCpf] = useState('');
  const [editServiceId, setEditServiceId] = useState('');
  const [editServiceName, setEditServiceName] = useState('');
  const [editServicePrice, setEditServicePrice] = useState<number>(0);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('08:00');
  const [editStatus, setEditStatus] = useState<AppointmentStatus>('agendado');
  const [editAttendanceStatus, setEditAttendanceStatus] = useState<'presenca' | 'falta' | 'pendente'>('pendente');
  const [editNotes, setEditNotes] = useState('');
  const [editNotifyWhatsApp, setEditNotifyWhatsApp] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleNotifyWhatsApp, setRescheduleNotifyWhatsApp] = useState(true);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Delete Appointment Confirmation Modal
  const [deleteApptConfirm, setDeleteApptConfirm] = useState<Appointment | null>(null);
  const [isDeletingAppt, setIsDeletingAppt] = useState(false);

  // Delete Patient Confirmation Modal
  const [deletePatientConfirm, setDeletePatientConfirm] = useState<{ patient: Patient; apptCount: number } | null>(null);
  const [deletePatientWithAppointments, setDeletePatientWithAppointments] = useState(true);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);

  // Quick New Appointment Modal
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBookingDate, setNewBookingDate] = useState('');
  const [newBookingTime, setNewBookingTime] = useState('08:00');
  const [newBookingPatientName, setNewBookingPatientName] = useState('');
  const [newBookingPatientPhone, setNewBookingPatientPhone] = useState('');
  const [newBookingServiceId, setNewBookingServiceId] = useState(services[0]?.id || '');
  const [newBookingNotes, setNewBookingNotes] = useState('');
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  // Success / Action feedback toast
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Helper date conversions
  const currentDateStr = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Title formatting according to view
  const headerTitle = useMemo(() => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const month = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();

    if (viewMode === 'day') {
      const day = currentDate.getDate();
      const weekDay = currentDate.toLocaleDateString('pt-BR', { weekday: 'long' });
      return `${day} de ${month} de ${year} (${weekDay.charAt(0).toUpperCase() + weekDay.slice(1)})`;
    }

    if (viewMode === 'week') {
      // Calculate start and end of week (Sunday to Saturday)
      const d = new Date(currentDate);
      const dayOfWeek = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const startMonth = monthNames[start.getMonth()];
      const endMonth = monthNames[end.getMonth()];

      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} – ${end.getDate()} de ${month} de ${year}`;
      }
      return `${start.getDate()} de ${startMonth} – ${end.getDate()} de ${endMonth} de ${year}`;
    }

    return `${month} de ${year}`;
  }, [currentDate, viewMode]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Category match
      const cat = getAppointmentCategory(appt, services);
      if (!selectedCategories[cat]) return false;

      // Status filter
      if (statusFilter === 'presenca' && appt.attendanceStatus !== 'presenca' && appt.status !== 'concluido') return false;
      if (statusFilter === 'agendado' && (appt.attendanceStatus === 'presenca' || appt.status === 'cancelado' || appt.status === 'falta')) return false;
      if (statusFilter === 'falta' && appt.attendanceStatus !== 'falta' && appt.status !== 'falta') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = appt.patientName.toLowerCase().includes(q);
        const matchPhone = appt.patientPhone.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchCpf = (appt.patientCpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchService = (appt.serviceName || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCpf && !matchService) return false;
      }

      return true;
    });
  }, [appointments, services, selectedCategories, statusFilter, searchQuery]);

  // Compute patient attendance stats & historical sessions for an appointment
  const getPatientSessionStats = (appt: Appointment) => {
    const cleanPhone = appt.patientPhone.replace(/\D/g, '');
    const patientAppts = appointments.filter(a => {
      const aPhone = a.patientPhone.replace(/\D/g, '');
      const matchPhone = cleanPhone && aPhone && (aPhone === cleanPhone || aPhone.includes(cleanPhone) || cleanPhone.includes(aPhone));
      const matchName = a.patientName.toLowerCase().trim() === appt.patientName.toLowerCase().trim();
      return (matchPhone || matchName) && a.status !== 'cancelado';
    });

    const completedAppts = patientAppts.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca');
    const pastPhysioAppts = completedAppts.filter(a => getAppointmentCategory(a, services) === 'fisioterapia');
    const pastPilatesAppts = completedAppts.filter(a => getAppointmentCategory(a, services) === 'pilates');

    // Dates of physiotherapy/pilates done
    const physioDates = pastPhysioAppts.map(a => `${formatDatePtBR(a.date)} (${a.time}h)`);
    const pilatesDates = pastPilatesAppts.map(a => `${formatDatePtBR(a.date)} (${a.time}h)`);

    return {
      totalCompleted: completedAppts.length,
      totalPhysio: pastPhysioAppts.length,
      totalPilates: pastPilatesAppts.length,
      physioDates,
      pilatesDates,
      totalScheduled: patientAppts.length,
    };
  };

  // WhatsApp Reminder Sender
  const sendWhatsAppReminder = (app: Appointment) => {
    const cleanPhone = app.patientPhone.replace(/\D/g, '');
    const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = `Olá *${app.patientName}*! Tudo bem?\n\nPassando para confirmar seu atendimento de *${app.serviceName}* na Clínica Dra. Elays Marinho:\n\n📅 *Data:* ${formatDatePtBR(app.date)}\n⏰ *Horário:* ${app.time}hs\n\nPodemos confirmar sua presença? Se precisar remarcar seu horário, avise-nos! ✨😊`;
    window.open(`https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(message)}`, '_blank');
  };

  // Mark Presence / Check-in Quick Action
  const handleCheckInPresence = async (appt: Appointment) => {
    try {
      await api.checkInPatient({
        appointmentId: appt.id,
        patientPhone: appt.patientPhone,
        patientName: appt.patientName,
        method: 'manual',
        notes: 'Check-in e presença confirmados diretamente pela Dra. Elays na Agenda Eletrônica',
      });
      showToast(`Presença confirmada para ${appt.patientName}! Sessão registrada com sucesso.`, 'success');
      onReload();
      if (selectedAppointment && selectedAppointment.id === appt.id) {
        setSelectedAppointment(prev => prev ? { ...prev, status: 'concluido', attendanceStatus: 'presenca', checkedInAt: new Date().toISOString() } : null);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar presença.', 'error');
    }
  };

  // Mark Absence / Falta
  const handleMarkAbsence = async (appt: Appointment) => {
    try {
      await api.markAttendance(appt.id, 'falta', 'Falta registrada na agenda médica.');
      showToast(`Falta registrada para ${appt.patientName}.`, 'info');
      onReload();
      if (selectedAppointment && selectedAppointment.id === appt.id) {
        setSelectedAppointment(prev => prev ? { ...prev, status: 'falta', attendanceStatus: 'falta' } : null);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar falta.', 'error');
    }
  };

  // Open Edit Appointment Modal (Permite alterar data, horário, procedimento, valor, dados e status)
  const handleOpenEditModal = (appt: Appointment) => {
    setEditModalAppt(appt);
    setEditPatientName(appt.patientName);
    setEditPatientPhone(appt.patientPhone);
    setEditPatientCpf(appt.patientCpf || '');
    setEditServiceId(appt.serviceId || services[0]?.id || '');
    setEditServiceName(appt.serviceName);
    setEditServicePrice(appt.servicePrice !== undefined ? appt.servicePrice : 0);
    setEditDate(appt.date);
    setEditTime(appt.time);
    setEditStatus(appt.status);
    setEditAttendanceStatus(appt.attendanceStatus || (appt.status === 'concluido' ? 'presenca' : appt.status === 'falta' ? 'falta' : 'pendente'));
    setEditNotes(appt.notes || '');
    setEditNotifyWhatsApp(true);
  };

  // Execute Edit Appointment
  const handleExecuteEditAppointment = async () => {
    if (!editModalAppt || !editDate || !editTime || !editPatientName) {
      showToast('Por favor, preencha o nome do paciente, data e horário.', 'error');
      return;
    }
    setIsSavingEdit(true);
    try {
      const selectedServ = services.find(s => s.id === editServiceId);
      const finalServiceName = editServiceName || selectedServ?.name || editModalAppt.serviceName;
      const finalPrice = editServicePrice !== undefined && editServicePrice >= 0 ? editServicePrice : (selectedServ?.price || editModalAppt.servicePrice || 0);

      const updated = await api.updateAppointmentDetails(editModalAppt.id, {
        patientName: editPatientName.trim(),
        patientPhone: editPatientPhone.trim(),
        patientCpf: editPatientCpf.trim() || undefined,
        serviceId: editServiceId,
        serviceName: finalServiceName,
        servicePrice: finalPrice,
        date: editDate,
        time: editTime,
        status: editStatus,
        attendanceStatus: editAttendanceStatus,
        notes: editNotes.trim(),
      });

      showToast(`Agendamento de ${editPatientName} atualizado com sucesso!`, 'success');

      // WhatsApp notification
      if (editNotifyWhatsApp && editPatientPhone) {
        const cleanPhone = editPatientPhone.replace(/\D/g, '');
        const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const msg = `Olá *${editPatientName}*!\n\nSeu agendamento na Clínica Dra. Elays Marinho foi atualizado:\n\n✨ *Procedimento:* ${finalServiceName}\n📅 *Data:* ${formatDatePtBR(editDate)}\n⏰ *Horário:* ${editTime}hs\n💰 *Valor:* ${formatCurrency(finalPrice)}\n\nEstamos à disposição para qualquer dúvida! ✨`;
        window.open(`https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(msg)}`, '_blank');
      }

      setEditModalAppt(null);
      if (selectedAppointment && selectedAppointment.id === editModalAppt.id) {
        setSelectedAppointment(updated);
      }
      onReload();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar alterações no agendamento.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Reschedule Modal
  const handleOpenRescheduleModal = (appt: Appointment) => {
    setRescheduleModalAppt(appt);
    setRescheduleDate(appt.date);
    setRescheduleTime(appt.time);
    setRescheduleReason('Ajuste de horário solicitado pelo paciente');
    setRescheduleNotifyWhatsApp(true);
  };

  // Execute Reschedule
  const handleExecuteReschedule = async () => {
    if (!rescheduleModalAppt || !rescheduleDate || !rescheduleTime) return;
    setIsRescheduling(true);
    try {
      const updated = await api.rescheduleAppointment(
        rescheduleModalAppt.id,
        rescheduleDate,
        rescheduleTime,
        rescheduleReason
      );

      showToast(`Horário remarcado com sucesso para ${formatDatePtBR(rescheduleDate)} às ${rescheduleTime}h!`, 'success');
      
      // WhatsApp notification
      if (rescheduleNotifyWhatsApp) {
        const cleanPhone = rescheduleModalAppt.patientPhone.replace(/\D/g, '');
        const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const msg = `Olá *${rescheduleModalAppt.patientName}*!\n\nSeu agendamento de *${rescheduleModalAppt.serviceName}* na Clínica Dra. Elays Marinho foi *REMARCADO* com sucesso para:\n\n📅 *Nova Data:* ${formatDatePtBR(rescheduleDate)}\n⏰ *Novo Horário:* ${rescheduleTime}hs\n\nQualquer dúvida estamos à disposição! ✨`;
        window.open(`https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(msg)}`, '_blank');
      }

      setRescheduleModalAppt(null);
      setSelectedAppointment(null);
      onReload();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remarcar horário.', 'error');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Execute Delete Appointment
  const handleExecuteDeleteAppt = async () => {
    if (!deleteApptConfirm) return;
    setIsDeletingAppt(true);
    try {
      await api.deleteAppointment(deleteApptConfirm.id);
      showToast('Agendamento excluído da agenda com sucesso.', 'info');
      setDeleteApptConfirm(null);
      setSelectedAppointment(null);
      onReload();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir agendamento.', 'error');
    } finally {
      setIsDeletingAppt(false);
    }
  };

  // Open Delete Patient Modal
  const handleOpenDeletePatientModal = (appt: Appointment) => {
    const matchPatient = patients.find(p => p.phone === appt.patientPhone || p.name.toLowerCase() === appt.patientName.toLowerCase());
    const count = appointments.filter(a => a.patientPhone === appt.patientPhone || a.patientName.toLowerCase() === appt.patientName.toLowerCase()).length;
    
    if (matchPatient) {
      setDeletePatientConfirm({ patient: matchPatient, apptCount: count });
    } else {
      // Temporary patient object
      setDeletePatientConfirm({
        patient: {
          id: `temp-${Date.now()}`,
          name: appt.patientName,
          phone: appt.patientPhone,
          totalSessions: count,
          createdAt: appt.createdAt,
        },
        apptCount: count,
      });
    }
  };

  // Execute Delete Patient
  const handleExecuteDeletePatient = async () => {
    if (!deletePatientConfirm) return;
    setIsDeletingPatient(true);
    try {
      await api.deletePatient(deletePatientConfirm.patient.id, deletePatientWithAppointments);
      showToast(`Paciente "${deletePatientConfirm.patient.name}" excluído(a) com sucesso do sistema.`, 'info');
      setDeletePatientConfirm(null);
      setSelectedAppointment(null);
      onReload();
    } catch (err: any) {
      showToast(err.message || 'Erro ao deletar paciente.', 'error');
    } finally {
      setIsDeletingPatient(false);
    }
  };

  // Create Quick Booking
  const handleCreateQuickBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookingPatientName || !newBookingPatientPhone || !newBookingDate || !newBookingTime || !newBookingServiceId) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsCreatingBooking(true);
    try {
      await api.createAppointment({
        patientName: newBookingPatientName,
        patientPhone: newBookingPatientPhone,
        serviceId: newBookingServiceId,
        date: newBookingDate,
        time: newBookingTime,
        notes: newBookingNotes,
      });

      showToast(`Novo agendamento criado para ${newBookingPatientName} em ${formatDatePtBR(newBookingDate)} às ${newBookingTime}h!`, 'success');
      setIsNewBookingOpen(false);
      setNewBookingPatientName('');
      setNewBookingPatientPhone('');
      setNewBookingNotes('');
      onReload();
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar agendamento.', 'error');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  // Generate Week Days (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 = Dom, 1 = Seg ...
    const start = new Date(d);
    start.setDate(d.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + i);
      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(dayDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      
      const dayNameShort = dayDate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === currentDateStr;

      days.push({
        date: dayDate,
        dateStr,
        dayNum: dayDate.getDate(),
        dayNameShort,
        isToday,
        isSelected,
      });
    }
    return days;
  }, [currentDate, todayStr, currentDateStr]);

  // Hours list for Google Calendar Time Grid (06:00 to 22:00 + any custom appt hours)
  const hourSlots = useMemo(() => {
    const hoursSet = new Set<string>();
    // Default clinic time coverage from early morning (06:00) to late evening (22:00)
    for (let h = 6; h <= 22; h++) {
      hoursSet.add(`${String(h).padStart(2, '0')}:00`);
    }
    // Also include any hour present in existing appointments so nothing is ever omitted
    appointments.forEach((appt) => {
      if (appt.time) {
        const cleanT = appt.time.replace('h', ':').trim();
        const hourNum = parseInt(cleanT.split(':')[0], 10);
        if (!isNaN(hourNum) && hourNum >= 0 && hourNum <= 23) {
          hoursSet.add(`${String(hourNum).padStart(2, '0')}:00`);
        }
      }
    });
    return Array.from(hoursSet).sort((a, b) => {
      const numA = parseInt(a.split(':')[0], 10);
      const numB = parseInt(b.split(':')[0], 10);
      return numA - numB;
    });
  }, [appointments]);

  // Mini Calendar generation for current month
  const miniCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayIndex = firstDay.getDay(); // 0 = Sun

    const days = [];
    // Leading days from prev month
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, currentMonth: false });
    }
    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, currentMonth: true });
    }
    // Trailing days
    const total = days.length;
    const remaining = 35 - total > 0 ? 35 - total : (42 - total > 0 ? 42 - total : 0);
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, currentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Month View Days grid (35 or 42 cells)
  const monthViewDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayIndex = firstDay.getDay();

    const days = [];
    // Prev month days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      days.push({
        date: d,
        dateStr: `${y}-${m}-${dayNum}`,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: `${y}-${m}-${dayNum}` === todayStr,
      });
    }
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      days.push({
        date: d,
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }
    // Next month days
    const total = days.length;
    const remaining = 35 - total >= 0 ? 35 - total : 42 - total;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      days.push({
        date: d,
        dateStr: `${y}-${m}-${dayNum}`,
        dayNum: i,
        isCurrentMonth: false,
        isToday: `${y}-${m}-${dayNum}` === todayStr,
      });
    }
    return days;
  }, [currentDate, todayStr]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      pilates: 0,
      fisioterapia: 0,
      avaliacao: 0,
      rpg: 0,
      massoterapia: 0,
      outros: 0,
    };
    appointments.forEach(a => {
      if (a.status !== 'cancelado') {
        const cat = getAppointmentCategory(a, services);
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [appointments, services]);

  // Today stats
  const todayStats = useMemo(() => {
    const todayAppts = appointments.filter(a => a.date === todayStr && a.status !== 'cancelado');
    const checkedIn = todayAppts.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca');
    const pending = todayAppts.filter(a => a.status === 'agendado' && a.attendanceStatus !== 'presenca');
    const faltas = todayAppts.filter(a => a.status === 'falta' || a.attendanceStatus === 'falta');
    return {
      total: todayAppts.length,
      checkedIn: checkedIn.length,
      pending: pending.length,
      faltas: faltas.length,
    };
  }, [appointments, todayStr]);

  return (
    <div id="admin-google-calendar-root" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col min-h-[820px]">
      
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`px-5 py-3 text-xs font-bold flex items-center justify-between transition-all ${
          actionFeedback.type === 'success' ? 'bg-emerald-600 text-white' :
          actionFeedback.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP GOOGLE CALENDAR HEADER BAR */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        
        {/* Left Side: Logo/Brand & Navigation Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2.5 mr-2">
            <div className="w-9 h-9 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h2 className="text-sm font-black text-slate-800 tracking-tight">Agenda Dra. Elays</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                  Ao Vivo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Google Calendar Model • Fisiolys</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              id="btn-calendar-prev"
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
              title="Período anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="btn-calendar-today"
              type="button"
              onClick={handleToday}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                currentDateStr === todayStr
                  ? 'bg-[#31523D] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Hoje
            </button>
            <button
              id="btn-calendar-next"
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
              title="Próximo período"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-sm sm:text-base font-black text-slate-800 tracking-tight pl-2">
            {headerTitle}
          </div>
        </div>

        {/* Right Side: Search, View Mode Switcher & New Appointment Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar paciente, CPF, serviço..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D] w-48 sm:w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle (Dia / Semana / Mês / Agenda) */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-2xl border border-slate-300/80 text-xs font-bold">
            <button
              id="btn-view-day"
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-[#31523D] font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Dia</span>
            </button>

            <button
              id="btn-view-week"
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-[#31523D] font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>

            <button
              id="btn-view-month"
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-[#31523D] font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>

            <button
              id="btn-view-schedule"
              type="button"
              onClick={() => setViewMode('schedule')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${
                viewMode === 'schedule'
                  ? 'bg-white text-[#31523D] font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* New Booking Button */}
          <button
            id="btn-new-google-calendar-booking"
            type="button"
            onClick={() => {
              setNewBookingDate(currentDateStr);
              setIsNewBookingOpen(true);
            }}
            className="px-4 py-2 rounded-2xl font-black text-xs bg-[#31523D] hover:bg-[#223a2b] text-white shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D0A73B]" />
            <span>Criar Agendamento</span>
          </button>
        </div>

      </div>

      {/* BODY: SIDEBAR + MAIN CALENDAR CANVAS */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT SIDEBAR (Mini Calendar, Categories, Presence Check-in Filter) */}
        <div className={`w-full lg:w-72 border-r border-slate-200 bg-slate-50/40 p-4 space-y-5 shrink-0 ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
          
          {/* MINI CALENDAR PICKER */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-800">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => {
                    const prevM = new Date(currentDate);
                    prevM.setMonth(prevM.getMonth() - 1);
                    setCurrentDate(prevM);
                  }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextM = new Date(currentDate);
                    nextM.setMonth(nextM.getMonth() + 1);
                    setCurrentDate(nextM);
                  }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 mb-1">
              <span>D</span>
              <span>S</span>
              <span>T</span>
              <span>Q</span>
              <span>Q</span>
              <span>S</span>
              <span>S</span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {miniCalendarDays.map((item, idx) => {
                const dayDateStr = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}-${String(item.date.getDate()).padStart(2, '0')}`;
                const isSelected = dayDateStr === currentDateStr;
                const isToday = dayDateStr === todayStr;
                const hasAppointments = appointments.some(a => a.date === dayDateStr && a.status !== 'cancelado');

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentDate(item.date)}
                    className={`h-7 w-7 mx-auto rounded-full text-[11px] font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#31523D] text-white shadow-2xs font-black'
                        : isToday
                        ? 'bg-[#D0A73B]/20 text-[#31523D] font-black border border-[#D0A73B]'
                        : item.currentMonth
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300'
                    }`}
                  >
                    <span>{item.date.getDate()}</span>
                    {hasAppointments && (
                      <span className={`w-1 h-1 rounded-full absolute bottom-0.5 ${isSelected ? 'bg-[#D0A73B]' : 'bg-emerald-500'}`}></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CHECK-IN & PRESENCE STATUS TODAY CARD */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <span>Presença & Check-in Hoje</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">{todayStats.total} agendados</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <span className="block text-xs font-black text-emerald-800">{todayStats.checkedIn}</span>
                <span className="text-[9px] font-bold text-emerald-700 uppercase">Presentes</span>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                <span className="block text-xs font-black text-amber-800">{todayStats.pending}</span>
                <span className="text-[9px] font-bold text-amber-700 uppercase">Aguardando</span>
              </div>
              <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                <span className="block text-xs font-black text-rose-800">{todayStats.faltas}</span>
                <span className="text-[9px] font-bold text-rose-700 uppercase">Faltas</span>
              </div>
            </div>

            {/* Filter by presence */}
            <div className="pt-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">Exibir Todos os Status</option>
                <option value="presenca">✅ Apenas Presenças Confirmadas</option>
                <option value="agendado">🟡 Apenas Agendados (Pendentes)</option>
                <option value="falta">❌ Apenas Faltas</option>
              </select>
            </div>
          </div>

          {/* CATEGORIES / COLOR CODING (PILATES = LARANJA, FISIOTERAPIA = VERDE, ETC.) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-[#31523D]" />
                <span>Modalidades por Cor</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const allSelected = Object.values(selectedCategories).every(v => v);
                  const updated: any = {};
                  Object.keys(selectedCategories).forEach(k => { updated[k] = !allSelected; });
                  setSelectedCategories(updated);
                }}
                className="text-[10px] font-bold text-teal-700 hover:underline"
              >
                Alternar
              </button>
            </div>

            <div className="space-y-1.5">
              {(Object.keys(CATEGORY_COLORS) as CategoryKey[]).map((catKey) => {
                const def = CATEGORY_COLORS[catKey];
                const count = categoryCounts[catKey] || 0;
                const isChecked = selectedCategories[catKey];

                return (
                  <label
                    key={catKey}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition-all ${
                      isChecked ? 'bg-slate-50 hover:bg-slate-100' : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setSelectedCategories(prev => ({ ...prev, [catKey]: e.target.checked }))}
                        className="rounded text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: def.hex }}></span>
                      <span className="text-xs font-bold text-slate-700">
                        {catKey === 'pilates' && 'Pilates (Laranja)'}
                        {catKey === 'fisioterapia' && 'Fisioterapia (Verde)'}
                        {catKey === 'avaliacao' && 'Avaliação Inicial (Azul)'}
                        {catKey === 'rpg' && 'RPG & Postura (Roxo)'}
                        {catKey === 'massoterapia' && 'Massoterapia (Rosa)'}
                        {catKey === 'outros' && 'Demais Serviços (Dourado)'}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* QUICK ACTIONS & SHORTCUTS */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-1.5">
            <span className="text-[11px] font-black text-emerald-900 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dicas de Gestão Rápida</span>
            </span>
            <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
              Clique em qualquer agendamento para <strong>confirmar presença</strong>, <strong>remarcar horário</strong> ou <strong>deletar paciente</strong>.
            </p>
          </div>

        </div>

        {/* MAIN CALENDAR DISPLAY AREA */}
        <div className="flex-1 flex flex-col overflow-y-auto min-h-[700px] p-4 bg-slate-100/40 pb-36">
          
          {/* 1. DAY VIEW (DIA) */}
          {viewMode === 'day' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-xs text-slate-500">Linha do tempo completa de atendimentos e encaixes do dia.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewBookingDate(currentDateStr);
                    setIsNewBookingOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#31523D] text-white hover:bg-[#223a2b] flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D0A73B]" />
                  <span>Novo Encaixe Hoje</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {hourSlots.map((hour) => {
                  const hourAppts = filteredAppointments.filter((a) => {
                    if (a.date !== currentDateStr) return false;
                    if (!a.time) return false;
                    const cleanT = a.time.replace('h', ':').trim();
                    const apptHour = parseInt(cleanT.split(':')[0], 10);
                    const slotHour = parseInt(hour.split(':')[0], 10);
                    return apptHour === slotHour;
                  });

                  return (
                    <div key={hour} className="flex group hover:bg-slate-50/60 transition-all">
                      
                      {/* Hour Label */}
                      <div className="w-20 sm:w-24 p-3.5 border-r border-slate-100 text-right shrink-0">
                        <span className="text-xs font-mono font-black text-slate-500">{hour}</span>
                      </div>

                      {/* Hour Slot Content */}
                      <div className="flex-1 p-2 sm:p-3 min-h-[68px] flex flex-col justify-center">
                        {hourAppts.length === 0 ? (
                          <div
                            onClick={() => {
                              setNewBookingDate(currentDateStr);
                              setNewBookingTime(hour);
                              setIsNewBookingOpen(true);
                            }}
                            className="h-full w-full rounded-xl border border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 p-2 flex items-center justify-between cursor-pointer transition-all text-slate-400 hover:text-emerald-700 text-xs font-medium"
                          >
                            <span className="text-[11px] text-slate-400 group-hover:text-emerald-700">
                              + Horário vago (Clique para agendar às {hour})
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-300 group-hover:text-emerald-600">
                              Livre
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {hourAppts.map((appt) => {
                              const cat = getAppointmentCategory(appt, services);
                              const colorDef = CATEGORY_COLORS[cat];
                              const stats = getPatientSessionStats(appt);
                              const isCheckedIn = appt.attendanceStatus === 'presenca' || appt.status === 'concluido';

                              return (
                                <div
                                  key={appt.id}
                                  onClick={() => setSelectedAppointment(appt)}
                                  className={`p-3 rounded-xl border cursor-pointer shadow-2xs hover:shadow-xs transition-all ${colorDef.cardBg} ${colorDef.cardBorder}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs font-mono font-black text-slate-900 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs">
                                          {appt.time}h
                                        </span>
                                        <h4 className="text-sm font-black text-slate-900 truncate">
                                          {appt.patientName}
                                        </h4>
                                      </div>
                                      <p className="text-xs font-bold mt-0.5" style={{ color: colorDef.accentColor }}>
                                        {appt.serviceName}
                                      </p>
                                    </div>

                                    {/* Check-in Presence Badge */}
                                    <div className="shrink-0">
                                      {isCheckedIn ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white flex items-center space-x-1 shadow-2xs">
                                          <Check className="w-3 h-3" />
                                          <span>Presença OK</span>
                                        </span>
                                      ) : appt.status === 'falta' ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white flex items-center space-x-1">
                                          <X className="w-3 h-3" />
                                          <span>Falta</span>
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-900 border border-amber-300">
                                          Aguardando Check-in
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Progress / Sessions completed banner */}
                                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-slate-700">
                                      {cat === 'fisioterapia' && `🩺 ${stats.totalPhysio} sessões de Fisio realizadas`}
                                      {cat === 'pilates' && `🧘 ${stats.totalPilates} sessões de Pilates realizadas`}
                                      {cat !== 'fisioterapia' && cat !== 'pilates' && `📋 ${stats.totalCompleted} atendimentos realizados`}
                                    </span>
                                    <span className="font-bold text-slate-500 text-[10px]">
                                      {appt.patientPhone}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Safety Net: Any Appointments Today Outside Regular Slots */}
              {(() => {
                const todayAppts = filteredAppointments.filter(a => a.date === currentDateStr);
                const unslotted = todayAppts.filter(a => {
                  if (!a.time) return true;
                  const cleanT = a.time.replace('h', ':').trim();
                  const hourNum = parseInt(cleanT.split(':')[0], 10);
                  return isNaN(hourNum);
                });

                if (unslotted.length > 0) {
                  return (
                    <div className="p-4 bg-amber-50/80 border-t border-amber-200">
                      <div className="flex items-center space-x-2 text-xs font-black text-amber-900 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Outros Agendamentos de Hoje ({unslotted.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {unslotted.map(appt => (
                          <div
                            key={appt.id}
                            onClick={() => setSelectedAppointment(appt)}
                            className="p-3 bg-white rounded-xl border border-amber-200 cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            <span className="text-xs font-black text-slate-800">{appt.patientName}</span>
                            <span className="block text-[11px] text-amber-800">{appt.serviceName} • {appt.time || 'Sem horário'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

            </div>
          )}

          {/* 2. WEEK VIEW (SEMANA GOOGLE CALENDAR GRID) */}
          {viewMode === 'week' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col flex-1">
              
              {/* Day Headers Row */}
              <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-center sticky top-0 z-10">
                <div className="p-3 border-r border-slate-200 text-xs font-black text-slate-400 flex items-center justify-center">
                  Horário
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      setCurrentDate(day.date);
                      setViewMode('day');
                    }}
                    className={`p-2.5 border-r border-slate-200 last:border-r-0 cursor-pointer hover:bg-slate-100/80 transition-all ${
                      day.isToday ? 'bg-[#D0A73B]/10' : ''
                    }`}
                  >
                    <span className="block text-[10px] font-black uppercase text-slate-400">
                      {day.dayNameShort}
                    </span>
                    <div className="mt-1 flex items-center justify-center">
                      <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center ${
                        day.isToday
                          ? 'bg-[#31523D] text-[#D0A73B] shadow-2xs'
                          : day.isSelected
                          ? 'bg-slate-300 text-slate-800'
                          : 'text-slate-800'
                      }`}>
                        {day.dayNum}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hourly Grid Rows */}
              <div className="divide-y divide-slate-100 overflow-y-auto">
                {hourSlots.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 min-h-[72px] hover:bg-slate-50/40 transition-all">
                    
                    {/* Time Column */}
                    <div className="p-2 border-r border-slate-100 text-right font-mono text-[11px] font-bold text-slate-400 flex items-start justify-end">
                      {hour}
                    </div>

                    {/* 7 Days Columns */}
                    {weekDays.map((day) => {
                      const slotAppts = filteredAppointments.filter((a) => {
                        if (a.date !== day.dateStr) return false;
                        if (!a.time) return false;
                        const cleanT = a.time.replace('h', ':').trim();
                        const apptHour = parseInt(cleanT.split(':')[0], 10);
                        const slotHour = parseInt(hour.split(':')[0], 10);
                        return apptHour === slotHour;
                      });

                      return (
                        <div
                          key={day.dateStr}
                          onClick={(e) => {
                            if (slotAppts.length === 0) {
                              setNewBookingDate(day.dateStr);
                              setNewBookingTime(hour);
                              setIsNewBookingOpen(true);
                            }
                          }}
                          className={`p-1 border-r border-slate-100 last:border-r-0 relative transition-all ${
                            day.isToday ? 'bg-[#D0A73B]/5' : ''
                          } ${slotAppts.length === 0 ? 'hover:bg-emerald-50/40 cursor-pointer' : ''}`}
                        >
                          {slotAppts.map((appt) => {
                            const cat = getAppointmentCategory(appt, services);
                            const colorDef = CATEGORY_COLORS[cat];
                            const isCheckedIn = appt.attendanceStatus === 'presenca' || appt.status === 'concluido';

                            return (
                              <div
                                key={appt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppointment(appt);
                                }}
                                className={`mb-1 p-1.5 rounded-lg border text-left cursor-pointer transition-all shadow-2xs hover:scale-101 ${colorDef.cardBg} ${colorDef.cardBorder}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-black text-slate-900 bg-white/80 px-1 rounded">
                                    {appt.time}
                                  </span>
                                  {isCheckedIn && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] shadow-2xs" title="Presença confirmada!">
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-black text-slate-900 truncate mt-0.5">
                                  {appt.patientName}
                                </div>
                                <div className="text-[10px] font-bold truncate" style={{ color: colorDef.accentColor }}>
                                  {appt.serviceName}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* 3. MONTH VIEW (MÊS GOOGLE CALENDAR GRID) */}
          {viewMode === 'month' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col flex-1">
              
              {/* Day Name Header */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center font-black text-[11px] text-slate-500 uppercase py-2">
                <span>Domingo</span>
                <span>Segunda</span>
                <span>Terça</span>
                <span>Quarta</span>
                <span>Quinta</span>
                <span>Sexta</span>
                <span>Sábado</span>
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-slate-100">
                {monthViewDays.map((cell, idx) => {
                  const cellAppts = filteredAppointments.filter((a) => a.date === cell.dateStr);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentDate(cell.date);
                        setViewMode('day');
                      }}
                      className={`min-h-[105px] p-1.5 flex flex-col justify-between transition-all hover:bg-slate-50 cursor-pointer ${
                        !cell.isCurrentMonth ? 'bg-slate-50/60 opacity-50' : 'bg-white'
                      } ${cell.isToday ? 'bg-[#D0A73B]/10' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-[#31523D] text-[#D0A73B] shadow-2xs'
                            : 'text-slate-700'
                        }`}>
                          {cell.dayNum}
                        </span>
                        {cellAppts.length > 0 && (
                          <span className="text-[10px] font-black text-slate-400">
                            {cellAppts.length} {cellAppts.length === 1 ? 'atend.' : 'atend.'}
                          </span>
                        )}
                      </div>

                      {/* Event chips */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {cellAppts.slice(0, 3).map((appt) => {
                          const cat = getAppointmentCategory(appt, services);
                          const colorDef = CATEGORY_COLORS[cat];
                          const isCheckedIn = appt.attendanceStatus === 'presenca' || appt.status === 'concluido';

                          return (
                            <div
                              key={appt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointment(appt);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold truncate flex items-center justify-between border ${colorDef.cardBg} ${colorDef.cardBorder}`}
                            >
                              <span className="truncate">
                                {appt.time} {appt.patientName}
                              </span>
                              {isCheckedIn && <span className="text-emerald-700 ml-1 font-black">✓</span>}
                            </div>
                          );
                        })}

                        {cellAppts.length > 3 && (
                          <span className="block text-[9px] font-extrabold text-slate-500 pl-1">
                            +{cellAppts.length - 3} mais...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* 4. SCHEDULE / LIST VIEW (COMPROMISSOS) */}
          {viewMode === 'schedule' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Lista Completa de Atendimentos Agendados</h3>
                  <p className="text-xs text-slate-500">Visualização cronológica com histórico de presenças e controle de sessões.</p>
                </div>
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-700">
                  {filteredAppointments.length} Registros
                </span>
              </div>

              {filteredAppointments.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Nenhum agendamento localizado para os filtros selecionados.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAppointments
                    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
                    .map((appt) => {
                      const cat = getAppointmentCategory(appt, services);
                      const colorDef = CATEGORY_COLORS[cat];
                      const stats = getPatientSessionStats(appt);
                      const isCheckedIn = appt.attendanceStatus === 'presenca' || appt.status === 'concluido';

                      return (
                        <div
                          key={appt.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 p-2 rounded-xl transition-all"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="text-center shrink-0 w-20">
                              <span className="block text-[10px] font-black uppercase text-slate-400">
                                {formatDatePtBR(appt.date)}
                              </span>
                              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-[#31523D] text-[#D0A73B] inline-block mt-0.5">
                                {appt.time} hs
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-black text-slate-900">{appt.patientName}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  cat === 'pilates' ? 'bg-orange-100 text-orange-800' :
                                  cat === 'fisioterapia' ? 'bg-emerald-100 text-emerald-800' :
                                  cat === 'avaliacao' ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {appt.serviceName}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 mt-0.5">
                                <Phone className="w-3 h-3 inline mr-1 text-slate-400" />
                                <span>{appt.patientPhone}</span>
                                {appt.patientCpf && <span className="ml-2">• CPF: {appt.patientCpf}</span>}
                              </p>

                              {/* Live Presence indicator */}
                              <div className="mt-1 text-[11px] font-semibold text-slate-700 flex items-center space-x-2">
                                {isCheckedIn ? (
                                  <span className="text-emerald-700 font-bold flex items-center space-x-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Presença Confirmada</span>
                                  </span>
                                ) : appt.status === 'falta' ? (
                                  <span className="text-rose-700 font-bold flex items-center space-x-1">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Falta Registrada</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-bold">🟡 Aguardando Check-in</span>
                                )}
                                <span>•</span>
                                <span className="text-slate-600">
                                  {stats.totalCompleted} sessões realizadas no histórico
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 justify-end">
                            <button
                              type="button"
                              onClick={() => sendWhatsAppReminder(appt)}
                              className="p-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1ebe5d] transition-all shadow-2xs"
                              title="Enviar WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenRescheduleModal(appt)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center space-x-1"
                              title="Remarcar horário"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-500" />
                              <span>Remarcar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedAppointment(appt)}
                              className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#31523D] text-white hover:bg-[#223a2b]"
                            >
                              Detalhes
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: APPOINTMENT DETAILS & FULL ACTIONS */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            {(() => {
              const cat = getAppointmentCategory(selectedAppointment, services);
              const colorDef = CATEGORY_COLORS[cat];
              const stats = getPatientSessionStats(selectedAppointment);
              const isCheckedIn = selectedAppointment.attendanceStatus === 'presenca' || selectedAppointment.status === 'concluido';

              return (
                <>
                  <div className={`p-5 text-white flex items-center justify-between ${colorDef.badgeBg}`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                          {colorDef.label}
                        </span>
                        <h3 className="text-lg font-black text-white leading-tight mt-0.5">
                          {selectedAppointment.patientName}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedAppointment(null)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    
                    {/* Check-in Presence Box */}
                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      isCheckedIn
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : selectedAppointment.status === 'falta'
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isCheckedIn ? 'bg-emerald-600 text-white' : selectedAppointment.status === 'falta' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {isCheckedIn ? <Check className="w-4 h-4" /> : selectedAppointment.status === 'falta' ? <X className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider">
                            {isCheckedIn ? '✅ Presença Confirmada (Check-in Realizado)' : selectedAppointment.status === 'falta' ? '❌ Falta Registrada' : '🟡 Aguardando Presença'}
                          </span>
                          <p className="text-xs mt-0.5 text-slate-700">
                            {isCheckedIn
                              ? `Check-in registrado com sucesso às ${selectedAppointment.time}h.`
                              : 'O paciente ainda não confirmou presença na clínica.'}
                          </p>
                        </div>
                      </div>

                      {/* Quick checkin / presence toggle */}
                      {!isCheckedIn && (
                        <button
                          type="button"
                          onClick={() => handleCheckInPresence(selectedAppointment)}
                          className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs shrink-0 cursor-pointer"
                        >
                          Confirmar Presença
                        </button>
                      )}
                    </div>

                    {/* Physiotherapy & Pilates historical session counts */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center space-x-1.5">
                          <Activity className="w-4 h-4 text-emerald-600" />
                          <span>Histórico de Fisioterapia & Pilates</span>
                        </span>
                        <span className="font-black text-slate-900">{stats.totalCompleted} sessões totais</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Sessões de Fisioterapia</span>
                          <span className="text-base font-black text-emerald-800">{stats.totalPhysio} realizadas</span>
                          {stats.physioDates.length > 0 && (
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                              Últimas: {stats.physioDates.slice(-3).join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Sessões de Pilates</span>
                          <span className="text-base font-black text-orange-700">{stats.totalPilates} realizadas</span>
                          {stats.pilatesDates.length > 0 && (
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                              Últimas: {stats.pilatesDates.slice(-3).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Appointment Info Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div
                        onClick={() => handleOpenEditModal(selectedAppointment)}
                        className="bg-slate-50 hover:bg-amber-50/50 p-3 rounded-xl border border-slate-200 hover:border-amber-300 cursor-pointer transition-all group"
                        title="Clique para alterar data e horário"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Data e Horário</span>
                          <span className="text-[10px] text-amber-700 font-bold opacity-80 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                            <Pencil className="w-2.5 h-2.5" /> Editar
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {formatDatePtBR(selectedAppointment.date)} às {selectedAppointment.time}h
                        </span>
                      </div>

                      <div
                        onClick={() => handleOpenEditModal(selectedAppointment)}
                        className="bg-slate-50 hover:bg-amber-50/50 p-3 rounded-xl border border-slate-200 hover:border-amber-300 cursor-pointer transition-all group"
                        title="Clique para mudar o procedimento e valor"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Procedimento & Valor</span>
                          <span className="text-[10px] text-amber-700 font-bold opacity-80 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                            <Pencil className="w-2.5 h-2.5" /> Alterar
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {selectedAppointment.serviceName} • {formatCurrency(selectedAppointment.servicePrice)}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Telefone / WhatsApp</span>
                        <span className="font-extrabold text-slate-800">
                          {selectedAppointment.patientPhone}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">CPF Cadastrado</span>
                        <span className="font-extrabold text-slate-800">
                          {selectedAppointment.patientCpf || 'Não informado'}
                        </span>
                      </div>
                    </div>

                    {selectedAppointment.notes && (
                      <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs">
                        <span className="text-[10px] uppercase font-bold text-amber-800 block">Observações do Atendimento</span>
                        <p className="text-slate-800 mt-0.5">{selectedAppointment.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons Grid */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      
                      {/* Send WhatsApp */}
                      <button
                        type="button"
                        onClick={() => sendWhatsAppReminder(selectedAppointment)}
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-[#25D366] hover:bg-[#1ebe5d] text-white flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>

                      {/* Reschedule Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenRescheduleModal(selectedAppointment)}
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-[#31523D] hover:bg-[#223a2b] text-white flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-[#D0A73B]" />
                        <span>Remarcar</span>
                      </button>

                      {/* Edit Appointment Button */}
                      <button
                        type="button"
                        id="btn-edit-appointment-primary"
                        onClick={() => handleOpenEditModal(selectedAppointment)}
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-[#B08A3E] hover:bg-[#8e6e2f] text-white flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer transition-all"
                        title="Editar data, horário, procedimento ou dados"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Editar</span>
                      </button>

                    </div>

                    {/* Secondary Actions (Mark Absence, Delete Appointment, Delete Patient, Edit) */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      
                      <div className="flex items-center space-x-2">
                        {selectedAppointment.status !== 'falta' && (
                          <button
                            type="button"
                            onClick={() => handleMarkAbsence(selectedAppointment)}
                            className="px-3 py-1.5 rounded-xl font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                          >
                            Registrar Falta
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteApptConfirm(selectedAppointment)}
                          className="px-3 py-1.5 rounded-xl font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                          <span>Excluir</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Edit Button (Bottom Row requested by user) */}
                        <button
                          type="button"
                          id="btn-edit-appointment-secondary"
                          onClick={() => handleOpenEditModal(selectedAppointment)}
                          className="px-3 py-1.5 rounded-xl font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center space-x-1 cursor-pointer transition-all shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                          <span>Editar</span>
                        </button>

                        {/* Delete Patient Option */}
                        <button
                          type="button"
                          onClick={() => handleOpenDeletePatientModal(selectedAppointment)}
                          className="px-3 py-1.5 rounded-xl font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Deletar Paciente</span>
                        </button>
                      </div>

                    </div>

                  </div>
                </>
              );
            })()}

          </div>
        </div>
      )}

      {/* MODAL 2: EDIT APPOINTMENT DETAILS & PROCEDURE (ALTERAR DATA, HORÁRIO E PROCEDIMENTO) */}
      {editModalAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Editar Agendamento</h3>
                  <p className="text-xs text-slate-500">Altere a data, horário, procedimento ou dados do paciente.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalAppt(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteEditAppointment();
              }}
              className="space-y-4"
            >
              {/* Patient Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Paciente *</label>
                  <input
                    type="text"
                    required
                    value={editPatientName}
                    onChange={(e) => setEditPatientName(e.target.value)}
                    placeholder="Nome completo do paciente"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={editPatientPhone}
                    onChange={(e) => setEditPatientPhone(e.target.value)}
                    placeholder="(93) 99999-9999"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
                  />
                </div>
              </div>

              {/* Service / Procedure Selection */}
              <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Opção de Procedimento & Tratamento *</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">Alterar serviço</span>
                </div>
                
                <select
                  value={editServiceId}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    setEditServiceId(chosenId);
                    const serv = services.find(s => s.id === chosenId);
                    if (serv) {
                      setEditServiceName(serv.name);
                      setEditServicePrice(serv.price);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min) — {formatCurrency(s.price)}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Nome do Procedimento</label>
                    <input
                      type="text"
                      value={editServiceName}
                      onChange={(e) => setEditServiceName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Valor Cobrado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editServicePrice}
                      onChange={(e) => setEditServicePrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Data do Atendimento *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Horário *</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
                  />
                </div>
              </div>

              {/* Quick Hours Suggestions Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">Horários rápidos:</span>
                {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setEditTime(h)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      editTime === h
                        ? 'bg-[#31523D] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>

              {/* CPF & Presence Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CPF do Paciente (Opcional)</label>
                  <input
                    type="text"
                    value={editPatientCpf}
                    onChange={(e) => setEditPatientCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status de Presença</label>
                  <select
                    value={editAttendanceStatus}
                    onChange={(e) => {
                      const val = e.target.value as 'presenca' | 'falta' | 'pendente';
                      setEditAttendanceStatus(val);
                      if (val === 'presenca') setEditStatus('concluido');
                      else if (val === 'falta') setEditStatus('falta');
                      else setEditStatus('agendado');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="pendente">🟡 Aguardando Presença (Agendado)</option>
                    <option value="presenca">✅ Presença Confirmada (Concluído)</option>
                    <option value="falta">❌ Falta Registrada</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações Clínicas / Anotações</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Paciente solicitou alteração de procedimento, plano de sessões..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                />
              </div>

              {/* WhatsApp Notification Checkbox */}
              <div className="flex items-center space-x-2 pt-1 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
                <input
                  type="checkbox"
                  id="chk-notify-edit"
                  checked={editNotifyWhatsApp}
                  onChange={(e) => setEditNotifyWhatsApp(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="chk-notify-edit" className="text-xs font-bold text-emerald-950 cursor-pointer">
                  Avisar paciente no WhatsApp sobre a alteração (data, horário e procedimento)
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModalAppt(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#B08A3E] hover:bg-[#8e6e2f] text-white shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? 'Salvando Alterações...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: RESCHEDULE APPOINTMENT (REMARCAR HORÁRIO) */}
      {rescheduleModalAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Remarcar Atendimento</h3>
                  <p className="text-xs text-slate-500">Altere o dia e o horário do paciente na agenda.</p>
                </div>
              </div>
              <button onClick={() => setRescheduleModalAppt(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-slate-700 block">Paciente: {rescheduleModalAppt.patientName}</span>
              <span className="text-slate-600 block">Procedimento: {rescheduleModalAppt.serviceName}</span>
              <span className="text-slate-500 block">Horário Atual: {formatDatePtBR(rescheduleModalAppt.date)} às {rescheduleModalAppt.time}h</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteReschedule();
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nova Data</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Novo Horário</label>
                <input
                  type="time"
                  required
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo da Remarcação (Opcional)</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Ex: Solicitação do paciente / Ajuste médico"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-notify-reschedule"
                  checked={rescheduleNotifyWhatsApp}
                  onChange={(e) => setRescheduleNotifyWhatsApp(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <label htmlFor="chk-notify-reschedule" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Abrir WhatsApp para avisar o paciente sobre a nova data
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalAppt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRescheduling}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-[#31523D] hover:bg-[#223a2b] text-white shadow-xs"
                >
                  {isRescheduling ? 'Salvando...' : 'Confirmar Remarcação'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: DELETE APPOINTMENT CONFIRMATION */}
      {deleteApptConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-800">Excluir Agendamento?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Deseja remover o agendamento de <strong>{deleteApptConfirm.patientName}</strong> no dia {formatDatePtBR(deleteApptConfirm.date)} às {deleteApptConfirm.time}h?
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteApptConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingAppt}
                onClick={handleExecuteDeleteAppt}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isDeletingAppt ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE PATIENT CONFIRMATION (DELETAR PACIENTE) */}
      {deletePatientConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Excluir Cadastro do Paciente</h3>
                <p className="text-xs text-rose-600 font-bold">Esta ação é irreversível.</p>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-2xl text-xs space-y-1.5 text-slate-800">
              <p>
                Você está prestes a excluir permanentemente o(a) paciente <strong>{deletePatientConfirm.patient.name}</strong> ({deletePatientConfirm.patient.phone}).
              </p>
              <p className="text-[11px] text-slate-600">
                Total de agendamentos vinculados a este paciente: <strong>{deletePatientConfirm.apptCount}</strong>
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="chk-del-appts"
                checked={deletePatientWithAppointments}
                onChange={(e) => setDeletePatientWithAppointments(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
              />
              <label htmlFor="chk-del-appts" className="text-xs font-bold text-slate-700 cursor-pointer">
                Excluir também todos os agendamentos e histórico deste paciente na agenda
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletePatientConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingPatient}
                onClick={handleExecuteDeletePatient}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isDeletingPatient ? 'Excluindo...' : 'Sim, Deletar Paciente'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 5: QUICK NEW APPOINTMENT CREATION */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Criar Novo Agendamento</h3>
                  <p className="text-xs text-slate-500">Adicione um novo paciente ou encaixe direto na grade.</p>
                </div>
              </div>
              <button onClick={() => setIsNewBookingOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickBooking} className="space-y-3.5">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Paciente *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do paciente..."
                  value={newBookingPatientName}
                  onChange={(e) => setNewBookingPatientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="(93) 99999-9999"
                    value={newBookingPatientPhone}
                    onChange={(e) => setNewBookingPatientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Procedimento *</label>
                  <select
                    required
                    value={newBookingServiceId}
                    onChange={(e) => setNewBookingServiceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrency(s.price)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={newBookingDate}
                    onChange={(e) => setNewBookingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horário *</label>
                  <input
                    type="time"
                    required
                    value={newBookingTime}
                    onChange={(e) => setNewBookingTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações do Encaixe</label>
                <input
                  type="text"
                  placeholder="Ex: Primeira avaliação, dor lombar, indicação..."
                  value={newBookingNotes}
                  onChange={(e) => setNewBookingNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBooking}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-[#31523D] hover:bg-[#223a2b] text-white shadow-xs"
                >
                  {isCreatingBooking ? 'Agendando...' : 'Salvar Agendamento'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
