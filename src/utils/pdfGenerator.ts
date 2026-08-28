import { jsPDF } from 'jspdf';
import { ClinicConfig, Service } from '../types';
import { DEFAULT_DOCTOR_CPF, getDoctorCpf, getProfessionalSignature } from './securityUtils';
import { ReceiptData } from './printUtils';
import { generateQRCodeDataUrl, getCheckInUrl, getGoogleReviewUrl, getPublicAppUrl } from './qrUtils';

export type QRTemplateType = 'checkin' | 'review' | 'app' | 'all';

export interface GenerateQRPDFOptions {
  type: QRTemplateType;
  clinic: ClinicConfig;
  patientName?: string;
  patientPhone?: string;
  customQrDataUrl?: string;
  customTargetUrl?: string;
  customUrl?: string;
  customTitle?: string;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatDatePtBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * Generates a crisp, vector-sharp PDF document for Fisiolys official receipts
 */
export async function createReceiptPDF(
  receipt: ReceiptData,
  clinic: Partial<ClinicConfig>,
  docCpf?: string
): Promise<{ doc: jsPDF; blob: Blob; file: File; fileName: string }> {
  const activeDoctorCpf = docCpf || getDoctorCpf(clinic.managerCpf || DEFAULT_DOCTOR_CPF);
  const nowStr = new Date().toLocaleDateString('pt-BR');
  const clinicName = clinic.name || 'Fisiolys Fisioterapia e Pilates';
  const managerName = clinic.managerName || 'Dra. Elays Marinho';
  const crefito = clinic.managerCrefito || 'CREFITO-12';
  const address = clinic.address || 'Av. Coronel José Porfírio, nº 3025 - Recreio';
  const city = clinic.city || 'Altamira - Pará';
  const phone = clinic.phone || '(93) 99126-5006';

  const sanitizedPatient = receipt.patientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const fileName = `Recibo_${receipt.receiptNumber}_${sanitizedPatient}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm
  let y = 18;

  // Background card outer border
  doc.setDrawColor(35, 55, 43); // #23372B
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, 260, 4, 4);

  // Top header banner background
  doc.setFillColor(35, 55, 43); // #23372B
  doc.roundedRect(margin, y, contentWidth, 32, 4, 4, 'F');
  // Overlap square for bottom corners of header
  doc.rect(margin, y + 20, contentWidth, 12, 'F');

  // Gold accent bar below header
  doc.setFillColor(208, 167, 59); // #D0A73B
  doc.rect(margin, y + 32, contentWidth, 1.5, 'F');

  // Brand Header in Gold / Off-white
  doc.setTextColor(245, 238, 211); // #F5EED3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('FISIOLYS', margin + 10, y + 14);

  doc.setTextColor(208, 167, 59); // #D0A73B
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('FISIOTERAPIA & PILATES', margin + 10, y + 21);

  doc.setTextColor(200, 215, 205);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${address} • ${city}`, margin + 10, y + 27);

  // Header Right side - Receipt Badge
  doc.setFillColor(208, 167, 59); // #D0A73B
  doc.roundedRect(pageWidth - margin - 52, y + 8, 44, 8, 2, 2, 'F');
  doc.setTextColor(24, 39, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(receipt.receiptNumber, pageWidth - margin - 30, y + 13.5, { align: 'center' });

  doc.setTextColor(245, 238, 211);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Emissão: ${nowStr}`, pageWidth - margin - 8, y + 23, { align: 'right' });

  y += 40;

  // Doctor credentials banner
  doc.setFillColor(243, 247, 244); // #F3F7F4
  doc.setDrawColor(200, 220, 208);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin + 5, y, contentWidth - 10, 16, 2, 2, 'FD');

  doc.setTextColor(24, 39, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(managerName, margin + 10, y + 6.5);

  doc.setTextColor(75, 100, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Fisioterapeuta Responsável • ${crefito}`, margin + 10, y + 11.5);

  doc.setTextColor(24, 39, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`CPF: ${activeDoctorCpf}`, pageWidth - margin - 10, y + 6.5, { align: 'right' });

  doc.setTextColor(75, 100, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(`WhatsApp: ${phone}`, pageWidth - margin - 10, y + 11.5, { align: 'right' });

  y += 24;

  // Title of the Document
  doc.setTextColor(35, 55, 43);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RECIBO OFICIAL DE PAGAMENTO', margin + 8, y);

  doc.setFillColor(208, 167, 59);
  doc.rect(margin + 8, y + 2, 35, 0.8, 'F');

  y += 10;

  // Data rows
  const drawRow = (label: string, value: string, isHighlight: boolean = false) => {
    doc.setFillColor(isHighlight ? 248 : 255, isHighlight ? 250 : 255, isHighlight ? 248 : 255);
    doc.setDrawColor(226, 232, 228);
    doc.setLineWidth(0.2);
    doc.rect(margin + 6, y, contentWidth - 12, 9, 'FD');

    doc.setTextColor(85, 107, 92);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(label, margin + 10, y + 6);

    doc.setTextColor(20, 31, 24);
    doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(value, margin + 65, y + 6);

    y += 9;
  };

  drawRow('Recebemos de (Paciente):', receipt.patientName, true);
  if (receipt.patientCpf) {
    drawRow('CPF do Paciente:', receipt.patientCpf);
  }
  drawRow('Telefone de Contato:', receipt.patientPhone || 'Não informado');
  drawRow('Serviço / Atendimento:', receipt.serviceName, true);
  drawRow('Data do Atendimento / Ref.:', formatDatePtBR(receipt.date));
  drawRow('Forma de Pagamento:', receipt.paymentMethod);
  drawRow('Status do Pagamento:', 'QUITADO COM SUCESSO ✅', true);

  y += 6;

  // Value highlight box
  doc.setFillColor(237, 247, 240); // #EDF7F0
  doc.setDrawColor(46, 125, 74);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin + 6, y, contentWidth - 12, 18, 3, 3, 'FD');

  doc.setTextColor(23, 77, 43);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VALOR TOTAL QUITADO:', margin + 12, y + 11.5);

