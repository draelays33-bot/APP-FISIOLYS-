import React, { useState, useEffect } from 'react';
import { 
  Users, Smartphone, Upload, FileText, Check, X, AlertCircle, 
  Sparkles, Plus, Download, RefreshCw, Share2, Phone, Search, 
  CheckSquare, Calendar, Cloud, LogOut, ArrowRight, UserCheck
} from 'lucide-react';
import { 
  isContactPickerSupported, pickNativeChromeContacts, 
  parseVCardText, parsePastedContacts, exportLeadsToVCard,
  ImportedContact 
} from '../../utils/contactUtils';
import { 
  signInWithGoogleContacts, fetchGoogleContacts, 
  createContactInGoogle, getCachedGoogleToken, 
  logoutGoogle, auth, initGoogleAuth 
} from '../../services/googleContacts';
import { User } from 'firebase/auth';
import { CrmLead } from '../../types';

interface CrmContactSyncModalProps {
  existingLeads: CrmLead[];
  onImportContacts: (contacts: ImportedContact[]) => Promise<void>;
  onClose: () => void;
}

export const CrmContactSyncModal: React.FC<CrmContactSyncModalProps> = ({
  existingLeads,
  onImportContacts,
  onClose
}) => {
  const [activeMode, setActiveMode] = useState<'google' | 'chrome' | 'file' | 'paste' | 'export'>('google');
  const [isMobileSupported, setIsMobileSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Google Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  const [parsedContacts, setParsedContacts] = useState<ImportedContact[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [defaultProtocol, setDefaultProtocol] = useState('Pilates clássico');
  const [searchFilter, setSearchFilter] = useState('');

  // Track if exporting leads to Google Contacts
  const [isExportingToGoogle, setIsExportingToGoogle] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    setIsMobileSupported(isContactPickerSupported());

    // Listen to Firebase Auth state
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setIsGoogleConnected(true);
      },
      () => {
        setGoogleUser(null);
        setIsGoogleConnected(false);
      }
    );

    // If already has cached token or user
    if (auth.currentUser && getCachedGoogleToken()) {
      setGoogleUser(auth.currentUser);
      setIsGoogleConnected(true);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // 1. Google Contacts OAuth Login & Sync
  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { user, accessToken } = await signInWithGoogleContacts();
      setGoogleUser(user);
      setIsGoogleConnected(true);
      
      // Auto fetch contacts after login
      const contacts = await fetchGoogleContacts(accessToken);
      setParsedContacts(contacts);
      setSelectedIndices(contacts.map((_, i) => i));
      setSuccessMessage(`Conta Google conectada com sucesso! ${contacts.length} contatos sincronizados.`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao autenticar com a conta Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchGoogleContactsOnly = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const contacts = await fetchGoogleContacts();
      setParsedContacts(contacts);
      setSelectedIndices(contacts.map((_, i) => i));
      setSuccessMessage(`${contacts.length} contatos do Google carregados com sucesso!`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao carregar contatos do Google.');
      if (err.message?.includes('não conectada') || err.message?.includes('expirada')) {
        setIsGoogleConnected(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setIsGoogleConnected(false);
      setSuccessMessage('Conta Google desconectada.');
    } catch (e) {
      console.error(e);
    }
  };

  // Export Leads from CRM directly into Google Contacts API
  const handleExportLeadsToGoogleContacts = async () => {
    if (!isGoogleConnected) {
      setErrorMessage('Conecte sua conta Google primeiro para exportar os leads.');
      return;
    }
    setIsExportingToGoogle(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let successCount = 0;
    const leadsToExport = existingLeads.filter(l => l.telefone && l.telefone.trim());
    setExportProgress({ current: 0, total: leadsToExport.length });

    try {
      for (let i = 0; i < leadsToExport.length; i++) {
        const lead = leadsToExport[i];
        try {
          await createContactInGoogle({
            nome: lead.nome,
            telefone: lead.telefone,
            email: lead.email,
            notes: `Fisiolys CRM • Procedimento: ${lead.protocolo} • Status: ${lead.status} ${lead.notas ? `• Notas: ${lead.notas}` : ''}`
          });
          successCount++;
        } catch (e) {
          console.warn(`Erro ao exportar contato ${lead.nome}:`, e);
        }
        setExportProgress({ current: i + 1, total: leadsToExport.length });
      }

      setSuccessMessage(`✅ Sucesso! ${successCount} leads da Fisiolys foram salvos diretamente no seu Google Contatos.`);
    } catch (err: any) {
      setErrorMessage(`Erro durante a exportação: ${err.message}`);
    } finally {
      setIsExportingToGoogle(false);
      setExportProgress(null);
    }
  };

  // 2. Chrome Native Contact Picker
  const handlePickFromChrome = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await pickNativeChromeContacts();
      if (res.success && res.contacts.length > 0) {
        setParsedContacts(res.contacts);
        setSelectedIndices(res.contacts.map((_, i) => i));
        setSuccessMessage(`${res.contacts.length} contatos selecionados da agenda.`);
      } else if (!res.success && res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao abrir a agenda de contatos.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. File Upload (.vcf or .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      let contacts: ImportedContact[] = [];
      if (file.name.toLowerCase().endsWith('.vcf') || file.name.toLowerCase().endsWith('.vcard')) {
        contacts = parseVCardText(content);
      } else {
        contacts = parsePastedContacts(content);
      }

      if (contacts.length === 0) {
        setErrorMessage('Nenhum contato válido encontrado no arquivo. Verifique o formato (.vcf ou .csv).');
      } else {
        setParsedContacts(contacts);
        setSelectedIndices(contacts.map((_, i) => i));
        setSuccessMessage(`${contacts.length} contatos importados do arquivo!`);
      }
    };
    reader.readAsText(file);
  };

  // 4. Parse Pasted Text
  const handleParsePasted = () => {
    if (!pasteText.trim()) return;
    const contacts = parsePastedContacts(pasteText);
    if (contacts.length === 0) {
      setErrorMessage('Nenhum contato identificado no texto colado. Use o formato: Nome, (93) 99126-5006');
    } else {
      setErrorMessage(null);
      setParsedContacts(contacts);
      setSelectedIndices(contacts.map((_, i) => i));
      setSuccessMessage(`${contacts.length} contatos identificados.`);
    }
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIndices.length === filteredContacts.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(filteredContacts.map((_, i) => i));
    }
  };

  const toggleSelectOne = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const filteredContacts = parsedContacts.filter(c => 
    c.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.telefone.includes(searchFilter)
  );

  // Check if contact already exists in CRM
  const isAlreadyInCrm = (tel: string) => {
    const clean = tel.replace(/\D/g, '');
    if (!clean) return false;
    return existingLeads.some(l => {
      const lClean = l.telefone.replace(/\D/g, '');
      return lClean && (lClean.includes(clean) || clean.includes(lClean));
    });
  };

  // Final Import to CRM Leads
  const handleConfirmImport = async () => {
    const toImport = parsedContacts
      .filter((_, idx) => selectedIndices.includes(idx))
      .map(c => ({
        ...c,
        protocolo: c.protocolo || defaultProtocol
      }));

    if (toImport.length === 0) {
      setErrorMessage('Selecione ao menos um contato para importar.');
      return;
    }

    setIsLoading(true);
    try {
      await onImportContacts(toImport);
      alert(`🎉 Sucesso! ${toImport.length} contatos foram adicionados como leads no CRM da Fisiolys.`);
      onClose();
    } catch (e) {
      setErrorMessage('Erro ao importar contatos para o CRM.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FAF7F0] rounded-3xl w-full max-w-3xl border border-[#E4DCC8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Top Header */}
        <div className="bg-[#1B2E24] text-[#FAF7F0] p-5 flex items-center justify-between border-b border-[#16251D]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#243F30] text-[#DCC58F] flex items-center justify-center border border-[#B08A3E]/40 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-[#FAF7F0] flex items-center space-x-2">
                <span>Google Contatos & Agenda CRM</span>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#B08A3E] text-white font-bold">
                  Sincronização 2-Vias
                </span>
              </h3>
              <p className="text-xs text-[#C9D1C8]">
                Importe e sincronize contatos da sua conta Google e WhatsApp com o CRM da Clínica Fisiolys.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#C9D1C8] hover:text-white rounded-xl hover:bg-[#20372B] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-3 bg-[#F3EEE2] border-b border-[#E4DCC8] flex flex-wrap gap-2">
          {/* Tab 1: Google Contacts Direct API */}
          <button
            id="tab-sync-google-contacts"
            onClick={() => { setActiveMode('google'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'google' 
                ? 'bg-[#1B2E24] text-[#DCC58F] shadow-xs' 
                : 'bg-white text-[#5B5A52] hover:bg-[#FAF7F0] border border-[#E4DCC8]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-blue-500" />
            <span>Google Contatos (Direto)</span>
          </button>

          {/* Tab 2: Chrome Mobile Direct Touch */}
          <button
            id="tab-sync-chrome-mobile"
            onClick={() => { setActiveMode('chrome'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'chrome' 
                ? 'bg-[#1B2E24] text-[#DCC58F] shadow-xs' 
                : 'bg-white text-[#5B5A52] hover:bg-[#FAF7F0] border border-[#E4DCC8]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#B08A3E]" />
            <span>Toque Direto Celular</span>
          </button>

          {/* Tab 3: File Upload */}
          <button
            id="tab-sync-file-upload"
            onClick={() => { setActiveMode('file'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'file' 
                ? 'bg-[#1B2E24] text-[#DCC58F] shadow-xs' 
                : 'bg-white text-[#5B5A52] hover:bg-[#FAF7F0] border border-[#E4DCC8]'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-[#B08A3E]" />
            <span>Arquivo (.vcf / WhatsApp / CSV)</span>
          </button>

          {/* Tab 4: Paste */}
          <button
            id="tab-sync-paste"
            onClick={() => { setActiveMode('paste'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'paste' 
                ? 'bg-[#1B2E24] text-[#DCC58F] shadow-xs' 
                : 'bg-white text-[#5B5A52] hover:bg-[#FAF7F0] border border-[#E4DCC8]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#B08A3E]" />
            <span>Colar Lista</span>
          </button>

          {/* Tab 5: Export */}
          <button
            id="tab-sync-export"
            onClick={() => { setActiveMode('export'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeMode === 'export' 
                ? 'bg-[#1B2E24] text-[#DCC58F] shadow-xs' 
                : 'bg-white text-[#5B5A52] hover:bg-[#FAF7F0] border border-[#E4DCC8]'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#B08A3E]" />
            <span>Exportar Leads</span>
          </button>
        </div>

        {/* Feedback Messages */}
        <div className="px-5 pt-3">
          {errorMessage && (
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="flex-1">{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="flex-1">{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* ========================================================================= */}
          {/* 1. GOOGLE CONTACTS LIVE API INTEGRATION */}
          {/* ========================================================================= */}
          {activeMode === 'google' && (
            <div className="space-y-4">
              <div className="p-5 bg-white rounded-3xl border border-[#E4DCC8] shadow-xs space-y-4">
                
                {/* Status bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4DCC8]">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                      {/* Official Google G Icon */}
                      <svg className="w-6 h-6" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1B2E24] flex items-center space-x-2">
                        <span>Google People & Contacts API</span>
                        {isGoogleConnected ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Conectado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            Aguardando Conexão
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-[#736B5E]">
                        {googleUser ? `Conta: ${googleUser.email || googleUser.displayName}` : 'Sincronize com a conta Google da Dra. Elays'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {!isGoogleConnected ? (
                      <button
                        id="btn-google-signin-sync"
                        type="button"
                        onClick={handleConnectGoogle}
                        disabled={isLoading}
                        className="px-4 py-2.5 bg-white hover:bg-[#FAF7F0] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#DCC58F] shadow-xs flex items-center space-x-2 cursor-pointer transition-all hover:shadow-sm"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>{isLoading ? 'Conectando...' : 'Conectar com Google'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleFetchGoogleContactsOnly}
                          disabled={isLoading}
                          className="px-3.5 py-2 bg-[#1B2E24] hover:bg-[#243F30] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-[#DCC58F] ${isLoading ? 'animate-spin' : ''}`} />
                          <span>Atualizar Lista</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectGoogle}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Desconectar conta Google"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2-Way Sync Actions Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 bg-[#FAF7F0] rounded-2xl border border-[#E4DCC8] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <ArrowRight className="w-4 h-4 text-emerald-700" />
                        <h5 className="text-xs font-bold text-[#1B2E24]">Google ➔ CRM Fisiolys</h5>
                      </div>
                      <p className="text-[11px] text-[#736B5E] mt-1">
                        Puxa todos os contatos salvos no Google Contatos para cadastrá-los como leads de Pilates & Fisioterapia.
                      </p>
                    </div>
                    <button
                      id="btn-fetch-google-contacts-cta"
                      type="button"
                      onClick={isGoogleConnected ? handleFetchGoogleContactsOnly : handleConnectGoogle}
                      disabled={isLoading}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{isGoogleConnected ? 'Sincronizar Contatos do Google' : 'Conectar e Puxar Contatos'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 bg-[#FAF7F0] rounded-2xl border border-[#E4DCC8] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <ArrowRight className="w-4 h-4 text-[#B08A3E]" />
                        <h5 className="text-xs font-bold text-[#1B2E24]">CRM Fisiolys ➔ Google Contatos</h5>
                      </div>
                      <p className="text-[11px] text-[#736B5E] mt-1">
                        Exporta os {existingLeads.length} leads do CRM direto para sua conta Google com identificador e telefone.
                      </p>
                    </div>
                    <button
                      id="btn-export-leads-to-google-cta"
                      type="button"
                      onClick={isGoogleConnected ? handleExportLeadsToGoogleContacts : handleConnectGoogle}
                      disabled={isExportingToGoogle || isLoading}
                      className="w-full py-2 bg-[#B08A3E] hover:bg-[#96742F] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>
                        {isExportingToGoogle 
                          ? `Enviando (${exportProgress?.current || 0}/${exportProgress?.total || 0})...` 
                          : 'Salvar Leads no Google Contatos'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/80 text-xs text-blue-950 flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Integração Oficial com API do Google (People API):</p>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Seus contatos são sincronizados com segurança usando o protocolo oficial do Google Workspace. Você pode consultar pacientes e disparar mensagens com facilidade.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. CHROME MOBILE CONTACT PICKER */}
          {/* ========================================================================= */}
          {activeMode === 'chrome' && (
            <div className="space-y-4">
              <div className="p-5 bg-white rounded-3xl border border-[#E4DCC8] shadow-xs space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1B2E24]">Agenda Nativa por Toque Direto no Celular</h4>
                    <p className="text-xs text-[#5B5A52] pt-0.5">
                      No Google Chrome no smartphone (Android/iOS), utilize o toque direto para abrir a agenda do aparelho e importar contatos.
                    </p>
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    id="btn-pick-native-chrome-contacts"
                    type="button"
                    onClick={handlePickFromChrome}
                    disabled={isLoading}
                    className="px-4 py-3 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-md border border-[#DCC58F]/50 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-[#DCC58F]" />
                    <span>{isLoading ? 'Abrindo Agenda...' : '📱 Selecionar Contatos do Celular'}</span>
                  </button>

                  <a
                    id="btn-open-google-calendar-mobile"
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 bg-[#243F30] hover:bg-[#2D4E3C] text-[#FAF7F0] text-xs font-bold rounded-xl border border-[#3E6550] flex items-center justify-center space-x-2 shadow-xs transition-all"
                  >
                    <Calendar className="w-4 h-4 text-[#DCC58F]" />
                    <span>📅 Abrir Google Agenda</span>
                  </a>

                  <a
                    id="btn-open-google-contacts-web"
                    href="https://contacts.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] flex items-center justify-center space-x-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-[#B08A3E]" />
                    <span>Abrir Google Contatos Web</span>
                  </a>

                  <button
                    id="btn-quick-export-leads-vcf"
                    type="button"
                    onClick={() => exportLeadsToVCard(existingLeads)}
                    className="px-4 py-2.5 bg-white hover:bg-[#FAF7F0] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#B08A3E]" />
                    <span>Exportar Leads (.vcf)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. FILE UPLOAD (.vcf / .csv) */}
          {/* ========================================================================= */}
          {activeMode === 'file' && (
            <div className="space-y-4">
              <div className="p-6 bg-white rounded-3xl border-2 border-dashed border-[#B08A3E]/60 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F3EEE2] text-[#B08A3E] flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1B2E24]">Importar arquivo de Contatos (.vcf, WhatsApp ou .csv)</h4>
                  <p className="text-xs text-[#736B5E] max-w-md mx-auto pt-1">
                    Exporte seus contatos do Google Contatos (formato vCard / .vcf) ou WhatsApp e selecione o arquivo.
                  </p>
                </div>

                <label className="inline-block px-5 py-2.5 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-md border border-[#DCC58F]/50 cursor-pointer transition-all">
                  <span>Selecionar Arquivo do Dispositivo</span>
                  <input
                    type="file"
                    accept=".vcf,.vcard,.csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. PASTE TEXT */}
          {/* ========================================================================= */}
          {activeMode === 'paste' && (
            <div className="space-y-3 p-5 bg-white rounded-3xl border border-[#E4DCC8]">
              <label className="block text-xs font-bold text-[#1B2E24]">
                Cole contatos copiados do WhatsApp ou lista de pacientes:
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Exemplo:&#10;Maria Fernanda Silva, (93) 99126-5006, Pilates clássico&#10;Carlos Eduardo, 93988776655, Fisioterapia Coluna&#10;Patrícia Lima, 93991234567"
                rows={5}
                className="w-full p-3 rounded-2xl bg-[#FAF7F0] border border-[#E4DCC8] text-xs font-mono focus:ring-2 focus:ring-[#B08A3E] outline-none"
              />
              <button
                type="button"
                onClick={handleParsePasted}
                className="px-4 py-2 bg-[#1B2E24] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Processar Contatos
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. EXPORT TO PHONE / GOOGLE */}
          {/* ========================================================================= */}
          {activeMode === 'export' && (
            <div className="p-5 bg-white rounded-3xl border border-[#E4DCC8] space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#DCC58F]/30 text-[#1B2E24] flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-[#B08A3E]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1B2E24]">Sincronizar Leads do CRM com seu Celular</h4>
                  <p className="text-xs text-[#5B5A52]">
                    Baixe o arquivo de contatos vCard (.vcf) contendo todos os {existingLeads.length} leads do CRM para adicionar à agenda do seu smartphone com 1 toque.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => exportLeadsToVCard(existingLeads)}
                  className="px-5 py-2.5 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-md border border-[#DCC58F]/50 flex items-center space-x-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#DCC58F]" />
                  <span>Baixar Arquivo para Celular (.vcf)</span>
                </button>

                {isGoogleConnected && (
                  <button
                    type="button"
                    onClick={handleExportLeadsToGoogleContacts}
                    disabled={isExportingToGoogle}
                    className="px-5 py-2.5 bg-[#B08A3E] hover:bg-[#96742F] text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>{isExportingToGoogle ? 'Sincronizando...' : 'Enviar direto para o Google Contatos'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PARSED CONTACTS PREVIEW & IMPORT LIST */}
          {/* ========================================================================= */}
          {parsedContacts.length > 0 && (
            <div className="pt-4 border-t border-[#E4DCC8] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-[#1B2E24]">
                    Contatos Identificados ({parsedContacts.length})
                  </h4>
                  <span className="text-xs text-[#736B5E]">
                    {selectedIndices.length} selecionados para importação no CRM
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#736B5E] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filtrar por nome ou telefone..."
                      className="pl-8 pr-3 py-1 bg-white border border-[#E4DCC8] rounded-xl text-xs outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="px-3 py-1.5 bg-[#F3EEE2] text-[#1B2E24] text-xs font-bold rounded-xl border border-[#E4DCC8] cursor-pointer hover:bg-[#EAE4D7]"
                  >
                    {selectedIndices.length === filteredContacts.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>
              </div>

              {/* Protocol selector for imported leads */}
              <div className="p-3 bg-[#F3EEE2] rounded-2xl border border-[#E4DCC8] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#1B2E24]">Tratamento Padrão para Novos Leads:</span>
                <select
                  value={defaultProtocol}
                  onChange={(e) => setDefaultProtocol(e.target.value)}
                  className="p-1.5 bg-white border border-[#E4DCC8] rounded-xl text-xs font-medium"
                >
                  <option value="Pilates clássico">Pilates clássico</option>
                  <option value="Fisioterapia traumato-ortopédica">Fisioterapia traumato-ortopédica</option>
                  <option value="Tratamento de coluna e postura">Tratamento de coluna e postura</option>
                  <option value="Liberação miofascial">Liberação miofascial</option>
                  <option value="Avaliação postural">Avaliação postural</option>
                </select>
              </div>

              {/* Contacts Table/List */}
              <div className="max-h-60 overflow-y-auto space-y-2 border border-[#E4DCC8] rounded-2xl p-2 bg-white">
                {filteredContacts.map((contact, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  const exists = isAlreadyInCrm(contact.telefone);

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelectOne(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-[#F8F5EE] border-[#B08A3E]' 
                          : 'bg-white border-[#E4DCC8]/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent div
                          className="w-4 h-4 rounded text-[#1B2E24] border-[#8C8270]"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#1B2E24]">{contact.nome}</p>
                          <span className="text-[11px] text-[#736B5E] font-mono">{contact.telefone}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {exists && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                            Já no CRM
                          </span>
                        )}
                        <span className="text-[11px] text-[#8C8270] font-medium">
                          {contact.origem}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F3EEE2] border-t border-[#E4DCC8] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#E4DCC8] text-[#736B5E] hover:text-[#1B2E24] text-xs font-bold rounded-xl cursor-pointer"
          >
            Fechar
          </button>

          {parsedContacts.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isLoading || selectedIndices.length === 0}
              className="px-5 py-2.5 bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-xs font-bold rounded-xl shadow-md border border-[#DCC58F]/50 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#DCC58F]" />
              <span>Importar {selectedIndices.length} Leads para o CRM</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
