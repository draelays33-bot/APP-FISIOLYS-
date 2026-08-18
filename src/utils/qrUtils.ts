import QRCode from 'qrcode';

export function getPublicAppUrl(customAppUrl?: string): string {
  if (customAppUrl && customAppUrl.trim().length > 0) {
    return customAppUrl.trim();
  }
  if (typeof window === 'undefined') return 'https://fisiolys.app';
  
  const origin = window.location.origin;
  
  // Se estiver executando no ambiente interno 'ais-dev-', converte automaticamente para o link público 'ais-pre-'
  // Isso impede que a tela de "Action required to load your app" (bloqueio de cookie) apareça ao ler pelo celular.
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }
  
  return origin;
}

export function getCheckInUrl(customAppUrl?: string, patientPhone?: string): string {
  const baseUrl = getPublicAppUrl(customAppUrl);
  const params = new URLSearchParams();
  params.append('view', 'patient_portal');
  params.append('action', 'checkin');
  if (patientPhone) {
    params.append('phone', patientPhone.replace(/\D/g, ''));
  }
  return `${baseUrl}?${params.toString()}`;
}

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    const targetUrl = text || getPublicAppUrl();
    const url = await QRCode.toDataURL(targetUrl, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#1B2B22', // Verde escuro de alto contraste para leitura instantânea na câmera
        light: '#ffffff',
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
  servicePrice: number;
  date: string;
  time: string;
  address: string;
  paymentMethod?: string;
}): string {
  const dateFormatted = formatDatePtBR(params.date);
  const priceFormatted = formatCurrency(params.servicePrice);
  const mapUrl = getClinicMapUrl(params.address);

  const paymentText = params.paymentMethod === 'pix' 
    ? 'PIX (Chave WhatsApp/E-mail)' 
    : params.paymentMethod === 'card_link' 
    ? 'Cartão de Crédito/Débito (Link Online)' 
    : 'Presencial na Recepção';

  const text = `Olá! Gostaria de confirmar meu agendamento na *${params.clinicName}*:

📋 *Serviço:* ${params.serviceName}
📅 *Data:* ${dateFormatted}
⏰ *Horário:* ${params.time} hs
👤 *Paciente:* ${params.patientName}
💰 *Valor:* ${priceFormatted}
💳 *Forma de Pagamento:* ${paymentText}
📍 *Local:* ${params.address}
🗺️ *Ver no Mapa:* ${mapUrl}

Aguardo a confirmação do horário. Obrigado(a)!`;

  return encodeURIComponent(text);
}
