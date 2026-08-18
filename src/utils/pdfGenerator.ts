import { jsPDF } from 'jspdf';
import { ClinicConfig, Service } from '../types';
import { generateQRCodeDataUrl, formatCurrency, getPublicAppUrl, getCheckInUrl, getGoogleReviewUrl, getClinicMapUrl } from './qrUtils';

export type QRTemplateType = 'checkin' | 'review' | 'app' | 'kit_completo';

export interface GeneratePDFOptions {
  type: QRTemplateType;
  clinic: ClinicConfig;
  customQrDataUrl?: string;
  customUrl?: string;
  patientName?: string;
  patientPhone?: string;
}

/**
 * Generates and downloads or returns an A4 PDF for printing clinic QR codes.
 */
export async function generateQRPDF(options: GeneratePDFOptions): Promise<jsPDF> {
  const { type, clinic, customQrDataUrl, customUrl, patientName, patientPhone } = options;

  // Create A4 PDF (210mm x 297mm) in portrait mode
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  if (type === 'kit_completo') {
    // Generate 3 pages: 1 Check-in, 1 Google Review, 1 App Agendamento
    await renderPlaquePage(doc, {
      type: 'checkin',
      clinic,
      pageNumber: 1,
      totalCount: 3,
      customUrl: getCheckInUrl(clinic.customAppUrl, patientPhone),
    });

    doc.addPage();
    await renderPlaquePage(doc, {
      type: 'review',
      clinic,
      pageNumber: 2,
      totalCount: 3,
      customUrl: getGoogleReviewUrl(clinic.googleReviewUrl, clinic.address, clinic.city),
    });

    doc.addPage();
    await renderPlaquePage(doc, {
      type: 'app',
      clinic,
      pageNumber: 3,
      totalCount: 3,
      customUrl: getPublicAppUrl(clinic.customAppUrl),
    });
  } else {
    // Single page plaque
    let targetUrl = customUrl;
    if (!targetUrl) {
      if (type === 'checkin') targetUrl = getCheckInUrl(clinic.customAppUrl, patientPhone);
      else if (type === 'review') targetUrl = getGoogleReviewUrl(clinic.googleReviewUrl, clinic.address, clinic.city);
      else targetUrl = getPublicAppUrl(clinic.customAppUrl);
    }

    await renderPlaquePage(doc, {
      type,
      clinic,
      customQrDataUrl,
      customUrl: targetUrl,
      patientName,
    });
  }

  return doc;
}

interface RenderPageProps {
  type: 'checkin' | 'review' | 'app';
  clinic: ClinicConfig;
  pageNumber?: number;
  totalCount?: number;
  customQrDataUrl?: string;
  customUrl?: string;
  patientName?: string;
}

