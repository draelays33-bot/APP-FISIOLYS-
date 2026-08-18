import { formatDatePtBR, formatCurrency, getClinicMapUrl } from './qrUtils';

export interface WhatsAppTemplateData {
  patientName: string;
  patientPhone?: string;
  serviceName: string;
  servicePrice?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  clinicName?: string;
  managerName?: string;
  address?: string;
  city?: string;
  paymentMethod?: string;
  notes?: string;
}

export const DEFAULT_WHATSAPP_TEMPLATES = {
  bookingConfirmation: `Olá *{paciente}*! 💚✨

Seu agendamento na *{clinica}* foi registrado com sucesso!

📋 *Tratamento:* {servico}
📅 *Data:* {data}
⏰ *Horário:* {horario} hs
💰 *Investimento:* {valor}
📍 *Endereço:* {endereco} - {cidade}
🗺️ *Rota no Google Maps:* {maps_link}

{instrucoes_chegada}

Estamos ansiosos para cuidar do seu bem-estar! Se precisar de qualquer ajuste, responda esta mensagem. 🌿`,

  reminderD1: `Olá *{paciente}*! Tudo bem? 🌸

Lembrete carinhoso do seu atendimento de *{servico}* agendado para *amanhã* na *{clinica}*:

📅 *Data:* {data} (Amanhã)
⏰ *Horário:* {horario} hs
📍 *Local:* {endereco}
🗺️ *Localização:* {maps_link}

Por favor, responda com *CONFIRMAR* para mantermos seu horário reservado com a *{responsavel}*. Caso precise remarcar, nos avise com antecedência. 💚`,

  reminderD0: `Olá *{paciente}*! Bom dia! ☀️✨

Passando para lembrar que o seu atendimento de *{servico}* na *{clinica}* é *HOJE*:

⏰ *Horário:* {horario} hs
📍 *Local:* {endereco} - {cidade}
🗺️ *Ver no Mapa:* {maps_link}

Recomendamos chegar com 5 a 10 minutos de antecedência. Estamos te aguardando com muito carinho! 🌿`
};

export interface QuickReplyTemplate {
  id: string;
  category: 'orientacao' | 'financeiro' | 'localizacao' | 'pontualidade' | 'pos_atendimento' | 'reagendamento' | 'livre';
  title: string;
  badge: string;
  template: string;
}

export const DEFAULT_QUICK_REPLY_TEMPLATES: QuickReplyTemplate[] = [
  {
    id: 'orientacoes_pre',
    category: 'orientacao',
    title: 'Orientações Pré-Sessão (Pilates & Fisio)',
    badge: '🧘 Orientações',
    template: `Olá *{paciente}*! Tudo bem? 🌿

Para o seu atendimento de *{servico}* agendado para *{data} às {horario}hs* na *{clinica}*, separamos algumas recomendações importantes:

👕 *Vestimenta:* Venha com roupas leves e confortáveis (legging, bermuda de lycra ou tactel) que facilitem os movimentos.
🧦 *Pilates:* Recomendamos meias antiderrapantes.
💧 *Hidratação:* Traga sua garrafinha de água.
📄 *Exames:* Se tiver exames de imagem recentes (Ressonância, Raio-X), traga para a avaliação da *{responsavel}*.

Qualquer dúvida estamos à disposição!`
  },
  {
    id: 'confirmacao_pagamento',
    category: 'financeiro',
    title: 'Confirmação de Pagamento & Recibo',
    badge: '💳 Financeiro',
    template: `Olá *{paciente}*! 💚

Confirmamos com sucesso o recebimento do seu pagamento referente a *{servico}* na *{clinica}*.

💰 *Valor:* {valor}
📄 *Comprovante/Recibo:* Seu extrato detalhado para Imposto de Renda e recibo digital já estão disponíveis na sua área do paciente!

Agradecemos imensamente pela confiança em nosso trabalho. Ótimo dia!`
  },
  {
    id: 'localizacao_acesso',
    category: 'localizacao',
    title: 'Localização & Rota no Google Maps',
    badge: '📍 Localização',
    template: `Olá *{paciente}*! 🗺️

Segue o endereço completo e o link para navegar até a *{clinica}*:

📍 *Endereço:* {endereco} - {cidade}
🧭 *Rota no Google Maps:* {maps_link}

Dispomos de estacionamento fácil e recepção climatizada. Se precisar de pontos de referência, estamos à disposição!`
  },
  {
    id: 'aviso_tolerancia',
    category: 'pontualidade',
    title: 'Aviso de Pontualidade & Tolerância',
    badge: '⏰ Horário',
    template: `Olá *{paciente}*! ⏱️

Lembramos que seu atendimento de *{servico}* está reservado para *{data} às {horario}hs*.

Para garantir o aproveitamento integral da sua sessão e respeitar a agenda dos demais pacientes, solicitamos pontualidade (tolerância de até 10 minutos).

Estamos te aguardando!`
  },
  {
    id: 'pos_sessao_cuidados',
    category: 'pos_atendimento',
    title: 'Pós-Atendimento & Orientações em Casa',
    badge: '🌟 Cuidados',
    template: `Olá *{paciente}*! 🌸✨

Como você está se sentindo após o atendimento de *{servico}* de hoje?

💧 *Lembretes pós-sessão:*
• Mantenha-se bem hidratado(a) ao longo do dia.
• Realize as respirações e alongamentos orientados pela *{responsavel}*.
• Se sentir algum desconforto anormal, nos envie uma mensagem.

Nos vemos na sua próxima sessão! 🌿`
  },
  {
    id: 'reagendamento_horario',
    category: 'reagendamento',
    title: 'Solicitação de Reagendamento',
    badge: '🔄 Reagendar',
    template: `Olá *{paciente}*! Tudo bem? 

Gostaríamos de verificar sua disponibilidade para ajustar o horário do seu atendimento de *{servico}*.

Quais dias e períodos (manhã ou tarde) seriam melhores para você nesta semana? Ficamos no aguardo para confirmar a melhor vaga com a *{responsavel}*. 💚`
  },
  {
    id: 'mensagem_livre',
    category: 'livre',
    title: 'Mensagem Livre / Personalizada',
    badge: '✍️ Personalizada',
    template: `Olá *{paciente}*! 

Passando para conversar sobre o seu atendimento na *{clinica}*. `
  }
];

