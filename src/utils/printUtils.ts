import { ClinicConfig } from '../types';
import { DEFAULT_DOCTOR_CPF, getDoctorCpf } from './securityUtils';

export interface ReceiptData {
  title: string;
  patientName: string;
  patientPhone: string;
  patientCpf?: string;
  serviceName: string;
  amount: number;
  date: string;
  paymentMethod: string;
  receiptNumber: string;
  status?: 'concluido' | 'pendente';
  notes?: string;
}

const formatDatePtBR = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

/**
 * Builds the complete HTML string for the official receipt matching Fisiolys stationery
 */
export function buildReceiptHTML(receipt: ReceiptData, clinic: Partial<ClinicConfig>, docCpf?: string): string {
  const activeDoctorCpf = docCpf || getDoctorCpf(clinic.managerCpf || DEFAULT_DOCTOR_CPF);
  const nowStr = new Date().toLocaleDateString('pt-BR');
  const clinicName = clinic.name || 'Fisiolys Fisioterapia e Pilates';
  const managerName = clinic.managerName || 'Dra. Elays Marinho';
  const crefito = clinic.managerCrefito || 'CREFITO-12';
  const address = clinic.address || 'Av. Coronel José Porfírio, nº 3025 - Recreio';
  const city = clinic.city || 'Altamira - Pará';
  const phone = clinic.phone || '(93) 99126-5006';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo Oficial - ${receipt.patientName} - ${receipt.receiptNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,800;1,600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @media print {
      body { margin: 0; padding: 12px; background: #ffffff !important; font-size: 11.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-container { box-shadow: none !important; border: 1.5px solid #23372B !important; max-width: 100% !important; padding: 24px !important; }
    }
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a2920;
      background: #f1f5f3;
      padding: 30px 15px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    .no-print-bar {
      width: 100%;
      max-width: 680px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .btn-action {
      background: #23372B;
      color: #F5EED3;
      border: 1px solid #D0A73B;
      padding: 10px 20px;
      font-weight: 700;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(35, 55, 43, 0.2);
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-action:hover {
      background: #18271e;
      transform: translateY(-1px);
    }
    .page-container {
      background: #ffffff;
      width: 100%;
      max-width: 680px;
      border: 2px solid #23372B;
      border-radius: 18px;
      padding: 32px 36px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      position: relative;
      overflow: hidden;
    }
    
    /* Top Decorative Corner Motifs */
    .corner-decor-top {
      position: absolute;
      top: 0;
      right: 0;
      width: 130px;
      height: 130px;
      background: radial-gradient(circle at top right, rgba(208, 167, 59, 0.12), transparent 70%);
      pointer-events: none;
    }

    /* Header layout */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #D0A73B;
      padding-bottom: 20px;
      margin-bottom: 24px;
      gap: 16px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-frame {
      width: 68px;
      height: 68px;
      border-radius: 16px;
      background: linear-gradient(135deg, #18271e 0%, #23372B 50%, #31523D 100%);
      border: 2px solid #D0A73B;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      padding: 4px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .brand-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 800;
      color: #1e3325;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #9E7F22;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 2px;
    }
    .header-badge {
      text-align: right;
      flex-shrink: 0;
    }
    .rec-pill {
      background: #23372B;
      color: #F5EED3;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid #D0A73B;
      display: inline-block;
      text-transform: uppercase;
    }
    .date-label {
      font-size: 11px;
      color: #556b5c;
      margin-top: 6px;
      font-weight: 600;
    }

    /* Doctor Identification Banner */
    .doctor-banner {
      background: linear-gradient(135deg, #f7f9f7 0%, #eef3ef 100%);
      border: 1px solid #c9d8ce;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      color: #23372B;
    }
    .doctor-name {
      font-weight: 800;
      font-size: 13px;
      color: #18271e;
    }

    /* Section Title */
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #23372B;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 15px;
      background: #D0A73B;
      border-radius: 2px;
    }

    /* Info Table */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      font-size: 12px;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8e4;
    }
    .info-table td {
      padding: 9px 8px;
    }
    .info-table td.lbl {
      color: #526357;
      font-weight: 600;
      width: 34%;
    }
    .info-table td.val {
      color: #141f18;
      font-weight: 700;
    }

    /* Amount Highlighting Card */
    .amount-card {
      background: linear-gradient(135deg, #edf7f0 0%, #d8eee0 100%);
      border: 2px solid #2e7d4a;
      border-radius: 14px;
      padding: 16px 22px;
      margin: 22px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-label {
      font-size: 12px;
      font-weight: 800;
      color: #174d2b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .amount-figure {
      font-size: 26px;
      font-weight: 900;
      color: #124424;
      font-family: 'Cinzel', serif;
    }

    /* Legal Declaration text */
    .legal-text {
      font-size: 10.5px;
      color: #4b5e51;
      line-height: 1.6;
      background: #fafbfa;
      border-left: 3px solid #D0A73B;
      padding: 10px 14px;
      border-radius: 0 8px 8px 0;
      margin: 18px 0;
      font-style: italic;
    }

    /* Signature Area */
    .signature-container {
      margin-top: 36px;
      padding-top: 18px;
      border-top: 1px dashed #b9cbbf;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
    }
    .signature-left {
      color: #637568;
      line-height: 1.4;
    }
    .signature-right {
      text-align: center;
      width: 250px;
    }
    .signature-line {
      border-top: 1.5px solid #1e3325;
      padding-top: 6px;
      margin-top: 32px;
    }
    .sig-name {
      font-weight: 800;
      color: #141f18;
      font-size: 12px;
    }
    .sig-role {
      font-size: 10px;
      color: #556b5c;
      font-weight: 600;
    }
    .sig-cpf {
      font-size: 10px;
      color: #9E7F22;
      font-weight: 700;
      font-family: monospace;
      margin-top: 2px;
    }

    /* Footer Address & Botanical motif */
    .footer-bar {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #e2e8e4;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #6d8073;
    }
  </style>
</head>
<body>

  <!-- Top Action Bar (Hidden on Print / PDF export) -->
  <div class="no-print-bar no-print">
    <div style="font-size: 12px; font-weight: 700; color: #23372B;">
      🧾 Recibo Pronto para Impressão / PDF
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-action" onclick="window.print()">
        🖨️ Imprimir / Salvar PDF
      </button>
    </div>
  </div>

  <!-- Official Receipt Document Card -->
  <div class="page-container" id="receipt-printable-content">
    <div class="corner-decor-top"></div>

    <!-- Header -->
    <div class="header">
      <div class="brand-left">
        <div class="logo-frame">
          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goldG1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFF5D6" />
                <stop offset="35%" stop-color="#D0A73B" />
                <stop offset="70%" stop-color="#C49B28" />
                <stop offset="100%" stop-color="#7E611D" />
              </linearGradient>
              <linearGradient id="leafG1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#A2C862" />
                <stop offset="100%" stop-color="#4B6E2F" />
              </linearGradient>
            </defs>
            <path d="M 38 25 C 28 35, 25 55, 38 68 C 48 76, 62 70, 60 55 C 58 45, 48 48, 48 52 C 48 58, 56 62, 65 52 C 72 44, 65 30, 52 30 C 44 30, 40 36, 40 42 C 40 50, 52 56, 52 64 C 52 72, 42 76, 34 72" stroke="url(#goldG1)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M 20 75 Q 32 82 45 80" stroke="url(#leafG1)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M 55 80 Q 70 82 82 72" stroke="url(#leafG1)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M 25 74 C 23 70, 28 68, 29 73 Z" fill="url(#leafG1)"/>
            <path d="M 35 79 C 33 75, 38 73, 39 78 Z" fill="url(#leafG1)"/>
            <path d="M 65 78 C 67 73, 72 75, 69 80 Z" fill="url(#leafG1)"/>
            <path d="M 75 74 C 78 70, 82 73, 78 77 Z" fill="url(#leafG1)"/>
          </svg>
        </div>
        <div>
          <h1 class="brand-title">Fisiolys</h1>
          <div class="brand-subtitle">Fisioterapia e Pilates</div>
        </div>
      </div>

      <div class="header-badge">
        <div class="rec-pill">${receipt.receiptNumber}</div>
        <div class="date-label">Emissão: <strong>${nowStr}</strong></div>
      </div>
    </div>

    <!-- Doctor Info Banner -->
    <div class="doctor-banner">
      <div>
        <div class="doctor-name">${managerName}</div>
        <div style="color: #556b5c; font-size: 11px;">Fisioterapeuta Responsável • ${crefito}</div>
      </div>
      <div style="text-align: right;">
        <div>CPF da Profissional: <strong style="color: #18271e; font-family: monospace;">${activeDoctorCpf}</strong></div>
        <div style="color: #556b5c; font-size: 11px;">Tel: ${phone} • Altamira - PA</div>
      </div>
    </div>

    <!-- Main Title -->
    <div class="section-title">
      ${receipt.title}
    </div>

    <!-- Table of Information -->
    <table class="info-table">
      <tr>
        <td class="lbl">Recebemos de (Paciente):</td>
        <td class="val"><strong style="font-size: 13px;">${receipt.patientName}</strong></td>
      </tr>
      ${receipt.patientCpf ? `
      <tr>
        <td class="lbl">CPF do Paciente:</td>
        <td class="val"><span style="font-family: monospace;">${receipt.patientCpf}</span></td>
      </tr>` : ''}
      <tr>
        <td class="lbl">Contato / Telefone:</td>
        <td class="val">${receipt.patientPhone || 'Não informado'}</td>
      </tr>
      <tr>
        <td class="lbl">Referente ao Serviço:</td>
        <td class="val">${receipt.serviceName}</td>
      </tr>
      <tr>
        <td class="lbl">Data de Atendimento / Ref.:</td>
        <td class="val">${formatDatePtBR(receipt.date)}</td>
      </tr>
      <tr>
        <td class="lbl">Forma de Quitação:</td>
        <td class="val">${receipt.paymentMethod}</td>
      </tr>
      <tr>
        <td class="lbl">Status do Pagamento:</td>
        <td class="val"><span style="color: #124424; font-weight: 800;">QUITADO COM SUCESSO</span></td>
      </tr>
    </table>

    <!-- Amount Highlight Box -->
    <div class="amount-card">
      <div class="amount-label">Valor Total Quitado</div>
      <div class="amount-figure">${formatCurrency(receipt.amount)}</div>
    </div>

    <!-- Legal declaration note for IRPF / Medical reimbursement -->
    <div class="legal-text">
      Declaramos para os devidos fins de direito, comprovação fiscal e dedução no Imposto de Renda (IRPF) que recebemos do(a) paciente acima identificado(a) o valor total supramencionado referente a serviços profissionais especializados de Fisioterapia e/ou Pilates.
    </div>

    ${receipt.notes ? `<div style="font-size: 11px; color: #556b5c; margin: 10px 0; font-style: italic;"><strong>Observações:</strong> ${receipt.notes}</div>` : ''}

    <!-- Signature and Authorization Block -->
    <div class="signature-container">
      <div class="signature-left">
        <div><strong>${address}</strong></div>
        <div>${city} • Contato: ${phone}</div>
        <div style="font-size: 9.5px; color: #84968a; margin-top: 3px;">Documento timbrado com validade legal e fiscal.</div>
      </div>

      <div class="signature-right">
        <div class="signature-line">
          <div class="sig-name">${managerName}</div>
          <div class="sig-role">Fisioterapeuta • ${crefito}</div>
          <div class="sig-cpf">CPF: ${activeDoctorCpf}</div>
        </div>
      </div>
    </div>

    <!-- Footer Bar -->
    <div class="footer-bar">
      <span>🌿 ${clinicName}</span>
      <span>Documento gerado eletronicamente em ${nowStr}</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
}

/**
 * Robust print function that works on mobile, desktop, Safari, iPad, and iframes
 */
export function triggerDirectReceiptPrint(receipt: ReceiptData, clinic: Partial<ClinicConfig>, docCpf?: string): void {
  const html = buildReceiptHTML(receipt, clinic, docCpf);

  // Method 1: Invisible Iframe (Best compatibility, no popup blocker trigger)
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.id = 'fisiolys-print-iframe';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.warn('Iframe print error, falling back to window.open', printErr);
          fallbackWindowPrint(html);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 400);
      return;
    }
  } catch (err) {
    console.warn('Iframe approach failed, using popup fallback', err);
  }

  // Method 2: Popup fallback
  fallbackWindowPrint(html);
}

function fallbackWindowPrint(html: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Method 3: Download as HTML file if popups and iframe are both blocked
    downloadReceiptFile(html, 'Recibo_Fisiolys.html');
  }
}

/**
 * Triggers downloading the receipt as a standalone HTML file
 */
export function downloadReceiptFile(htmlContent: string, fileName: string = 'Recibo_Fisiolys.html'): void {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (e) {
    console.error('Error downloading receipt file', e);
  }
}