async function renderPlaquePage(doc: jsPDF, props: RenderPageProps) {
  const { type, clinic, customQrDataUrl, customUrl, patientName } = props;

  // Colors
  const primaryGreen = [35, 55, 43];     // #23372B
  const darkForest = [49, 82, 61];       // #31523D
  const gold = [208, 167, 59];           // #D0A73B
  const goldDark = [126, 97, 29];        // #7E611D
  const softBg = [247, 248, 243];        // #F7F8F3
  const textDark = [30, 41, 59];         // #1E293B
  const textMuted = [100, 116, 139];     // #64748B

  // 1. Page Background
  doc.setFillColor(softBg[0], softBg[1], softBg[2]);
  doc.rect(0, 0, 210, 297, 'F');

  // 2. Decorative Outer Border
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(1.5);
  doc.roundedRect(10, 10, 190, 277, 6, 6, 'D');

  doc.setDrawColor(darkForest[0], darkForest[1], darkForest[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(12, 12, 186, 273, 5, 5, 'D');

  // 3. Top Header Banner
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.roundedRect(16, 16, 178, 38, 4, 4, 'F');

  // Gold accent line under header
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(16, 52, 178, 2, 'F');

  // Clinic Brand in Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FISIOLYS', 105, 30, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text('FISIOTERAPIA & PILATES • SAÚDE E REABILITAÇÃO', 105, 37, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(220, 230, 225);
  doc.text(`Responsável Técnica: Dra. ${clinic.managerName || 'Elays Marinho'}`, 105, 45, { align: 'center' });

  // 4. Plaque Subtitle / Action Ribbon
  let ribbonTitle = 'CHEGOU PARA O SEU ATENDIMENTO?';
  let mainTitle = 'FAÇA SEU CHECK-IN PELO CELULAR';
  let subtitle = 'Aponte a câmera do seu celular para o QR Code e confirme sua presença na recepção em 5 segundos.';
  let qrCaption = 'QR CODE DE CHECK-IN DA RECEPÇÃO';
  let step1 = '1. Aponte a Câmera';
  let step1Desc = 'Abra o celular e mire no QR Code.';
  let step2 = '2. Confirme Presença';
  let step2Desc = patientName ? `Olá, ${patientName}!` : 'Toque em Confirmar Presença.';
  let step3 = '3. Aguarde Confortável';
  let step3Desc = 'A Dra. Elays já foi notificada!';

  if (type === 'review') {
    ribbonTitle = 'SUA OPINIÃO VALE MUITO PARA NÓS!';
    mainTitle = 'AVALIE NOSSO ATENDIMENTO NO GOOGLE';
    subtitle = 'Aponte a câmera do celular para avaliar a Fisiolys com 5 Estrelas no Google e ajude mais pessoas a encontrarem saúde e bem-estar.';
    qrCaption = 'QR CODE DE AVALIAÇÃO 5 ESTRELAS';
    step1 = '1. Aponte a Câmera';
    step1Desc = 'Mire a câmera no QR Code.';
    step2 = '2. Selecione 5 Estrelas';
    step2Desc = 'Dê sua nota de 5 estrelas ★★★★★';
    step3 = '3. Deixe seu Comentário';
    step3Desc = 'Conte como foi sua experiência!';
  } else if (type === 'app') {
    ribbonTitle = 'AGENDE OU ACOMPANHE SUAS SESSÕES';
    mainTitle = 'ACESSE O APLICATIVO DA FISIOLYS';
    subtitle = 'Agende consultas, veja horários disponíveis, histórico de frequência e extrato de sessões de Pilates e Fisioterapia 24h por dia.';
    qrCaption = 'QR CODE DO APLICATIVO / AGENDAMENTO';
    step1 = '1. Aponte a Câmera';
    step1Desc = 'Mire a câmera no QR Code.';
    step2 = '2. Escolha o Serviço';
    step2Desc = 'Pilates, Coluna ou Fisioterapia.';
    step3 = '3. Garanta seu Horário';
    step3Desc = 'Confirmação rápida e segura!';
  }

  // Ribbon Badge
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.roundedRect(45, 62, 120, 8, 4, 4, 'F');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(ribbonTitle, 105, 67.5, { align: 'center' });

  // Main Call to Action Title
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(mainTitle, 105, 78, { align: 'center' });

  // Subtitle Explanation (Wrapped)
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const splitSub = doc.splitTextToSize(subtitle, 160);
  doc.text(splitSub, 105, 85, { align: 'center' });

  // 5. Generate and Embed High-Res QR Code
  const qrUrl = customQrDataUrl || (await generateQRCodeDataUrl(customUrl || getPublicAppUrl(clinic.customAppUrl)));

  // QR Code Frame (Card on Page)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(1.2);
  doc.roundedRect(55, 96, 100, 105, 6, 6, 'FD');

  if (qrUrl) {
    try {
      doc.addImage(qrUrl, 'PNG', 65, 102, 80, 80);
    } catch (e) {
      console.error('Error rendering QR image in PDF', e);
    }
  }

  // Caption under QR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(goldDark[0], goldDark[1], goldDark[2]);
  doc.text(qrCaption, 105, 192, { align: 'center' });

  // Direct URL small print
  if (customUrl) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    const shortUrl = customUrl.length > 55 ? customUrl.substring(0, 52) + '...' : customUrl;
    doc.text(shortUrl, 105, 197, { align: 'center' });
  }

  // 6. 3-Step Instruction Boxes
  const boxWidth = 54;
  const boxHeight = 28;
  const startY = 210;

  // Box 1
  renderStepBox(doc, 20, startY, boxWidth, boxHeight, '1', step1, step1Desc, darkForest, gold, textDark, textMuted);
  // Box 2
  renderStepBox(doc, 78, startY, boxWidth, boxHeight, '2', step2, step2Desc, darkForest, gold, textDark, textMuted);
  // Box 3
  renderStepBox(doc, 136, startY, boxWidth, boxHeight, '3', step3, step3Desc, darkForest, gold, textDark, textMuted);

  // 7. Footer Info (Address, City, Phone)
  doc.setDrawColor(200, 215, 205);
  doc.setLineWidth(0.4);
  doc.line(25, 252, 185, 252);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkForest[0], darkForest[1], darkForest[2]);
  doc.text(`${clinic.name} • Altamira / Pará`, 105, 258, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`${clinic.address} • WhatsApp: ${clinic.phone || '(93) 99126-5006'}`, 105, 264, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(goldDark[0], goldDark[1], goldDark[2]);
  doc.text('Placa oficial formatada para display de acrílico ou balcão de recepção (Folha A4)', 105, 272, { align: 'center' });
}

function renderStepBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  num: string,
  title: string,
  desc: string,
  darkGreen: number[],
  gold: number[],
  textDark: number[],
  textMuted: number[]
) {
  // White card with subtle border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 215, 205);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');

  // Step Number Badge (Gold/Green)
  doc.setFillColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  doc.circle(x + 7, y + 8, 4, 'F');
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(num, x + 7, y + 9.5, { align: 'center' });

  // Title
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(title, x + 13, y + 9);

  // Description
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const splitDesc = doc.splitTextToSize(desc, w - 8);
  doc.text(splitDesc, x + 4, y + 17);
}