  doc.setTextColor(18, 68, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(formatCurrency(receipt.amount), pageWidth - margin - 12, y + 12.5, { align: 'right' });

  y += 24;

  // Legal / IRPF Tax Declaration Text
  doc.setFillColor(250, 251, 250);
  doc.setDrawColor(208, 167, 59); // Gold left bar
  doc.setLineWidth(0.6);
  doc.roundedRect(margin + 6, y, contentWidth - 12, 20, 1, 1, 'FD');
  doc.setFillColor(208, 167, 59);
  doc.rect(margin + 6, y, 1.8, 20, 'F');

  doc.setTextColor(75, 94, 81);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  const legalText =
    'Declaramos para os devidos fins de direito, comprovação e dedução no Imposto de Renda (IRPF) que recebemos do(a) paciente acima identificado(a) o valor total supramencionado referente a serviços profissionais especializados de Fisioterapia e/ou Pilates.';
  const splitLegal = doc.splitTextToSize(legalText, contentWidth - 22);
  doc.text(splitLegal, margin + 12, y + 6);

  y += 24;

  if (receipt.notes) {
    doc.setTextColor(85, 107, 92);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Observações: ${receipt.notes}`, margin + 8, y);
    y += 8;
  }

  // Signature section
  const sigY = 224;
  doc.setDrawColor(185, 203, 191);
  doc.setLineWidth(0.3);
  doc.line(margin + 6, sigY - 4, pageWidth - margin - 6, sigY - 4);

  // Left side signature notes
  doc.setTextColor(99, 117, 104);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(address, margin + 8, sigY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${city} • Tel: ${phone}`, margin + 8, sigY + 13);
  doc.text('Documento timbrado com validade legal e fiscal.', margin + 8, sigY + 18);

  // Right side signature line
  const sigRightX = pageWidth - margin - 40;
  doc.setDrawColor(30, 51, 37);
  doc.setLineWidth(0.5);
  doc.line(sigRightX - 35, sigY + 6, sigRightX + 35, sigY + 6);

  doc.setTextColor(20, 31, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(managerName, sigRightX, sigY + 11, { align: 'center' });

  doc.setTextColor(85, 107, 92);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Fisioterapeuta Responsável • ${crefito}`, sigRightX, sigY + 15.5, { align: 'center' });

  doc.setTextColor(158, 127, 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`CPF: ${activeDoctorCpf}`, sigRightX, sigY + 20, { align: 'center' });

  // Footer bar
  doc.setFillColor(243, 247, 244);
  doc.rect(margin, 252, contentWidth, 8, 'F');
  doc.setTextColor(109, 128, 115);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`🌿 ${clinicName}`, margin + 6, 257.5);
  doc.text(`Documento emitido eletronicamente em ${nowStr}`, pageWidth - margin - 6, 257.5, { align: 'right' });

  // Generate output blob and file
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  return { doc, blob: pdfBlob, file: pdfFile, fileName };
}

/**
 * Triggers direct download of the official PDF file
 */
export async function downloadReceiptPDF(
  receipt: ReceiptData,
  clinic: Partial<ClinicConfig>,
  docCpf?: string
): Promise<string> {
  const { blob, fileName } = await createReceiptPDF(receipt, clinic, docCpf);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);

  return fileName;
}

/**
 * Opens PDF in browser or viewer, and opens print dialog
 */
export async function printReceiptPDF(
  receipt: ReceiptData,
  clinic: Partial<ClinicConfig>,
  docCpf?: string
): Promise<void> {
  const { blob, fileName } = await createReceiptPDF(receipt, clinic, docCpf);
  const blobUrl = URL.createObjectURL(blob);

  // Open in a new tab or trigger direct download
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow || printWindow.closed) {
    // If pop-up blocked or in iframe, trigger auto download
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 2000);
  }
}

/**
 * Handles sharing receipt via WhatsApp, attaching the PDF file when supported
 * or downloading the PDF and opening WhatsApp with formatted text
 */
export async function shareReceiptViaWhatsApp(
  receipt: ReceiptData,
  clinic: Partial<ClinicConfig>,
  docCpf?: string
): Promise<{ sharedAsFile: boolean; fileName: string; phoneUsed: string }> {
  const { file, fileName, blob } = await createReceiptPDF(receipt, clinic, docCpf);
  const activeDoctorCpf = docCpf || getDoctorCpf(clinic.managerCpf || DEFAULT_DOCTOR_CPF);

  const cleanPhone = (receipt.patientPhone || '').replace(/\D/g, '');
  const phoneToUse = cleanPhone.length > 0 ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';

  const msg =
    `🧾 *RECIBO OFICIAL DE PAGAMENTO - ${clinic.name || 'Fisiolys'}*\n\n` +
    `Olá *${receipt.patientName}*! Segue em anexo o seu recibo em PDF e comprovante do atendimento:\n\n` +
    `📄 *Nº do Recibo:* ${receipt.receiptNumber}\n` +
    `🧘‍♀️ *Serviço/Atendimento:* ${receipt.serviceName}\n` +
    `💰 *Valor Quitado:* ${formatCurrency(receipt.amount)}\n` +
    `💳 *Forma de Pagamento:* ${receipt.paymentMethod}\n` +
    `🗓️ *Data:* ${formatDatePtBR(receipt.date)}\n` +
    `📋 *Status:* Quitado com Sucesso ✅\n\n` +
    `🏥 *Profissional:* ${clinic.managerName || 'Dra. Elays Marinho'} (${clinic.managerCrefito || 'CREFITO-12'})\n` +
    `🪪 *CPF da Profissional:* ${activeDoctorCpf}\n` +
    `📍 *Endereço:* ${clinic.address} - ${clinic.city}\n\n` +
    `Agradecemos pela sua confiança! Guarde este recibo para seu controle e declaração de Imposto de Renda. ✨🌸`;

  // 1. Check if browser can share files natively (WhatsApp on iOS, Android, macOS Safari/Chrome)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Recibo Oficial - ${receipt.patientName}`,
        text: msg,
      });
      return { sharedAsFile: true, fileName, phoneUsed: phoneToUse };
    } catch (err: unknown) {
      // User cancelled share sheet or share error -> fall back to auto-download + WhatsApp link
      console.log('Share cancelled or not completed, falling back to download + WhatsApp link', err);
    }
  }

  // 2. Fallback: Automatically download the PDF to patient/admin device AND open WhatsApp
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);

  // Open WhatsApp with complete formatted text
  const waUrl = phoneToUse
    ? `https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(msg)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

  window.open(waUrl, '_blank');

  return { sharedAsFile: false, fileName, phoneUsed: phoneToUse };
}

/**
 * Generates Reception / Check-in / Google Review A4 Display Sign with QR Code
 */
export async function generateQRPDF(options: GenerateQRPDFOptions): Promise<jsPDF> {
  const { type, clinic, patientPhone } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Target URL based on type
  let targetUrl = options.customUrl || options.customTargetUrl || getPublicAppUrl(clinic.customAppUrl);
  let title = options.customTitle || 'ACESSE NOSSO APLICATIVO';
  let subtitle = 'Escaneie a câmera do seu celular para agendar e gerenciar suas sessões';
  let badgeText = 'PILATES & FISIOTERAPIA';

  if (type === 'checkin') {
    targetUrl = options.customUrl || options.customTargetUrl || getCheckInUrl(clinic.customAppUrl, patientPhone);
    title = options.customTitle || 'CONFIRME SUA PRESENÇA';
    subtitle = 'Aponte a câmera do seu celular no QR Code para realizar seu Check-in automático';
    badgeText = 'TOTEM DE CHECK-IN DIGITAL';
  } else if (type === 'review') {
    targetUrl = options.customUrl || options.customTargetUrl || getGoogleReviewUrl(clinic.googleReviewUrl, clinic.address, clinic.city);
    title = options.customTitle || 'AVALIE SUA EXPERIÊNCIA NO GOOGLE';
    subtitle = 'Sua opinião é muito valiosa! Escaneie para nos avaliar com 5 estrelas';
    badgeText = 'AVALIAÇÃO 5 ESTRELAS ⭐⭐⭐⭐⭐';
  }

  // Border & Header
  doc.setFillColor(35, 55, 43); // #23372B
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setFillColor(208, 167, 59); // Gold bar
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  doc.setTextColor(245, 238, 211);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('FISIOLYS', pageWidth / 2, 20, { align: 'center' });

  doc.setTextColor(208, 167, 59);
  doc.setFontSize(10);
  doc.text('FISIOTERAPIA & PILATES • DRA. ELAYS MARINHO', pageWidth / 2, 29, { align: 'center' });

  doc.setTextColor(200, 220, 210);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${clinic.address} • ${clinic.city}`, pageWidth / 2, 36, { align: 'center' });

  // Badge
  doc.setFillColor(208, 167, 59);
  doc.roundedRect(pageWidth / 2 - 45, 55, 90, 9, 3, 3, 'F');
  doc.setTextColor(24, 39, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(badgeText, pageWidth / 2, 61, { align: 'center' });

  // Big Title
  doc.setTextColor(35, 55, 43);
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, 76, { align: 'center' });

  // Subtitle
  doc.setTextColor(80, 100, 90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const splitSub = doc.splitTextToSize(subtitle, 160);
  doc.text(splitSub, pageWidth / 2, 85, { align: 'center' });

  // QR Code Image
  let qrDataUrl = options.customQrDataUrl;
  if (!qrDataUrl) {
    qrDataUrl = await generateQRCodeDataUrl(targetUrl);
  }
  const qrSize = 95;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = 100;

  // QR Outer Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(208, 167, 59);
  doc.setLineWidth(1.2);
  doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 6, 6, 'FD');

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  }

  // Instructions
  let curY = qrY + qrSize + 16;
  doc.setFillColor(243, 247, 244);
  doc.setDrawColor(200, 220, 210);
  doc.setLineWidth(0.4);
  doc.roundedRect(25, curY, pageWidth - 50, 26, 3, 3, 'FD');

  doc.setTextColor(35, 55, 43);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Como utilizar:', 32, curY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 90, 80);
  doc.text('1. Abra a câmera ou leitor de QR Code no seu smartphone', 32, curY + 13);
  doc.text('2. Aponte para o código acima e toque no link exibido', 32, curY + 18.5);
  doc.text('3. Concluído! Sem necessidade de baixar nada ou fila de espera', 32, curY + 23.5);

  // Footer
  doc.setFillColor(35, 55, 43);
  doc.rect(0, pageHeight - 16, pageWidth, 16, 'F');
  doc.setTextColor(245, 238, 211);
  doc.setFontSize(8);
  doc.text(
    `🌿 Fisiolys Clínica Integrada • Contato: ${clinic.phone || '(93) 99126-5006'}`,
    pageWidth / 2,
    pageHeight - 6.5,
    { align: 'center' }
  );

  return doc;
}

