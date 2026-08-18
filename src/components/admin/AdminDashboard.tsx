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
  X
} from 'lucide-react';

interface AdminDashboardProps {
  clinic: ClinicConfig;
  services: Service[];
  schedule: ScheduleConfig;
  appointments: Appointment[];
  patients: Patient[];
  onReload: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clinic,
  services,
  schedule,
  appointments,
  patients,
  onReload,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [agendaViewMode, setAgendaViewMode] = useState<'grid' | 'list'>('grid');
  const [searchPatientQuery, setSearchPatientQuery] = useState<string>('');

  // Financial password protection
  const [financialPasswordUnlocked, setFinancialPasswordUnlocked] = useState<boolean>(false);
  const [financialPasswordInput, setFinancialPasswordInput] = useState<string>('');
  const [financialPasswordError, setFinancialPasswordError] = useState<string>('');

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

  const filteredAppointments = appointments.filter((a) => {
    const matchDate = selectedDate ? a.date === selectedDate : true;
    const matchStatus = statusFilter !== 'todos' ? a.status === statusFilter : true;
    const matchSearch = searchPatientQuery
      ? a.patientName.toLowerCase().includes(searchPatientQuery.toLowerCase()) ||
        a.patientPhone.includes(searchPatientQuery) ||
        a.serviceName.toLowerCase().includes(searchPatientQuery.toLowerCase())
      : true;
    return matchDate && matchStatus && matchSearch;
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
                onClick={() => setActiveTab('agenda')}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 hover:underline"
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
                id="btn-card-goto-financeiro"
                onClick={() => setActiveTab('financeiro')}
                className="text-xs font-bold text-amber-900 hover:text-amber-950 flex items-center space-x-1 hover:underline"
              >
                <span>Gestão de Cobranças</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Previsão de Receita / Faturamento (Teal / Cyan) */}
          <div className="bg-white rounded-2xl p-4 border border-teal-200/90 shadow-2xs hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/5 rounded-full -mr-6 -mt-6 pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-100/90 px-2.5 py-0.5 rounded-full">
                Receita Estimada
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
                id="btn-card-goto-reports"
                onClick={() => setActiveTab('financeiro')}
                className="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center space-x-1 hover:underline"
              >
                <span>Relatórios Financeiros</span>
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
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center">
              <button
                id="btn-card-goto-fidelidade"
                onClick={() => setActiveTab('fidelidade')}
                className="text-xs font-bold text-purple-800 hover:text-purple-950 flex items-center space-x-1 hover:underline"
              >
                <span>Clube Fidelidade R$ 99</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Tab Navigation Menu */}
        <div className="bg-white rounded-2xl p-2 shadow-2xs border border-[#C9D8CB] mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar flex-1">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#D0A73B]" />
              <span>Visão Geral</span>
            </button>

