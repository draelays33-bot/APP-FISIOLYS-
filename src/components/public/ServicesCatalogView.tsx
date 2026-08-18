import React, { useState } from 'react';
import { ClinicConfig, Service, ServiceCategory } from '../../types';
import { formatCurrency } from '../../utils/qrUtils';
import { Sparkles, Calendar, Clock, CheckCircle2, HeartHandshake, Phone, ArrowRight, Printer, Shield, Activity, Users, UserCheck } from 'lucide-react';
import { PrintableQRPDFModal } from '../common/PrintableQRPDFModal';

interface ServicesCatalogViewProps {
  clinic: ClinicConfig;
  services: Service[];
  onSelectServiceToBook: (service: Service) => void;
}

export const ServicesCatalogView: React.FC<ServicesCatalogViewProps> = ({
  clinic,
  services,
  onSelectServiceToBook,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  const categories: { id: string; label: string; icon: string }[] = [
    { id: 'all', label: 'Todos os Serviços', icon: '✨' },
    { id: 'pilates', label: 'Pilates (MAT Solo)', icon: '🧘‍♀️' },
    { id: 'fisioterapia', label: 'Fisioterapia & Coluna', icon: '🩺' },
    { id: 'massoterapia', label: 'Massoterapia & Liberação', icon: '💆‍♀️' },
    { id: 'aba', label: 'ABA / Infantil', icon: '🧩' },
  ];

  const activeServices = services.filter((s) => s.active);

  const filteredServices = selectedCategory === 'all'
    ? activeServices
    : activeServices.filter((s) => {
        if (selectedCategory === 'pilates') return s.category === 'pilates';
        if (selectedCategory === 'fisioterapia') return s.category === 'fisioterapia';
        if (selectedCategory === 'massoterapia') return s.category === 'massoterapia';
        if (selectedCategory === 'aba') return s.category === 'aba';
        return true;
      });

  const getCategoryBadge = (category: ServiceCategory) => {
    switch (category) {
      case 'pilates':
        return {
          label: 'Pilates MAT Solo',
          badgeClass: 'bg-[#5F6D33]/15 text-[#31523D] border-[#5F6D33]/30',
          investLabel: '(Mensal)',
        };
      case 'fisioterapia':
        return {
          label: 'Fisioterapia Especializada',
          badgeClass: 'bg-[#31523D]/10 text-[#31523D] border-[#31523D]/30',
          investLabel: '(Sessão)',
        };
      case 'massoterapia':
        return {
          label: 'Massoterapia & Liberação',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          investLabel: '(Sessão)',
        };
      case 'aba':
        return {
          label: 'Terapia ABA / Infantil',
          badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          investLabel: '(Sessão)',
        };
      default:
        return {
          label: 'Atendimento Clínico',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          investLabel: '(Sessão)',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-[#23372B] via-[#31523D] to-[#3D674C] rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D0A73B]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#D0A73B]/20 text-[#D0A73B] border border-[#D0A73B]/40 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Guia Completo de Atendimentos • Clínica Fisiolys</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Serviços & Tratamentos Especializados
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
            Conheça todos os nossos tratamentos em Fisioterapia, Pilates MAT Solo, Reabilitação de Coluna e Terapias Manuais com a Dra. {clinic.managerName || 'Elays Marinho'}.
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="px-4 py-2.5 bg-[#D0A73B] hover:bg-[#b8912e] text-[#1B2B22] rounded-xl text-xs font-black transition-all shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#1B2B22]" />
              <span>Imprimir Tabela de Preços & QR Codes em PDF (A4)</span>
            </button>

            <a
              href={`https://wa.me/55${clinic.whatsapp || clinic.phone?.replace(/\D/g, '') || '93991265006'}?text=${encodeURIComponent("Olá Dra. Elays! Gostaria de mais informações sobre os tratamentos da Fisiolys.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center space-x-2"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Falar no WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Category Pills Switcher */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-[#31523D] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span className="text-[10px] opacity-70">
              ({cat.id === 'all' ? activeServices.length : activeServices.filter(s => s.category === cat.id).length})
            </span>
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => {
          const badgeInfo = getCategoryBadge(service.category);
          const isPilates = service.category === 'pilates';

          return (
            <div
              key={service.id}
              className="bg-white rounded-3xl border border-[#C9D8CB]/80 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-[#31523D]"
            >
              {/* Card Header & Content */}
              <div className="p-6 space-y-4">
                
                {/* Badges Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeInfo.badgeClass}`}>
                    {badgeInfo.label}
                  </span>
                  
                  <div className="flex items-center space-x-1 text-slate-400 text-xs font-medium bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                    <Clock className="w-3.5 h-3.5 text-[#5F6D33]" />
                    <span>{service.durationMinutes} min</span>
                  </div>
                </div>

                {/* Service Title */}
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-[#31523D] transition-colors leading-tight">
                  {service.name}
                </h3>

                {/* Service Description */}
                <p className="text-xs text-slate-600 leading-relaxed min-h-[50px]">
                  {service.description}
                </p>

                {/* Benefits / Highlights */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Atendimento individualizado e personalizado</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Ambiente climatizado e equipamentos modernos</span>
                  </div>
                  {isPilates && (
                    <div className="text-[11px] font-bold text-[#7E611D] flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D0A73B] shrink-0" />
                      <span>Foco em fortalecimento, flexibilidade e postura</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Card Footer: Investment & Booking Action */}
              <div className="p-6 bg-[#F4F7F4]/60 border-t border-slate-100 space-y-4">
                
                {/* Investment Layout */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">
                      Investimento:
                    </span>
                    <span className="text-xs font-extrabold text-[#7E611D]">
                      {badgeInfo.investLabel}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-black text-[#23372B]">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                </div>

                {/* Action CTA Button */}
                <button
                  onClick={() => onSelectServiceToBook(service)}
                  className="w-full py-3 px-4 bg-[#31523D] hover:bg-[#23372B] text-white rounded-2xl text-xs font-extrabold shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer group-hover:scale-[1.01]"
                >
                  <Calendar className="w-4 h-4 text-[#D0A73B]" />
                  <span>Agendar Este Tratamento</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
                </button>

              </div>

            </div>
          );
        })}
      </div>

      {/* Referral Promotion Banner (Programa Indique e Ganhe) */}
      <div className="bg-gradient-to-r from-[#F5EED3] via-amber-50 to-[#F5EED3] border-2 border-[#D0A73B]/50 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#D0A73B]/20 text-[#7E611D] text-xs font-black uppercase">
            <HeartHandshake className="w-4 h-4 text-[#7E611D]" />
            <span>Programa Indique e Ganhe</span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Indique Amigos e Familiares para a Fisiolys
          </h3>
          <p className="text-xs text-slate-600 max-w-xl">
            A cada amigo indicado que iniciar o plano de Pilates ou Fisioterapia, você ganha <strong>1 Sessão de Massoterapia / Liberação Miofascial Gratuita</strong> e o seu indicado ganha a <strong>Aula Experimental por apenas R$ 49,00</strong>!
          </p>
        </div>

        <button
          onClick={() => {
            const msg = encodeURIComponent(`Olá! Quero indicar um amigo para a Fisiolys Fisioterapia e Pilates com a Dra. Elays Marinho!`);
            window.open(`https://wa.me/55${clinic.whatsapp || '93991265006'}?text=${msg}`, '_blank');
          }}
          className="px-6 py-3.5 bg-[#31523D] hover:bg-[#23372B] text-white rounded-2xl text-xs font-black shrink-0 shadow-md flex items-center space-x-2 cursor-pointer"
        >
          <Phone className="w-4 h-4 text-[#D0A73B]" />
          <span>Indicar Amigo no WhatsApp</span>
        </button>
      </div>

      {/* PDF Generation Modal */}
      <PrintableQRPDFModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        clinic={clinic}
        services={services}
        defaultTemplate="catalog"
      />

    </div>
  );
};