/**
 * Generates an A4 Printable PDF containing the entire Services and Treatments Price Catalog
 */
export async function generateServicesCatalogPDF(clinic: ClinicConfig, services: Service[]): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryGreen = [35, 55, 43];
  const darkForest = [49, 82, 61];
  const gold = [208, 167, 59];
  const goldDark = [126, 97, 29];
  const softBg = [247, 248, 243];
  const textDark = [30, 41, 59];
  const textMuted = [100, 116, 139];

  // Background
  doc.setFillColor(softBg[0], softBg[1], softBg[2]);
  doc.rect(0, 0, 210, 297, 'F');

  // Borders
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(1.2);
  doc.roundedRect(10, 10, 190, 277, 5, 5, 'D');

  doc.setDrawColor(darkForest[0], darkForest[1], darkForest[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(12, 12, 186, 273, 4, 4, 'D');

  // Header
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.roundedRect(16, 16, 178, 30, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FISIOLYS • TABELA DE SERVIÇOS & TRATAMENTOS', 105, 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text(`Dra. ${clinic.managerName || 'Elays Marinho'} • Fisioterapia e Pilates • Altamira / PA`, 105, 36, { align: 'center' });

  // Filter and categorize services
  let currentY = 54;

  const activeServices = services.filter((s) => s.active);

  for (const s of activeServices) {
    if (currentY > 255) {
      doc.addPage();
      currentY = 25;
    }

    const isPilates = s.category === 'pilates';
    const invType = isPilates ? '(Mensal)' : '(Sessão)';

    // Service Item Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(210, 225, 215);
    doc.setLineWidth(0.4);
    doc.roundedRect(16, currentY, 178, 22, 2.5, 2.5, 'FD');

    // Category Tag
    doc.setFillColor(isPilates ? 245 : 230, isPilates ? 238 : 242, isPilates ? 211 : 235);
    doc.roundedRect(19, currentY + 3, 26, 5, 1, 1, 'F');
    doc.setTextColor(isPilates ? 126 : 49, isPilates ? 97 : 82, isPilates ? 29 : 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(s.category.toUpperCase(), 32, currentY + 6.5, { align: 'center' });

    // Duration Tag
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`${s.durationMinutes} min`, 50, currentY + 6.5);

    // Title
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(s.name, 19, currentY + 13);

    // Description
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const descShort = s.description.length > 95 ? s.description.substring(0, 92) + '...' : s.description;
    doc.text(descShort, 19, currentY + 18);

    // Price and Investment Label
    doc.setTextColor(goldDark[0], goldDark[1], goldDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`Investimento ${invType}`, 188, currentY + 7, { align: 'right' });

    doc.setTextColor(darkForest[0], darkForest[1], darkForest[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(formatCurrency(s.price), 188, currentY + 16, { align: 'right' });

    currentY += 25;
  }

  // Footer QR Code to Book Online
  const appQr = await generateQRCodeDataUrl(getPublicAppUrl(clinic.customAppUrl));
  if (currentY <= 245) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.roundedRect(16, currentY + 2, 178, 28, 3, 3, 'FD');

    if (appQr) {
      doc.addImage(appQr, 'PNG', 20, currentY + 4, 24, 24);
    }

    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Agende seus Atendimentos pelo Smartphone', 48, currentY + 11);

    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Escaneie o QR Code ao lado para escolher datas e horários disponíveis.', 48, currentY + 17);
    doc.text(`WhatsApp: ${clinic.phone || '(93) 99126-5006'} • ${clinic.address}`, 48, currentY + 23);
  }

  return doc;
}