export function interpolateWhatsAppTemplate(template: string, data: WhatsAppTemplateData): string {
  const clinicName = data.clinicName || 'Fisiolys Fisioterapia e Pilates';
  const managerName = data.managerName || 'Dra. Elays Marinho';
  const address = data.address || 'Av. Coronel José Porfírio, nº 3025 - Recreio';
  const city = data.city || 'Altamira - Pará';
  const mapsUrl = getClinicMapUrl(address, city);
  const formattedDate = formatDatePtBR(data.date);
  const formattedPrice = data.servicePrice !== undefined ? formatCurrency(data.servicePrice) : '';

  let paymentText = 'A combinar na recepção';
  if (data.paymentMethod === 'pix') paymentText = 'PIX (Chave WhatsApp / E-mail)';
  else if (data.paymentMethod === 'card_link' || data.paymentMethod === 'cartao_recorrente') paymentText = 'Cartão (Link Online)';
  else if (data.paymentMethod === 'presencial') paymentText = 'Presencial (Dinheiro / Cartão na Clínica)';

  const arrivalInstructions = '💡 *Dica:* Venha com roupas leves e confortáveis adequadas para a prática do Pilates ou sessão fisioterapêutica.';

  let result = template || DEFAULT_WHATSAPP_TEMPLATES.bookingConfirmation;

  result = result.replace(/\{paciente\}/g, data.patientName || 'Paciente');
  result = result.replace(/\{servico\}/g, data.serviceName || 'Atendimento');
  result = result.replace(/\{valor\}/g, formattedPrice || 'Sob consulta');
  result = result.replace(/\{data\}/g, formattedDate || '');
  result = result.replace(/\{horario\}/g, data.time || '');
  result = result.replace(/\{clinica\}/g, clinicName);
  result = result.replace(/\{responsavel\}/g, managerName);
  result = result.replace(/\{endereco\}/g, address);
  result = result.replace(/\{cidade\}/g, city);
  result = result.replace(/\{maps_link\}/g, mapsUrl);
  result = result.replace(/\{forma_pagamento\}/g, paymentText);
  result = result.replace(/\{instrucoes_chegada\}/g, arrivalInstructions);
  result = result.replace(/\{chave_pix\}/g, '93991265006');

  return result;
}

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

export function getWhatsAppWebUrl(phone: string, text: string): string {
  const clean = cleanPhoneNumber(phone);
  return `https://web.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(text)}`;
}

export function getWhatsAppDirectUrl(phone: string, text: string): string {
  const clean = cleanPhoneNumber(phone);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}
