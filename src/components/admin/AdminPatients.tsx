import React, { useState } from 'react';
import { Patient, Appointment, ClinicConfig } from '../../types';
import { formatDatePtBR, formatCurrency } from '../../utils/qrUtils';
import { api } from '../../services/api';
import {
  Search,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  FileText,
  ChevronRight,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  IdCard,
  Filter,
  RefreshCw,
  Printer,
  FileCheck,
  Download,
  Share2,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface AdminPatientsProps {
  patients: Patient[];
  appointments: Appointment[];
  clinic?: ClinicConfig;
  onReload?: () => void;
}

export const AdminPatients: React.FC<AdminPatientsProps> = ({ patients, appointments, clinic, onReload }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'with_cpf' | 'high_attendance' | 'has_faltas'>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastMarkedAppt, setLastMarkedAppt] = useState<Appointment | null>(null);
  
  // Delete Patient State
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [deleteWithAppointments, setDeleteWithAppointments] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper function to strip non-alphanumeric characters for flexible CPF/phone matching
  const cleanStr = (str?: string) => (str ? str.replace(/\D/g, '') : '');

  const filteredPatients = patients.filter((p) => {
    const rawSearch = searchTerm.trim().toLowerCase();
    const cleanedSearch = cleanStr(searchTerm);

    // Matches
    const matchesName = p.name.toLowerCase().includes(rawSearch);
    const matchesEmail = p.email ? p.email.toLowerCase().includes(rawSearch) : false;
    const matchesNotes = p.notes ? p.notes.toLowerCase().includes(rawSearch) : false;
    
    // CPF matching (both formatted and unformatted digits)
    const matchesCpfRaw = p.cpf ? p.cpf.toLowerCase().includes(rawSearch) : false;
    const matchesCpfClean = p.cpf && cleanedSearch.length > 0 ? cleanStr(p.cpf).includes(cleanedSearch) : false;

    // Phone matching (both formatted and digits only)
    const matchesPhoneRaw = p.phone.includes(rawSearch);
    const matchesPhoneClean = cleanedSearch.length > 0 ? cleanStr(p.phone).includes(cleanedSearch) : false;

    const matchesSearch = rawSearch === '' || matchesName || matchesEmail || matchesNotes || matchesCpfRaw || matchesCpfClean || matchesPhoneRaw || matchesPhoneClean;

    // Secondary category filters
    if (!matchesSearch) return false;

    const patientAppts = appointments.filter(
      (a) => a.patientPhone === p.phone || a.patientName.toLowerCase() === p.name.toLowerCase()
    );
    const totalPresencas = patientAppts.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca').length || p.totalSessions || 0;
    const totalFaltas = patientAppts.filter(a => a.status === 'falta' || a.attendanceStatus === 'falta').length || p.totalFaltas || 0;
    const totalValid = totalPresencas + totalFaltas;
    const assiduidade = totalValid > 0 ? Math.round((totalPresencas / totalValid) * 100) : 100;

    if (selectedFilter === 'with_cpf') return Boolean(p.cpf && p.cpf.trim().length > 0);
    if (selectedFilter === 'high_attendance') return assiduidade >= 80;
    if (selectedFilter === 'has_faltas') return totalFaltas > 0;

    return true;
  });

  // Get appointments history for selected patient
  const patientAppointments = selectedPatient
    ? appointments.filter(
        (a) =>
          a.patientPhone === selectedPatient.phone ||
          a.patientName.toLowerCase() === selectedPatient.name.toLowerCase()
      )
    : [];

  const completedPatientAppointments = patientAppointments.filter(
    (a) => a.status === 'concluido' || a.attendanceStatus === 'presenca'
  );

  // Generate Individual Session Attendance Receipt PDF
  const handleGenerateAttendancePDF = (patient: Patient, appt: Appointment) => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para emitir o comprovante em PDF.');
      return;
    }

    const nowStr = new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const nowDateTime = new Date().toLocaleString('pt-BR');
    const protocolNumber = `ATD-${appt.id.replace(/\D/g, '').slice(0, 6) || Math.floor(100000 + Math.random() * 900000)}`;

    const clinicName = clinic?.name || 'Clínica Dra. Elays Marinho';
    const clinicTagline = clinic?.tagline || 'Fisioterapia Pélvica, Obstétrica & Studio Pilates';
    const clinicAddress = clinic?.address ? `${clinic.address}, ${clinic.city || 'São Paulo - SP'}` : 'São Paulo - SP';
    const clinicPhone = clinic?.phone || clinic?.whatsapp || '(11) 99999-9999';
    const managerName = clinic?.managerName || 'Dra. Elays Marinho';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comprovante de Atendimento - ${patient.name}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          @media print {
            body { margin: 0; padding: 0; background: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; font-size: 13px; }
            .no-print { display: none !important; }
            .document-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #f8fafc;
            padding: 24px;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            line-height: 1.5;
          }
          .document-card {
            background: #ffffff;
            max-width: 760px;
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            padding: 36px 44px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
            position: relative;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #31523D;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .clinic-brand {
            display: flex;
            flex-direction: column;
          }
          .clinic-name {
            font-size: 22px;
            font-weight: 800;
            color: #31523D;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .clinic-specialty {
            font-size: 13px;
            font-weight: 700;
            color: #D0A73B;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-top: 4px;
          }
          .clinic-meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 6px;
            line-height: 1.4;
          }
          .protocol-badge {
            text-align: right;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px 14px;
            border-radius: 10px;
          }
          .protocol-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
          }
          .protocol-code {
            font-size: 13px;
            font-weight: 800;
            font-family: monospace;
            color: #31523D;
            margin-top: 2px;
          }
          
          .doc-title-container {
            text-align: center;
            margin-bottom: 24px;
          }
          .doc-title {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
            padding: 6px 16px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            display: inline-block;
          }
          
          .section-title {
            font-size: 12px;
            font-weight: 800;
            color: #31523D;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 18px;
            margin-bottom: 8px;
            border-left: 3px solid #D0A73B;
            padding-left: 8px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 18px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 18px;
            margin-bottom: 16px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-item.full {
            grid-column: span 2;
          }
          .info-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .info-value {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 2px;
          }
          
          .declaration-box {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 18px;
            margin: 20px 0;
            font-size: 12.5px;
            line-height: 1.65;
            text-align: justify;
            color: #334155;
          }
          
          .status-pill {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 800;
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #86efac;
          }

          .footer {
            margin-top: 36px;
            padding-top: 18px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .emission-info {
            font-size: 10px;
            color: #94a3b8;
            line-height: 1.5;
          }
          .signature-block {
            text-align: center;
            width: 240px;
          }
          .signature-line {
            border-top: 1.5px solid #0f172a;
            margin-bottom: 6px;
          }
          .signature-name {
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
          }
          .signature-title {
            font-size: 10px;
            color: #64748b;
          }
          
          .btn-print-bar {
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
          }
          .btn-print {
            background: #31523D;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            font-size: 12px;
            font-weight: 800;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          .btn-print:hover {
            background: #243f2f;
          }
          .btn-close {
            background: #e2e8f0;
            color: #334155;
            border: none;
            padding: 10px 16px;
            font-size: 12px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="btn-print-bar no-print">
          <button class="btn-print" onclick="window.print()">
            🖨️ Imprimir / Salvar em PDF
          </button>
          <button class="btn-close" onclick="window.close()">
            ✕ Fechar
          </button>
        </div>

        <div class="document-card">
          <div class="header">
            <div class="clinic-brand">
              <h1 class="clinic-name">${clinicName}</h1>
              <div class="clinic-specialty">${clinicTagline}</div>
              <div class="clinic-meta">
                Responsável Técnica: <strong>${managerName}</strong> (CREFITO-3 / Fisioterapia)<br/>
                ${clinicAddress} • WhatsApp: ${clinicPhone}
              </div>
            </div>
            <div class="protocol-badge">
              <div class="protocol-label">Protocolo de Atendimento</div>
              <div class="protocol-code">${protocolNumber}</div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Emissão: ${nowDateTime}</div>
            </div>
          </div>

          <div class="doc-title-container">
            <div class="doc-title">
              Comprovante & Declaração de Atendimento
            </div>
          </div>

          <div class="section-title">1. Identificação da(o) Paciente</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Nome Completo</span>
              <span class="info-value">${patient.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">CPF</span>
              <span class="info-value">${patient.cpf || 'Não informado / Em cadastro'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Telefone / WhatsApp</span>
              <span class="info-value">${patient.phone}</span>
            </div>
            <div class="info-item">
              <span class="info-label">E-mail</span>
              <span class="info-value">${patient.email || 'Não informado'}</span>
            </div>
          </div>

          <div class="section-title">2. Dados da Sessão Realizada</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Procedimento / Especialidade</span>
              <span class="info-value">${appt.serviceName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Data do Atendimento</span>
              <span class="info-value">${formatDatePtBR(appt.date)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Horário de Início / Duração</span>
              <span class="info-value">${appt.time} hs (${appt.durationMinutes || 50} min)</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status da Presença</span>
              <span class="info-value">
                <span class="status-pill">✓ SESSÃO CONCLUÍDA & PRESENÇA CONFIRMADA</span>
              </span>
            </div>
            ${appt.servicePrice ? `
              <div class="info-item">
                <span class="info-label">Valor do Atendimento</span>
                <span class="info-value">${formatCurrency(appt.servicePrice)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Modalidade / Pagamento</span>
                <span class="info-value">${appt.paymentMethod ? appt.paymentMethod.toUpperCase() : 'Atendimento Registrado'}</span>
              </div>
            ` : ''}
            ${(appt.notes || patient.notes) ? `
              <div class="info-item full">
                <span class="info-label">Observações Clínicas / Prontuário</span>
                <span class="info-value" style="font-weight: 500; font-style: italic; color: #475569;">
                  "${appt.notes || patient.notes}"
                </span>
              </div>
            ` : ''}
          </div>

          <div class="declaration-box">
            Declaramos para os devidos fins de comprovação, acompanhamento de tratamento de saúde e/ou justificativa legal de comparecimento que a(o) paciente acima identificada(o) compareceu e realizou atendimento fisioterapêutico/pilates especializado nesta unidade clínica na data e horário supracitados.
          </div>

          <div class="footer">
            <div class="emission-info">
              Documento emitido eletronicamente pelo Sistema de Prontuários da Clínica.<br/>
              Data e hora de emissão: ${nowDateTime}<br/>
              Código de Autenticidade: ${protocolNumber}
            </div>

            <div class="signature-block">
              <div style="height: 32px;"></div>
              <div class="signature-line"></div>
              <div class="signature-name">${managerName}</div>
              <div class="signature-title">Fisioterapeuta • Responsável Técnica</div>
              <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${nowStr}</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Generate Full Multi-Session Attendance Declaration PDF
  const handleGenerateFullHistoryPDF = (patient: Patient, appts: Appointment[]) => {
    const printWindow = window.open('', '_blank', 'width=880,height=900');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no seu navegador para emitir o relatório em PDF.');
      return;
    }

    const attendedAppts = appts.filter((a) => a.status === 'concluido' || a.attendanceStatus === 'presenca');
    const nowStr = new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const nowDateTime = new Date().toLocaleString('pt-BR');
    const clinicName = clinic?.name || 'Clínica Dra. Elays Marinho';
    const clinicTagline = clinic?.tagline || 'Fisioterapia Pélvica, Obstétrica & Studio Pilates';
    const clinicAddress = clinic?.address ? `${clinic.address}, ${clinic.city || 'São Paulo - SP'}` : 'São Paulo - SP';
    const clinicPhone = clinic?.phone || clinic?.whatsapp || '(11) 99999-9999';
    const managerName = clinic?.managerName || 'Dra. Elays Marinho';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Declaração de Frequência & Histórico de Sessões - ${patient.name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          @media print {
            body { margin: 0; padding: 0; background: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; font-size: 12px; }
            .no-print { display: none !important; }
            .document-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #f8fafc;
            padding: 24px;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .document-card {
            background: #ffffff;
            max-width: 800px;
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            padding: 36px 44px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #31523D;
            padding-bottom: 18px;
            margin-bottom: 20px;
          }
          .clinic-name { font-size: 20px; font-weight: 800; color: #31523D; margin: 0; }
          .clinic-specialty { font-size: 12px; font-weight: 700; color: #D0A73B; text-transform: uppercase; margin-top: 3px; }
          .clinic-meta { font-size: 11px; color: #64748b; margin-top: 4px; }
          
          .doc-title-container { text-align: center; margin-bottom: 20px; }
          .doc-title {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            padding: 6px 16px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            display: inline-block;
          }
          
          table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
          th { background: #31523D; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: 700; text-transform: uppercase; font-size: 10px; }
          td { border-bottom: 1px solid #e2e8f0; padding: 7px 10px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; text-transform: uppercase; background: #dcfce7; color: #15803d; }
          
          .footer {
            margin-top: 36px;
            padding-top: 18px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .btn-print {
            background: #31523D;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            font-size: 12px;
            font-weight: 800;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px;">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar Relatório em PDF</button>
        </div>

        <div class="document-card">
          <div class="header">
            <div>
              <h1 class="clinic-name">${clinicName}</h1>
              <div class="clinic-specialty">${clinicTagline}</div>
              <div class="clinic-meta">${clinicAddress} • ${clinicPhone}</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div><strong>Paciente:</strong> ${patient.name}</div>
              <div><strong>CPF:</strong> ${patient.cpf || 'Não informado'}</div>
              <div><strong>Emissão:</strong> ${nowDateTime}</div>
            </div>
          </div>

          <div class="doc-title-container">
            <div class="doc-title">Declaração & Histórico de Frequência de Tratamento</div>
          </div>

          <p style="font-size: 12px; line-height: 1.6; color: #334155;">
            Declaramos para os devidos fins que a(o) paciente <strong>${patient.name}</strong>${patient.cpf ? `, portador(a) do CPF nº ${patient.cpf}` : ''}, realizou um total de <strong>${attendedAppts.length} sessão(ões)</strong> de fisioterapia/pilates nesta clínica, conforme cronograma detalhado a seguir:
          </p>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Data</th>
                <th>Horário</th>
                <th>Especialidade / Serviço</th>
                <th>Status</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${attendedAppts.map((a, idx) => `
                <tr>
                  <td><strong>${idx + 1}</strong></td>
                  <td><strong>${formatDatePtBR(a.date)}</strong></td>
                  <td>${a.time} hs</td>
                  <td>${a.serviceName}</td>
                  <td><span class="badge">Presença Confirmada</span></td>
                  <td style="text-align: right;">${a.servicePrice ? formatCurrency(a.servicePrice) : 'Incluso'}</td>
                </tr>
              `).join('')}
              ${attendedAppts.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: 15px; color: #94a3b8;">Nenhuma sessão concluída registrada até o momento.</td></tr>' : ''}
            </tbody>
          </table>

          <div class="footer">
            <div style="font-size: 10px; color: #94a3b8;">
              Documento oficial de comprovação de frequência terapêutica.<br/>
              Emitido em: ${nowDateTime}
            </div>
            <div style="text-align: center; width: 220px;">
              <div style="border-top: 1.5px solid #0f172a; margin-top: 30px; padding-top: 4px; font-weight: 800; font-size: 11px;">
                ${managerName}
              </div>
              <div style="font-size: 10px; color: #64748b;">Fisioterapeuta Responsável</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleMarkAttendanceModal = async (appt: Appointment, newStatus: 'concluido' | 'falta' | 'agendado') => {
    setUpdatingId(appt.id);
    try {
      await api.markAttendance(appt.id, newStatus);
      if (newStatus === 'concluido') {
        setLastMarkedAppt(appt);
      }
      if (onReload) onReload();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar presença/falta');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExecuteDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      await api.deletePatient(patientToDelete.id, deleteWithAppointments);
      setPatientToDelete(null);
      setSelectedPatient(null);
      if (onReload) onReload();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar paciente');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar with Search & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="sm:flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800">Prontuários & Cadastro de Pacientes</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                {filteredPatients.length} paciente(s)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Localização instantânea por <strong>Nome, CPF, Telefone ou Anotações do Prontuário</strong> com emissão de comprovantes em PDF.
            </p>
          </div>

          {/* Real-time Search Input */}
          <div className="mt-3 sm:mt-0 relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-teal-600" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF (ex: 341.892) ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 font-medium placeholder:text-slate-400 shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs no-scrollbar">
          <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3 text-slate-500" />
            <span>Filtros:</span>
          </span>

          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({patients.length})
          </button>

          <button
            onClick={() => setSelectedFilter('with_cpf')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedFilter === 'with_cpf'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <IdCard className="w-3.5 h-3.5 text-[#D0A73B]" />
            <span>Com CPF</span>
          </button>

          <button
            onClick={() => setSelectedFilter('high_attendance')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedFilter === 'high_attendance'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Alta Frequência (≥80%)</span>
          </button>

          <button
            onClick={() => setSelectedFilter('has_faltas')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              selectedFilter === 'has_faltas'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Com Faltas</span>
          </button>

          {searchTerm && (
            <span className="ml-auto text-[11px] text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
              Filtrado por: "{searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* Patient List Grid */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">Nenhum prontuário encontrado</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não encontramos nenhum paciente correspondente à busca "{searchTerm}". Verifique o nome ou número de CPF digitado.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedFilter('all'); }}
            className="px-4 py-2 bg-[#31523D] text-white rounded-xl text-xs font-bold hover:bg-[#25402e] transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Limpar Filtro e Mostrar Todos</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatients.map((patient) => {
            const patientAppts = appointments.filter(
              (a) => a.patientPhone === patient.phone || a.patientName.toLowerCase() === patient.name.toLowerCase()
            );
            const totalPresencas = patientAppts.filter(a => a.status === 'concluido' || a.attendanceStatus === 'presenca').length || patient.totalSessions || 0;
            const totalFaltas = patientAppts.filter(a => a.status === 'falta' || a.attendanceStatus === 'falta').length || patient.totalFaltas || 0;
            const totalValid = totalPresencas + totalFaltas;
            const assiduidade = totalValid > 0 ? Math.round((totalPresencas / totalValid) * 100) : 100;
            const lastCompletedAppt = patientAppts.find(a => a.status === 'concluido' || a.attendanceStatus === 'presenca');

            return (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-teal-500 cursor-pointer shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                        {patient.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-teal-600 shrink-0" />
                          <span>{patient.phone}</span>
                        </span>

                        {patient.cpf && (
                          <span className="flex items-center space-x-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                            <IdCard className="w-3 h-3 text-[#31523D] shrink-0" />
                            <span>CPF: {patient.cpf}</span>
                          </span>
                        )}

                        {patient.email && (
                          <span className="hidden sm:flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{patient.email}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="px-3 py-1 bg-[#31523D] text-[#D0A73B] font-extrabold rounded-full text-xs border border-[#D0A73B]/30 shrink-0 shadow-2xs">
                      {assiduidade}% Frequência
                    </span>
                  </div>

                  {/* Presence vs Absence Stats */}
                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <span className="text-emerald-800 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Presenças</span>
                      </span>
                      <strong className="text-emerald-900 font-extrabold text-sm">{totalPresencas}</strong>
                    </div>

                    <div className="bg-rose-50 p-2 rounded-xl border border-rose-100 flex items-center justify-between">
                      <span className="text-rose-800 font-semibold flex items-center space-x-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Faltas</span>
                      </span>
                      <strong className="text-rose-900 font-extrabold text-sm">{totalFaltas}</strong>
                    </div>
                  </div>

                  {patient.notes && (
                    <div className="mt-3 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70 text-slate-700 space-y-0.5">
                      <span className="font-bold text-teal-800 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                        <FileText className="w-3 h-3 text-teal-600" />
                        <span>Prontuário / Observações:</span>
                      </span>
                      <p className="italic line-clamp-2 text-slate-600">
                        "{patient.notes}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>
                      Último atendimento: <strong className="text-slate-700">{patient.lastSessionDate ? formatDatePtBR(patient.lastSessionDate) : 'Recente'}</strong>
                    </span>
                    {lastCompletedAppt && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateAttendancePDF(patient, lastCompletedAppt);
                        }}
                        className="px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Emitir comprovante em PDF da última sessão"
                      >
                        <Printer className="w-2.5 h-2.5 text-teal-700" />
                        <span>Comprovante</span>
                      </button>
                    )}
                  </div>
                  <span className="text-teal-700 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Ver Prontuário</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Patient History & Medical Records Detail Drawer / Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto space-y-4">
            
            <button
              onClick={() => {
                setSelectedPatient(null);
                setLastMarkedAppt(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center font-extrabold text-lg shadow-xs">
                {selectedPatient.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between pr-8">
                  <h3 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-teal-600" />
                    <span>{selectedPatient.phone}</span>
                  </span>
                  {selectedPatient.cpf && (
                    <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <IdCard className="w-3 h-3 text-teal-700" />
                      <span>CPF: {selectedPatient.cpf}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Header for PDF Certificates */}
            {completedPatientAppointments.length > 0 && (
              <div className="bg-[#31523D]/5 border border-[#31523D]/20 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="text-xs">
                  <span className="font-extrabold text-[#31523D] flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#31523D]" />
                    <span>Comprovantes de Comparecimento ({completedPatientAppointments.length} concluída{completedPatientAppointments.length > 1 ? 's' : ''})</span>
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Gere a declaração oficial com carimbo profissional para o paciente.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleGenerateAttendancePDF(selectedPatient, completedPatientAppointments[0])}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold bg-[#31523D] hover:bg-[#25402e] text-[#D0A73B] shadow-2xs border border-[#D0A73B]/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Emitir comprovante em PDF da sessão mais recente"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#D0A73B]" />
                    <span>Último Comprovante</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateFullHistoryPDF(selectedPatient, patientAppointments)}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Emitir histórico completo de frequência"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Histórico Geral</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notification alert if user just marked presence */}
            {lastMarkedAppt && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Presença registrada com sucesso em <strong>{formatDatePtBR(lastMarkedAppt.date)} ({lastMarkedAppt.time} hs)</strong>!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateAttendancePDF(selectedPatient, lastMarkedAppt)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3 h-3" />
                  <span>Gerar Comprovante PDF</span>
                </button>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <p className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500">Primeira Consulta:</span>
                <strong className="text-slate-800">{selectedPatient.firstSessionDate ? formatDatePtBR(selectedPatient.firstSessionDate) : 'N/A'}</strong>
              </p>
              {selectedPatient.email && (
                <p className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">E-mail:</span>
                  <strong className="text-slate-800">{selectedPatient.email}</strong>
                </p>
              )}
              {selectedPatient.notes && (
                <div className="pt-1 space-y-1">
                  <span className="font-bold text-[#31523D] flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>Anotações do Prontuário:</span>
                  </span>
                  <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed font-medium">
                    {selectedPatient.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2 pt-2">
              <h4 className="text-xs font-extrabold uppercase text-[#31523D] tracking-wider">
                Histórico & Presenças ({patientAppointments.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Altere o status ou gere comprovantes
              </span>
            </div>

            {patientAppointments.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum agendamento registrado para este paciente.</p>
            ) : (
              <div className="space-y-3">
                {patientAppointments.map((app) => {
                  const isPresenca = app.status === 'concluido' || app.attendanceStatus === 'presenca';
                  const isFalta = app.status === 'falta' || app.attendanceStatus === 'falta';

                  return (
                    <div
                      key={app.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-teal-300 transition-all shadow-2xs"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900">{app.serviceName}</p>
                        <p className="text-slate-500 flex items-center space-x-2 mt-0.5">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <strong>{formatDatePtBR(app.date)}</strong>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{app.time} hs</span>
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                        {isPresenca && (
                          <button
                            type="button"
                            onClick={() => handleGenerateAttendancePDF(selectedPatient, app)}
                            className="px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer bg-[#31523D] hover:bg-[#25402e] text-[#D0A73B] shadow-2xs border border-[#D0A73B]/30"
                            title="Gerar Comprovante de Atendimento em PDF"
                          >
                            <Printer className="w-3 h-3 text-[#D0A73B]" />
                            <span>Comprovante PDF</span>
                          </button>
                        )}

                        <button
                          disabled={updatingId === app.id}
                          onClick={() => handleMarkAttendanceModal(app, 'concluido')}
                          className={`px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer ${
                            isPresenca
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Presença</span>
                        </button>

                        <button
                          disabled={updatingId === app.id}
                          onClick={() => handleMarkAttendanceModal(app, 'falta')}
                          className={`px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer ${
                            isFalta
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Falta</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPatientToDelete(selectedPatient)}
                className="px-3.5 py-2 rounded-xl text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center space-x-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Deletar Paciente</span>
              </button>

              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setLastMarkedAppt(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Excluir Cadastro do Paciente</h3>
                <p className="text-xs text-rose-600 font-bold">Esta ação é irreversível.</p>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-2xl text-xs space-y-1.5 text-slate-800">
              <p>
                Deseja realmente excluir o(a) paciente <strong>{patientToDelete.name}</strong> ({patientToDelete.phone})?
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="chk-del-patient-appts"
                checked={deleteWithAppointments}
                onChange={(e) => setDeleteWithAppointments(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
              />
              <label htmlFor="chk-del-patient-appts" className="text-xs font-bold text-slate-700 cursor-pointer">
                Excluir também todos os agendamentos deste paciente na agenda
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDeletePatient}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Deletar Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


