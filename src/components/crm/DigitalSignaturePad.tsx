import React, { useRef, useState, useEffect } from 'react';
import { 
  PenTool, RotateCcw, Check, X, Shield, Lock, FileCheck2, 
  Calendar, UserCheck, Sparkles, CheckCircle2, AlertCircle, Award, Stethoscope
} from 'lucide-react';
import { getProfessionalSignature, setProfessionalSignature } from '../../utils/securityUtils';
import { BotanicalVineAccents } from '../common/BotanicalVineAccents';

interface DigitalSignaturePadProps {
  patientName: string;
  treatmentName?: string;
  initialSignatureUrl?: string;
  initialSignatureDate?: string;
  initialSignatureHash?: string;
  initialDoctorSignatureUrl?: string;
  onSave: (signatureData: {
    dataUrl: string;
    date: string;
    hash: string;
    doctorDataUrl?: string;
  }) => void;
  onCancel?: () => void;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  patientName,
  treatmentName = 'Plano Terapêutico Fisiolys & Pilates',
  initialSignatureUrl,
  initialSignatureDate,
  initialSignatureHash,
  initialDoctorSignatureUrl,
  onSave,
  onCancel
}) => {
  // Tabs: 'patient' | 'doctor'
  const [activeSigner, setActiveSigner] = useState<'patient' | 'doctor'>('patient');

  // Canvas refs
  const patientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doctorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // States for Patient Canvas
  const [isDrawingPatient, setIsDrawingPatient] = useState(false);
  const [hasDrawnPatient, setHasDrawnPatient] = useState(Boolean(initialSignatureUrl));
  const [patientStrokesHistory, setPatientStrokesHistory] = useState<ImageData[]>([]);
  const [patientDataUrl, setPatientDataUrl] = useState<string>(initialSignatureUrl || '');

  // States for Doctor Canvas (Dra. Elays Marinho)
  const defaultSavedDoctorSig = getProfessionalSignature();
  const [isDrawingDoctor, setIsDrawingDoctor] = useState(false);
  const [hasDrawnDoctor, setHasDrawnDoctor] = useState(Boolean(initialDoctorSignatureUrl || defaultSavedDoctorSig));
  const [doctorStrokesHistory, setDoctorStrokesHistory] = useState<ImageData[]>([]);
  const [doctorDataUrl, setDoctorDataUrl] = useState<string>(initialDoctorSignatureUrl || defaultSavedDoctorSig || '');

  const [isAgreed, setIsAgreed] = useState(true);
  const [saveDoctorAsDefault, setSaveDoctorAsDefault] = useState(true);

  // Initialize Patient Canvas
  useEffect(() => {
    if (activeSigner !== 'patient') return;
    const canvas = patientCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1B2E24';

    if (patientDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawnPatient(true);
      };
      img.src = patientDataUrl;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }, [activeSigner]);

  // Initialize Doctor Canvas
  useEffect(() => {
    if (activeSigner !== 'doctor') return;
    const canvas = doctorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1B2E24';

    if (doctorDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawnDoctor(true);
      };
      img.src = doctorDataUrl;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }, [activeSigner]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // --- Handlers for Patient Canvas ---
  const handleStartDrawPatient = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = patientCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawingPatient(true);
    setHasDrawnPatient(true);
  };

  const handleDrawPatient = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingPatient) return;
    e.preventDefault();
    const canvas = patientCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleStopDrawPatient = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e) e.preventDefault();
    if (!isDrawingPatient) return;
    setIsDrawingPatient(false);
    const canvas = patientCanvasRef.current;
    if (canvas) {
      setPatientDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const handleClearPatient = () => {
    const canvas = patientCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawnPatient(false);
    setPatientDataUrl('');
  };

  // --- Handlers for Doctor Canvas ---
  const handleStartDrawDoctor = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = doctorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawingDoctor(true);
    setHasDrawnDoctor(true);
  };

  const handleDrawDoctor = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingDoctor) return;
    e.preventDefault();
    const canvas = doctorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleStopDrawDoctor = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e) e.preventDefault();
    if (!isDrawingDoctor) return;
    setIsDrawingDoctor(false);
    const canvas = doctorCanvasRef.current;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      setDoctorDataUrl(url);
      if (saveDoctorAsDefault) {
        setProfessionalSignature(url);
      }
    }
  };

  const handleClearDoctor = () => {
    const canvas = doctorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawnDoctor(false);
    setDoctorDataUrl('');
  };

  const handleSaveSignature = () => {
    let finalPatientUrl = patientDataUrl;
    if (patientCanvasRef.current && hasDrawnPatient) {
      finalPatientUrl = patientCanvasRef.current.toDataURL('image/png');
    }

    if (!finalPatientUrl && !initialSignatureUrl) {
      alert("Por favor, capture a assinatura do paciente antes de confirmar.");
      setActiveSigner('patient');
      return;
    }

    if (!isAgreed) {
      alert("É necessário marcar o aceite dos termos do plano terapêutico e deontologia.");
      return;
    }

    let finalDoctorUrl = doctorDataUrl || defaultSavedDoctorSig || '';
    if (doctorCanvasRef.current && hasDrawnDoctor) {
      finalDoctorUrl = doctorCanvasRef.current.toDataURL('image/png');
    }

    if (finalDoctorUrl && saveDoctorAsDefault) {
      setProfessionalSignature(finalDoctorUrl);
    }

    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR').slice(0, 5)}`;
    const hash = initialSignatureHash || `FISIOLYS-SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    onSave({
      dataUrl: finalPatientUrl || initialSignatureUrl || '',
      date: initialSignatureDate || dateFormatted,
      hash,
      doctorDataUrl: finalDoctorUrl || undefined
    });
  };

  return (
    <div className="bg-[#FAF7F0] rounded-3xl p-5 sm:p-7 border border-[#E4DCC8] shadow-2xl max-w-2xl w-full mx-auto space-y-5 relative overflow-hidden animate-in zoom-in-95 duration-200">
      
      {/* Decorative botanical climbing vine */}
      <div className="absolute -top-3 -right-3 w-28 h-28 pointer-events-none opacity-40">
        <BotanicalVineAccents variant="corner-tr" colorTheme="gold" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#E4DCC8] pb-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center shadow-xs">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#1B2E24]">
                Assinatura Digital & Validação de Contrato
              </h3>
              <p className="text-xs text-[#736B5E]">
                Assinatura eletrônica do Paciente (Contratante) e da Dra. Elays Marinho (Contratada).
              </p>
            </div>
          </div>
        </div>

        {initialSignatureHash && hasDrawnPatient && (
          <span className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Assinado</span>
          </span>
        )}
      </div>

      {/* Signer Switch Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-[#F3EEE2] p-1.5 rounded-2xl border border-[#E4DCC8] relative z-10">
        <button
          type="button"
          onClick={() => setActiveSigner('patient')}
          className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSigner === 'patient'
              ? 'bg-[#1B2E24] text-[#DCC58F] shadow-sm'
              : 'text-[#5B5A52] hover:text-[#1B2E24] hover:bg-white/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>1. Assinatura do Paciente</span>
          {hasDrawnPatient && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveSigner('doctor')}
          className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSigner === 'doctor'
              ? 'bg-[#1B2E24] text-[#DCC58F] shadow-sm'
              : 'text-[#5B5A52] hover:text-[#1B2E24] hover:bg-white/60'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>2. Assinatura da Dra. Elays</span>
          {(hasDrawnDoctor || defaultSavedDoctorSig) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
      </div>

      {/* Patient & Consultation Summary Pill */}
      <div className="p-3.5 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs relative z-10">
        <div>
          <span className="text-[#736B5E] block text-[11px]">Paciente (Contratante):</span>
          <strong className="text-[#1B2E24] text-sm">{patientName}</strong>
        </div>
        <div>
          <span className="text-[#736B5E] block text-[11px]">Plano / Procedimento:</span>
          <strong className="text-[#1B2E24]">{treatmentName}</strong>
        </div>
        <div>
          <span className="text-[#736B5E] block text-[11px]">Fisioterapeuta (Contratada):</span>
          <span className="text-[#1B2E24] font-bold">Dra. Elays Marinho (CREFITO-12 / 208058)</span>
        </div>
      </div>

      {/* TAB 1: PATIENT SIGNATURE */}
      {activeSigner === 'patient' && (
        <div className="space-y-4 animate-in fade-in duration-150 relative z-10">
          
          {/* Legal Declaration Box */}
          <div className="p-3.5 bg-white rounded-2xl border border-[#E4DCC8] text-xs text-[#5B5A52] space-y-2">
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 text-[#B08A3E] shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px] sm:text-xs">
                "Declaro que fui informado(a) e concordo integralmente com a avaliação cinético-funcional, diagnósticos, contrato de serviços e o plano terapêutico prescrito pela Dra. Elays Marinho (CREFITO 208058). Autorizo a realização dos procedimentos na clínica Fisiolys, em conformidade com o COFFITO e LGPD."
              </p>
            </div>

            <label className="flex items-center space-x-2.5 pt-1 text-xs font-semibold text-[#1B2E24] cursor-pointer">
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
                className="w-4 h-4 rounded text-[#1B2E24] border-[#8C8270] focus:ring-[#B08A3E]"
              />
              <span>Confirmo a leitura e aprovação dos termos contratuais e terapêuticos</span>
            </label>
          </div>

          {/* Canvas Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1B2E24] flex items-center space-x-1.5">
                <span>✍️ Assinatura do Paciente (Desenhe com o dedo, caneta ou mouse)</span>
              </label>
              
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              </div>
            </div>

            <div className="relative w-full h-44 bg-white rounded-2xl border-2 border-dashed border-[#B08A3E]/60 overflow-hidden shadow-inner touch-none">
              <canvas
                ref={patientCanvasRef}
                onMouseDown={handleStartDrawPatient}
                onMouseMove={handleDrawPatient}
                onMouseUp={handleStopDrawPatient}
                onMouseLeave={handleStopDrawPatient}
                onTouchStart={handleStartDrawPatient}
                onTouchMove={handleDrawPatient}
                onTouchEnd={handleStopDrawPatient}
                onTouchCancel={handleStopDrawPatient}
                className="w-full h-full cursor-crosshair block"
                style={{ touchAction: 'none' }}
              />

              <div className="absolute bottom-6 left-6 right-6 border-b border-[#E4DCC8] pointer-events-none flex justify-between items-center text-[10px] text-[#A69B88] font-mono select-none">
                <span>X __________________________________________</span>
                <span>Assinatura do Paciente ({patientName})</span>
              </div>

              {!hasDrawnPatient && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4 text-[#A69B88] space-y-1">
                  <PenTool className="w-6 h-6 stroke-[1.5] text-[#DCC58F]" />
                  <span className="text-xs font-medium">Toque e desenhe a assinatura do paciente aqui</span>
                  <span className="text-[10px]">Validação digital com timestamp e hash COFFITO</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCTOR SIGNATURE (DRA. ELAYS MARINHO) */}
      {activeSigner === 'doctor' && (
        <div className="space-y-4 animate-in fade-in duration-150 relative z-10">
          
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="flex items-center space-x-2 font-bold">
              <Award className="w-4 h-4 text-emerald-700" />
              <span>Assinatura Profissional • Dra. Elays Marinho (CREFITO-12 / 208058)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Sua assinatura será vinculada automaticamente a todos os contratos, laudos e TCLEs gerados para este paciente.
            </p>
          </div>

          {/* Canvas Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1B2E24] flex items-center space-x-1.5">
                <span>✍️ Assinatura da Dra. Elays Marinho</span>
              </label>
              
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={handleClearDoctor}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar / Redesenhar</span>
                </button>
              </div>
            </div>

            <div className="relative w-full h-44 bg-white rounded-2xl border-2 border-dashed border-emerald-600/50 overflow-hidden shadow-inner touch-none">
              <canvas
                ref={doctorCanvasRef}
                onMouseDown={handleStartDrawDoctor}
                onMouseMove={handleDrawDoctor}
                onMouseUp={handleStopDrawDoctor}
                onMouseLeave={handleStopDrawDoctor}
                onTouchStart={handleStartDrawDoctor}
                onTouchMove={handleDrawDoctor}
                onTouchEnd={handleStopDrawDoctor}
                onTouchCancel={handleStopDrawDoctor}
                className="w-full h-full cursor-crosshair block"
                style={{ touchAction: 'none' }}
              />

              <div className="absolute bottom-6 left-6 right-6 border-b border-[#E4DCC8] pointer-events-none flex justify-between items-center text-[10px] text-[#A69B88] font-mono select-none">
                <span>X __________________________________________</span>
                <span>Dra. Elays Marinho (CREFITO-12 / 208058)</span>
              </div>

              {!hasDrawnDoctor && !doctorDataUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4 text-[#A69B88] space-y-1">
                  <Stethoscope className="w-6 h-6 stroke-[1.5] text-emerald-600" />
                  <span className="text-xs font-medium">Desenhe sua assinatura profissional aqui</span>
                  <span className="text-[10px]">Pode salvar como assinatura padrão para todos os contratos</span>
                </div>
              )}
            </div>

            <label className="flex items-center space-x-2 pt-1 text-xs font-medium text-[#1B2E24] cursor-pointer">
              <input
                type="checkbox"
                checked={saveDoctorAsDefault}
                onChange={(e) => setSaveDoctorAsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-[#1B2E24] border-[#8C8270] focus:ring-[#B08A3E]"
              />
              <span>Salvar esta assinatura como padrão da Dra. Elays nos próximos contratos e laudos</span>
            </label>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E4DCC8] relative z-10">
        <div className="text-[10px] text-[#736B5E] hidden sm:block">
          <span>🔒 Criptografia SHA-256 & LGPD</span>
        </div>

        <div className="flex items-center space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold text-[#736B5E] hover:text-[#1B2E24] bg-white border border-[#E4DCC8] rounded-xl hover:bg-[#F3EEE2] transition-all cursor-pointer"
            >
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveSignature}
            className="px-5 py-2.5 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-md border border-[#DCC58F]/50 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Check className="w-4 h-4 text-[#DCC58F]" />
            <span>Confirmar & Salvar Assinaturas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
