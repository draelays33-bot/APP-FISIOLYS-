import QRCode from 'qrcode';

export function getPublicAppUrl(customAppUrl?: string): string {
  if (customAppUrl && customAppUrl.trim().length > 0) {
    let url = customAppUrl.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    return url;
  }
  if (typeof window === 'undefined') return 'https://fisiolys.app';
  
  let origin = window.location.origin;
  // Convert development preview host to public shared host (ais-pre-) so iPhone camera scans without authentication restrictions
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

export function getCheckInUrl(customAppUrl?: string, patientPhone?: string): string {
  const baseUrl = getPublicAppUrl(customAppUrl);
  const params = new URLSearchParams();
  params.append('view', 'patient_portal');
  params.append('tab', 'checkin');
  params.append('action', 'checkin');
  if (patientPhone) {
    params.append('phone', patientPhone.replace(/\D/g, ''));
  }
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generates an ultra-crisp, high-contrast QR Code Data URL optimized for instant smartphone camera scanning.
 * - Uses pure black #000000 on #FFFFFF for maximum optical contrast (21:1 ratio)
 * - Uses standard ISO 4-module quiet zone margin for foolproof edge detection
 * - Uses Error Correction 'M' (15%) to maintain large, clear module size rather than dense microscopic dots
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    const targetUrl = text || getPublicAppUrl();
    const url = await QRCode.toDataURL(targetUrl, {
      width: 1000,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000', // Pure black for 100% camera readability
        light: '#ffffff', // Pure white background
      },
    });
    return url;
  } catch (err) {
    console.error("Error generating QR code data URL", err);
    return '';
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function formatDatePtBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatPhoneMask(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function getClinicMapUrl(address: string = "Av. Coronel José Porfírio, nº 3025 - Recreio", city: string = "Altamira - Pará"): string {
  const fullAddress = `${address}, ${city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Fisiolys, " + fullAddress)}`;
}

export function getGoogleReviewUrl(customUrl?: string, address: string = "Av. Coronel José Porfírio, nº 3025 - Recreio", city: string = "Altamira - Pará"): string {
  if (customUrl && customUrl.trim().length > 0 && !customUrl.includes('search/?api=1')) {
    return customUrl.trim();
  }
  const fullAddress = `${address}, ${city}`;
  // Direct Google search shortcut for Google Business Review popup
  return `https://www.google.com/search?q=${encodeURIComponent("Fisiolys Fisioterapia e Pilates " + fullAddress + " Avaliar no Google")}`;
}

export function generateWhatsAppMessage(params: {
  clinicName: string;
  patientName: string;
  serviceName: string;
  servicePrice?: number;
  date: string;
  time: string;
  address: string;
  paymentMethod?: string;
  planScheduleSummary?: string;
  frequencyLabel?: string;
}): string {
  const dateFormatted = formatDatePtBR(params.date);
  const mapUrl = getClinicMapUrl(params.address);

  const paymentText = params.paymentMethod === 'pix' 
    ? 'PIX (Chave WhatsApp/E-mail)' 
    : params.paymentMethod === 'card_link' 
    ? 'Cartão de Crédito/Débito (Link Online)' 
    : params.paymentMethod === 'cartao_recorrente'
    ? 'Cartão Recorrente Mensal'
    : 'Presencial na Recepção';

  const scheduleLine = params.planScheduleSummary 
    ? `🗓️ *Frequência / Dias Escolhidos:* ${params.planScheduleSummary}\n📅 *Data de Início:* ${dateFormatted}`
    : `📅 *Data:* ${dateFormatted}\n⏰ *Horário:* ${params.time} hs`;

  const text = `Olá! Gostaria de confirmar minha solicitação de agendamento na *${params.clinicName}*:

📋 *Tratamento / Serviço:* ${params.serviceName}
${scheduleLine}
👤 *Paciente:* ${params.patientName}
💳 *Forma de Pagamento:* ${paymentText}
📍 *Local:* ${params.address}
🗺️ *Ver no Mapa:* ${mapUrl}

⚖️ *Normas Éticas:* Condições e plano informados na Avaliação Fisioterapêutica (CREFITO-12).

Aguardo a confirmação do agendamento. Muito obrigado(a)! 🌿💚`;

  return encodeURIComponent(text);
}

