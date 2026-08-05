import React, { useState } from 'react';
import { Crown, Sparkles, Phone, Mail, Share2, Download, Printer, Check, Copy, Award } from 'lucide-react';
import { LoyaltyMember } from '../../types';
import { getImageUrl } from '../../utils/imageUtils';

interface LoyaltyCardProps {
  member: LoyaltyMember;
  clinicPhone?: string;
  showActions?: boolean;
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({
  member,
  clinicPhone = '5593991265006',
  showActions = true
}) => {
  const [copied, setCopied] = useState(false);

  // Format Card Number (e.g., FID-2026-8492)
  const getFormattedCardNumber = (id: string) => {
    const rawNumber = id.replace(/\D/g, '').slice(-8) || '84920152';
    const part1 = rawNumber.slice(0, 4);
    const part2 = rawNumber.slice(4);
    return `FID-${part1}-${part2}`;
  };

  // Format Start Date
  const getFormattedStartDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('pt-BR');
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toLocaleDateString('pt-BR');
      return d.toLocaleDateString('pt-BR');
    } catch {
      return new Date().toLocaleDateString('pt-BR');
    }
  };

  const cardNumber = getFormattedCardNumber(member.id);
  const startDate = getFormattedStartDate(member.createdAt);
  const mascotImg = getImageUrl('/src/assets/images/mascot_griffin_lys_1785804022309.jpg');
  const logoImg = getImageUrl('/src/assets/images/fisiolys_logo_brand_1785780140781.jpg');

  // WhatsApp Message
  const handleSendWhatsApp = () => {
    const targetPhone = member.patientPhone || clinicPhone;
    const cleanPhone = targetPhone.replace(/\D/g, '');
    const phoneToUse = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

    const message = encodeURIComponent(
      `👑 *CARTÃO FIDELIDADE - CLUBE DE VANTAGENS FISIOLYS* 🌿\n\n` +
      `Olá, *${member.patientName}*!\n` +
      `Seu Cartão Fidelidade Digital já está gerado e ativo:\n\n` +
      `👤 *Nome:* ${member.patientName}\n` +
      `💳 *Nº do Cartão:* ${cardNumber}\n` +
      `📅 *Início do Plano:* ${startDate}\n` +
      `🏅 *Selo Oficial:* 12 anos de experiência cuidando de vidas através do movimento\n` +
      `🦅 *Mascote Oficial:* Lys (Grifo Fisiolys)\n\n` +
      `Acesse seu saldo e agendamentos no nosso App!`
    );

    window.open(`https://wa.me/${phoneToUse}?text=${message}`, '_blank');
  };

  // Email Mailto link
  const handleSendEmail = () => {
    if (!member.patientEmail) {
      alert('O paciente não possui e-mail cadastrado.');
      return;
    }

    const subject = encodeURIComponent(`👑 Seu Cartão Fidelidade - Clube de Vantagens Fisiolys`);
    const body = encodeURIComponent(
      `Olá, ${member.patientName}!\n\n` +
      `É um prazer ter você no Clube de Vantagens Fisiolys!\n\n` +
      `Aqui estão as informações do seu Cartão Fidelidade:\n` +
      `-----------------------------------------\n` +
      `• Nome: ${member.patientName}\n` +
      `• Nº do Cartão: ${cardNumber}\n` +
      `• Data de Início do Plano: ${startDate}\n` +
      `• Selo de Tradição: 12 Anos de experiência cuidando de vidas através do movimento\n` +
      `• Mascote da Clínica: Lys • Grifo Fisiolys\n` +
      `-----------------------------------------\n\n` +
      `Com este cartão você acumula saldo mensal de R$ 99,00 para utilizar em Pilates, Fisioterapia e Massoterapia, estensível para parentes de 2º grau.\n\n` +
      `Atenciosamente,\n` +
      `Dra. Elays Marinho - Fisiolys Fisioterapia e Pilates`
    );

    window.open(`mailto:${member.patientEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCardDetails = () => {
    const text = `CARTÃO FIDELIDADE FISIOLYS\nNome: ${member.patientName}\nNº Cartão: ${cardNumber}\nInício: ${startDate}\nSelo: 12 Anos Cuidando de vidas através do movimento`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-3">
      {/* DIGITAL LOYALTY CARD CONTAINER */}
      <div
        id={`loyalty-card-${member.id}`}
        className="relative w-full max-w-md mx-auto rounded-3xl p-6 bg-gradient-to-br from-[#18291F] via-[#284232] to-[#0F1C15] text-white shadow-2xl border-2 border-[#D0A73B]/60 overflow-hidden transform transition-all hover:scale-[1.01]"
      >
        {/* Metallic Gold Background Pattern Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-44 h-44 bg-[#D0A73B]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-36 h-36 bg-[#5F6D33]/30 rounded-full blur-2xl pointer-events-none" />

        {/* Top Card Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-4 relative z-10">
          <div className="flex items-center space-x-3">
            {/* Logo Oficial Fisiolys */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#18291F] p-0.5 border border-[#D0A73B] shadow-md shrink-0 overflow-hidden flex items-center justify-center">
              <img
                src={logoImg}
                alt="Logo Fisiolys"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[9px] uppercase tracking-widest font-black text-[#EBDC9C] block">
                  Clube de Vantagens
                </span>
                <Crown className="w-3 h-3 text-[#D0A73B]" />
              </div>
              <h3 className="text-sm sm:text-base font-serif font-black tracking-wide text-white leading-tight">
                FISIOLYS VIP
              </h3>
            </div>
          </div>

          {/* SIM Chip Visual Graphic */}
          <div className="w-10 h-7 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300 shadow-inner flex items-center justify-center relative overflow-hidden opacity-90 shrink-0">
            <div className="w-full h-[1px] bg-amber-700/60 absolute top-2" />
            <div className="w-full h-[1px] bg-amber-700/60 absolute bottom-2" />
            <div className="h-full w-[1px] bg-amber-700/60 absolute left-3" />
            <div className="h-full w-[1px] bg-amber-700/60 absolute right-3" />
          </div>
        </div>

        {/* Main Body: Card Details + Mascot Illustration */}
        <div className="my-5 flex items-center justify-between gap-4 relative z-10">
          {/* Cardholder Info */}
          <div className="space-y-3.5 flex-1 min-w-0">
            {/* 1. Nome do Paciente */}
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#EAF0DB]/70 block">
                Nome do Titular
              </span>
              <p className="text-base sm:text-lg font-bold text-white truncate drop-shadow-xs">
                {member.patientName}
              </p>
            </div>

            {/* 2. Data de Início e Número do Cartão */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#EAF0DB]/70 block">
                  Início do Plano
                </span>
                <p className="text-xs font-mono font-bold text-[#EBDC9C]">
                  {startDate}
                </p>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#EAF0DB]/70 block">
                  Nº do Cartão
                </span>
                <p className="text-xs font-mono font-bold text-amber-300 tracking-wider">
                  {cardNumber}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Ilustração da Mascote Lys */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative group">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-[#D0A73B] shadow-xl p-0.5 bg-gradient-to-tr from-[#D0A73B] to-amber-100">
                <img
                  src={mascotImg}
                  alt="Lys - Mascotinha Fisiolys"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 bg-[#31523D] text-[#EBDC9C] p-1 rounded-full text-[8px] border border-[#D0A73B] shadow-xs">
                ✨
              </span>
            </div>
            <span className="text-[10px] font-black text-[#EBDC9C] mt-1 tracking-tight">
              Mascote Lys
            </span>
          </div>
        </div>

        {/* Footer Bar: Selo de 12 Anos no Canto Esquerdo + Badge Membro VIP */}
        <div className="flex items-center justify-between gap-2 border-t border-white/15 pt-3 relative z-10 text-[10px]">
          {/* Canto Esquerdo: Selo de 12 Anos de Experiência */}
          <div className="flex items-center space-x-2 bg-[#18291F]/80 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-[#D0A73B]/40 shadow-xs max-w-[70%] sm:max-w-[75%]">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#D0A73B] via-[#F7EEBC] to-[#D0A73B] text-[#18291F] flex items-center justify-center font-black text-[9px] shadow-xs shrink-0 border border-amber-200">
              12
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[8.5px] font-black tracking-wider text-[#EBDC9C] flex items-center space-x-1 truncate">
                <Award className="w-2.5 h-2.5 text-[#D0A73B] shrink-0" />
                <span>12 ANOS DE EXPERIÊNCIA</span>
              </span>
              <span className="text-[7.5px] font-medium text-[#EAF0DB]/90 truncate">
                Cuidando de vidas através do movimento
              </span>
            </div>
          </div>

          {/* Canto Direito: Badge Membro VIP */}
          <span className="font-extrabold text-[#D0A73B] bg-white/10 px-2 py-1 rounded-md border border-[#D0A73B]/30 flex items-center space-x-1 shrink-0">
            <Sparkles className="w-2.5 h-2.5 text-[#D0A73B]" />
            <span>Membro VIP</span>
          </span>
        </div>
      </div>

      {/* ACTION BUTTONS (ENVIAR WHATSAPP / E-MAIL / IMPRIMIR) */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto pt-1">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex-1 min-w-[130px] px-3.5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            title="Enviar no WhatsApp do paciente"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Enviar WhatsApp</span>
          </button>

          {member.patientEmail && (
            <button
              type="button"
              onClick={handleSendEmail}
              className="flex-1 min-w-[120px] px-3.5 py-2.5 bg-[#31523D] hover:bg-[#23372B] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              title="Enviar por e-mail"
            >
              <Mail className="w-3.5 h-3.5 text-[#D0A73B]" />
              <span>Enviar E-mail</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyCardDetails}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
            title="Copiar dados do cartão"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
            title="Imprimir Cartão"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      )}
    </div>
  );
};
