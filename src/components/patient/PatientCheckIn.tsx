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
  getPublicAppUrl,
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
  Building2,
  Calendar,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  ExternalLink,
  MapPin
} from 'lucide-react';

interface PatientCheckInProps {
  patient: Patient;
  appointments: Appointment[];
  clinic: ClinicConfig;
  services: Service[];
  onReload?: () => void;
  onNavigateToBooking?: () => void;
}

export const PatientCheckIn: React.FC<PatientCheckInProps> = ({
  patient,
  appointments,
  clinic,
  services,
  onReload,
  onNavigateToBooking,
}) => {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // QR Code mode: reception (general totem) or patient (personal)
  const [qrMode, setQrMode] = useState<'reception' | 'personal'>('reception');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);

  // Print Desk Plaque Modal
  const [showPrintPlaque, setShowPrintPlaque] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDirectDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      const doc = await generateQRPDF({
        type: 'checkin',
        clinic,
        customQrDataUrl: qrCodeDataUrl,
        customUrl: checkInUrl,
        patientName: qrMode === 'personal' ? patient.name : undefined,
        patientPhone: qrMode === 'personal' ? patient.phone : undefined,
      });
      doc.save(`Fisiolys_Placa_CheckIn_A4_${qrMode === 'personal' ? patient.name.replace(/\s+/g, '_') : 'Recepcao'}.pdf`);
    } catch (e) {
      console.error('Error generating PDF', e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Selected service for walk-in check-in if no scheduled appointment today
  const [walkInServiceId, setWalkInServiceId] = useState<string>(() => {
    return services[0]?.id || '';
  });

  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Today's appointments for this patient
  const todayAppointments = useMemo(() => {
    return appointments.filter(
      a => a.date === todayStr && a.status !== 'cancelado'
    );
  }, [appointments, todayStr]);

  const activeTodayAppt = todayAppointments[0] || null;
  const isAlreadyCheckedInToday = activeTodayAppt?.attendanceStatus === 'presenca' && !!activeTodayAppt?.checkedInAt;

  // Generate QR Code URL
  const checkInUrl = useMemo(() => {
    if (qrMode === 'personal') {
      return getCheckInUrl(clinic.customAppUrl, patient.phone);
    }
    return getCheckInUrl(clinic.customAppUrl);
  }, [clinic.customAppUrl, qrMode, patient.phone]);

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

  // Handle Direct Check-in
  const handlePerformCheckIn = async (appointmentId?: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await api.checkInPatient({
        appointmentId: appointmentId || activeTodayAppt?.id,
        patientName: patient.name,
        patientPhone: patient.phone,
        method: 'qrcode',
        notes: 'Check-in presencial confirmado pelo Portal'
      });

      if (res && res.success) {
        setSuccessMessage(res.message || `Check-in confirmado com sucesso! Seja bem-vindo(a) à Fisiolys.`);
        if (onReload) {
          onReload();
        }
      } else {
        setErrorMessage("Não foi possível concluir o check-in. Tente novamente ou fale na recepção.");
      }
    } catch (err: any) {
      console.error("Check-in error:", err);
      setErrorMessage(err.message || "Erro ao processar check-in. Verifique a conexão com a clínica.");
    } finally {
      setLoading(false);
    }
  };

  // Copy check-in link handler
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(checkInUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      });
    }
  };

  // Download QR Code image
  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `QRCode_CheckIn_Fisiolys_${qrMode === 'personal' ? patient.name.replace(/\s+/g, '_') : 'Recepcao'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">

      {/* SUCCESS CONFIRMATION MODAL / BANNER */}
      {successMessage && (
        <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-xl border border-emerald-500 relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-white text-emerald-700 flex items-center justify-center font-extrabold shadow-md shrink-0">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-800/60 text-white border border-emerald-400">
                  Presença Registrada
                </span>
                <h3 className="text-lg font-black text-white mt-1">Check-in Realizado com Sucesso!</h3>
                <p className="text-xs text-emerald-100 mt-0.5 max-w-xl">
                  {successMessage} Fique à vontade na recepção enquanto a Dra. {clinic.managerName} finaliza os preparativos da sua sala.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSuccessMessage(null)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all shrink-0 self-start sm:self-center"
            >
              OK, Entendido
            </button>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="bg-red-50 text-red-800 rounded-2xl p-4 border border-red-200 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-xs font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-red-600 hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 1. PATIENT TODAY ARRIVAL CHECK-IN CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chegada do Paciente na Clínica</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Check-in de Presença em 1-Clique
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Ao chegar para a sua consulta ou aula de Pilates na <strong className="text-slate-800">{clinic.name}</strong>, confirme sua presença para notificar imediatamente a equipe de atendimento.
            </p>
          </div>

          {/* Direct Action Area */}
          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2">
            {isAlreadyCheckedInToday ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center sm:text-right space-y-1">
                <div className="flex items-center sm:justify-end space-x-1.5 text-emerald-800 font-extrabold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Check-in Já Confirmado Hoje!</span>
                </div>
                <div className="text-xs text-slate-600">
                  Horário: <strong>{activeTodayAppt?.checkedInAt ? new Date(activeTodayAppt.checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Hoje'} hs</strong>
                </div>
                <div className="text-[11px] text-slate-400">
                  Sessão: {activeTodayAppt?.serviceName}
                </div>
              </div>
            ) : activeTodayAppt ? (
              <button
                onClick={() => handlePerformCheckIn(activeTodayAppt.id)}
                disabled={loading}
                className="px-6 py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-700/25 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processando Check-in...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>Confirmar Presença Hoje ({activeTodayAppt.time} hs)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handlePerformCheckIn()}
                  disabled={loading}
                  className="w-full px-6 py-3.5 bg-[#31523D] hover:bg-[#23372B] text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Registrando Chegada...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#D0A73B]" />
                      <span>Fazer Check-in Presencial Agora</span>
                    </>
                  )}
                </button>
                <div className="text-[11px] text-slate-400 text-center sm:text-right">
                  Não possui horário marcado? Este botão registra sua chegada avulsa.
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Today's Schedule Card if available */}
        {activeTodayAppt && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {activeTodayAppt.serviceName}
                </div>
                <div className="text-slate-500">
                  Data: <strong>Hoje ({formatDatePtBR(todayStr)})</strong> às <strong>{activeTodayAppt.time} hs</strong> • Dra. {clinic.managerName}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                isAlreadyCheckedInToday
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {isAlreadyCheckedInToday ? 'Presença Confirmada' : 'Aguardando Check-in'}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* 2. QR CODE SECTION FOR RECEPTION DESK & TOTEM */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#7E611D] uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-[#D0A73B]" />
              <span>Totem & Placa de Balcão da Recepção</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1">
              QR Code Oficial de Check-in Fisiolys
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Imprima e posicione no balcão da clínica para que os pacientes façam check-in instantâneo apontando a câmera do smartphone.
            </p>
          </div>

          {/* QR Code Switcher Mode */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setQrMode('reception')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                qrMode === 'reception'
                  ? 'bg-white text-[#31523D] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Totem Recepção (Geral)
            </button>
            <button
              onClick={() => setQrMode('personal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                qrMode === 'personal'
                  ? 'bg-white text-[#31523D] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              QR Code do Paciente
            </button>
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
                {qrMode === 'reception' ? 'Placa de Balcão • Recepção' : `QR Code • ${patient.name}`}
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
                <span>Como funciona o Check-in via QR Code:</span>
              </h4>

              <ol className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#31523D] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    1
                  </span>
                  <span>O paciente chega à clínica e aponta a câmera do celular para a placa de QR Code no balcão.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#31523D] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    2
                  </span>
                  <span>A página de confirmação se abre e ele clica em <strong>"Confirmar Presença"</strong> em menos de 5 segundos.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#31523D] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    3
                  </span>
                  <span>A Dra. Elays Marinho recebe o aviso de chegada e a frequência do paciente é atualizada automaticamente!</span>
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              
              {/* Button: Direct Download PDF A4 */}
              <button
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
                onClick={() => setIsPdfModalOpen(true)}
                className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-[#7E611D] border border-[#D0A73B]/50 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#7E611D]" />
                <span>Imprimir / Outras Placas</span>
              </button>

              {/* Button: Download PNG */}
              <button
                onClick={handleDownloadQr}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Baixar PNG</span>
              </button>

              {/* Button: Copy Link */}
              <button
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
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Link Público</span>
            </div>

          </div>

        </div>

      </div>

      {/* 3. PRINTABLE DESK PLAQUE MODAL (DISPLAY DE MESA A4) */}
      {showPrintPlaque && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-[#31523D]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase">
                  Visualização da Placa de Recepção para Impressão
                </h3>
              </div>
              <button
                onClick={() => setShowPrintPlaque(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Plaque Preview Canvas (Styled for A4 Display) */}
            <div
              id="printable-checkin-plaque"
              className="bg-[#F7F8F3] border-4 border-[#31523D] rounded-3xl p-8 text-center space-y-6 shadow-md relative"
            >
              {/* Corner Gold Accents */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#D0A73B]" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#D0A73B]" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#D0A73B]" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#D0A73B]" />

              {/* Clinic Branding */}
              <div className="space-y-1">
                <div className="text-2xl font-black text-[#31523D] tracking-tight">
                  FISIOLYS
                </div>
                <div className="text-xs font-bold text-[#7E611D] uppercase tracking-widest">
                  Fisioterapia & Pilates • Saúde e Reabilitação
                </div>
              </div>

              {/* Title & Invitation */}
              <div className="space-y-1">
                <div className="inline-block px-4 py-1 rounded-full bg-[#31523D] text-[#D0A73B] text-xs font-black uppercase tracking-wider">
                  Chegou para o seu atendimento?
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                  FAÇA SEU CHECK-IN PELO CELULAR
                </h2>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Aponte a câmera do seu smartphone para o QR Code abaixo e confirme sua presença.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex justify-center">
                <div className="w-56 h-56 bg-white p-4 rounded-2xl border-2 border-[#D0A73B] shadow-lg flex items-center justify-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code Check-in Recepção"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QrCode className="w-24 h-24 text-slate-300" />
                  )}
                </div>
              </div>

              {/* 3 Steps Guide */}
              <div className="grid grid-cols-3 gap-2 text-left pt-2 border-t border-[#C9D8CB] max-w-md mx-auto">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black text-[#31523D]">1. Aponte</div>
                  <div className="text-[10px] text-slate-500 leading-tight">Abra a câmera do celular e mire no QR Code.</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black text-[#31523D]">2. Confirme</div>
                  <div className="text-[10px] text-slate-500 leading-tight">Confirme seu nome e clique em check-in.</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black text-[#31523D]">3. Relaxe</div>
                  <div className="text-[10px] text-slate-500 leading-tight">A Dra. Elays já sabe que você chegou!</div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 text-[10px] text-slate-400">
                {clinic.address} • {clinic.city} • Dra. {clinic.managerName}
              </div>

            </div>

            {/* Print Dialog Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleDirectDownloadPDF}
                disabled={isDownloadingPdf}
                className="w-full sm:flex-1 py-3 bg-[#31523D] hover:bg-[#23372B] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#D0A73B]" />
                <span>Baixar Documento em PDF (A4)</span>
              </button>
              <button
                onClick={() => {
                  setShowPrintPlaque(false);
                  setIsPdfModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-3 bg-amber-100 hover:bg-amber-200 text-[#7E611D] font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Outras Opções de Impressão</span>
              </button>
              <button
                onClick={() => setShowPrintPlaque(false)}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global Printable PDF Generator Modal */}
      <PrintableQRPDFModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        clinic={clinic}
        services={services}
        defaultTemplate="checkin"
        patientName={qrMode === 'personal' ? patient.name : undefined}
        patientPhone={qrMode === 'personal' ? patient.phone : undefined}
      />

    </div>
  );
};
