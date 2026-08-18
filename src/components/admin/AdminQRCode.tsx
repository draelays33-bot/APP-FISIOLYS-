import React, { useState, useEffect } from 'react';
import { ClinicConfig } from '../../types';
import { generateQRCodeDataUrl, getPublicAppUrl, getGoogleReviewUrl, getClinicMapUrl } from '../../utils/qrUtils';
import { generateQRPDF } from '../../utils/pdfGenerator';
import { PrintableQRPDFModal } from '../common/PrintableQRPDFModal';
import { api } from '../../services/api';
import { QrCode, Copy, Share2, Download, Printer, Check, Sparkles, ExternalLink, Activity, RefreshCw, ShieldCheck, Star, MapPin, Smartphone, Save, Link as LinkIcon, FileText } from 'lucide-react';
import { GoogleGIcon } from '../public/DownloadAppQRSection';

interface AdminQRCodeProps {
  clinic: ClinicConfig;
}

export const AdminQRCode: React.FC<AdminQRCodeProps> = ({ clinic }) => {
  const [currentClinic, setCurrentClinic] = useState<ClinicConfig>(clinic);
  const [selectedPreset, setSelectedPreset] = useState<'app' | 'review' | 'map' | 'custom'>('app');
  const [customLink, setCustomLink] = useState<string>(() => getPublicAppUrl(clinic.customAppUrl));
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Editable links state for clinic config
  const [editReviewUrl, setEditReviewUrl] = useState<string>(clinic.googleReviewUrl || '');
  const [editAppUrl, setEditAppUrl] = useState<string>(clinic.customAppUrl || '');
  const [savingLinks, setSavingLinks] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  const appUrl = getPublicAppUrl(currentClinic.customAppUrl);
  const reviewUrl = getGoogleReviewUrl(currentClinic.googleReviewUrl, currentClinic.address, currentClinic.city);
  const mapUrl = getClinicMapUrl(currentClinic.address, currentClinic.city);

  const getActiveTargetUrl = () => {
    if (selectedPreset === 'review') return reviewUrl;
    if (selectedPreset === 'map') return mapUrl;
    if (selectedPreset === 'app') return appUrl;
    return customLink || appUrl;
  };

  const publicLink = getActiveTargetUrl();

  useEffect(() => {
    generateQRCodeDataUrl(publicLink).then((url) => setQrDataUrl(url));
  }, [publicLink]);

  const handleSelectPreset = (preset: 'app' | 'review' | 'map') => {
    setSelectedPreset(preset);
    if (preset === 'app') setCustomLink(appUrl);
    if (preset === 'review') setCustomLink(reviewUrl);
    if (preset === 'map') setCustomLink(mapUrl);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    let msg = `Olá! Para agendar sua sessão de Pilates ou Fisioterapia no *${currentClinic.name}*, acesse nosso link de agendamento online:\n\n${publicLink}`;
    if (selectedPreset === 'review') {
      msg = `Olá! Gostou do seu atendimento no *${currentClinic.name}*? Deixe sua avaliação de 5 Estrelas no Google! Ajuda muito nosso trabalho 💚:\n\n${publicLink}`;
    } else if (selectedPreset === 'map') {
      msg = `Olá! Aqui está a localização e rota no Google Maps para o *${currentClinic.name}* (${currentClinic.address}):\n\n${publicLink}`;
    }
    const text = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode-${selectedPreset}-${currentClinic.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const handlePrintCard = async () => {
    setIsGeneratingPdf(true);
    try {
      let pdfType: 'checkin' | 'review' | 'app' = 'app';
      if (selectedPreset === 'review') pdfType = 'review';
      else if (selectedPreset === 'app') pdfType = 'app';

      const doc = await generateQRPDF({
        type: pdfType,
        clinic: currentClinic,
        customQrDataUrl: qrDataUrl,
        customUrl: publicLink,
      });
      doc.save(`Fisiolys_Placa_${selectedPreset.toUpperCase()}_A4.pdf`);
    } catch (e) {
      console.error('Error generating PDF', e);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveClinicLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLinks(true);
    setSaveSuccessMsg('');
    try {
      const updated = await api.updateClinic({
        googleReviewUrl: editReviewUrl.trim(),
        customAppUrl: editAppUrl.trim(),
      });
      setCurrentClinic(updated);
      setSaveSuccessMsg('✓ Links da clínica atualizados e salvos com sucesso!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLinks(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h3 className="text-lg font-bold text-slate-800">Gerador de Links e QR Codes da Clínica</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Gere QR Codes para <strong>Agendamentos Online</strong>, <strong>Avaliações de 5 Estrelas no Google</strong> ou <strong>Localização no Google Maps</strong> para colocar no balcão da recepção, banners e placas de acrílico.
        </p>
      </div>

      {/* Preset Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleSelectPreset('app')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center space-x-3 ${
            selectedPreset === 'app'
              ? 'bg-[#31523D] text-white border-[#31523D] shadow-md'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${selectedPreset === 'app' ? 'bg-white/10 text-[#D0A73B]' : 'bg-slate-100 text-[#31523D]'}`}>
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <strong className="block text-xs font-black">Link de Agendamento</strong>
            <span className="text-[11px] opacity-80">Acesso ao Web App</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectPreset('review')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center space-x-3 ${
            selectedPreset === 'review'
              ? 'bg-[#4285F4] text-white border-[#4285F4] shadow-md'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${selectedPreset === 'review' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#4285F4]'}`}>
            <GoogleGIcon className="w-5 h-5" />
          </div>
          <div>
            <strong className="block text-xs font-black flex items-center space-x-1">
              <span>Avaliação no Google</span>
              <span className="text-amber-300">★</span>
            </strong>
            <span className="text-[11px] opacity-90">QR Code 5 Estrelas</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSelectPreset('map')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center space-x-3 ${
            selectedPreset === 'map'
              ? 'bg-[#D0A73B] text-[#1B2B22] border-[#D0A73B] shadow-md'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${selectedPreset === 'map' ? 'bg-black/10 text-[#1B2B22]' : 'bg-slate-100 text-[#D0A73B]'}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <strong className="block text-xs font-black">Google Maps</strong>
            <span className="text-[11px] opacity-80">Rota para a Clínica</span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Link & WhatsApp Share Controls */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              {selectedPreset === 'review' 
                ? '⭐ Link Direto para Avaliação 5 Estrelas no Google' 
                : selectedPreset === 'map'
                ? '📍 Link do Google Maps (Rota de Destino)'
                : '📱 Link Público para Agendamentos'}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={customLink}
                onChange={(e) => {
                  setCustomLink(e.target.value);
                  setSelectedPreset('custom');
                }}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <button
                id="btn-copy-public-link"
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shrink-0 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <button
                type="button"
                onClick={() => handleSelectPreset('app')}
                className="text-[11px] text-teal-700 hover:underline flex items-center space-x-1 font-medium cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restaurar URL de Agendamento</span>
              </button>
              {copied && (
                <p className="text-xs text-emerald-600 font-semibold animate-fade-in">
                  ✓ Link copiado!
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <button
              id="btn-share-whatsapp"
              onClick={handleShareWhatsApp}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center space-x-2 shadow-xs transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar Link via WhatsApp</span>
            </button>

            <a
              href={publicLink}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center space-x-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Testar Visão do Paciente no Navegador</span>
            </a>
          </div>

          <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5 shadow-2xs">
            <p className="font-extrabold flex items-center space-x-1.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>QR Code Otimizado para Leitura Mobile sem Bloqueios:</span>
            </p>
            <p className="leading-relaxed">
              O QR Code foi configurado para direcionar à <strong>URL pública de acesso</strong> (sem requisições de cookies internos de desenvolvimento). Assim, qualquer câmera de celular abre a página de agendamento instantaneamente!
            </p>
            <p className="font-semibold text-emerald-800 pt-1">💡 Dica de Divulgação:</p>
            <p>Cole este link na bio do Instagram do seu studio de Pilates ou clínica de Fisioterapia para permitir agendamentos 24 horas por dia!</p>
          </div>
        </div>

        {/* QR Code Printable Card Display */}
        <div id="printable-qr-card" className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs text-center flex flex-col items-center justify-between">
          
          <div className="w-full">
            <div className="inline-flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-700 mb-3">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>{clinic.name}</span>
            </div>

            <h4 className="text-base font-extrabold text-slate-800">
              Escaneie o QR Code para Agendar
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Aponte a câmera do seu celular para escolher o horário
            </p>

            {/* QR Image Box */}
            <div
              onClick={() => window.open(publicLink, '_blank')}
              title="Clique para abrir a página do paciente em nova aba"
              className="my-5 p-4 bg-white border-2 border-dashed border-teal-200 hover:border-teal-600 rounded-2xl inline-block shadow-xs cursor-pointer group transition-all transform hover:scale-105"
            >
              {qrDataUrl ? (
                <div className="relative">
                  <img
                    src={qrDataUrl}
                    alt="QR Code de Agendamento"
                    className="w-48 h-48 mx-auto"
                  />
                  <div className="absolute inset-0 bg-teal-900/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                    <span className="bg-teal-800 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center space-x-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Link</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  Gerando QR Code...
                </div>
              )}
            </div>
          </div>

          {/* Download & Print Buttons */}
          <div className="w-full space-y-2 pt-3 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-download-qr-png"
                onClick={handleDownloadPNG}
                className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar PNG</span>
              </button>

              <button
                onClick={handlePrintCard}
                disabled={isGeneratingPdf}
                className="py-2.5 px-3 rounded-xl font-bold text-xs bg-[#31523D] hover:bg-[#23372B] disabled:opacity-50 text-white flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D0A73B]" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5 text-[#D0A73B]" />
                    <span>Baixar PDF (A4)</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-[#7E611D] border border-[#D0A73B]/40 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#7E611D]" />
              <span>Gerar Kit Completo de Placas (A4)</span>
            </button>
          </div>

        </div>

      </div>

      {/* Dedicated Form for Clinic Link Settings */}
      <form onSubmit={handleSaveClinicLinks} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">Personalizar Links Definitivos da Clínica</h4>
            <p className="text-xs text-slate-500">
              Configure seus links oficiais do Google Meu Negócio e Domínio próprio para que todos os QR Codes funcionem perfeitamente.
            </p>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 animate-fadeIn">
            {saveSuccessMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              ⭐ Link de Avaliação no Google Meu Negócio
            </label>
            <input
              type="url"
              value={editReviewUrl}
              onChange={(e) => setEditReviewUrl(e.target.value)}
              placeholder="Ex: https://g.page/r/suaclinica/review ou https://maps.app.goo.gl/..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Cole o link da página do Google Meu Negócio onde o paciente é levado direto para dar 5 estrelas.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              📱 Link / Domínio Personalizado do App (Opcional)
            </label>
            <input
              type="url"
              value={editAppUrl}
              onChange={(e) => setEditAppUrl(e.target.value)}
              placeholder="Ex: https://fisiolys.app ou https://fisiolys.com.br"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Se você possui um domínio próprio configurado, insira-o para gerar o QR Code com seu próprio endereço.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={savingLinks}
            className="px-5 py-2.5 bg-[#31523D] hover:bg-[#23372B] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#D0A73B]" />
            <span>{savingLinks ? 'Salvando...' : 'Salvar Links da Clínica'}</span>
          </button>
        </div>
      </form>

      {/* Printable QR Code Modal */}
      <PrintableQRPDFModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        clinic={currentClinic}
        defaultTemplate={selectedPreset === 'review' ? 'review' : selectedPreset === 'app' ? 'app' : 'checkin'}
      />

    </div>
  );
};
