import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Appointment, Service, ScheduleConfig, ClinicConfig, Patient, AdminTab, AppointmentStatus, LoyaltyMember } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR } from '../../utils/qrUtils';
import { AdminServices } from './AdminServices';
import { AdminSchedule } from './AdminSchedule';
import { AdminPatients } from './AdminPatients';
import { AdminLoyalty } from './AdminLoyalty';
import { AdminFinancial } from './AdminFinancial';
import { AdminQRCode } from './AdminQRCode';
import { AdminWebhook } from './AdminWebhook';
import { AdminWhatsApp } from './AdminWhatsApp';
import { AdminToasts } from './AdminToasts';
import { AdminSettings } from './AdminSettings';
import { AdminGoogleCalendarAgenda, CalendarViewType } from './AdminGoogleCalendarAgenda';
import { FisiolysCRM } from '../crm/FisiolysCRM';
import { verifyFinancialPassword, getFinancialPassword } from '../../utils/securityUtils';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Calendar,
  Briefcase,
  Clock,
  Users,
  Crown,
  QrCode,
  Radio,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Grid,
  List,
  MessageSquare,
  Phone,
  Lock,
  ShieldCheck,
  X,
  Settings,
  Brain,
  ClipboardList,
  Tag,
  Palette,
  Database,
  BookOpen
} from 'lucide-react';

