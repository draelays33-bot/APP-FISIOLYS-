import { CrmLead, CrmLeadPriority, CrmLeadStatus } from '../types';

export interface ImportedContact {
  nome: string;
  telefone: string;
  email?: string;
  origem: string;
  protocolo?: string;
  notas?: string;
}

/**
 * Checks if the browser supports the native Google Chrome / Android Contact Picker API
 */
export function isContactPickerSupported(): boolean {
  return 'contacts' in navigator && 'ContactsManager' in window && 'select' in (navigator as any).contacts;
}

/**
 * Invokes the native Google Chrome Mobile Contact Picker
 */
export async function pickNativeChromeContacts(): Promise<{ success: boolean; contacts: ImportedContact[]; error?: string }> {
  if (!isContactPickerSupported()) {
    return {
      success: false,
      contacts: [],
      error: 'A API de Seleção de Contatos nativa está disponível principalmente no Google Chrome no celular (Android). Você pode usar a importação por vCard/CSV ou colar contatos.'
    };
  }

  try {
    const props = ['name', 'tel', 'email'];
    const opts = { multiple: true };
    const rawContacts = await (navigator as any).contacts.select(props, opts);

    if (!rawContacts || rawContacts.length === 0) {
      return { success: true, contacts: [] };
    }

    const parsed: ImportedContact[] = rawContacts.map((c: any) => {
      const name = Array.isArray(c.name) ? c.name[0] : c.name || 'Contato do Celular';
      const rawTel = Array.isArray(c.tel) ? c.tel[0] : c.tel || '';
      const email = Array.isArray(c.email) ? c.email[0] : c.email || '';
      
      // Clean phone number
      const cleanPhone = cleanPhoneNumber(rawTel);

      return {
        nome: name,
        telefone: cleanPhone || rawTel,
        email: email || undefined,
        origem: 'Agenda do Celular (Chrome)',
        protocolo: 'Pilates clássico',
        notas: 'Importado via seleção direta no Google Chrome'
      };
    }).filter((c: ImportedContact) => c.nome || c.telefone);

    return { success: true, contacts: parsed };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: true, contacts: [] };
    }
    return {
      success: false,
      contacts: [],
      error: err.message || 'Não foi possível acessar a agenda do celular.'
    };
  }
}

/**
 * Cleans phone number to standard Brazilian format (93) 9XXXX-XXXX or similar
 */
export function cleanPhoneNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  
  // If starts with 55 and has 12 or 13 digits, strip 55
  let clean = digits;
  if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
    clean = clean.slice(2);
  }

  if (clean.length === 11) {
    // (DD) 9XXXX-XXXX
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    // (DD) XXXX-XXXX
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  } else if (clean.length === 9) {
    // 9XXXX-XXXX
    return `(93) ${clean.slice(0, 5)}-${clean.slice(5)}`;
  } else if (clean.length === 8) {
    return `(93) 9${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  
  return raw;
}

/**
 * Parses vCard (.vcf) files exported from WhatsApp or Google Contacts
 */
export function parseVCardText(vcardText: string): ImportedContact[] {
  const contacts: ImportedContact[] = [];
  const cards = vcardText.split(/BEGIN:VCARD/i);

  for (const card of cards) {
    if (!card.trim()) continue;

    let name = '';
    let tel = '';
    let email = '';
    let note = '';

    const lines = card.split(/\r?\n/);
    for (const line of lines) {
      if (line.toUpperCase().startsWith('FN:')) {
        name = line.substring(3).trim();
      } else if (!name && line.toUpperCase().startsWith('N:')) {
        const parts = line.substring(2).split(';');
        name = `${parts[1] || ''} ${parts[0] || ''}`.trim();
      } else if (line.toUpperCase().startsWith('TEL') && !tel) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          tel = cleanPhoneNumber(line.substring(colonIdx + 1).trim());
        }
      } else if (line.toUpperCase().startsWith('EMAIL') && !email) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          email = line.substring(colonIdx + 1).trim();
        }
      } else if (line.toUpperCase().startsWith('NOTE:')) {
        note = line.substring(5).trim();
      }
    }

    if (name || tel) {
      contacts.push({
        nome: name || 'Contato WhatsApp / Google',
        telefone: tel,
        email: email || undefined,
        origem: 'WhatsApp / Google Contatos (vCard)',
        protocolo: 'Pilates clássico',
        notas: note || 'Importado via arquivo de contatos vCard'
      });
    }
  }

  return contacts;
}

/**
 * Parses simple CSV or pasted contact text: "Nome, Telefone, Protocolo"
 */
export function parsePastedContacts(text: string): ImportedContact[] {
  const lines = text.split(/\r?\n/);
  const contacts: ImportedContact[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if comma or semicolon separated
    const parts = trimmed.includes(';') ? trimmed.split(';') : trimmed.includes(',') ? trimmed.split(',') : trimmed.split('\t');
    
    if (parts.length >= 2) {
      const nome = parts[0].trim();
      const telefone = cleanPhoneNumber(parts[1].trim());
      const protocolo = parts[2]?.trim() || 'Pilates clássico';
      const notas = parts[3]?.trim() || 'Importado via lista de contatos';

      if (nome && (telefone || parts[1])) {
        contacts.push({
          nome,
          telefone: telefone || parts[1].trim(),
          origem: 'WhatsApp / Lista Rápida',
          protocolo,
          notas
        });
      }
    } else {
      // Just a phone or name
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length >= 8) {
        contacts.push({
          nome: `Lead WhatsApp (${cleanPhoneNumber(trimmed)})`,
          telefone: cleanPhoneNumber(trimmed),
          origem: 'WhatsApp Rápido',
          protocolo: 'Pilates clássico'
        });
      }
    }
  }

  return contacts;
}

/**
 * Exports current CRM leads to standard vCard (.vcf) file for 1-touch import back to mobile phone
 */
export function exportLeadsToVCard(leads: CrmLead[], filename = 'Contatos_Fisiolys_Leads.vcf') {
  const cards = leads.map(l => {
    const cleanTel = l.telefone.replace(/\D/g, '');
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${l.nome} (Fisiolys)`,
      `N:${l.nome};;;;`,
      `TEL;TYPE=CELL,VOICE:${l.telefone}`,
      `NOTE:Lead Fisiolys - Protocolo: ${l.protocolo} | Origem: ${l.origem}`,
      `CATEGORIES:Fisiolys,Pilates,Fisioterapia,Leads`,
      'END:VCARD'
    ].join('\r\n');
  }).join('\r\n');

  const blob = new Blob([cards], { type: 'text/vcard;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
