import { CrmLead } from '../types';

/**
 * Utility to export CRM Leads to a clean, Excel-compatible CSV file with UTF-8 BOM.
 */
export function exportLeadsToCsv(leads: CrmLead[], filenamePrefix = 'leads_fisiolys_crm'): void {
  if (!leads || leads.length === 0) {
    alert("Não há leads para exportar.");
    return;
  }

  // Headers
  const headers = [
    'ID',
    'Nome Completo',
    'Telefone',
    'Protocolo de Interesse',
    'Status no Funil',
    'Prioridade',
    'Origem do Contato',
    'Data de Cadastro',
    'Observações / Notas Clínicas'
  ];

  const escapeCsv = (str: string | undefined | null) => {
    if (!str) return '""';
    const clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${clean}"`;
  };

  const statusLabels: Record<string, string> = {
    novo: 'Novo Lead',
    conversa: 'Em Conversa',
    agendado: 'Agendado',
    paciente: 'Paciente Fisiolys',
    perdido: 'Perdido'
  };

  const priorityLabels: Record<string, string> = {
    alta: 'Alta Prioridade',
    media: 'Média Prioridade',
    baixa: 'Baixa Prioridade'
  };

  const rows = leads.map(l => {
    const statusText = statusLabels[l.status] || l.status;
    const priorityText = priorityLabels[l.prioridade || 'media'] || (l.prioridade || 'Média');
    const dateFormatted = l.criadoEm ? new Date(l.criadoEm).toLocaleDateString('pt-BR') : '';

    return [
      escapeCsv(l.id),
      escapeCsv(l.nome),
      escapeCsv(l.telefone),
      escapeCsv(l.protocolo),
      escapeCsv(statusText),
      escapeCsv(priorityText),
      escapeCsv(l.origem),
      escapeCsv(dateFormatted),
      escapeCsv(l.notas)
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
