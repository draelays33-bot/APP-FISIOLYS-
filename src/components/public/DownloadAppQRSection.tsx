import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Download, Copy, Check, Share2, Sparkles, ExternalLink, ShieldCheck, ArrowRight, X, MapPin, Navigation, Star } from 'lucide-react';
import { generateQRCodeDataUrl, getPublicAppUrl, getClinicMapUrl, getGoogleReviewUrl } from '../../utils/qrUtils';
import { getImageUrl } from '../../utils/imageUtils';
import { api } from '../../services/api';
import { ClinicConfig } from '../../types';

export const GoogleGIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" shrink-0="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface DownloadAppQRSectionProps {
  clinicName?: string;
  googleReviewUrl?: string;
  customAppUrl?: string;
  compact?: boolean;
}

export const DownloadAppQRSection: React.FC<DownloadAppQRSectionProps> = ({
  clinicName = "Fisiolys Fisioterapia e Pilates",
  googleReviewUrl,
  customAppUrl,
  compact = false
}) => {
  const [clinicConfig, setClinicConfig] = useState<Partial<ClinicConfig>>({
    googleReviewUrl,
    customAppUrl,
  });

  const [qrMode, setQrMode] = useState<'public' | 'destino' | 'google_review' | 'whatsapp' | 'custom'>('public');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    api.getClinic().then((c) => {
      setClinicConfig(c);
      if (!customUrl) {
        setCustomUrl(getPublicAppUrl(c.customAppUrl || customAppUrl));
      }
    }).catch(() => {});
  }, []);

  const whatsappDirectUrl = "https://wa.me/5593991265006?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20sess%C3%A3o%20na%20Fisiolys";
  const publicAppUrl = getPublicAppUrl(clinicConfig.customAppUrl || customAppUrl);
  const mapDirectUrl = getClinicMapUrl(clinicConfig.address || "Av. Coronel José Porfírio, nº 3025 - Recreio", clinicConfig.city || "Altamira - Pará");
  const reviewDirectUrl = getGoogleReviewUrl(clinicConfig.googleReviewUrl || googleReviewUrl, clinicConfig.address || "Av. Coronel José Porfírio, nº 3025 - Recreio", clinicConfig.city || "Altamira - Pará");

  const getTargetUrl = () => {
    if (qrMode === 'destino') return mapDirectUrl;
    if (qrMode === 'google_review') return reviewDirectUrl;
    if (qrMode === 'whatsapp') return whatsappDirectUrl;
    if (qrMode === 'public') return publicAppUrl;
    return customUrl || publicAppUrl;
  };

  const currentActiveUrl = getTargetUrl();

  useEffect(() => {
    generateQRCodeDataUrl(currentActiveUrl).then((url) => setQrDataUrl(url));
  }, [currentActiveUrl]);

  const handleCopyLink = (urlToCopy?: string) => {
    const text = urlToCopy || currentActiveUrl;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode-fisiolys-${qrMode}.png`;
    a.click();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! Baixe ou acesse o aplicativo de agendamento online da *${clinicName}* para marcar sessões de Pilates e Fisioterapia diretamente pelo celular:\n\n${currentActiveUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#EAF0DB] hover:bg-[#d8e4c3] text-[#31523D] text-xs font-black transition-all cursor-pointer border border-[#9CB55E]/50 shadow-2xs"
        >
          <Smartphone className="w-4 h-4 text-[#5F6D33]" />
          <span>Baixar App (QR Code)</span>
        </button>

        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 relative text-center">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center space-x-2 text-[#31523D] font-black text-sm">
                <QrCode className="w-5 h-5 text-[#5F6D33]" />
                <span>Aplicativo & Localização Fisiolys</span>
              </div>

              <h3 className="text-lg font-black text-slate-800">
                {qrMode === 'destino' ? '📍 Mapa & Rota de Destino' : '📱 Escaneie para Abrir o App'}
              </h3>

              {/* Mode Switcher inside Modal */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setQrMode('public')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    qrMode === 'public' ? 'bg-[#31523D] text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>App</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('google_review')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    qrMode === 'google_review' ? 'bg-[#4285F4] text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GoogleGIcon className="w-3.5 h-3.5" />
                  <span>Avaliação</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('destino')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    qrMode === 'destino' ? 'bg-[#D0A73B] text-[#1B2B22] shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Destino</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {qrMode === 'destino' 
                  ? 'Aponte a câmera para abrir o mapa no Google Maps: Av. Coronel José Porfírio, nº 3025 - Recreio.'
                  : qrMode === 'google_review'
                  ? 'Aponte a câmera do celular para deixar sua avaliação 5 Estrelas no Google!'
                  : 'Aponte a câmera do seu celular para abrir o aplicativo de agendamentos!'}
              </p>

              <div
                onClick={() => window.open(currentActiveUrl, '_blank')}
                title="Clique aqui para abrir em uma nova aba"
                className="p-3 bg-white border-2 border-dashed border-[#9CB55E] hover:border-[#31523D] rounded-2xl inline-block shadow-xs my-1 cursor-pointer group transition-all transform hover:scale-105"
              >
                {qrDataUrl ? (
                  <div className="relative">
                    <img src={qrDataUrl} alt="QR Code Fisiolys" className="w-44 h-44 mx-auto" />
                    <div className="absolute inset-0 bg-[#31523D]/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                      <span className="bg-[#31523D] text-white px-3 py-1 rounded-full text-xs font-black shadow-md flex items-center space-x-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{qrMode === 'destino' ? 'Abrir Mapa' : qrMode === 'google_review' ? 'Avaliar no Google' : 'Abrir App'}</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                    Gerando QR Code...
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={publicAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#31523D] hover:bg-[#23372B] text-white font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <Smartphone className="w-4 h-4 text-[#D0A73B]" />
                  <span>Abrir App em Nova Aba</span>
                </a>

                <a
                  href={reviewDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <GoogleGIcon className="w-4 h-4" />
                  <span>Avaliar no Google 5 Estrelas</span>
                  <span className="text-amber-400">★★★★★</span>
                </a>

                <a
                  href={mapDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#D0A73B] hover:bg-[#b8912d] text-[#1B2B22] font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
                >
                  <Navigation className="w-4 h-4 text-[#1B2B22]" />
                  <span>Ver Destino no Google Maps</span>
                </a>

                <button
                  onClick={() => handleCopyLink(currentActiveUrl)}
                  className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1B2B22] via-[#284232] to-[#1B2B22] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border-2 border-[#D0A73B]/50 my-8">
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-60 h-60 bg-[#D0A73B]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Column: Information & App Benefits */}
        <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 bg-[#D0A73B]/20 border border-[#D0A73B]/50 px-3 py-1 rounded-full text-xs font-black text-[#F5EED3]">
            <Smartphone className="w-4 h-4 text-[#D0A73B]" />
            <span>Aplicativo Web & Localização Fisiolys</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Leve a Clínica no Seu Celular!
          </h2>

          <p className="text-xs sm:text-sm text-[#EAF0DB]/90 leading-relaxed font-medium max-w-xl">
            Aponte a câmera do seu smartphone para o QR Code para abrir o aplicativo de agendamentos ou obter a rota direta para a nossa clínica na <strong>Av. Coronel José Porfírio, nº 3025 - Recreio</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center space-x-2.5">
              <span className="text-lg">⚡</span>
              <div>
                <strong className="text-white font-bold block">Agendamento em 2 Clicks</strong>
                <span className="text-[11px] text-[#EAF0DB]/70">Marque Pilates ou Fisioterapia pelo celular.</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center space-x-2.5">
              <span className="text-lg">📍</span>
              <div>
                <strong className="text-white font-bold block">Localização Exata</strong>
                <span className="text-[11px] text-[#EAF0DB]/70">Av. Coronel José Porfírio, nº 3025 - Recreio.</span>
              </div>
            </div>
          </div>

          {/* Direct External Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <a
              href={publicAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#31523D] hover:bg-[#23372B] text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center space-x-2 border border-[#D0A73B]/40"
            >
              <Smartphone className="w-4 h-4 text-[#D0A73B]" />
              <span>Abrir App em Nova Aba</span>
            </a>

            <a
              href={reviewDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-100 text-slate-800 font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center space-x-2 border border-slate-200"
            >
              <GoogleGIcon className="w-4 h-4" />
              <span>Avaliar no Google</span>
              <span className="flex text-amber-400 font-bold text-xs">★★★★★</span>
            </a>

            <a
              href={mapDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#D0A73B] hover:bg-[#b8912e] text-[#1B2B22] font-black px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center space-x-2"
            >
              <Navigation className="w-4 h-4 text-[#1B2B22]" />
              <span>Ver Destino no Google Maps</span>
            </a>

            <button
              onClick={handleShareWhatsApp}
              className="bg-[#25D366] hover:bg-[#1EBE57] text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4 fill-white" />
              <span>Enviar via WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Right Column: QR Code Display Box with Mascot Lys */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="bg-white rounded-3xl p-6 text-slate-800 shadow-2xl border-4 border-[#D0A73B] text-center max-w-xs w-full relative">
            
            {/* Mascot Lys Badge on top of QR Card */}
            <div className="absolute -top-6 -right-4 w-14 h-14 rounded-full overflow-hidden border-2 border-[#D0A73B] shadow-lg bg-[#31523D]">
              <img
                src={getImageUrl("/src/assets/images/mascot_griffin_lys_1785804022309.jpg")}
                alt="Lys Grifo Mascote"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <span className="text-[10px] font-black tracking-widest text-[#5F6D33] uppercase bg-[#EAF0DB] px-3 py-0.5 rounded-full inline-block mb-2">
              {clinicName}
            </span>

            <h4 className="text-sm font-extrabold text-slate-900 mb-1">
              Escaneie o QR Code
            </h4>
            <div className="flex items-center justify-center space-x-1.5 text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 my-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-bold">Acesso Público Direto pelo Celular</span>
            </div>

            <p className="text-[11px] text-slate-500 mb-2">
              Escolha qual QR Code deseja visualizar:
            </p>

            {/* QR Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-3 text-[10px] font-bold gap-0.5">
              <button
                type="button"
                onClick={() => setQrMode('public')}
                className={`flex-1 py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  qrMode === 'public' ? 'bg-[#31523D] text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>App</span>
              </button>

              <button
                type="button"
                onClick={() => setQrMode('google_review')}
                className={`flex-1 py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  qrMode === 'google_review' ? 'bg-[#4285F4] text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GoogleGIcon className="w-3 h-3" />
                <span>Avaliar</span>
              </button>

              <button
                type="button"
                onClick={() => setQrMode('destino')}
                className={`flex-1 py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  qrMode === 'destino' ? 'bg-[#D0A73B] text-[#1B2B22] shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Navigation className="w-3 h-3 text-current" />
                <span>Mapa</span>
              </button>

              <button
                type="button"
                onClick={() => setQrMode('whatsapp')}
                className={`flex-1 py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                  qrMode === 'whatsapp' ? 'bg-[#25D366] text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Share2 className="w-3 h-3" />
                <span>Whats</span>
              </button>
            </div>

            {qrMode === 'custom' && (
              <div className="mb-3">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://suaclinica.com.br"
                  className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-mono"
                />
              </div>
            )}

            {/* Interactive QR Code Box */}
            <div
              onClick={() => window.open(currentActiveUrl, '_blank')}
              title={`Clique para abrir em nova aba (${qrMode === 'destino' ? 'Google Maps' : 'Aplicativo'})`}
              className="p-3 bg-slate-50 border-2 border-dashed border-[#9CB55E] hover:border-[#31523D] rounded-2xl inline-block shadow-inner mb-3 cursor-pointer group transition-all transform hover:scale-105"
            >
              {qrDataUrl ? (
                <div className="relative">
                  <img
                    src={qrDataUrl}
                    alt="QR Code Fisiolys"
                    className="w-44 h-44 mx-auto"
                  />
                  <div className="absolute inset-0 bg-[#31523D]/10 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                    <span className="bg-[#31523D] text-white px-3 py-1 rounded-full text-xs font-black shadow-md flex items-center space-x-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{qrMode === 'destino' ? 'Abrir no Mapa' : 'Abrir App'}</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                  Gerando QR Code...
                </div>
              )}
            </div>

            {/* Quick action buttons right below QR Code */}
            <div className="grid grid-cols-1 gap-2 w-full text-xs font-bold">
              <a
                href={publicAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-[#31523D] hover:bg-[#23372B] text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Abrir App em Nova Aba</span>
              </a>

              <a
                href={mapDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-[#D0A73B] hover:bg-[#b8912e] text-[#1B2B22] font-black rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Navigation className="w-3.5 h-3.5 text-[#1B2B22]" />
                <span>Ver Destino no Google Maps</span>
              </a>

              <button
                type="button"
                onClick={handleDownloadQR}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#5F6D33]" />
                <span>Baixar Imagem QR Code</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
