import React, { useState, useEffect, useMemo } from 'react';
import {
  Patient,
  Appointment,
  ClinicConfig,
  Service
} from '../../types';
import { api } from '../../services/api';
import {
  generateQRCodeDataUrl,
  getCheckInUrl,
  formatDatePtBR,
  formatPhoneMask
} from '../../utils/qrUtils';
import { generateQRPDF } from '../../utils/pdfGenerator';
import { PrintableQRPDFModal } from '../common/PrintableQRPDFModal';
import {
  QrCode,
  CheckCircle2,
  Clock,
  Sparkles,
  Printer,
  Download,
  Copy,
  Check,
  Smartphone,
  Calendar,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Search,
  User,
  Activity,
  Heart,
  PlusCircle,
  ChevronRight,
  X,
  Smile,
  Users
} from 'lucide-react';

interface PatientCheckInProps {
  patient?: Patient | null;
  patients?: Patient[];
  appointments: Appointment[];
  clinic: ClinicConfig;
  services: Service[];
  onReload?: () => void;
  onNavigateToBooking?: () => void;
  onSelectPatient?: (patientId: string) => void;
}

export const PatientCheckIn: React.FC<PatientCheckInProps> = ({
  patient,
  patients = [],
  appointments,
  clinic,
  services,
  onReload,
  onNavigateToBooking,
  onSelectPatient,
}) => {
  const [loadingApptId, setLoadingApptId] = useState<string | null>(null);
  const [successModalData, setSuccessModalData] = useState<{
    patientName: string;
    time: string;
    serviceName: string;
    checkedInAt: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Search query to filter today's appointments
  const [searchTodayQuery, setSearchTodayQuery] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('phone') || urlParams.get('name') || '';
      }
    } catch {
      // ignore
    }
    return '';
  });

  // Walk-in / unregistered patient quick arrival state
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInServiceId, setWalkInServiceId] = useState(services[0]?.id || '');
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);

  // QR Code mode: reception (general totem) or patient (personal)
  const [qrMode, setQrMode] = useState<'reception' | 'personal'>('reception');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);

  // Print Desk Plaque Modal
  const [showPrintPlaque, setShowPrintPlaque] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Current Date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Formatted date for display
  const todayFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Today's appointments for ALL patients (excluding cancelled)
  const allTodayAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date === todayStr && a.status !== 'cancelado')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, todayStr]);

  // Filtered today's appointments by search query
  const filteredTodayAppointments = useMemo(() => {
    if (!searchTodayQuery.trim()) return allTodayAppointments;
    const q = searchTodayQuery.toLowerCase().trim();
    return allTodayAppointments.filter(a => {
      const nameMatch = a.patientName.toLowerCase().includes(q);
      const phoneMatch = a.patientPhone.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
      const timeMatch = a.time.includes(q);
      const serviceMatch = a.serviceName.toLowerCase().includes(q);
      return nameMatch || phoneMatch || timeMatch || serviceMatch;
    });
  }, [allTodayAppointments, searchTodayQuery]);

  // Stats for today
  const todayStats = useMemo(() => {
    const total = allTodayAppointments.length;
    const checkedIn = allTodayAppointments.filter(
      a => a.attendanceStatus === 'presenca' || a.status === 'concluido' || !!a.checkedInAt
    ).length;
    const pending = total - checkedIn;
    return { total, checkedIn, pending };
  }, [allTodayAppointments]);

  // Generate QR Code URL
  const checkInUrl = useMemo(() => {
    if (qrMode === 'personal' && patient?.phone) {
      return getCheckInUrl(clinic.customAppUrl, patient.phone);
    }
    return getCheckInUrl(clinic.customAppUrl);
  }, [clinic.customAppUrl, qrMode, patient?.phone]);

  useEffect(() => {
    let isMounted = true;
    setIsGeneratingQr(true);
    generateQRCodeDataUrl(checkInUrl).then(url => {
      if (isMounted) {
        setQrCodeDataUrl(url);
        setIsGeneratingQr(false);
      }
    }).catch(() => {
      if (isMounted) setIsGeneratingQr(false);
    });

    return () => {
      isMounted = false;
    };
  }, [checkInUrl]);

  // Direct Check-in for an appointment on today's list
  const handleConfirmAppointmentCheckIn = async (appt: Appointment) => {
    try {
      setLoadingApptId(appt.id);
      setErrorMessage(null);

      const res = await api.checkInPatient({
        appointmentId: appt.id,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        method: 'qrcode',
        notes: 'Check-in de presença confirmado pelo Totem/QR Code'
      });

      if (res && res.success) {
        setSuccessModalData({
          patientName: appt.patientName,
          time: appt.time,
          serviceName: appt.serviceName,
          checkedInAt: res.checkedInAt || new Date().toISOString()
        });

        if (onReload) {
          onReload();
        }
      } else {
        setErrorMessage("Não foi possível registrar o check-in. Por favor, tente novamente ou avise a recepção.");
      }
    } catch (err: any) {
      console.error("Check-in error:", err);
      setErrorMessage(err.message || "Erro ao processar check-in. Verifique a conexão com a clínica.");
    } finally {
      setLoadingApptId(null);
    }
  };

  // Walk-in arrival check-in handler
  const handleWalkInCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) {
      setErrorMessage("Por favor, informe seu nome completo.");
      return;
    }

    try {
      setWalkInSubmitting(true);
      setErrorMessage(null);

      const selectedServ = services.find(s => s.id === walkInServiceId) || services[0];

      const res = await api.checkInPatient({
        patientName: walkInName.trim(),
        patientPhone: walkInPhone.trim() || '(93) 99999-9999',
        method: 'totem',
        notes: `Encaixe/Presença avulsa - ${selectedServ?.name || 'Sessão'} ${walkInNotes ? `| ${walkInNotes}` : ''}`
      });

      if (res && res.success) {
        setSuccessModalData({
          patientName: walkInName.trim(),
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          serviceName: selectedServ?.name || 'Fisioterapia / Pilates',
          checkedInAt: new Date().toISOString()
        });

        setWalkInName('');
        setWalkInPhone('');
        setWalkInNotes('');
        setIsWalkInOpen(false);

        if (onReload) {
          onReload();
        }
      } else {
        setErrorMessage("Não foi possível registrar seu check-in. Por favor, tente novamente.");
      }
    } catch (err: any) {
      console.error("Walk-in check-in error:", err);
      setErrorMessage(err.message || "Erro ao processar check-in.");
    } finally {
      setWalkInSubmitting(false);
    }
  };

  // Direct PDF Download Handler
  const handleDirectDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      const doc = await generateQRPDF({
        type: 'checkin',
        clinic,
        customQrDataUrl: qrCodeDataUrl,
        customUrl: checkInUrl,
        patientName: qrMode === 'personal' && patient ? patient.name : undefined,
        patientPhone: qrMode === 'personal' && patient ? patient.phone : undefined,
      });
      doc.save(`Fisiolys_Placa_CheckIn_A4_${qrMode === 'personal' && patient ? patient.name.replace(/\s+/g, '_') : 'Recepcao'}.pdf`);
    } catch (e) {
      console.error('Error generating PDF', e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Copy link
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(checkInUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      });
    }
  };

  // Download PNG
  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `QRCode_CheckIn_Fisiolys_${qrMode === 'personal' && patient ? patient.name.replace(/\s+/g, '_') : 'Recepcao'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* POPUP DE SUCESSO DO CHECK-IN */}
      {successModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border-2 border-emerald-500 text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner ring-4 ring-emerald-50">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                Presença Registrada com Sucesso!
              </span>
              <h3 className="text-2xl font-serif font-extrabold text-slate-900">
                Seja Bem-vindo(a), {successModalData.patientName}!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Seu check-in para o horário das <strong className="text-slate-900 font-extrabold">{successModalData.time} hs</strong> foi confirmado. A <strong>Dra. {clinic.managerName}</strong> já foi notificada da sua chegada!
              </p>
            </div>

            <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 text-left text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Serviço / Aula:</span>
                <span className="font-bold text-slate-900">{successModalData.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Horário de Chegada:</span>
                <span className="font-bold text-emerald-800">
                  {new Date(successModalData.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} hs
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Fisioterapeuta:</span>
                <span className="font-bold text-slate-900">Dra. {clinic.managerName}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSuccessModalData(null)}
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-700/30 transition-all cursor-pointer"
              >
                ✓ Concluir e Ficar à Vontade na Recepção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="bg-rose-50 text-rose-800 rounded-2xl p-4 border border-rose-200 flex items-center justify-between gap-3 animate-shake">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
          >
            ✕ Fechar
          </button>
        </div>
      )}

      {/* 1. SEÇÃO PRINCIPAL: TOTEM DE CHECK-IN DO DIA COM LISTA DE PACIENTES */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        
        {/* Header do Totem */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Totem Oficial de Presença • Fisiolys</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
              Faça seu Check-in de Chegada
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 capitalize">
              📅 {todayFormatted}
            </p>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Agendados</span>
              <span className="text-sm font-black text-slate-800">{todayStats.total}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Presentes</span>
              <span className="text-sm font-black text-emerald-800">{todayStats.checkedIn}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Aguardando</span>
              <span className="text-sm font-black text-amber-800">{todayStats.pending}</span>
            </div>
          </div>
        </div>

        {/* Instrução e Barra de Busca Rápida por Nome */}
        <div className="bg-[#F7F8F3] rounded-2xl p-4 sm:p-5 border border-[#C9D8CB] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-[#23372B]">
                Selecione o seu nome e horário abaixo para confirmar presença:
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Localize seu agendamento de hoje e clique no botão verde para registrar sua chegada.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => setIsWalkInOpen(!isWalkInOpen)}
              className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-[#7E611D] bg-[#F5EED3] hover:bg-[#EBDC9C] px-3.5 py-2 rounded-xl border border-[#D0A73B]/50 transition-all shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isWalkInOpen ? 'Fechar Cadastro' : 'Não está na lista? Encaixe Rápido'}</span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Digite seu nome para filtrar seu horário..."
              value={searchTodayQuery}
              onChange={(e) => setSearchTodayQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#C9D8CB] rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#31523D] transition-all font-medium"
            />
            {searchTodayQuery && (
              <button
                type="button"
                onClick={() => setSearchTodayQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* FORMULÁRIO DE ENCAIXE / CHECK-IN AVULSO (QUANDO ABERTO) */}
        {isWalkInOpen && (
          <form onSubmit={handleWalkInCheckInSubmit} className="bg-amber-50/60 rounded-2xl p-5 border-2 border-[#D0A73B]/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#7E611D]">
                <PlusCircle className="w-4 h-4 text-[#D0A73B]" />
                <h4 className="text-xs font-black uppercase tracking-wider">
                  Check-in de Encaixe / Paciente Sem Agendamento Prévio
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsWalkInOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  WhatsApp (com DDD)
                </label>
                <input
                  type="tel"
                  placeholder="(93) 99999-9999"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(formatPhoneMask(e.target.value))}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Tratamento / Aula
                </label>
                <select
                  value={walkInServiceId}
                  onChange={(e) => setWalkInServiceId(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                >
                  {services.filter(s => s.active).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsWalkInOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={walkInSubmitting}
                className="px-5 py-2.5 bg-[#31523D] hover:bg-[#23372B] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {walkInSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D0A73B]" />
                    <span>Confirmar Presença na Recepção</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* LISTA DE ATENDIMENTOS DE HOJE */}
        <div className="space-y-3">
          {filteredTodayAppointments.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">
                  {searchTodayQuery 
                    ? `Nenhum agendamento encontrado para "${searchTodayQuery}" hoje.`
                    : 'Nenhum agendamento marcado na agenda para a data de hoje.'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchTodayQuery 
                    ? 'Verifique a digitação ou utilize o botão "Encaixe Rápido" acima para registrar sua chegada.'
                    : 'Você pode registrar sua chegada avulsa no botão "Encaixe Rápido" acima ou agendar uma nova sessão.'}
                </p>
              </div>
              {onNavigateToBooking && (
                <button
                  type="button"
                  onClick={onNavigateToBooking}
                  className="px-4 py-2 bg-[#31523D] text-white text-xs font-bold rounded-xl hover:bg-[#23372B] transition-all cursor-pointer"
                >
                  Fazer Novo Agendamento
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTodayAppointments.map((appt) => {
                const isCheckedIn = appt.attendanceStatus === 'presenca' || appt.status === 'concluido' || !!appt.checkedInAt;
                const isLoading = loadingApptId === appt.id;

                return (
                  <div
                    key={appt.id}
                    className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between space-y-3 ${
                      isCheckedIn
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-[#31523D] shadow-xs hover:shadow-md'
                    }`}
                  >
                    {/* Linha Superior: Horário & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-[#23372B] text-[#F5EED3] text-xs font-black shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-[#D0A73B]" />
                          <span>{appt.time} hs</span>
                        </span>

                        <span className="text-[11px] font-bold text-slate-500">
                          {appt.durationMinutes} min
                        </span>
                      </div>

                      {isCheckedIn ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-600 text-white shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                          <span>Presença Confirmada</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <span>🟡 Aguardando Chegada</span>
                        </span>
                      )}
                    </div>

                    {/* Dados do Paciente e Serviço */}
                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-slate-900 flex items-center space-x-1.5">
                        <User className="w-4 h-4 text-[#5F6D33] shrink-0" />
                        <span>{appt.patientName}</span>
                      </h4>
                      <p className="text-xs font-semibold text-[#31523D]">
                        {appt.serviceName}
                      </p>
                      {appt.patientPhone && (
                        <p className="text-[11px] text-slate-400">
                          Tel: {formatPhoneMask(appt.patientPhone)}
                        </p>
                      )}
                    </div>

                    {/* Botão de Ação / Confirmação */}
                    <div className="pt-2 border-t border-slate-100/80">
                      {isCheckedIn ? (
                        <div className="flex items-center justify-between text-xs text-emerald-800 font-bold bg-white/70 px-3 py-2 rounded-xl border border-emerald-200">
                          <span className="flex items-center space-x-1">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Check-in realizado</span>
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {appt.checkedInAt 
                              ? `${new Date(appt.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} hs`
                              : 'Hoje'}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmAppointmentCheckIn(appt)}
                          disabled={isLoading}
                          className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-[#D0A73B]" />
                              <span>Registrando Presença...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                              <span>Confirmar Minha Presença</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 2. PLACA DE BALCÃO E QR CODE PARA RECEPÇÃO */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#7E611D] uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-[#D0A73B]" />
              <span>Placa de Balcão e Totem Físico</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1">
              QR Code Oficial de Check-in Fisiolys
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Imprima e posicione no balcão da clínica para que os pacientes façam check-in instantâneo apontando a câmera do celular.
            </p>
          </div>

          {/* QR Code Switcher Mode */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setQrMode('reception')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                qrMode === 'reception'
                  ? 'bg-white text-[#31523D] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Totem Recepção (Geral)
            </button>
            {patient && (
              <button
                type="button"
                onClick={() => setQrMode('personal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  qrMode === 'personal'
                    ? 'bg-white text-[#31523D] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                QR Code do Paciente
              </button>
            )}
          </div>
        </div>

        {/* QR Code Visual Showcase & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* QR Code Display Canvas */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#F7F8F3] to-[#EAEFEA] rounded-3xl border border-[#C9D8CB] text-center shadow-inner">
            <div className="w-56 h-56 bg-white p-4 rounded-2xl shadow-md border border-[#D0A73B]/30 flex items-center justify-center relative">
              {isGeneratingQr ? (
                <div className="flex flex-col items-center space-y-2 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#31523D]" />
                  <span className="text-[11px] font-bold">Gerando QR Code...</span>
                </div>
              ) : qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code Check-in Fisiolys"
                  className="w-full h-full object-contain"
                />
              ) : (
                <QrCode className="w-24 h-24 text-slate-300" />
              )}
            </div>

            <div className="mt-4 space-y-1">
              <span className="text-xs font-black text-[#31523D] uppercase tracking-wide">
                {qrMode === 'reception' ? 'Placa de Balcão • Recepção' : `QR Code • ${patient?.name || 'Paciente'}`}
              </span>
              <p className="text-[11px] text-slate-500 max-w-xs">
                {qrMode === 'reception' 
                  ? 'Qualquer paciente que apontar o celular acessa a tela de confirmação de presença.' 
                  : 'Check-in direto pré-identificado com o telefone deste paciente.'}
              </p>
            </div>
          </div>

          {/* Quick Actions & Instructions */}
          <div className="md:col-span-7 space-y-5">
            
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Como funciona a rotina de Check-in:</span>
              </h4>

              <ol className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#31523D] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    1
                  </span>
                  <span>O paciente chega à recepção e aponta a câmera do celular para a placa de QR Code no balcão (ou abre o link).</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#31523D] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    2
                  </span>
                  <span>A página de check-in mostra seu nome e horário na lista de hoje. Ele clica em <strong>"Confirmar Minha Presença"</strong>.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#31523D] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    3
                  </span>
                  <span>A <strong>Dra. {clinic.managerName}</strong> é notificada imediatamente e o registro de presença é atualizado no sistema!</span>
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              
              {/* Button: Direct Download PDF A4 */}
              <button
                type="button"
                onClick={handleDirectDownloadPDF}
                disabled={isDownloadingPdf}
                className="px-4 py-2.5 bg-[#31523D] hover:bg-[#23372B] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
              >
                {isDownloadingPdf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D0A73B]" />
                    <span>Gerando PDF A4...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-[#D0A73B]" />
                    <span>Baixar Placa em PDF (A4)</span>
                  </>
                )}
              </button>

              {/* Button: Open Print & PDF Options Modal */}
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-[#7E611D] border border-[#D0A73B]/50 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#7E611D]" />
                <span>Imprimir / Outras Placas</span>
              </button>

              {/* Button: Download PNG */}
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Baixar PNG</span>
              </button>

              {/* Button: Copy Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link Direto'}</span>
              </button>

              {/* Button: Test Simulation */}
              <a
                href={checkInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Testar Leitura</span>
              </a>

            </div>

            {/* Link Preview box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="truncate max-w-sm font-mono text-[11px]">{checkInUrl}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Link Totem</span>
            </div>

          </div>

        </div>

      </div>

      {/* Global Printable PDF Generator Modal */}
      <PrintableQRPDFModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        clinic={clinic}
        services={services}
        defaultTemplate="checkin"
        patientName={qrMode === 'personal' && patient ? patient.name : undefined}
        patientPhone={qrMode === 'personal' && patient ? patient.phone : undefined}
      />

    </div>
  );
};
