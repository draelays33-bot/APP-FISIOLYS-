import React, { useState } from 'react';
import { Heart, Sparkles, MessageCircle, ShieldCheck, ChevronRight, Lightbulb } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

interface ClinicMascotProps {
  compact?: boolean;
  onBookClick?: () => void;
}

const HEALTH_TIPS = [
  {
    title: "Dica da Lys sobre a Coluna 🧘‍♀️",
    tip: "Manter a postura alinhada durante o trabalho evita dores na lombar e cervical. No Pilates Fisiolys, fortalecemos seu core para sustentação ideal!"
  },
  {
    title: "Agendamento Seguro e Sem Espera ⏱️",
    tip: "Nosso sistema reserva seu horário em tempo real! Escolha sua sessão com no mínimo 2h de antecedência ou fale no WhatsApp para emergências."
  },
  {
    title: "Atendimento Individualizado 🌿",
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
      <div className="bg-gradient-to-r from-[#EAF0DB] via-[#F4F7F4] to-[#F5EED3] rounded-2xl p-4 border border-[#9CB55E]/50 shadow-xs flex items-center space-x-3.5">
        <div className="relative shrink-0">
          <img
            src={getImageUrl("/src/assets/images/mascot_griffin_lys_1785804022309.jpg")}
            alt="Lys - Grifo Fêmea Mascotinha Fisiolys"
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-full object-cover border-2 border-[#5F6D33] shadow-md transform hover:scale-105 transition-transform"
          />
          <span className="absolute -bottom-1 -right-1 bg-[#31523D] text-white p-1 rounded-full text-[9px] shadow-xs">
            ✨
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-black text-[#23372B]">Lys • Mascotinha Grifo Fisiolys</span>
            <span className="text-[10px] bg-[#31523D] text-white px-2 py-0.2 rounded-full font-bold">Oficial</span>
          </div>
          <p className="text-[11px] text-slate-700 mt-0.5 font-medium leading-snug line-clamp-2">
            "{currentTip.tip}"
          </p>
        </div>
        <button
          type="button"
          onClick={handleBookClick}
          className="px-2.5 py-1.5 bg-[#31523D] hover:bg-[#23372B] text-white rounded-xl text-[10px] font-extrabold shrink-0 transition-colors cursor-pointer flex items-center space-x-1"
          title="Agendar consulta"
        >
          <span>Agendar</span>
          <ChevronRight className="w-3 h-3 text-[#D0A73B]" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#EAF0DB] via-[#F4F7F4] to-[#F5EED3] rounded-3xl p-6 border border-[#9CB55E]/60 shadow-sm relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-[#9CB55E]/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
        {/* Mascot Avatar Card */}
        <div className="flex flex-col items-center text-center shrink-0">
          <div className="relative group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-3 border-[#5F6D33] shadow-xl p-0.5 bg-white transform transition-transform group-hover:scale-105">
              <img
                src={getImageUrl("/src/assets/images/mascot_griffin_lys_1785804022309.jpg")}
                alt="Lys - Grifo Bípede Fêmea Mascote Fisiolys"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-2.5xl"
              />
            </div>
            <span className="absolute -bottom-2 -right-2 bg-[#25D366] text-white px-2.5 py-1 rounded-full text-[10px] font-black border-2 border-white shadow-md flex items-center space-x-1">
              <Heart className="w-3 h-3 fill-white" />
              <span>Lys</span>
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-[#23372B] mt-3">Lys</h4>
          <span className="text-[11px] font-semibold text-[#5F6D33]">Grifo Fêmea Mascote Fisiolys 🦅💚</span>
        </div>

        {/* Mascot Speech Bubble */}
        <div className="flex-1 space-y-3">
          <div className="bg-white p-4 sm:p-5 rounded-2xl rounded-tl-none border border-[#9CB55E]/40 shadow-xs relative">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
              <span className="text-xs font-black text-[#23372B] flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#D0A73B]" />
                <span>{currentTip.title}</span>
              </span>
              <button
                type="button"
                onClick={nextTip}
                className="text-[10px] font-bold text-[#5F6D33] hover:text-[#31523D] bg-[#EAF0DB] hover:bg-[#D8E4C3] px-2.5 py-1 rounded-full transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Lightbulb className="w-3 h-3" />
                <span>Ver Próxima Dica</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              "{currentTip.tip}"
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center space-x-3 text-slate-600 font-semibold text-[11px]">
              <span className="flex items-center space-x-1 text-[#31523D]">
                <ShieldCheck className="w-4 h-4 text-[#5F6D33]" />
                <span>Atendimento Acolhedor Dra. Elays Marinho</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleBookClick}
              className="bg-[#31523D] hover:bg-[#23372B] text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center space-x-1.5 ml-auto"
            >
              <span>Agendar com a Dra. Elays</span>
              <ChevronRight className="w-4 h-4 text-[#D0A73B]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