interface AdminDashboardProps {
  clinic: ClinicConfig;
  services: Service[];
  schedule: ScheduleConfig;
  appointments: Appointment[];
  patients: Patient[];
  initialTab?: AdminTab;
  onReload: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clinic,
  services,
  schedule,
  appointments,
  patients,
  initialTab,
  onReload,
}) => {
  // Normalize initialTab to one of the 5 main areas
  const getNormalizedTab = (tab?: AdminTab): AdminTab => {
    if (!tab) return 'agenda';
    if (tab === 'dashboard' || tab === 'fidelidade') return 'financeiro';
    if (tab === 'horarios') return 'agenda';
    if (tab === 'pacientes') return 'prontuario';
    if (tab === 'whatsapp' || tab === 'webhook') return 'crm';
    if (tab === 'qrcode') return 'configuracoes';
    return tab;
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(getNormalizedTab(initialTab));
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateScope, setDateScope] = useState<'day' | 'week' | 'all'>('day');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [agendaViewMode, setAgendaViewMode] = useState<'grid' | 'list'>('grid');
  const [searchPatientQuery, setSearchPatientQuery] = useState<string>('');

  // Subtabs state for the 5 areas
  const [agendaSubTab, setAgendaSubTab] = useState<'calendario' | 'horarios' | 'tarefas'>(
    initialTab === 'horarios' ? 'horarios' : 'calendario'
  );
  const [prontuarioSubTab, setProntuarioSubTab] = useState<'avaliacoes' | 'evolucoes' | 'pacientes' | 'tcle' | 'templates'>(
    initialTab === 'pacientes' ? 'pacientes' : 'avaliacoes'
  );
  const [financeiroSubTab, setFinanceiroSubTab] = useState<'visao_geral' | 'pagamentos' | 'fidelidade'>(
    initialTab === 'fidelidade' ? 'fidelidade' : 'visao_geral'
  );
  const [crmSubTab, setCrmSubTab] = useState<'leads' | 'whatsapp' | 'webhook' | 'ia_clinica' | 'templates'>(
    initialTab === 'whatsapp' ? 'whatsapp' : initialTab === 'webhook' ? 'webhook' : 'leads'
  );

  // Synchronize when parent passes updated initialTab
  useEffect(() => {
    if (initialTab) {
      const norm = getNormalizedTab(initialTab);
      setActiveTab(norm);
      if (initialTab === 'horarios') setAgendaSubTab('horarios');
      if (initialTab === 'pacientes') setProntuarioSubTab('pacientes');
      if (initialTab === 'fidelidade') setFinanceiroSubTab('fidelidade');
      if (initialTab === 'whatsapp') setCrmSubTab('whatsapp');
      if (initialTab === 'webhook') setCrmSubTab('webhook');
    }
  }, [initialTab]);

  // Calendar direct navigation state
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewType>('day');
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());

  const handleOpenTodayAgenda = () => {
    setActiveTab('agenda');
    setAgendaSubTab('calendario');
    setCalendarViewMode('day');
    setCalendarDate(new Date());
    setTimeout(() => {
      const el = document.getElementById('admin-google-calendar-root');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  // Financial password protection & sub-tab tracking
  const [financialPasswordUnlocked, setFinancialPasswordUnlocked] = useState<boolean>(true);
  const [financialPasswordInput, setFinancialPasswordInput] = useState<string>('');
  const [financialPasswordError, setFinancialPasswordError] = useState<string>('');
  const [financialPaymentSubTab, setFinancialPaymentSubTab] = useState<'pendentes' | 'recebidos'>('pendentes');

  // Shortcut to open financial tab directly at specific sub-view
  const handleGoToFinancial = (subTab: 'pendentes' | 'recebidos' = 'pendentes') => {
    setFinancialPaymentSubTab(subTab);
    setFinanceiroSubTab('pagamentos');
    setFinancialPasswordUnlocked(true);
    setActiveTab('financeiro');
  };

  // Shift date helper
  const shiftSelectedDate = (daysDelta: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + daysDelta);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // WhatsApp Reminder Sender
  const sendWhatsAppReminder = (app: Appointment) => {
    const cleanPhone = app.patientPhone.replace(/\D/g, '');
    const phoneToUse = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = `Olá *${app.patientName}*! Tudo bem?\n\nPassando para confirmar seu agendamento de *${app.serviceName}* na Clínica Dra. Elays Marinho:\n\n📅 *Data:* ${formatDatePtBR(app.date)}\n⏰ *Horário:* ${app.time}hs\n\nPodemos confirmar sua presença? Se precisar reagendar, avise-nos! 😊✨`;
    window.open(`https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(message)}`, '_blank');
  };

  // Manual New Appointment Modal State
  const [isManualApptOpen, setIsManualApptOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualServiceId, setManualServiceId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState('09:00');
  const [manualNotes, setManualNotes] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');

  // Helper to open manual booking modal prefilled with slot date & time
  const handleOpenSlotBooking = (dateStr: string, timeStr: string) => {
    setManualDate(dateStr);
    setManualTime(timeStr);
    if (services.length > 0 && !manualServiceId) {
      setManualServiceId(services[0].id);
    }
    setIsManualApptOpen(true);
  };

  // Generate slots for selectedDate
  const dayTimeSlots = React.useMemo(() => {
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayIndex = dateObj.getDay();
    const dayConfig = schedule.days?.find((d) => d.dayOfWeek === dayIndex);

    let startTime = '07:00';
    let endTime = '19:00';
    let lunchStart = '12:00';
    let lunchEnd = '13:00';
    const step = schedule.slotIntervalMinutes || 60;

    if (dayConfig) {
      if (dayConfig.startTime) startTime = dayConfig.startTime;
      if (dayConfig.endTime) endTime = dayConfig.endTime;
      if (dayConfig.lunchStart) lunchStart = dayConfig.lunchStart;
      if (dayConfig.lunchEnd) lunchEnd = dayConfig.lunchEnd;
    }

    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;

    const slotsSet = new Set<string>();

    for (let m = startMins; m < endMins; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const slotStr = `${hh}:${mm}`;

      if (lunchStart && lunchEnd) {
        const [lsh, lsm] = lunchStart.split(':').map(Number);
        const [leh, lem] = lunchEnd.split(':').map(Number);
        const lStartM = lsh * 60 + lsm;
        const lEndM = leh * 60 + lem;
        if (m >= lStartM && m < lEndM) continue;
      }

      slotsSet.add(slotStr);
    }

    // Include existing appointments' times for selectedDate if not present
    appointments
      .filter((a) => a.date === selectedDate && a.status !== 'cancelado')
      .forEach((a) => slotsSet.add(a.time));

    return Array.from(slotsSet).sort();
  }, [selectedDate, schedule, appointments]);

  // Fetch loyalty members to compute pending payments accurately
  const [loyaltyMembers, setLoyaltyMembers] = useState<LoyaltyMember[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.getLoyaltyMembers().then((members) => {
      if (isMounted) setLoyaltyMembers(members || []);
    }).catch((err) => {
      console.warn("Could not load loyalty members for metrics cards:", err);
    });
    return () => { isMounted = false; };
  }, []);

  // Key Metric Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayStr && a.status !== 'cancelado');
  const completedToday = appointments.filter((a) => a.date === todayStr && a.status === 'concluido');
  const pendingToday = appointments.filter((a) => a.date === todayStr && (a.status === 'agendado' || a.status === 'confirmado'));

  // Pending Payments Calculation (Appointments + Loyalty Overdue)
  const pendingAppointments = appointments.filter(
    (a) => a.status === 'agendado' || (a.status === 'confirmado' && a.attendanceStatus === 'pendente')
  );
  const pendingAppointmentsTotal = pendingAppointments.reduce((sum, a) => sum + (a.servicePrice || 0), 0);

  const overdueLoyaltyMembers = loyaltyMembers.filter(
    (m) => m.status === 'inadimplente' || (m.overdueMonths && m.overdueMonths.length > 0)
  );
  const pendingLoyaltyTotal = overdueLoyaltyMembers.reduce(
    (sum, m) => sum + ((m.overdueMonths?.length || 1) * (m.monthlyFee || 99)),
    0
  );

  const totalPendingPaymentsCount = pendingAppointments.length + overdueLoyaltyMembers.length;
  const totalPendingPaymentsAmount = pendingAppointmentsTotal + pendingLoyaltyTotal;

  const totalRevenueEstimated = appointments
    .filter((a) => a.status !== 'cancelado')
    .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

  const activePatientCount = patients.length;
  const activeLoyaltyCount = loyaltyMembers.filter((m) => m.status === 'ativo').length;

  // Recharts 7-Day Trend Calculation for Strategic Insights
  const last7DaysData = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayNumStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const formattedLabel = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} (${dayNumStr})`;

      const dayAppts = appointments.filter((a) => a.date === dateStr && a.status !== 'cancelado');
      const completedCount = dayAppts.filter((a) => a.status === 'concluido' || a.attendanceStatus === 'presenca').length;
      const scheduledCount = dayAppts.filter((a) => a.status === 'agendado' || a.status === 'confirmado').length;

      result.push({
        dateStr,
        label: formattedLabel,
        total: dayAppts.length,
        concluidos: completedCount,
        agendados: scheduledCount,
      });
    }
    return result;
  }, [appointments]);

  const totalLast7Days = last7DaysData.reduce((acc, curr) => acc + curr.total, 0);

  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      await api.updateAppointmentStatus(id, status);
      onReload();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar agendamento.');
    }
  };

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualPhone || !manualServiceId || !manualDate || !manualTime) {
      setManualError('Preencha todos os campos obrigatórios.');
      return;
    }

    setManualLoading(true);
    setManualError('');
    try {
      await api.createAppointment({
        patientName: manualName,
        patientPhone: manualPhone,
        serviceId: manualServiceId,
        date: manualDate,
        time: manualTime,
        notes: manualNotes,
      });
      setIsManualApptOpen(false);
      setManualName('');
      setManualPhone('');
      setManualNotes('');
      onReload();
    } catch (err: any) {
      setManualError(err.message || 'Erro ao criar agendamento.');
    } finally {
      setManualLoading(false);
    }
  };

  const todayFilterStr = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter((a) => {
    let matchDate = true;
    if (dateScope === 'day') {
      matchDate = selectedDate ? a.date === selectedDate : true;
    } else if (dateScope === 'week') {
      const next7Days = new Date();
      next7Days.setDate(next7Days.getDate() + 7);
      const next7Str = next7Days.toISOString().split('T')[0];
      matchDate = a.date >= todayFilterStr && a.date <= next7Str;
    } else if (dateScope === 'all') {
      matchDate = true;
    }

    const matchStatus = statusFilter !== 'todos' ? a.status === statusFilter : true;
    const matchSearch = searchPatientQuery
      ? a.patientName.toLowerCase().includes(searchPatientQuery.toLowerCase()) ||
        a.patientPhone.includes(searchPatientQuery) ||
        a.serviceName.toLowerCase().includes(searchPatientQuery.toLowerCase())
      : true;
    return matchDate && matchStatus && matchSearch;
  });

  // Sort filtered appointments by date and time
  const sortedFilteredAppointments = [...filteredAppointments].sort((a, b) => {
    const da = `${a.date}T${a.time}`;
    const db = `${b.date}T${b.time}`;
    return da.localeCompare(db);
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/60 pb-12 pt-4 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* 📊 EXECUTIVE TOP SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-6">

          {/* Card 1: Agendamentos do Dia (Emerald / Forest Green) */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-2xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-6 -mt-6 pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                Sessões de Hoje
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                <CalendarIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{todayAppointments.length}</span>
                <span className="text-xs font-extrabold text-emerald-700">agendamento(s)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1.5 flex-wrap">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-700">{completedToday.length} concluído(s)</span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-amber-700">{pendingToday.length} pendente(s)</span>
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center">
              <button
                id="btn-card-goto-agenda"
                onClick={handleOpenTodayAgenda}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 hover:underline cursor-pointer"
                title="Visualizar a agenda completa e atendimentos de hoje"
              >
                <span>Ver Agenda de Hoje</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Pagamentos Pendentes (Amber / Golden Rose Alert) */}
          <div className={`bg-white rounded-2xl p-4 border shadow-2xs hover:shadow-md transition-all relative overflow-hidden group ${
            totalPendingPaymentsCount > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200/90'
          }`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -mr-6 -mt-6 pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                totalPendingPaymentsCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
              }`}>
                Pagamentos Pendentes
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                totalPendingPaymentsCount > 0 ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300/50' : 'bg-slate-100 text-slate-600'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{formatCurrency(totalPendingPaymentsAmount)}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {totalPendingPaymentsCount === 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Nenhum valor pendente!</span>
                  </span>
                ) : (
                  <span>
                    <strong className="text-amber-900">{totalPendingPaymentsCount} pendência(s)</strong> ({pendingAppointments.length} sessões + {overdueLoyaltyMembers.length} clube)
                  </span>
                )}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center">
              <button
                id="btn-card-goto-financeiro-pendentes"
                onClick={() => handleGoToFinancial('pendentes')}
                className="text-xs font-bold text-amber-900 hover:text-amber-950 flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <span>⚡ Ver Cobranças Pendentes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Previsão de Receita / Faturamento (Teal / Cyan) */}
          <div className="bg-white rounded-2xl p-4 border border-teal-200/90 shadow-2xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/5 rounded-full -mr-6 -mt-6 pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-100/90 px-2.5 py-0.5 rounded-full">
                Receita & Recibos
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{formatCurrency(totalRevenueEstimated)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Soma dos atendimentos ativos cadastrados
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center">
              <button
                id="btn-card-goto-financeiro-recibos"
                onClick={() => handleGoToFinancial('recebidos')}
                className="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <span>📄 Ver Histórico & Recibos em PDF</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 4: Pacientes Ativos & Clube Fidelidade (Purple / Crown) */}
          <div className="bg-white rounded-2xl p-4 border border-purple-200/90 shadow-2xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -mr-6 -mt-6 pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-800 bg-purple-100/90 px-2.5 py-0.5 rounded-full">
                Pacientes & Clube
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Crown className="w-5 h-5 text-[#D0A73B]" />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{activePatientCount}</span>
                <span className="text-xs font-extrabold text-purple-700">pacientes</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                <strong className="text-purple-900 font-bold">{activeLoyaltyCount}</strong> no Clube Fidelidade R$ 99
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                id="btn-card-goto-pacientes-tags"
                onClick={() => {
                  setActiveTab('prontuario');
                  setProntuarioSubTab('pacientes');
                }}
                className="text-xs font-bold text-[#1B2E24] hover:text-teal-900 flex items-center space-x-1 hover:underline cursor-pointer"
                title="Ver pacientes organizados por categorias e tags de cores"
              >
                <Tag className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Categorias & Tags</span>
              </button>

              <button
                id="btn-card-goto-fidelidade"
                onClick={() => {
                  setActiveTab('financeiro');
                  setFinanceiroSubTab('fidelidade');
                }}
                className="text-xs font-bold text-purple-800 hover:text-purple-950 flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <span>Clube R$99</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Unified 5-Area Navigation Menu */}
        <div className="bg-white rounded-2xl p-2 shadow-2xs border border-[#C9D8CB] mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar flex-1">
            {/* Area 1: Agenda Eletrônica */}
            <button
              id="tab-agenda"
              onClick={() => setActiveTab('agenda')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'agenda'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <CalendarIcon className={`w-4 h-4 ${activeTab === 'agenda' ? 'text-[#DCC58F]' : 'text-[#1B2E24]'}`} />
              <span>1. Agenda Eletrônica</span>
            </button>

            {/* Area 2: Prontuário do Paciente */}
            <button
              id="tab-prontuario"
              onClick={() => setActiveTab('prontuario')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'prontuario'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Users className={`w-4 h-4 ${activeTab === 'prontuario' ? 'text-[#DCC58F]' : 'text-[#1B2E24]'}`} />
              <span>2. Prontuário do Paciente</span>
            </button>

            {/* Area 3: Financeiro */}
            <button
              id="tab-financeiro"
              onClick={() => setActiveTab('financeiro')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'financeiro'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <DollarSign className={`w-4 h-4 ${activeTab === 'financeiro' ? 'text-[#DCC58F]' : 'text-[#1B2E24]'}`} />
              <span>3. Financeiro & Recibos</span>
            </button>

            {/* Area 4: Serviços & Planos */}
            <button
              id="tab-servicos"
              onClick={() => setActiveTab('servicos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'servicos'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Briefcase className={`w-4 h-4 ${activeTab === 'servicos' ? 'text-[#DCC58F]' : 'text-[#1B2E24]'}`} />
              <span>4. Serviços & Planos ({services.length})</span>
            </button>

            {/* Area 5: CRM & Comunicação */}
            <button
              id="tab-crm"
              onClick={() => setActiveTab('crm')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'crm'
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-sm ring-1 ring-[#DCC58F]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Brain className={`w-4 h-4 ${activeTab === 'crm' ? 'text-[#DCC58F]' : 'text-[#B44A2E]'}`} />
              <span>5. CRM & Comunicação</span>
            </button>

            {/* Settings & QR */}
            <button
              id="tab-configuracoes"
              onClick={() => setActiveTab('configuracoes')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'configuracoes'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-[#F4F7F4]'
              }`}
              title="Configurações e Links"
            >
              <Settings className="w-4 h-4 text-[#D0A73B]" />
              <span className="hidden sm:inline">Configurações</span>
            </button>
          </div>

          {/* Toast & Notification Bell Component */}
          <div className="shrink-0 pl-2 border-l border-slate-100 flex items-center">
            <AdminToasts
              appointments={appointments}
              onNavigateTab={(tab) => {
                if (tab === 'fidelidade') {
                  setActiveTab('financeiro');
                  setFinanceiroSubTab('fidelidade');
                } else if (tab === 'horarios') {
                  setActiveTab('agenda');
                  setAgendaSubTab('horarios');
                } else if (tab === 'pacientes') {
                  setActiveTab('prontuario');
                  setProntuarioSubTab('pacientes');
                } else if (tab === 'whatsapp') {
                  setActiveTab('crm');
                  setCrmSubTab('whatsapp');
                } else if (tab === 'webhook') {
                  setActiveTab('crm');
                  setCrmSubTab('webhook');
                } else {
                  setActiveTab(getNormalizedTab(tab));
                }
              }}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ÁREA 1: AGENDA ELETRÔNICA (Google Calendar, Horários, Encaixes, Tarefas) */}
        {/* ========================================================================= */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            {/* Sub-nav pills for Agenda */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setAgendaSubTab('calendario')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    agendaSubTab === 'calendario'
                      ? 'bg-[#31523D] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-[#D0A73B]" />
                  <span>Calendário Google (Dia/Semana/Mês)</span>
                </button>

                <button
                  onClick={() => setAgendaSubTab('horarios')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    agendaSubTab === 'horarios'
                      ? 'bg-[#31523D] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-[#D0A73B]" />
                  <span>Horários de Atendimento & Limites</span>
                </button>

                <button
                  onClick={() => setAgendaSubTab('tarefas')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    agendaSubTab === 'tarefas'
                      ? 'bg-[#31523D] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D0A73B]" />
                  <span>Lembretes & Tarefas do Dia</span>
                </button>
              </div>

              <button
                id="btn-open-manual-booking-agenda"
                onClick={() => setIsManualApptOpen(true)}
                className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-teal-700 hover:bg-teal-800 text-white shadow-xs flex items-center space-x-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Novo Encaixe</span>
              </button>
            </div>

            {/* Sub-view Content */}
            {agendaSubTab === 'calendario' && (
              <AdminGoogleCalendarAgenda
                appointments={appointments}
                patients={patients}
                services={services}
                schedule={schedule}
                clinic={clinic}
                initialViewMode={calendarViewMode}
                initialDate={calendarDate}
                onReload={onReload}
              />
            )}

            {agendaSubTab === 'horarios' && (
              <AdminSchedule schedule={schedule} onReload={onReload} />
            )}

            {agendaSubTab === 'tarefas' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-serif font-bold text-[#1B2E24]">
                      Tarefas Clínicas & Follow-up de Atendimentos
                    </h3>
                    <p className="text-xs text-slate-500">
                      Acompanhamento de retornos, envio de planos e orientações pós-atendimento.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Follow-up pós-avaliação (Pilates)</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">Paciente: Maria Fernanda Silva • Enviar plano sugerido.</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                        Prioridade Alta
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Confirmar retorno de reavaliação de coluna</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">Paciente: Carlos Eduardo Santos • 30 dias de evolução.</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                        Agendado
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Lembrar de exercícios para casa (Cinesioterapia)</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">Paciente: Juliana Mendes Rocha • Fortalecimento de manguito rotador.</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                        Pendente Envio
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex items-start gap-3">
                    <Users className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Confirmar turma de Pilates das 18h</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">Turma 02 • 3 alunas confirmadas para hoje.</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900">
                        Hoje
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÁREA 2: PRONTUÁRIO ELETRÔNICO DO PACIENTE (Avaliações, Evoluções, TCLE)    */}
        {/* ========================================================================= */}
        {activeTab === 'prontuario' && (
          <div className="space-y-4">
            {/* Sub-nav pills for Prontuário */}
            <div className="flex items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setProntuarioSubTab('avaliacoes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  prontuarioSubTab === 'avaliacoes'
                    ? 'bg-[#31523D] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Fichas de Avaliação Clínica</span>
              </button>

              <button
                onClick={() => setProntuarioSubTab('evolucoes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  prontuarioSubTab === 'evolucoes'
                    ? 'bg-[#31523D] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Evoluções das Sessões</span>
              </button>

              <button
                onClick={() => setProntuarioSubTab('pacientes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  prontuarioSubTab === 'pacientes'
                    ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs ring-1 ring-[#DCC58F]/40'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Pacientes (Categorias & Tags) ({patients.length})</span>
              </button>

              <button
                onClick={() => setProntuarioSubTab('tcle')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  prontuarioSubTab === 'tcle'
                    ? 'bg-[#31523D] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>TCLE & Contratos Assinados</span>
              </button>

              <button
                id="tab-prontuario-templates"
                onClick={() => setProntuarioSubTab('templates')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  prontuarioSubTab === 'templates'
                    ? 'bg-[#B08A3E] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Templates da Dra. Elays</span>
              </button>
            </div>

            {/* Sub-view rendering for Prontuário */}
            {prontuarioSubTab === 'avaliacoes' && (
              <FisiolysCRM initialTab="avaliacoes" />
            )}

            {prontuarioSubTab === 'evolucoes' && (
              <FisiolysCRM initialTab="evolucoes" />
            )}

            {prontuarioSubTab === 'pacientes' && (
              <AdminPatients
                patients={patients}
                appointments={appointments}
                clinic={clinic}
                onReload={onReload}
              />
            )}

            {prontuarioSubTab === 'tcle' && (
              <FisiolysCRM initialTab="tcle" />
            )}

            {prontuarioSubTab === 'templates' && (
              <FisiolysCRM initialTab="templates" />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÁREA 3: FINANCEIRO (Faturamento, Pendentes/Recebidos, Clube Fidelidade)     */}
        {/* ========================================================================= */}
        {activeTab === 'financeiro' && (
          !financialPasswordUnlocked ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md mx-auto my-8 border border-slate-200/90 shadow-sm text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center mx-auto shadow-md border border-[#D0A73B]/40">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 inline-block mb-2">
                  🔒 Acesso Restrito ao Administrador
                </span>
                <h3 className="text-xl font-serif font-extrabold text-[#23372B]">
                  Área de Gestão Financeira
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Esta área contém relatórios e faturamento restrito. Digite a senha do Administrador para acessar.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (verifyFinancialPassword(financialPasswordInput)) {
                    setFinancialPasswordUnlocked(true);
                    setFinancialPasswordError('');
                  } else {
                    setFinancialPasswordError('Senha incorreta! Digite a senha válida de Gestão Financeira.');
                  }
                }}
                className="space-y-4 pt-2"
              >
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                    Digite a Senha do Gestor
                  </label>
                  <input
                    type="password"
                    placeholder="Sua senha de gestor..."
                    value={financialPasswordInput}
                    onChange={(e) => {
                      setFinancialPasswordInput(e.target.value);
                      setFinancialPasswordError('');
                    }}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-center font-mono font-extrabold text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#31523D] bg-slate-50"
                    autoFocus
                  />
                  {financialPasswordError && (
                    <p className="text-xs font-bold text-rose-600 mt-2 flex items-center justify-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{financialPasswordError}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1 text-center font-medium">
                    (Senha configurável da Dra. Elays • Padrão: <code className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">011809</code>)
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-[#31523D] hover:bg-[#23372B] text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#D0A73B]" />
                    <span>Acessar Gestão Financeira & Recibos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFinancialPasswordUnlocked(true);
                      setFinancialPasswordError('');
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-200 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>🔓 Desbloquear com 1-Clique (Dra. Elays)</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sub-nav pills for Financeiro */}
              <div className="flex items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setFinanceiroSubTab('visao_geral')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    financeiroSubTab === 'visao_geral'
                      ? 'bg-[#31523D] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#D0A73B]" />
                  <span>Visão Geral & Faturamento</span>
                </button>

                <button
                  onClick={() => setFinanceiroSubTab('pagamentos')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    financeiroSubTab === 'pagamentos'
                      ? 'bg-[#31523D] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#D0A73B]" />
                  <span>Pagamentos & Emissão de Recibos PDF</span>
                </button>

                <button
                  onClick={() => setFinanceiroSubTab('fidelidade')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                    financeiroSubTab === 'fidelidade'
                      ? 'bg-[#B08A3E] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-[#FAF7F0]" />
                  <span>Clube Fidelidade R$ 99</span>
                </button>
              </div>

              {financeiroSubTab === 'visao_geral' && (
                <div className="space-y-6">
                  {/* Quick Metrics Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-semibold">Sessões Hoje</span>
                        <CalendarIcon className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-extrabold text-slate-800">{todayAppointments.length}</span>
                        <span className="text-[11px] font-semibold text-emerald-700">
                          ({completedToday.length} concluídas)
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-semibold">Total Agendamentos</span>
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-2xl font-extrabold text-slate-800">{appointments.length}</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-semibold">Faturamento Estimado</span>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-2xl font-extrabold text-teal-800">{formatCurrency(totalRevenueEstimated)}</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-xs font-semibold">Pacientes Cadastrados</span>
                        <UserCheck className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-2xl font-extrabold text-slate-800">{activePatientCount}</span>
                    </div>
                  </div>

                  {/* Recharts Chart: Tendência de Agendamentos */}
                  <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
                    <div className="sm:flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-[#31523D]/10 text-[#31523D] flex items-center justify-center shrink-0">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <h3 className="text-base font-bold text-slate-800">
                            Tendência de Atendimentos & Demanda (Última Semana)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Evolução diária de novas sessões agendadas e presenças concluídas.
                        </p>
                      </div>

                      <div className="mt-2 sm:mt-0 flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#31523D]"></span>
                          <span>Total na Semana: <strong className="text-slate-900 font-extrabold">{totalLast7Days} sessões</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-64 pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#31523D" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#31523D" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorConcluidos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#D0A73B" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#D0A73B" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs space-y-1">
                                    <p className="font-extrabold text-[#D0A73B] border-b border-slate-800 pb-1">{label}</p>
                                    <div className="flex items-center justify-between gap-4 pt-0.5">
                                      <span className="text-slate-300">Total Agendado:</span>
                                      <strong className="text-white font-bold">{data.total} sessões</strong>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-emerald-400">Presenças Concluídas:</span>
                                      <strong className="text-emerald-300 font-bold">{data.concluidos}</strong>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            name="Total Agendado"
                            stroke="#31523D"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                            dot={{ r: 4, fill: '#31523D', strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{ r: 6, fill: '#31523D' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="concluidos"
                            name="Presenças Concluídas"
                            stroke="#D0A73B"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fillOpacity={1}
                            fill="url(#colorConcluidos)"
                            dot={{ r: 3, fill: '#D0A73B' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {financeiroSubTab === 'pagamentos' && (
                <AdminFinancial
                  clinic={clinic}
                  appointments={appointments}
                  patients={patients}
                  initialTab={financialPaymentSubTab}
                  onReload={onReload}
                />
              )}

              {financeiroSubTab === 'fidelidade' && (
                <AdminLoyalty clinicPhone={clinic.whatsapp} />
              )}
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* ÁREA 4: SERVIÇOS & PLANOS (Catálogo Integrado e Planos Alternativos)      */}
        {/* ========================================================================= */}
        {activeTab === 'servicos' && (
          <AdminServices services={services} onReload={onReload} />
        )}

        {/* ========================================================================= */}
        {/* ÁREA 5: CRM & COMUNICAÇÃO (Leads, WhatsApp, Webhooks, IA Clínica)        */}
        {/* ========================================================================= */}
        {activeTab === 'crm' && (
          <div className="space-y-4">
            {/* Sub-nav pills for CRM & Comunicação */}
            <div className="flex items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setCrmSubTab('leads')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  crmSubTab === 'leads'
                    ? 'bg-[#31523D] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Funil de Leads & Pacientes</span>
              </button>

              <button
                onClick={() => setCrmSubTab('whatsapp')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  crmSubTab === 'whatsapp'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp & Lembretes Inteligentes</span>
              </button>

              <button
                onClick={() => setCrmSubTab('webhook')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  crmSubTab === 'webhook'
                    ? 'bg-[#31523D] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Disparos em Lote & Webhook</span>
              </button>

              <button
                onClick={() => setCrmSubTab('ia_clinica')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  crmSubTab === 'ia_clinica'
                    ? 'bg-[#B44A2E] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-[#FDE68A]" />
                <span>Assistente Fisiolys (IA)</span>
              </button>

              <button
                id="tab-crm-templates"
                onClick={() => setCrmSubTab('templates')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  crmSubTab === 'templates'
                    ? 'bg-[#B08A3E] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Templates & Scripts</span>
              </button>
            </div>

            {/* Sub-view content */}
            {crmSubTab === 'leads' && (
              <FisiolysCRM initialTab="leads" />
            )}

            {crmSubTab === 'whatsapp' && (
              <AdminWhatsApp clinic={clinic} appointments={appointments} onReload={onReload} />
            )}

            {crmSubTab === 'webhook' && (
              <AdminWebhook clinic={clinic} onReload={onReload} />
            )}

            {crmSubTab === 'ia_clinica' && (
              <FisiolysCRM initialTab="ia_clinica" />
            )}

            {crmSubTab === 'templates' && (
              <FisiolysCRM initialTab="templates" />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CONFIGURAÇÕES & SENHAS & QR CODE                                         */}
        {/* ========================================================================= */}
        {activeTab === 'configuracoes' && (
          <div className="space-y-6">
            <AdminSettings clinic={clinic} onReload={onReload} />
            <AdminQRCode clinic={clinic} />
          </div>
        )}

        {/* MANUAL BOOKING MODAL */}
        {isManualApptOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative">
              
              <button
                onClick={() => setIsManualApptOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Novo Agendamento Manual / Encaixe
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Registre um atendimento presencial ou agendado por telefone.
              </p>

              {manualError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <form onSubmit={handleManualBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Nome do Paciente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Ferreira"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98888-7777"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Serviço / Tratamento *
                  </label>
                  <select
                    required
                    value={manualServiceId}
                    onChange={(e) => setManualServiceId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                  >
                    <option value="">Selecione o serviço...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrency(s.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Horário *
                    </label>
                    <input
                      type="time"
                      required
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Sintomas, encaminhamento médico..."
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsManualApptOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={manualLoading}
                    className="px-5 py-2 rounded-xl font-bold text-xs bg-teal-700 text-white hover:bg-teal-800 shadow-xs"
                  >
                    {manualLoading ? 'Salvando...' : 'Confirmar Encaixe'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