/**
 * Generates A4 PDF Services & Treatments Catalog
 */
export async function generateServicesCatalogPDF(
  clinic: ClinicConfig,
  services: Service[]
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Header
  doc.setFillColor(35, 55, 43);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setFillColor(208, 167, 59);
  doc.rect(0, 38, pageWidth, 2, 'F');

  doc.setTextColor(245, 238, 211);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('FISIOLYS - CATÁLOGO DE SERVIÇOS & PILATES', pageWidth / 2, 18, { align: 'center' });

  doc.setTextColor(208, 167, 59);
  doc.setFontSize(9);
  doc.text(`TABELA OFICIAL • ${clinic.managerName || 'Dra. Elays Marinho'} (CREFITO-12)`, pageWidth / 2, 26, {
    align: 'center',
  });

  doc.setTextColor(200, 220, 210);
  doc.setFontSize(7.5);
  doc.text(`${clinic.address} • ${clinic.city} • Tel: ${clinic.phone}`, pageWidth / 2, 33, {
    align: 'center',
  });

  let y = 48;

  // Services list
  services.forEach((srv, index) => {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 252 : 255, index % 2 === 0 ? 250 : 255);
    doc.setDrawColor(220, 230, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setTextColor(35, 55, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(srv.name, margin + 5, y + 6.5);

    doc.setTextColor(18, 68, 36);
    doc.setFontSize(11);
    doc.text(formatCurrency(srv.price), pageWidth - margin - 5, y + 7, { align: 'right' });

    doc.setTextColor(90, 110, 95);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const desc = srv.description || `Sessão personalizada • Duração: ${srv.durationMinutes || 50} min`;
    doc.text(desc.slice(0, 85), margin + 5, y + 13);

    y += 21;
  });

  // Footer
  doc.setFillColor(35, 55, 43);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setTextColor(245, 238, 211);
  doc.setFontSize(7.5);
  doc.text(
    `🌿 Fisiolys Clínica • Agendamentos pelo WhatsApp: ${clinic.phone || '(93) 99126-5006'}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  return doc;
}

/**
 * Generates an official, comprehensive Clinical Evaluation and Evolution Report in PDF
 */
export async function createClinicalEvaluationPDF(
  aval: any,
  patientName: string,
  clinic: Partial<ClinicConfig> = {}
): Promise<{ doc: jsPDF; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm
  let y = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 18;
      // Repeat small header
      doc.setFillColor(28, 36, 32);
      doc.rect(0, 0, pageWidth, 8, 'F');
      doc.setTextColor(245, 238, 211);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`FISIOLYS • Prontuário Clínico — Paciente: ${patientName}`, margin, 5.5);
      y += 5;
    }
  };

  // Header Banner
  doc.setFillColor(28, 36, 32); // #1C2420
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  // Gold accent bar
  doc.setFillColor(208, 167, 59); // #D0A73B
  doc.rect(margin, y + 26, contentWidth, 1.2, 'F');

  // Title & Clinic Branding
  doc.setTextColor(250, 247, 240); // #FAF7F0
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FISIOLYS FISIOTERAPIA & PILATES', margin + 6, y + 10);

  doc.setTextColor(208, 167, 59);
  doc.setFontSize(8.5);
  doc.text('PRONTUÁRIO CLÍNICO & LAUDO DE AVALIAÇÃO FISIOTERAPÊUTICA', margin + 6, y + 17);

  doc.setTextColor(190, 205, 195);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `Responsável Técnica: ${clinic.managerName || 'Dra. Elays Marinho'} — CREFITO-12 / 208058`,
    margin + 6,
    y + 22.5
  );

  doc.text(
    `Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR').slice(0, 5)}`,
    pageWidth - margin - 6,
    y + 22.5,
    { align: 'right' }
  );

  y += 33;

  // 1. Patient Identification Box (Clean grid layout with separated EVA badge)
  const cardHeight = 22;
  doc.setFillColor(245, 247, 244);
  doc.setDrawColor(200, 215, 205);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

  // Left text block (Max width contentWidth - 44mm to prevent any badge overlap)
  doc.setTextColor(28, 36, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`Paciente: ${patientName}`, margin + 5, y + 6);

  // Row 2: Demographic & Clinical Date Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 85, 75);
  doc.text(`Data da Avaliação: ${aval.data ? formatDatePtBR(aval.data) : 'N/A'}`, margin + 5, y + 11.5);
  doc.text(`Idade: ${aval.idade ? `${aval.idade} anos` : 'Não informada'}`, margin + 60, y + 11.5);
  doc.text(`Profissão: ${aval.profissao || 'Não informada'}`, margin + 98, y + 11.5);

  // Row 3: Evaluator
  doc.text(`Avaliador(a): ${aval.avaliador || 'Dra. Elays Marinho (CREFITO 208058)'}`, margin + 5, y + 17);

  // Dedicated EVA Dor badge in the right area (completely separated)
  const eva = aval.escalaDor !== undefined ? aval.escalaDor : 0;
  const evaBadgeWidth = 36;
  const evaBadgeX = pageWidth - margin - evaBadgeWidth - 2;
  const evaBadgeY = y + 3;
  const evaBadgeHeight = 16;

  // Background color based on pain level
  const evaColor = eva >= 7 ? [220, 50, 50] : eva >= 4 ? [225, 140, 20] : [46, 115, 85];
  doc.setFillColor(evaColor[0], evaColor[1], evaColor[2]);
  doc.roundedRect(evaBadgeX, evaBadgeY, evaBadgeWidth, evaBadgeHeight, 2, 2, 'F');

  // Badge Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('ESCALA DE DOR', evaBadgeX + evaBadgeWidth / 2, evaBadgeY + 4.5, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`EVA: ${eva}/10`, evaBadgeX + evaBadgeWidth / 2, evaBadgeY + 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const evaText = eva === 0 ? 'Sem Dor' : eva <= 3 ? 'Dor Leve' : eva <= 6 ? 'Dor Moderada' : eva <= 8 ? 'Dor Intensa' : 'Dor Máxima';
  doc.text(evaText, evaBadgeX + evaBadgeWidth / 2, evaBadgeY + 14.2, { align: 'center' });

  y += cardHeight + 4;

  // Helper Section Renderer
  const renderSectionHeader = (title: string, iconNumber: string) => {
    checkPageBreak(12);
    doc.setFillColor(35, 55, 43);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(250, 247, 240);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${iconNumber}. ${title}`, margin + 3, y + 4.2);
    y += 8;
  };

  const renderField = (label: string, value?: string, defaultVal = 'Não relatado / Sem alterações') => {
    const textVal = value && value.trim() ? value : defaultVal;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(28, 36, 32);
    doc.text(`${label}:`, margin + 3, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 75, 65);
    const splitText = doc.splitTextToSize(textVal, contentWidth - 10);
    checkPageBreak(splitText.length * 4 + 4);
    doc.text(splitText, margin + 3, y + 4);
    y += splitText.length * 4 + 5;
  };

  // Section 1: Anamnese & Queixa
  renderSectionHeader('ANAMNESE CLÍNICA & HISTÓRICO', 'I');
  renderField('Queixa Principal (QP)', aval.queixaPrincipal, 'Não especificada');
  if (aval.historico) renderField('Histórico da Doença Atual (HDA)', aval.historico);
  if (aval.medicamentos) renderField('Medicamentos em Uso', aval.medicamentos);
  if (aval.comorbidades) renderField('Comorbidades & Antecedentes', aval.comorbidades);

  y += 2;

  // Section 2: Exame Físico & Testes
  renderSectionHeader('EXAME FÍSICO & TESTES ESPECIAIS', 'II');
  if (aval.inspecao) renderField('Inspeção Postural / Palpação', aval.inspecao);
  if (aval.adm) renderField('Amplitude de Movimento (ADM)', aval.adm);
  if (aval.forcaMuscular) renderField('Força Muscular & Dinamometria', aval.forcaMuscular);
  if (aval.testesEspeciais) renderField('Testes Ortopédicos / Especiais', aval.testesEspeciais);

  y += 2;

  // Section 3: Diagnóstico Cinético-Funcional & Objetivos
  renderSectionHeader('DIAGNÓSTICO FUNCIONAL & CONDUTA TERAPÊUTICA', 'III');
  renderField('Diagnóstico Cinético-Funcional', aval.diagnosticoFuncional, 'Em definição diagnóstica');
  renderField('Objetivos do Tratamento', aval.objetivos, 'Alívio álgico, ganho de mobilidade e estabilização funcional');
  renderField('Plano Terapêutico & Frequência Indicada', aval.planoTerapeutico, 'Pilates e Fisioterapia conforme protocolo clínico');

  y += 3;

  // Section 4: Evolução das Sessões & Frequência
  if (aval.evolucoes && aval.evolucoes.length > 0) {
    renderSectionHeader(`HISTÓRICO DE SESSÕES & FREQUÊNCIA (${aval.evolucoes.length} SESSÕES)`, 'IV');
    
    aval.evolucoes.forEach((ev: any) => {
      checkPageBreak(18);
      doc.setFillColor(250, 252, 250);
      doc.setDrawColor(220, 230, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, y, contentWidth, 15, 1.5, 1.5, 'FD');

      const sessaoTag = ev.quantidadeRealizada || `Sessão ${ev.sessao}/${ev.totalSessoesPlano || 10}`;
      const presencaLabel = ev.presencaStatus === 'falta_justificada' 
        ? 'Falta Justificada' 
        : ev.presencaStatus === 'falta_sem_aviso' 
        ? 'Falta s/ Aviso' 
        : ev.presencaStatus === 'reposicao' 
        ? 'Reposição' 
        : 'Presente';

      doc.setTextColor(28, 36, 32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`[${sessaoTag}] • ${presencaLabel} — Data: ${formatDatePtBR(ev.data)}`, margin + 3, y + 4.5);

      doc.setTextColor(180, 74, 46);
      doc.setFontSize(7.5);
      doc.text(`EVA Antes: ${ev.dorAntes}/10`, margin + 112, y + 4.5);
      
      doc.setTextColor(46, 115, 85);
      doc.text(`EVA Depois: ${ev.dorDepois}/10`, margin + 142, y + 4.5);

      doc.setTextColor(60, 75, 65);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const conduta = ev.procedimentos ? `Condutas: ${ev.procedimentos}` : 'Condutas cinesioterapêuticas de rotina';
      doc.text(conduta.slice(0, 115), margin + 3, y + 9);

      if (ev.observacoes) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 115, 105);
        doc.text(`Obs: ${ev.observacoes.slice(0, 115)}`, margin + 3, y + 12.8);
      }

      y += 17;
    });
  }

  // Section 5: Exames Complementares & Laudos Anexados
  if (aval.examesAnexados && aval.examesAnexados.length > 0) {
    renderSectionHeader(`EXAMES COMPLEMENTARES & LAUDOS ANEXADOS (${aval.examesAnexados.length})`, 'V');
    
    aval.examesAnexados.forEach((exam: any) => {
      checkPageBreak(15);
      doc.setFillColor(248, 250, 248);
      doc.setDrawColor(210, 225, 215);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, y, contentWidth, 13, 1.5, 1.5, 'FD');

      const tipoLabel = 
        exam.tipo === 'raio_x' ? 'Raio-X' :
        exam.tipo === 'ressonancia' ? 'Ressonância Magnética (RM)' :
        exam.tipo === 'tomografia' ? 'Tomografia Computadorizada (TC)' :
        exam.tipo === 'ultrassom' ? 'Ultrassonografia (USG)' :
        exam.tipo === 'laudo_medico' ? 'Laudo Médico / Atestado' : 'Outro Exame';

      doc.setTextColor(28, 36, 32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`[${tipoLabel}] ${exam.nome}`, margin + 3, y + 4.5);

      doc.setTextColor(100, 115, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Data: ${exam.data ? formatDatePtBR(exam.data) : 'N/A'}`, pageWidth - margin - 40, y + 4.5);

      if (exam.observacoes) {
        doc.setTextColor(60, 75, 65);
        doc.setFontSize(7.5);
        doc.text(`Conclusão/Laudo: ${exam.observacoes.slice(0, 120)}`, margin + 3, y + 9);
      }

      y += 15;
    });
  }

  // Signature Block (Dual: Patient Digital Signature + Therapist Signature)
  checkPageBreak(45);
  y += 8;

  if (aval.assinaturaPacienteUrl) {
    // 2-Column Signature Block
    const colWidth = (contentWidth - 10) / 2;
    const col1X = margin;
    const col2X = margin + colWidth + 10;

    // Col 1: Patient Signature
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(210, 225, 215);
    doc.setLineWidth(0.3);
    doc.roundedRect(col1X, y, colWidth, 34, 2, 2, 'FD');

    // Draw the patient digital signature image
    try {
      doc.addImage(aval.assinaturaPacienteUrl, 'PNG', col1X + (colWidth - 45) / 2, y + 2, 45, 18);
    } catch (e) {
      console.warn("Could not embed patient signature image in PDF:", e);
    }

    doc.setDrawColor(180, 195, 185);
    doc.line(col1X + 8, y + 21, col1X + colWidth - 8, y + 21);

    doc.setTextColor(28, 36, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(patientName, col1X + colWidth / 2, y + 25, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 100, 90);
    doc.text('Assinatura Eletrônica do(a) Paciente', col1X + colWidth / 2, y + 28.5, { align: 'center' });
    if (aval.assinaturaHash) {
      doc.text(`Hash: ${aval.assinaturaHash}`, col1X + colWidth / 2, y + 31.5, { align: 'center' });
    }

    // Col 2: Therapist Signature
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(210, 225, 215);
    doc.setLineWidth(0.3);
    doc.roundedRect(col2X, y, colWidth, 34, 2, 2, 'FD');

    const doctorSignatureUrl = aval.assinaturaProfissionalUrl || clinic.managerSignatureUrl || getProfessionalSignature();
    if (doctorSignatureUrl) {
      try {
        doc.addImage(doctorSignatureUrl, 'PNG', col2X + (colWidth - 45) / 2, y + 2, 45, 17);
      } catch (e) {
        console.warn("Could not embed professional signature in Evaluation PDF:", e);
      }
    }

    doc.setDrawColor(180, 195, 185);
    doc.line(col2X + 8, y + 21, col2X + colWidth - 8, y + 21);

    doc.setTextColor(28, 36, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(clinic.managerName || 'Dra. Elays Marinho', col2X + colWidth / 2, y + 25, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 100, 90);
    doc.text('Fisioterapeuta • CREFITO-12 / 208058', col2X + colWidth / 2, y + 28.5, { align: 'center' });
    doc.text('Fisiolys Fisioterapia e Pilates', col2X + colWidth / 2, y + 31.5, { align: 'center' });

    y += 38;
  } else {
    // Single centered therapist signature
    const doctorSignatureUrl = aval.assinaturaProfissionalUrl || clinic.managerSignatureUrl || getProfessionalSignature();
    if (doctorSignatureUrl) {
      try {
        doc.addImage(doctorSignatureUrl, 'PNG', pageWidth / 2 - 25, y - 6, 50, 16);
      } catch (e) {
        console.warn("Could not embed professional signature in Evaluation PDF:", e);
      }
    }
    doc.setDrawColor(180, 195, 185);
    doc.setLineWidth(0.4);
    doc.line(pageWidth / 2 - 40, y + 10, pageWidth / 2 + 40, y + 10);

    doc.setTextColor(28, 36, 32);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(clinic.managerName || 'Dra. Elays Marinho', pageWidth / 2, y + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 105, 95);
    doc.text('Fisioterapeuta Especialista — CREFITO-12 / 208058', pageWidth / 2, y + 18, { align: 'center' });
    doc.text('Fisiolys Fisioterapia e Pilates • Altamira - PA', pageWidth / 2, y + 21.5, { align: 'center' });

    y += 26;
  }

  // Bottom Page Footer
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(28, 36, 32);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    doc.setTextColor(245, 238, 211);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(
      `Fisiolys Fisioterapia e Pilates • Av. Coronel José Porfírio, 3025 - Altamira/PA • Tel: (93) 99126-5006 • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 3,
      { align: 'center' }
    );
  }

  const cleanName = patientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const fileName = `Prontuario_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;

  return { doc, fileName };
}

/**
 * Generates an official, comprehensive Service Contract & Voice/Image TCLE PDF
 * strictly aligned with the Code of Ethics & Deontology of Physiotherapy (COFFITO 424/2013, 532/2021 and LGPD)
 */
export async function createServiceContractPDF(
  aval: any,
  patientName: string,
  clinic: Partial<ClinicConfig> = {}
): Promise<{ doc: jsPDF; blob: Blob; file: File; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm
  let y = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 16;
      // Header for continued pages
      doc.setFillColor(28, 36, 32);
      doc.rect(0, 0, pageWidth, 7, 'F');
      doc.setTextColor(245, 238, 211);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`FISIOLYS • Contrato de Prestação de Serviços Fisioterapêuticos — Paciente: ${patientName}`, margin, 4.8);
      y += 6;
    }
  };

  // Header Banner
  doc.setFillColor(28, 36, 32); // #1C2420
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  // Gold accent bar
  doc.setFillColor(208, 167, 59); // #D0A73B
  doc.rect(margin, y + 26, contentWidth, 1.2, 'F');

  // Title & Clinic Branding
  doc.setTextColor(250, 247, 240); // #FAF7F0
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('FISIOLYS FISIOTERAPIA & PILATES', margin + 6, y + 9.5);

  doc.setTextColor(208, 167, 59);
  doc.setFontSize(8);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS FISIOTERAPÊUTICOS E PILATES CLÍNICO', margin + 6, y + 16);

  doc.setTextColor(190, 205, 195);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `Deontologia da Fisioterapia: Resoluções COFFITO nº 424/2013, 425/2013, 532/2021 e Lei nº 13.709/2018 (LGPD)`,
    margin + 6,
    y + 22
  );

  doc.text(
    `Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`,
    pageWidth - margin - 6,
    y + 22,
    { align: 'right' }
  );

  y += 33;

  // 1. Identification Box (Partes Contratantes)
  doc.setFillColor(245, 247, 244);
  doc.setDrawColor(200, 215, 205);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  doc.setTextColor(28, 36, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('I. DAS PARTES CONTRATANTES', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 65, 55);

  // Contratada
  const manager = clinic.managerName || 'Dra. Elays Marinho';
  const crefito = clinic.managerCrefito || 'CREFITO-12 / 208058';
  const doctorCpf = getDoctorCpf(clinic.managerCpf || DEFAULT_DOCTOR_CPF);
  const clinicAddr = `${clinic.address || 'Av. Coronel José Porfírio, 3025 - Recreio'} - ${clinic.city || 'Altamira/PA'}`;
  
  doc.text(`CONTRATADA: ${manager}, Fisioterapeuta inscrita sob ${crefito}, CPF nº ${doctorCpf}, com atuação na clínica FISIOLYS FISIOTERAPIA & PILATES, sediada em ${clinicAddr}.`, margin + 4, y + 11.5, { maxWidth: contentWidth - 8 });

  // Contratante
  const pCpf = aval.cpf ? `inscrito(a) no CPF nº ${aval.cpf}` : 'portador(a) dos documentos informados em ficha';
  const pProf = aval.profissao ? `profissão: ${aval.profissao}` : '';
  const pTel = aval.telefone ? `telefone: ${aval.telefone}` : '';
  const pEnd = aval.endereco ? `endereço: ${aval.endereco}` : '';
  const patientDetails = [pCpf, pProf, pTel, pEnd].filter(Boolean).join(', ');

  doc.text(`CONTRATANTE / PACIENTE: ${patientName}${patientDetails ? `, ${patientDetails}` : ''}.`, margin + 4, y + 22.5, { maxWidth: contentWidth - 8 });

  y += 36;

  // Helper Section Renderer for Contract Clauses
  const renderClause = (clauseTitle: string, clauseText: string, extraNote?: string) => {
    checkPageBreak(18);
    
    // Clause Header
    doc.setFillColor(35, 55, 43);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setTextColor(250, 247, 240);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(clauseTitle, margin + 3, y + 3.8);
    y += 7.5;

    // Clause Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 50, 45);
    const splitText = doc.splitTextToSize(clauseText, contentWidth - 6);
    checkPageBreak(splitText.length * 3.6 + 4);
    doc.text(splitText, margin + 3, y + 1);
    y += splitText.length * 3.6 + 3;

    if (extraNote) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 100, 90);
      const splitNote = doc.splitTextToSize(extraNote, contentWidth - 6);
      checkPageBreak(splitNote.length * 3.5 + 3);
      doc.text(splitNote, margin + 3, y + 1);
      y += splitNote.length * 3.5 + 3;
    }

    y += 2;
  };

  // Cláusula 1ª
  const objText = `O presente contrato tem por objeto a prestação de serviços profissionais especializados de Fisioterapia e/ou Pilates Clínico, visando à promoção, prevenção, tratamento e recuperação cinético-funcional do(a) CONTRATANTE, consoante a Anamnese e Avaliação Clínica realizada em ${aval.data ? formatDatePtBR(aval.data) : 'consulta prévia'}.\n` +
    `• Queixa Principal / Diagnóstico Funcional: ${aval.diagnosticoFuncional || aval.queixaPrincipal || 'Quadro álgico e disfunção biomecânica especificada em ficha.'}\n` +
    `• Objetivos Terapêuticos: ${aval.objetivos || 'Alívio da dor, fortalecimento muscular, ganho de ADM e estabilização funcional.'}\n` +
    `• Conduta Terapêutica Proposta: ${aval.planoTerapeutico || 'Sessões de cinesioterapia com Pilates e recursos fisioterapêuticos integrados.'}`;
  renderClause('CLÁUSULA 1ª — DO OBJETO E PLANO TERAPÊUTICO INDIVIDUALIZADO', objText);

  // Cláusula 2ª
  const deontologiaText = `Em observância aos ditames do Código de Ética e Deontologia da Fisioterapia (Resolução COFFITO nº 424/2013), os serviços fisioterapêuticos configuram obrigação de meio e diligência técnica, e não de resultado garantido. A CONTRATADA compromete-se a empregar todo o zelo, conhecimento técnico-científico e recursos terapêuticos adequados, cabendo ao(à) CONTRATANTE seguir rigorosamente as orientações ergonômicas, domiciliares e preventivas repassadas pela profissional.`;
  renderClause('CLÁUSULA 2ª — DA NATUREZA TÉCNICA E DEONTOLOGIA PROFISSIONAL', deontologiaText);

  // Cláusula 3ª
  const freqText = aval.frequenciaSemanal || 'Conforme plano terapêutico definido (1 a 3 vezes por semana)';
  const sessaoText = `As sessões terão duração média de 50 (cinquenta) minutos, realizadas nos horários previamente ajustados na agenda da clínica.\n` +
    `• Frequência Programada: ${freqText}.\n` +
    `• Pontualidade e Faltas: Em caso de impossibilidade de comparecimento, o(a) CONTRATANTE deverá comunicar à clínica com antecedência mínima de 4 (quatro) horas, possibilitando a remarcação de reposição dentro do respectivo mês de vigência, conforme disponibilidade de agenda. Ausências não notificadas no prazo serão contabilizadas como sessão realizada.`;
  renderClause('CLÁUSULA 3ª — DAS SESSÕES, FREQUÊNCIA E REPOSIÇÕES', sessaoText);

  // Cláusula 4ª
  const valText = aval.valorTratamento || 'Conforme tabela oficial de serviços e plano vigente da clínica Fisiolys';
  const payFormText = aval.formaPagamento || 'PIX, Cartão de Crédito/Débito, Boleto ou Plano de Recorrência Mensal';
  const honorariosText = `Pelos serviços ora contratados, o(a) CONTRATANTE pagará à CONTRATADA o montante de: ${valText}, mediante a seguinte forma de pagamento: ${payFormText}.\n` +
    `• Emissão de Recibo Oficial: A CONTRATADA emitirá recibo oficial com aposição do número de inscrição no CREFITO e CPF, válido para fins fiscais, comprovação perante convênios e dedução no Imposto de Renda (IRPF).`;
  renderClause('CLÁUSULA 4ª — DOS HONORÁRIOS, PAGAMENTOS E RECIBO OFICIAL', honorariosText);

  // Cláusula 5ª
  const lgpdText = `Todos os registros de saúde, dados cadastrais, prontuários, imagens clínicas e evoluções do(a) CONTRATANTE são estritamente sigilosos e protegidos sob guarda ética profissional e nos termos da Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018 - LGPD), sendo acessíveis exclusivamente pela equipe de saúde responsável pelo cuidado.`;
  renderClause('CLÁUSULA 5ª — DO SIGILO PROFISSIONAL E PROTEÇÃO DE DADOS (LGPD)', lgpdText);

  // Cláusula 6ª: TERMO DE CONSENTIMENTO DE IMAGEM E VOZ
  const isImageAccepted = aval.termoImagemVozAceito !== false && aval.termoImagemVozTipo !== 'recusado';
  const imageType = aval.termoImagemVozTipo || 'completo';
  let imageDetailText = '';
  if (imageType === 'completo') {
    imageDetailText = `[ X ] AUTORIZAÇÃO COMPLETA: O(A) CONTRATANTE autoriza expressamente a captação, gravação e utilização de sua imagem (fotografias e vídeos de evolução postural, biomecânica e exercícios terapêuticos) e registros de voz/depoimentos para fins de acompanhamento de prontuário, publicações técnico-científicas e divulgação institucional nos canais e redes sociais oficiais da FISIOLYS / Dra. Elays Marinho, sem exibição vexatória e em estrito cumprimento da Resolução COFFITO nº 532/2021.`;
  } else if (imageType === 'cientifico_apenas') {
    imageDetailText = `[ X ] AUTORIZAÇÃO EXCLUSIVA PARA FINS CLÍNICOS E CIENTÍFICOS: O(A) CONTRATANTE autoriza o registro de fotografias e vídeos exclusivamente para prontuário clínico e discussões científicas em meio fechado de saúde, vedada a divulgação em redes sociais abertas.`;
  } else {
    imageDetailText = `[ X ] NÃO AUTORIZAÇÃO: O(A) CONTRATANTE opta por não autorizar o uso de sua imagem e voz para fins de divulgação, sendo mantidos apenas os registros gráficos estritamente indispensáveis ao prontuário clínico.`;
  }

  const tcleImageText = `Em conformidade com a Resolução COFFITO nº 532/2021 e Resolução COFFITO nº 424/2013 (Código de Deontologia da Fisioterapia), o(a) CONTRATANTE manifesta sua vontade livre, consciente e esclarecida quanto ao uso de imagem e voz conforme a opção assinalada abaixo:\n` +
    `${imageDetailText}\n` +
    `• O(A) CONTRATANTE reconhece que a presente autorização é concedida a título gratuito, não ensejando quaisquer ônus presentes ou futuros, podendo ser revogada por solicitação escrita à CONTRATADA.`;
  renderClause('CLÁUSULA 6ª — TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO & USO DE IMAGEM E VOZ (COFFITO 532/2021)', tcleImageText);

  // Cláusula 7ª
  const rescisaoText = `O presente contrato é firmado por prazo indeterminado durante a vigência do tratamento, podendo ser rescindido a qualquer tempo por qualquer das partes mediante comunicação prévia. Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o Foro da Comarca de Altamira, Estado do Pará.`;
  renderClause('CLÁUSULA 7ª — DA VIGÊNCIA, RESCISÃO E FORO', rescisaoText);

  // Bloco de Assinaturas
  checkPageBreak(45);
  y += 5;

  const colWidth = (contentWidth - 10) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + 10;

  // Box 1: Assinatura do Paciente
  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(210, 225, 215);
  doc.setLineWidth(0.3);
  doc.roundedRect(col1X, y, colWidth, 36, 2, 2, 'FD');

  if (aval.assinaturaPacienteUrl) {
    try {
      doc.addImage(aval.assinaturaPacienteUrl, 'PNG', col1X + (colWidth - 45) / 2, y + 2, 45, 18);
    } catch (e) {
      console.warn("Could not embed patient signature image in Contract PDF:", e);
    }
  }

  doc.setDrawColor(180, 195, 185);
  doc.line(col1X + 8, y + 22, col1X + colWidth - 8, y + 22);

  doc.setTextColor(28, 36, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(patientName, col1X + colWidth / 2, y + 26, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 100, 90);
  doc.text('CONTRATANTE / PACIENTE', col1X + colWidth / 2, y + 29.5, { align: 'center' });
  if (aval.assinaturaHash) {
    doc.text(`Hash Eletrônico: ${aval.assinaturaHash.slice(0, 24)}...`, col1X + colWidth / 2, y + 33, { align: 'center' });
  } else {
    doc.text(`Data: ${aval.data ? formatDatePtBR(aval.data) : new Date().toLocaleDateString('pt-BR')}`, col1X + colWidth / 2, y + 33, { align: 'center' });
  }

  // Box 2: Assinatura da Fisioterapeuta
  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(210, 225, 215);
  doc.setLineWidth(0.3);
  doc.roundedRect(col2X, y, colWidth, 36, 2, 2, 'FD');

  const doctorSignatureUrl = aval.assinaturaProfissionalUrl || clinic.managerSignatureUrl || getProfessionalSignature();
  if (doctorSignatureUrl) {
    try {
      doc.addImage(doctorSignatureUrl, 'PNG', col2X + (colWidth - 45) / 2, y + 2, 45, 18);
    } catch (e) {
      console.warn("Could not embed therapist signature image in Contract PDF:", e);
    }
  }

  doc.setDrawColor(180, 195, 185);
  doc.line(col2X + 8, y + 22, col2X + colWidth - 8, y + 22);

  doc.setTextColor(28, 36, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(manager, col2X + colWidth / 2, y + 26, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 100, 90);
  doc.text(`CONTRATADA • ${crefito}`, col2X + colWidth / 2, y + 29.5, { align: 'center' });
  doc.text('Fisiolys Fisioterapia e Pilates • Altamira - PA', col2X + colWidth / 2, y + 33, { align: 'center' });

  // Page Numbers Footer
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(28, 36, 32);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    doc.setTextColor(245, 238, 211);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(
      `Fisiolys Fisioterapia e Pilates • Av. Coronel José Porfírio, 3025 - Altamira/PA • Tel: ${clinic.phone || '(93) 99126-5006'} • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 3,
      { align: 'center' }
    );
  }

  const cleanName = patientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const fileName = `Contrato_Fisiolys_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  return { doc, blob: pdfBlob, file: pdfFile, fileName };
}

/**
 * Direct Download helper for Service Contract PDF
 */
export async function downloadServiceContractPDF(
  aval: any,
  patientName: string,
  clinic: Partial<ClinicConfig> = {}
): Promise<string> {
  const { blob, fileName } = await createServiceContractPDF(aval, patientName, clinic);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
  return fileName;
}

/**
 * Shares Service Contract PDF via WhatsApp with text and direct document attachment
 */
export async function shareServiceContractViaWhatsApp(
  aval: any,
  patientName: string,
  patientPhone: string | undefined,
  clinic: Partial<ClinicConfig> = {}
): Promise<{ sharedAsFile: boolean; fileName: string; phoneUsed: string }> {
  const { file, fileName, blob } = await createServiceContractPDF(aval, patientName, clinic);
  const cleanPhone = (patientPhone || aval.telefone || '').replace(/\D/g, '');
  const phoneToUse = cleanPhone.length > 0 ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';

  const msg =
    `📄 *CONTRATO DE PRESTAÇÃO DE SERVIÇOS & TCLE - ${clinic.name || 'FISIOLYS'}*\n\n` +
    `Olá *${patientName}*! Tudo bem? 🌿✨\n\n` +
    `Segue em anexo o seu *Contrato de Prestação de Serviços Fisioterapêuticos e Pilates Clínico*, devidamente registrado e preenchido com base na sua avaliação clínica e nas diretrizes éticas do COFFITO (Resoluções 424/2013 e 532/2021).\n\n` +
    `📋 *Paciente:* ${patientName}\n` +
    `🩺 *Responsável Técnica:* ${clinic.managerName || 'Dra. Elays Marinho'} (${clinic.managerCrefito || 'CREFITO-12 / 208058'})\n` +
    `🎯 *Plano Terapêutico:* ${aval.planoTerapeutico || 'Pilates e Fisioterapia Integrada'}\n` +
    `🗓️ *Data da Avaliação:* ${aval.data ? formatDatePtBR(aval.data) : new Date().toLocaleDateString('pt-BR')}\n` +
    `📸 *Termo de Imagem e Voz:* Registrado conforme legislação COFFITO/LGPD ✅\n\n` +
    `Qualquer dúvida, estamos à inteira disposição!\n` +
    `📍 *Endereço:* ${clinic.address || 'Av. Coronel José Porfírio, 3025'} - ${clinic.city || 'Altamira/PA'}\n` +
    `Com carinho,\n*Equipe Fisiolys* 🌸✨`;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Contrato de Serviços - ${patientName}`,
        text: msg,
      });
      return { sharedAsFile: true, fileName, phoneUsed: phoneToUse };
    } catch (err: unknown) {
      console.log('Share cancelled, falling back to download + WhatsApp link', err);
    }
  }

  // Fallback: download PDF and open WhatsApp
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);

  const waUrl = phoneToUse
    ? `https://api.whatsapp.com/send?phone=${phoneToUse}&text=${encodeURIComponent(msg)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

  window.open(waUrl, '_blank');
  return { sharedAsFile: false, fileName, phoneUsed: phoneToUse };
}

/**
 * Generates an Annual Income Tax (IRPF) Declaration PDF for a Patient
 */
export async function generatePatientAnnualReport(
  patient: any,
  appointments: any[],
  clinic: Partial<ClinicConfig> = {},
  year: string = new Date().getFullYear().toString()
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // Header Banner
  doc.setFillColor(28, 36, 32);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setFillColor(208, 167, 59);
  doc.rect(margin, y + 24, contentWidth, 1.2, 'F');

  doc.setTextColor(250, 247, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FISIOLYS FISIOTERAPIA & PILATES', margin + 6, y + 9);

  doc.setTextColor(208, 167, 59);
  doc.setFontSize(8.5);
  doc.text(`DECLARAÇÃO ANUAL DE QUITAÇÃO DE DESPESAS DE SAÚDE • ANO-BASE ${year}`, margin + 6, y + 15.5);

  doc.setTextColor(190, 205, 195);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `Para fins de comprovação junto à Secretaria da Receita Federal do Brasil (IRPF)`,
    margin + 6,
    y + 20.5
  );

  y += 32;

  // Professional Issuer Block
  const manager = clinic.managerName || 'Dra. Elays Marinho';
  const crefito = clinic.managerCrefito || 'CREFITO-12 / 208058';
  const doctorCpf = getDoctorCpf(clinic.managerCpf || DEFAULT_DOCTOR_CPF);

  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(210, 225, 215);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(28, 36, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PROFISSIONAL RESPONSÁVEL / PRESTADORA DE SERVIÇOS', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 75, 65);
  doc.text(`Nome: ${manager} • Inscrição: ${crefito} • CPF: ${doctorCpf}`, margin + 4, y + 10.5);
  doc.text(`Clínica: ${clinic.name || 'Fisiolys Fisioterapia e Pilates'} • CNPJ/Endereço: ${clinic.address || 'Av. Coronel José Porfírio, 3025'} - ${clinic.city || 'Altamira/PA'}`, margin + 4, y + 15.5);

  y += 26;

  // Patient Declaration Text
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(210, 225, 215);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setTextColor(28, 36, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DECLARAMOS QUE O(A) PACIENTE:', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(40, 55, 45);
  const pCpfText = patient.cpf ? `inscrito(a) no CPF nº ${patient.cpf}` : 'devidamente identificado(a) em prontuário';
  doc.text(
    `Declaramos para os devidos fins de dedução em Declaração de Ajuste Anual do Imposto sobre a Renda da Pessoa Física (IRPF), que ${patient.name}, ${pCpfText}, realizou sessões de tratamento fisioterapêutico e pilates cinesiológico na clínica FISIOLYS ao longo do ano de ${year}, tendo quitado integralmente os valores discriminados abaixo:`,
    margin + 4,
    y + 11,
    { maxWidth: contentWidth - 8 }
  );

  y += 30;

  // Appointments Table
  let totalQuitado = 0;
  doc.setFillColor(28, 36, 32);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(250, 247, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Data', margin + 3, y + 4.8);
  doc.text('Procedimento / Especialidade', margin + 28, y + 4.8);
  doc.text('Forma Pgto', margin + 105, y + 4.8);
  doc.text('Recibo Nº', margin + 130, y + 4.8);
  doc.text('Valor (R$)', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  y += 7;

  appointments.forEach((appt, idx) => {
    if (appt.status === 'cancelado') return;
    const price = appt.servicePrice || 0;
    totalQuitado += price;

    doc.setFillColor(idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255, idx % 2 === 0 ? 250 : 255);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setDrawColor(230, 235, 232);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    doc.setTextColor(50, 65, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(formatDatePtBR(appt.date), margin + 3, y + 4.2);
    doc.text((appt.serviceName || 'Fisioterapia').slice(0, 42), margin + 28, y + 4.2);
    doc.text((appt.paymentMethod || 'PIX').toUpperCase(), margin + 105, y + 4.2);
    doc.text(`REC-${appt.id.slice(0, 6).toUpperCase()}`, margin + 130, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(price.toFixed(2).replace('.', ','), pageWidth - margin - 3, y + 4.2, { align: 'right' });

    y += 6;
  });

  // Total Row
  doc.setFillColor(208, 167, 59);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(28, 36, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`TOTAL GERAL QUITADO NO ANO DE ${year}:`, margin + 4, y + 5.5);
  doc.text(formatCurrency(totalQuitado), pageWidth - margin - 4, y + 5.5, { align: 'right' });

  y += 20;

  // Signature Block
  const sigUrl = clinic.managerSignatureUrl || getProfessionalSignature();
  if (sigUrl) {
    try {
      doc.addImage(sigUrl, 'PNG', pageWidth / 2 - 25, y - 6, 50, 16);
    } catch (e) {}
  }

  doc.setDrawColor(180, 195, 185);
  doc.line(pageWidth / 2 - 40, y + 10, pageWidth / 2 + 40, y + 10);

  doc.setTextColor(28, 36, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(manager, pageWidth / 2, y + 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 105, 95);
  doc.text(`${crefito} • CPF: ${doctorCpf}`, pageWidth / 2, y + 18, { align: 'center' });
  doc.text(`Altamira/PA, ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, y + 22, { align: 'center' });

  // Footer
  doc.setFillColor(28, 36, 32);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
  doc.setTextColor(245, 238, 211);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    `Fisiolys Fisioterapia e Pilates • Av. Coronel José Porfírio, 3025 - Altamira/PA • Tel: ${clinic.phone || '(93) 99126-5006'}`,
    pageWidth / 2,
    pageHeight - 3,
    { align: 'center' }
  );

  return doc;
}

