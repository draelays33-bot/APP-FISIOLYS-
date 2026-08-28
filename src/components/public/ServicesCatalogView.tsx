import React, { useState } from 'react';
import { ClinicConfig, Service, ServiceCategory } from '../../types';
import { Sparkles, Calendar, Clock, CheckCircle2, HeartHandshake, Phone, ArrowRight, Printer, Shield, Activity, Users, UserCheck, Stethoscope, Flower2, Heart, Puzzle } from 'lucide-react';
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

  const categories: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Todos os Serviços', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'pilates', label: 'Pilates (MAT Solo)', icon: <Flower2 className="w-3.5 h-3.5" /> },
    { id: 'fisioterapia', label: 'Fisioterapia & Coluna', icon: <Stethoscope className="w-3.5 h-3.5" /> },
    { id: 'massoterapia', label: 'Massoterapia & Liberação', icon: <Heart className="w-3.5 h-3.5" /> },
    { id: 'aba', label: 'ABA / Infantil', icon: <Puzzle className="w-3.5 h-3.5" /> },
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
          badgeClass: 'bg-dourado/10 text-dourado border-dourado/30',
        };
      case 'fisioterapia':
        return {
          label: 'Fisioterapia Especializada',
          badgeClass: 'bg-verde-900/10 text-verde-900 border-verde-900/20',
        };
      case 'massoterapia':
        return {
          label: 'Massoterapia & Liberação',
          badgeClass: 'bg-verde-900/5 text-verde-800 border-linha',
        };
      case 'aba':
        return {
          label: 'Terapia ABA / Infantil',
          badgeClass: 'bg-creme-card text-carvao border-linha',
        };
      default:
        return {
          label: 'Atendimento Clínico',
          badgeClass: 'bg-creme-card text-carvao-suave border-linha',
        };
    }
  };

  return (
    <div id="services-catalog-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Hero Banner */}
      <div className="bg-verde-900 rounded-3xl p-6 sm:p-10 text-creme shadow-xl relative overflow-hidden border border-verde-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-dourado/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-dourado-suave/5 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-dourado/15 text-dourado-suave border border-dourado/30 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-dourado" />
            <span>Guia de Atendimentos • Clínica Fisiolys</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-creme leading-tight">
            Serviços & Tratamentos Especializados
          </h1>

          <p className="text-sm sm:text-base text-creme/80 leading-relaxed font-sans">
            Conheça todos os nossos tratamentos em Fisioterapia, Pilates MAT Solo, Reabilitação de Coluna e Terapias Manuais com a Dra. {clinic.managerName || 'Elays Marinho'}.
          </p>

          {/* CREFITO-12 Ethics Notification Banner */}
          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs flex items-start space-x-3 text-xs text-creme/90">
            <Shield className="w-4 h-4 text-dourado-suave shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong className="text-dourado-suave">Conformidade Ética CREFITO-12 (PA) & COFFITO:</strong> Em cumprimento às normas éticas e deontológicas da Fisioterapia, os honorários e planos de tratamento são informados de forma individualizada mediante a Avaliação Fisioterapêutica.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              id="catalog-print-pdf-btn"
              onClick={() => setIsPdfModalOpen(true)}
              className="px-5 py-2.5 bg-dourado hover:bg-dourado/90 text-creme rounded-full text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer border border-dourado-suave/30"
            >
              <Printer className="w-4 h-4 text-creme" />
              <span>Imprimir Catálogo & QR Code em PDF (A4)</span>
            </button>

            <a
              id="catalog-whatsapp-assessment-btn"
              href={`https://wa.me/55${clinic.whatsapp || clinic.phone?.replace(/\D/g, '') || '93991265006'}?text=${encodeURIComponent("Olá Dra. Elays! Gostaria de agendar uma Avaliação Fisioterapêutica na Fisiolys.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-creme rounded-full text-xs font-bold transition-all border border-white/20 flex items-center space-x-2"
            >
              <Phone className="w-4 h-4 text-dourado-suave" />
              <span>Agendar Avaliação no WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Category Pills Switcher */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`category-pill-${cat.id}`}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer shrink-0 border ${
              selectedCategory === cat.id
                ? 'bg-verde-900 text-creme border-verde-900 shadow-sm'
                : 'bg-creme-card text-carvao-suave hover:bg-white hover:text-carvao border-linha'
            }`}
          >
            <span className={selectedCategory === cat.id ? 'text-dourado-suave' : 'text-dourado'}>{cat.icon}</span>
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
              id={`service-card-${service.id}`}
              className="bg-creme-card rounded-3xl border border-linha shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-dourado/60"
            >
              {/* Card Header & Content */}
              <div className="p-6 space-y-4 bg-white rounded-t-3xl border-b border-linha/60">
                
                {/* Badges Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${badgeInfo.badgeClass}`}>
                    {badgeInfo.label}
                  </span>
                  
                  <div className="flex items-center space-x-1 text-carvao-suave text-xs font-medium bg-creme px-2.5 py-1 rounded-full border border-linha">
                    <Clock className="w-3.5 h-3.5 text-dourado" />
                    <span>{service.durationMinutes} min</span>
                  </div>
                </div>

                {/* Service Title */}
                <h3 className="text-lg font-serif font-bold text-carvao group-hover:text-verde-900 transition-colors leading-tight">
                  {service.name}
                </h3>

                {/* Service Description */}
                <p className="text-xs text-carvao-suave leading-relaxed min-h-[48px]">
                  {service.description}
                </p>

                {/* Benefits / Highlights */}
                <div className="space-y-1.5 pt-2 border-t border-linha/50">
                  <div className="text-[11px] font-medium text-carvao flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-verde-900 shrink-0" />
                    <span>Atendimento individualizado e humanizado</span>
                  </div>
                  <div className="text-[11px] font-medium text-carvao flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-verde-900 shrink-0" />
                    <span>Ambiente climatizado e estrutura completa</span>
                  </div>
                  {isPilates && (
                    <div className="text-[11px] font-medium text-dourado flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-dourado shrink-0" />
                      <span>Foco em fortalecimento, flexibilidade e postura</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Card Footer: Ethical Compliance Status & Booking Action */}
              <div className="p-6 bg-creme-card space-y-4">
                
                {/* CREFITO-12 Compliant Assessment Status */}
                <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-linha">
                  <div>
                    <span className="text-[10px] font-bold text-carvao-suave uppercase block tracking-wider">
                      Condições de Atendimento:
                    </span>
                    <span className="text-xs font-bold text-verde-900 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-dourado" />
                      <span>Sob Avaliação Fisioterapêutica</span>
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-dourado/15 text-dourado border border-dourado/30">
                    CREFITO-PA
                  </span>
                </div>

                {/* Action CTA Button */}
                <button
                  id={`book-service-btn-${service.id}`}
                  onClick={() => onSelectServiceToBook(service)}
                  className="w-full py-3.5 px-4 bg-verde-900 hover:bg-verde-800 text-creme rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer group-hover:scale-[1.01]"
                >
                  <Calendar className="w-4 h-4 text-dourado-suave" />
                  <span>Agendar Atendimento / Avaliação</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-80 group-hover:translate-x-1 transition-transform" />
                </button>

              </div>

            </div>
          );
        })}
      </div>

      {/* Referral Promotion Banner (Programa Indique e Ganhe) */}
      <div className="bg-creme-card border border-dourado/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-dourado/15 text-dourado text-xs font-bold uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4 text-dourado" />
            <span>Programa Indique e Ganhe</span>
          </div>
          <h3 className="text-lg sm:text-xl font-serif font-bold text-carvao">
            Indique Amigos e Familiares para a Fisiolys
          </h3>
          <p className="text-xs text-carvao-suave max-w-xl font-sans">
            A cada amigo indicado que iniciar o plano de Pilates ou tratamento de Fisioterapia, você ganha <strong>1 Sessão de Massoterapia / Liberação Miofascial</strong> e o seu indicado ganha a <strong>Aula Experimental / Avaliação com Condição Especial</strong>!
          </p>
        </div>

        <button
          id="referral-whatsapp-cta-btn"
          onClick={() => {
            const msg = encodeURIComponent(`Olá! Quero indicar um amigo para a Fisiolys Fisioterapia e Pilates com a Dra. Elays Marinho!`);
            window.open(`https://wa.me/55${clinic.whatsapp || '93991265006'}?text=${msg}`, '_blank');
          }}
          className="px-6 py-3.5 bg-verde-900 hover:bg-verde-800 text-creme rounded-full text-xs font-bold shrink-0 shadow-md flex items-center space-x-2 cursor-pointer border border-verde-800"
        >
          <Phone className="w-4 h-4 text-dourado-suave" />
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
