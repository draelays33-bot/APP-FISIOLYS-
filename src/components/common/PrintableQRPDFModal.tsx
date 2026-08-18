import React, { useState, useEffect } from 'react';
import { ClinicConfig, Service } from '../../types';
import { generateQRPDF, generateServicesCatalogPDF, QRTemplateType } from '../../utils/pdfGenerator';
import { generateQRCodeDataUrl, getCheckInUrl, getGoogleReviewUrl, getPublicAppUrl } from '../../utils/qrUtils';
import { Printer, Download, FileText, CheckCircle2, X, Sparkles, Smartphone, Star, UserCheck, RefreshCw, Layers } from 'lucide-react';
import { GoogleGIcon } from '../public/DownloadAppQRSection';

interface PrintableQRPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinic: ClinicConfig;
  services?: Service[];
  defaultTemplate?: QRTemplateType | 'catalog';
  patientName?: string;
  patientPhone?: string;
}

export const PrintableQRPDFModal: React.FC<PrintableQRPDFModalProps> = ({
  isOpen,
  onClose,
  clinic,
  services = [],
  defaultTemplate = 'checkin',
  patientName,
  patientPhone,
}) => {
  const [selectedType, setSelectedType] = useState<QRTemplateType | 'catalog'>(defaultTemplate);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (defaultTemplate) {
      setSelectedType(defaultTemplate);
    }
  }, [defaultTemplate]);

  // Update preview QR code when selection changes
  useEffect(() => {
    let targetUrl = getPublicAppUrl(clinic.customAppUrl);
    if (selectedType === 'checkin') {
      targetUrl = getCheckInUrl(clinic.customAppUrl, patientPhone);
    } else if (selectedType === 'review') {
      targetUrl = getGoogleReviewUrl(clinic.googleReviewUrl, clinic.address, clinic.city);
    }
    generateQRCodeDataUrl(targetUrl).then(setQrPreviewUrl);
  }, [selectedType, clinic, patientPhone]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    setDownloadSuccess(false);
    try {
      if (selectedType === 'catalog') {
        const doc = await generateServicesCatalogPDF(clinic, services);
        doc.save(`Fisiolys_Tabela_Servicos_Tratamentos_${new Date().getFullYear()}.pdf`);
      } else {
        const doc = await generateQRPDF({
          type: selectedType,
          clinic,
          patientName,
          patientPhone,
        });
        const fileSuffix = selectedType === 'checkin' ? 'CheckIn_Recepcao' : selectedType === 'review' ? 'Avaliacao_Google_5Estrelas' : selectedType === 'app' ? 'Aplicativo_Agendamento' : 'Kit_Completo_Placas';
        doc.save(`Fisiolys_Placa_A4_${fileSuffix}.pdf`);
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleOpenPrintPreview = async () => {
    setGeneratingPdf(true);
    try {
      let doc;
      if (selectedType === 'catalog') {
        doc = await generateServicesCatalogPDF(clinic, services);
      } else {
        doc = await generateQRPDF({
          type: selectedType,
          clinic,
          patientName,
          patientPhone,
        });
      }
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Error opening print view:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-[#D0A73B]/40 space-y-5 my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center font-black shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Impressão de Placas e QR Codes em PDF (A4)
              </h3>
              <p className="text-xs text-slate-500">
                Gere documentos prontos para imprimir e colocar no balcão da clínica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Selector Options */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Escolha o Modelo de Placa / Documento para Gerar:
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            {/* 1. Check-in Plaque */}
            <button
              type="button"
              onClick={() => setSelectedType('checkin')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                selectedType === 'checkin'
                  ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/20'
                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${selectedType === 'checkin' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-slate-200'}`}>
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>Placa de Check-in</span>
                  {selectedType === 'checkin' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Para o balcão da recepção. Paciente aponta a câmera e avisa que chegou.
                </div>
              </div>
            </button>

            {/* 2. Google Review Plaque */}
            <button
              type="button"
              onClick={() => setSelectedType('review')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                selectedType === 'review'
                  ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600/20'
                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${selectedType === 'review' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-slate-200'}`}>
                <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>Avaliação Google (5 Estrelas)</span>
                  {selectedType === 'review' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Incentive os pacientes a avaliarem a clínica no Google Meu Negócio.
                </div>
              </div>
            </button>

            {/* 3. App / Agendamento Plaque */}
            <button
              type="button"
              onClick={() => setSelectedType('app')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                selectedType === 'app'
                  ? 'bg-[#31523D]/10 border-[#31523D] ring-2 ring-[#31523D]/20'
                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${selectedType === 'app' ? 'bg-[#31523D] text-[#D0A73B]' : 'bg-white text-[#31523D] border border-slate-200'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>Placa do Aplicativo</span>
                  {selectedType === 'app' && <CheckCircle2 className="w-3.5 h-3.5 text-[#31523D]" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  QR Code para agendamentos online e consulta de horários.
                </div>
              </div>
            </button>

            {/* 4. Kit Completo (All 3 in A4) */}
            <button
              type="button"
              onClick={() => setSelectedType('kit_completo')}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                selectedType === 'kit_completo'
                  ? 'bg-amber-50/90 border-[#D0A73B] ring-2 ring-[#D0A73B]/20'
                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${selectedType === 'kit_completo' ? 'bg-[#D0A73B] text-slate-900' : 'bg-white text-[#7E611D] border border-slate-200'}`}>
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>Kit Completo (3 Placas)</span>
                  {selectedType === 'kit_completo' && <CheckCircle2 className="w-3.5 h-3.5 text-[#D0A73B]" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Gera 1 arquivo PDF contendo as 3 placas individuais formatadas para A4.
                </div>
              </div>
            </button>

            {/* 5. Tabela de Serviços Catalog */}
            {services.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedType('catalog')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer sm:col-span-2 ${
                  selectedType === 'catalog'
                    ? 'bg-emerald-50/90 border-[#31523D] ring-2 ring-[#31523D]/20'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${selectedType === 'catalog' ? 'bg-[#31523D] text-[#D0A73B]' : 'bg-white text-[#31523D] border border-slate-200'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                    <span>Tabela Oficial de Serviços e Tratamentos</span>
                    {selectedType === 'catalog' && <CheckCircle2 className="w-3.5 h-3.5 text-[#31523D]" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Tabela com todos os tratamentos da Fisiolys, preços de investimento (Mensal/Sessão) e QR Code.
                  </div>
                </div>
              </button>
            )}

          </div>
        </div>

        {/* Live Visual Preview Container */}
        <div className="bg-[#F7F8F3] border-2 border-[#D0A73B]/40 rounded-2xl p-4 sm:p-5 text-center space-y-3 relative">
          
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-[#31523D] text-[#D0A73B] text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Pré-visualização do Documento A4 (Pronto para Impressão)</span>
          </div>

          <div className="bg-white rounded-xl p-4 max-w-sm mx-auto shadow-md border border-slate-200 space-y-2.5">
            <div className="font-extrabold text-[#31523D] text-sm tracking-wide">
              FISIOLYS • CLÍNICA DRA. ELAYS MARINHO
            </div>
            
            <div className="text-xs font-bold text-slate-800">
              {selectedType === 'checkin'
                ? 'FAÇA SEU CHECK-IN PELO CELULAR'
                : selectedType === 'review'
                ? 'AVALIE NOSSO ATENDIMENTO NO GOOGLE ★★★★★'
                : selectedType === 'catalog'
                ? 'TABELA DE SERVIÇOS & TRATAMENTOS'
                : 'ACESSE O APLICATIVO DA CLÍNICA'}
            </div>

            {selectedType !== 'catalog' && qrPreviewUrl && (
              <div className="w-28 h-28 mx-auto p-1.5 bg-white border border-[#D0A73B] rounded-lg flex items-center justify-center shadow-xs">
                <img src={qrPreviewUrl} alt="QR Code Preview" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="text-[10px] text-slate-500">
              {clinic.address} • Altamira / PA
            </div>
          </div>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>✓ Documento PDF gerado e baixado com sucesso no seu dispositivo!</span>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          
          {/* Main Download Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPdf}
            className="w-full sm:flex-1 py-3.5 px-5 bg-[#31523D] hover:bg-[#23372B] disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold transition-all shadow-lg shadow-[#31523D]/20 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {generatingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#D0A73B]" />
                <span>Gerando Documento PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#D0A73B]" />
                <span>Baixar Documento em PDF (Folha A4)</span>
              </>
            )}
          </button>

          {/* Direct Print / View Button */}
          <button
            onClick={handleOpenPrintPreview}
            disabled={generatingPdf}
            className="w-full sm:w-auto py-3.5 px-5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Abrir / Imprimir</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3.5 px-4 text-slate-500 hover:text-slate-700 text-xs font-semibold"
          >
            Fechar
          </button>

        </div>

      </div>
    </div>
  );
};
