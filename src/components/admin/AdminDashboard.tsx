import React, { useState } from 'react';
import { Appointment, Service, ScheduleConfig, ClinicConfig, Patient, AdminTab, AppointmentStatus } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDatePtBR } from '../../utils/qrUtils';
import { AdminServices } from './AdminServices';
import { AdminSchedule } from './AdminSchedule';
import { AdminPatients } from './AdminPatients';
import { AdminLoyalty } from './AdminLoyalty';
import { AdminQRCode } from './AdminQRCode';
import { AdminWebhook } from './AdminWebhook';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
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
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  UserCheck,
  ChevronRight,
  Phone,
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

  // Key Metric Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayStr && a.status !== 'cancelado');
  const completedToday = appointments.filter((a) => a.date === todayStr && a.status === 'concluido');
  
  const totalRevenueEstimated = appointments
    .filter((a) => a.status !== 'cancelado')
    .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

  const activePatientCount = patients.length;

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
    return matchDate && matchStatus;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/60 pb-12 pt-4 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Tab Navigation Menu */}
        <div className="bg-white rounded-2xl p-2 shadow-2xs border border-[#C9D8CB] mb-6 flex items-center space-x-1 overflow-x-auto no-scrollbar">
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
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              ✓ Concluído
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(app.id, 'concluido')}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Concluir</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(app.id, 'cancelado')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
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

        {/* TAB 2: FULL AGENDA / CALENDAR */}
        {activeTab === 'agenda' && (
          <div className="space-y-6">
            
            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Filtrar por Data
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Status do Agendamento
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="agendado">Agendados</option>
                    <option value="concluido">Concluídos</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setIsManualApptOpen(true)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-teal-700 hover:bg-teal-800 text-white shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Agendamento Manual</span>
              </button>
            </div>

            {/* Agenda Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              {filteredAppointments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs sm:text-sm">
                  Nenhum agendamento localizado para o filtro selecionado.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAppointments.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-all"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-center shrink-0">
                          <span className="block text-[10px] uppercase font-bold text-slate-400">
                            {formatDatePtBR(app.date)}
                          </span>
                          <span className="px-2.5 py-1 rounded-md font-mono font-extrabold text-xs bg-teal-100 text-teal-800 inline-block mt-0.5">
                            {app.time} hs
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{app.patientName}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            <strong className="text-teal-800">{app.serviceName}</strong> • {formatCurrency(app.servicePrice)}
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          app.status === 'concluido'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'agendado'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {app.status}
                        </span>

                        {app.status === 'agendado' && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'concluido')}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Concluir
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'cancelado')}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
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
          <AdminPatients patients={patients} appointments={appointments} />
        )}

        {/* TAB 5.5: FIDELIDADE RECORRENTE R$ 99 */}
        {activeTab === 'fidelidade' && (
          <AdminLoyalty clinicPhone={clinic.whatsapp} />
        )}

        {/* TAB 6: LINK & QR CODE */}
        {activeTab === 'qrcode' && (
          <AdminQRCode clinic={clinic} />
        )}

        {/* TAB 7: WEBHOOK */}
        {activeTab === 'webhook' && (
          <AdminWebhook clinic={clinic} onReload={onReload} />
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
