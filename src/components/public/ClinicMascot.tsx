import React, { useState } from 'react';
import { Heart, Sparkles, ShieldCheck, ChevronRight, Lightbulb } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

interface ClinicMascotProps {
  compact?: boolean;
  onBookClick?: () => void;
}

const HEALTH_TIPS = [
  {
    title: "Dica da Lys sobre a Coluna",
    tip: "Manter a postura alinhada durante o trabalho evita dores na lombar e cervical. No Pilates Fisiolys, fortalecemos seu core para sustentação ideal!"
  },
  {
    title: "Agendamento Seguro e Sem Espera",
    tip: "Nosso sistema reserva seu horário em tempo real! Escolha sua sessão com no mínimo 2h de antecedência ou fale no WhatsApp para emergências."
  },
  {
    title: "Atendimento Individualizado",
    tip: "A Dra. Elays Marinho cuida de cada detalhe do seu plano terapêutico. Aqui cada paciente recebe carinho e acompanhamento exclusivo!"
  }
];

export const ClinicMascot: React.FC<ClinicMascotProps> = ({ compact = false, onBookClick }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % HEALTH_TIPS.length);
  };

  const currentTip = HEALTH_TIPS[currentTipIndex];

  const handleBookClick = () => {
    if (onBookClick) {
      onBookClick();
    } else {
      const el = document.getElementById('services-list-start') || document.getElementById('step-1-services-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  if (compact) {
    return (
      <div id="clinic-mascot-compact" className="bg-creme-card rounded-2xl p-4 border border-linha shadow-xs flex items-center space-x-3.5">
        <div className="relative shrink-0">
          <img
            src={getImageUrl("/src/assets/images/mascot_griffin_lys_1785804022309.jpg")}
            alt="Lys - Grifo Fêmea Mascotinha Fisiolys"
            referrerPolicy="no-referrer"
            className="w-13 h-13 rounded-full object-cover border-2 border-dourado shadow-xs transform hover:scale-105 transition-transform"
          />
          <span className="absolute -bottom-1 -right-1 bg-verde-900 text-dourado-suave p-1 rounded-full text-[9px] shadow-xs">
            <Sparkles className="w-2.5 h-2.5" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-serif font-bold text-carvao">Lys • Mascote Fisiolys</span>
            <span className="text-[9px] bg-verde-900 text-creme px-2 py-0.5 rounded-full font-semibold uppercase">Oficial</span>
          </div>
          <p className="text-[11px] text-carvao-suave mt-0.5 font-sans leading-snug line-clamp-2">
            "{currentTip.tip}"
          </p>
        </div>
        <button
          type="button"
          id="mascot-compact-book-btn"
          onClick={handleBookClick}
          className="px-3 py-1.5 bg-verde-900 hover:bg-verde-800 text-creme rounded-full text-[10px] font-bold shrink-0 transition-colors cursor-pointer flex items-center space-x-1"
          title="Agendar consulta"
        >
          <span>Agendar</span>
          <ChevronRight className="w-3 h-3 text-dourado-suave" />
        </button>
      </div>
    );
  }

  return (
    <div id="clinic-mascot-full" className="bg-creme-card rounded-3xl p-6 border border-linha shadow-sm relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-dourado/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
        {/* Mascot Avatar Card */}
        <div className="flex flex-col items-center text-center shrink-0">
          <div className="relative group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-dourado shadow-md p-0.5 bg-white transform transition-transform group-hover:scale-105">
              <img
                src={getImageUrl("/src/assets/images/mascot_griffin_lys_1785804022309.jpg")}
                alt="Lys - Grifo Bípede Fêmea Mascote Fisiolys"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-2.5xl"
              />
            </div>
            <span className="absolute -bottom-2 -right-2 bg-verde-900 text-dourado-suave px-2.5 py-0.5 rounded-full text-[10px] font-bold border-2 border-white shadow-xs flex items-center space-x-1">
              <Heart className="w-3 h-3 fill-dourado-suave text-dourado-suave" />
              <span>Lys</span>
            </span>
          </div>
          <h4 className="text-sm font-serif font-bold text-carvao mt-3">Lys</h4>
          <span className="text-[11px] font-medium text-carvao-suave">Mascote Oficial Fisiolys</span>
        </div>

        {/* Mascot Speech Bubble */}
        <div className="flex-1 space-y-3">
          <div className="bg-white p-4 sm:p-5 rounded-2xl rounded-tl-none border border-linha shadow-xs relative">
            <div className="flex items-center justify-between gap-2 border-b border-linha/60 pb-2 mb-2">
              <span className="text-xs font-serif font-bold text-carvao flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-dourado" />
                <span>{currentTip.title}</span>
              </span>
              <button
                type="button"
                id="mascot-next-tip-btn"
                onClick={nextTip}
                className="text-[10px] font-bold text-dourado hover:text-carvao bg-dourado/10 hover:bg-dourado/20 px-3 py-1 rounded-full transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Lightbulb className="w-3 h-3" />
                <span>Próxima Dica</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-carvao-suave leading-relaxed font-sans">
              "{currentTip.tip}"
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center space-x-3 text-carvao-suave font-medium text-[11px]">
              <span className="flex items-center space-x-1.5 text-verde-900">
                <ShieldCheck className="w-4 h-4 text-dourado" />
                <span>Atendimento Humanizado Dra. Elays Marinho</span>
              </span>
            </div>

            <button
              type="button"
              id="mascot-book-with-dr-btn"
              onClick={handleBookClick}
              className="bg-verde-900 hover:bg-verde-800 text-creme font-bold px-5 py-2.5 rounded-full text-xs transition-all cursor-pointer shadow-xs flex items-center space-x-1.5 ml-auto border border-verde-800"
            >
              <span>Agendar com a Dra. Elays</span>
              <ChevronRight className="w-4 h-4 text-dourado-suave" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