            <button
              id="tab-agenda"
              onClick={() => setActiveTab('agenda')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'agenda'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-[#D0A73B]" />
              <span>Agenda & Atendimentos</span>
            </button>

            <button
              id="tab-servicos"
              onClick={() => setActiveTab('servicos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'servicos'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#D0A73B]" />
              <span>Serviços ({services.length})</span>
            </button>

            <button
              id="tab-horarios"
              onClick={() => setActiveTab('horarios')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'horarios'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Clock className="w-4 h-4 text-[#D0A73B]" />
              <span>Horários de Atendimento</span>
            </button>

            <button
              id="tab-pacientes"
              onClick={() => setActiveTab('pacientes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'pacientes'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Users className="w-4 h-4 text-[#D0A73B]" />
              <span>Pacientes ({patients.length})</span>
            </button>

            <button
              id="tab-fidelidade"
              onClick={() => setActiveTab('fidelidade')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'fidelidade'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Crown className="w-4 h-4 text-[#D0A73B]" />
              <span>Fidelidade R$ 99</span>
            </button>

            <button
              id="tab-financeiro"
              onClick={() => setActiveTab('financeiro')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'financeiro'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <DollarSign className="w-4 h-4 text-[#D0A73B]" />
              <span>Gestão Financeira</span>
              {!financialPasswordUnlocked && <Lock className="w-3 h-3 text-[#D0A73B] shrink-0" />}
            </button>

            <button
              id="tab-qrcode"
              onClick={() => setActiveTab('qrcode')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'qrcode'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <QrCode className="w-4 h-4 text-[#D0A73B]" />
              <span>Link & QR Code</span>
            </button>

            <button
              id="tab-webhook"
              onClick={() => setActiveTab('webhook')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'webhook'
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <Radio className="w-4 h-4 text-[#D0A73B]" />
              <span>Webhook</span>
            </button>

            <button
              id="tab-whatsapp"
              onClick={() => setActiveTab('whatsapp')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F4F7F4]'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp & Lembretes</span>
            </button>
          </div>

          {/* Toast & Notification Bell Component */}
          <div className="shrink-0 pl-2 border-l border-slate-100 flex items-center">
            <AdminToasts appointments={appointments} onNavigateTab={(tab) => setActiveTab(tab)} />
          </div>
        </div>

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
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

            {/* Recharts Chart: Tendência de Agendamentos da Última Semana */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
              <div className="sm:flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#31523D]/10 text-[#31523D] flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                      Tendência de Atendimentos & Agendamentos (Última Semana)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Evolução diária de novas sessões agendadas e presenciais confirmadas nos últimos 7 dias.
                  </p>
                </div>

                <div className="mt-2 sm:mt-0 flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#31523D]"></span>
                    <span>Total na Semana: <strong className="text-slate-900 font-extrabold">{totalLast7Days} sessões</strong></span>
                  </div>
                </div>
              </div>

              {/* Chart Container */}
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

              {/* Legend Footer */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-slate-600 border-t border-slate-100">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-1 bg-[#31523D] rounded-full"></span>
                  <span>Total de Agendamentos (Demanda Diária)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-[#D0A73B] border border-dashed border-[#D0A73B]"></span>
                  <span>Presenças Concluídas</span>
                </span>
              </div>
            </div>

            {/* Today's Timeline & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Today's Schedule Card */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Atendimentos de Hoje ({formatDatePtBR(todayStr)})</h3>
                    <p className="text-xs text-slate-500">Pacientes agendados na fisioterapia e pilates para o dia de hoje.</p>
                  </div>
                  <button
                    id="btn-open-manual-booking"
                    onClick={() => setIsManualApptOpen(true)}
                    className="px-3 py-1.5 rounded-xl font-bold text-xs bg-teal-700 hover:bg-teal-800 text-white flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Encaixe</span>
                  </button>
                </div>

                {todayAppointments.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs sm:text-sm">
                    <p>Nenhum atendimento agendado para o dia de hoje.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayAppointments.map((app) => (
                      <div
                        key={app.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-teal-300 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-start space-x-3">
                          <span className="px-3 py-1.5 rounded-lg font-mono font-extrabold text-xs bg-teal-100 text-teal-800 shrink-0">
                            {app.time} hs
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{app.patientName}</h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              <strong className="text-teal-800">{app.serviceName}</strong> • {app.patientPhone}
                            </p>
                            {app.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-1">Obs: "{app.notes}"</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {app.status === 'concluido' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✅ Presença</span>
                            </span>
                          ) : app.status === 'falta' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 flex items-center space-x-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>❌ Falta</span>
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(app.id, 'concluido')}
                                className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center space-x-1 cursor-pointer"
                                title="Dar presença para esta paciente"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Presença</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(app.id, 'falta')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center space-x-1 cursor-pointer"
                                title="Registrar falta para esta paciente"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Falta</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(app.id, 'cancelado')}
                                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Side Card: Quick Link & Share */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Agendamento Público</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Envie o QR Code ou o link direto para pacientes marcarem via WhatsApp sem precisar telefonar.
                  </p>
                </div>

                <div className="mt-6 space-y-2.5">
                  <button
                    onClick={() => setActiveTab('qrcode')}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-teal-700 text-white hover:bg-teal-800 flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <span>Ver QR Code & Link da Clínica</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: FULL VERSATILE AGENDA */}
        {activeTab === 'agenda' && (
          <div className="space-y-6">
            
            {/* Top Toolbar: Date Navigation, Search, View Modes & New Appointment */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                
                {/* Date Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => shiftSelectedDate(-1)}
                      className="p-1.5 rounded-xl hover:bg-white text-slate-700 font-bold transition-all cursor-pointer"
                      title="Dia anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleSetToday}
                      className="px-3 py-1 rounded-xl bg-white text-slate-800 text-xs font-black shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Hoje
                    </button>

                    <button
                      type="button"
                      onClick={() => shiftSelectedDate(1)}
                      className="p-1.5 rounded-xl hover:bg-white text-slate-700 font-bold transition-all cursor-pointer"
                      title="Próximo dia"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 rounded-2xl border border-slate-300 text-xs font-extrabold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D]"
                    />
                  </div>

                  <span className="text-xs font-black text-[#31523D] bg-[#EAF0DB] px-3 py-1.5 rounded-2xl border border-[#C9D8CB]">
                    🗓️ {formatDatePtBR(selectedDate)}
                  </span>
                </div>

                {/* View Switcher & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAgendaViewMode('grid')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        agendaViewMode === 'grid'
                          ? 'bg-[#31523D] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Grade de Horários & Vagas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAgendaViewMode('list')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        agendaViewMode === 'list'
                          ? 'bg-[#31523D] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Lista de Pacientes</span>
                    </button>
                  </div>

                  {/* Manual Appointment Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setManualDate(selectedDate);
                      setIsManualApptOpen(true);
                    }}
                    className="px-4 py-2 rounded-2xl font-black text-xs bg-[#31523D] hover:bg-[#23372B] text-white shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#D0A73B]" />
                    <span>+ Novo Encaixe / Agendamento</span>
                  </button>
                </div>

              </div>

              {/* Second Row: Search & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchPatientQuery}
                      onChange={(e) => setSearchPatientQuery(e.target.value)}
                      placeholder="Buscar por paciente, telefone ou serviço..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#31523D] w-full"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="agendado">🟡 Agendados (Pendentes)</option>
                    <option value="concluido">✅ Presenças Concluídas</option>
                    <option value="falta">❌ Faltas Registradas</option>
                    <option value="cancelado">🚫 Cancelados</option>
                  </select>
                </div>

                {/* Day Summary Stats Bar */}
                {(() => {
                  const dayApps = appointments.filter((a) => a.date === selectedDate && a.status !== 'cancelado');
                  const dayDone = dayApps.filter((a) => a.status === 'concluido').length;
                  const dayPending = dayApps.filter((a) => a.status === 'agendado').length;
                  const occupiedTimes = new Set(dayApps.map((a) => a.time));
                  const freeCount = Math.max(0, dayTimeSlots.length - occupiedTimes.size);

                  return (
                    <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 font-bold text-slate-700">
                        Total: <strong>{dayApps.length}</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                        Presenças: <strong>{dayDone}</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-bold">
                        Pendentes: <strong>{dayPending}</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-[#EAF0DB] text-[#31523D] font-black border border-[#C9D8CB]">
                        Vagas Livres: <strong>{freeCount}</strong>
                      </span>
                    </div>
                  );
                })()}

              </div>

            </div>

            {/* VIEW MODE 1: GRID VIEW (GRADE DE HORÁRIOS & VAGAS LIVRES) */}
            {agendaViewMode === 'grid' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider px-1">
                  <span>Grade Temporal de Horários — {formatDatePtBR(selectedDate)}</span>
                  <span>Clique em "Agendar Encaixe" para preencher vagas</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {dayTimeSlots.map((slotTime) => {
                    const slotAppts = filteredAppointments.filter((a) => a.time === slotTime);

                    if (slotAppts.length === 0) {
                      // FREE SLOT CARD
                      return (
                        <div
                          key={`slot_${slotTime}`}
                          className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 hover:border-emerald-400 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="px-3 py-1.5 rounded-xl font-mono font-black text-xs bg-emerald-700 text-white shadow-2xs shrink-0 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{slotTime} hs</span>
                            </span>
                            <div>
                              <span className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Horário Livre / Vaga Disponível</span>
                              </span>
                              <p className="text-[11px] text-emerald-700 mt-0.5">
                                Pronto para receber agendamento público ou encaixe direto
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenSlotBooking(selectedDate, slotTime)}
                            className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs flex items-center space-x-1 transition-all cursor-pointer group-hover:scale-102 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agendar Encaixe ({slotTime})</span>
                          </button>
                        </div>
                      );
                    }

                    // OCCUPIED SLOT CARD(S)
                    return (
                      <div
                        key={`slot_${slotTime}`}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="px-3 py-1 rounded-xl font-mono font-black text-xs bg-[#31523D] text-[#D0A73B] shadow-2xs flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{slotTime} hs</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {slotAppts.length} Paciente{slotAppts.length > 1 ? 's' : ''} neste horário
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {slotAppts.map((app) => (
                            <div key={app.id} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-extrabold text-slate-800">{app.patientName}</h4>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    app.status === 'concluido'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : app.status === 'falta'
                                      ? 'bg-rose-100 text-rose-800'
                                      : app.status === 'cancelado'
                                      ? 'bg-slate-100 text-slate-600'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}>
                                    {app.status === 'concluido' && '✅ Presença'}
                                    {app.status === 'falta' && '❌ Falta'}
                                    {app.status === 'cancelado' && '🚫 Cancelado'}
                                    {app.status === 'agendado' && '🟡 Pendente'}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-600 mt-0.5">
                                  <strong className="text-[#31523D]">{app.serviceName}</strong> • {formatCurrency(app.servicePrice)}
                                </p>

                                <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                                  <span className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{app.patientPhone}</span>
                                  </span>
                                  {app.notes && (
                                    <span>• Obs: <em className="text-slate-700">{app.notes}</em></span>
                                  )}
                                </p>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                                {/* Send WhatsApp Reminder Button */}
                                <button
                                  type="button"
                                  onClick={() => sendWhatsAppReminder(app)}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-2xs flex items-center space-x-1 cursor-pointer"
                                  title="Enviar mensagem de confirmação/lembrete no WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Lembrete</span>
                                </button>

                                {app.status === 'agendado' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(app.id, 'concluido')}
                                      className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-700 text-white hover:bg-emerald-800 flex items-center space-x-1 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Presença</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(app.id, 'falta')}
                                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center space-x-1 cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Falta</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(app.id, 'cancelado')}
                                      className="px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW MODE 2: LIST VIEW */}
            {agendaViewMode === 'list' && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                {filteredAppointments.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs sm:text-sm">
                    Nenhum agendamento localizado para os filtros selecionados.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredAppointments.map((app) => (
                      <div
                        key={app.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-all"
                      >
                        <div className="flex items-start space-x-3.5">
                          <div className="text-center shrink-0">
                            <span className="block text-[10px] uppercase font-bold text-slate-400">
                              {formatDatePtBR(app.date)}
                            </span>
                            <span className="px-2.5 py-1 rounded-xl font-mono font-black text-xs bg-[#31523D] text-[#D0A73B] inline-block mt-0.5">
                              {app.time} hs
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800">{app.patientName}</h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              <strong className="text-[#31523D]">{app.serviceName}</strong> • {formatCurrency(app.servicePrice)}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{app.patientPhone}</span>
                            </p>
                            {app.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-100 p-1.5 rounded-md inline-block">
                                Obs: {app.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            type="button"
                            onClick={() => sendWhatsAppReminder(app)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-2xs flex items-center space-x-1 cursor-pointer"
                            title="Enviar lembrete de agendamento no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          {app.status === 'concluido' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✅ Presença</span>
                            </span>
                          ) : app.status === 'falta' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 flex items-center space-x-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>❌ Falta</span>
                            </span>
                          ) : app.status === 'cancelado' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                              🚫 Cancelado
                            </span>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(app.id, 'concluido')}
                                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-700 text-white hover:bg-emerald-800 flex items-center space-x-1 cursor-pointer"
                                title="Dar presença para esta paciente"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Presença</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(app.id, 'falta')}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 flex items-center space-x-1 cursor-pointer"
                                title="Registrar falta para esta paciente"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Falta</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(app.id, 'cancelado')}
                                className="px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 3: SERVICES */}
        {activeTab === 'servicos' && (
          <AdminServices services={services} onReload={onReload} />
        )}

        {/* TAB 4: SCHEDULE CONFIG */}
        {activeTab === 'horarios' && (
          <AdminSchedule schedule={schedule} onReload={onReload} />
        )}

        {/* TAB 5: PATIENTS */}
        {activeTab === 'pacientes' && (
          <AdminPatients patients={patients} appointments={appointments} clinic={clinic} onReload={onReload} />
        )}

        {/* TAB 5.5: FIDELIDADE RECORRENTE R$ 99 */}
        {activeTab === 'fidelidade' && (
          <AdminLoyalty clinicPhone={clinic.whatsapp} />
        )}

        {/* TAB 5.8: GESTÃO FINANCEIRA & COBRANÇA (RESTRICTED WITH PASSWORD 011809) */}
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
                  if (financialPasswordInput.trim() === '011809') {
                    setFinancialPasswordUnlocked(true);
                    setFinancialPasswordError('');
                  } else {
                    setFinancialPasswordError('Senha incorreta! Digite a senha válida de Administrador.');
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
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-[#31523D] hover:bg-[#23372B] text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#D0A73B]" />
                    <span>Acessar Gestão Financeira</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full py-2 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Voltar ao Painel Geral
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <AdminFinancial clinic={clinic} appointments={appointments} onReload={onReload} />
          )
        )}

        {/* TAB 6: LINK & QR CODE */}
        {activeTab === 'qrcode' && (
          <AdminQRCode clinic={clinic} />
        )}

        {/* TAB 7: WEBHOOK */}
        {activeTab === 'webhook' && (
          <AdminWebhook clinic={clinic} onReload={onReload} />
        )}

        {/* TAB 8: WHATSAPP & AUTOMATED REMINDERS */}
        {activeTab === 'whatsapp' && (
          <AdminWhatsApp clinic={clinic} appointments={appointments} onReload={onReload} />
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
