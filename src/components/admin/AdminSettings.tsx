import React, { useState, useEffect } from 'react';
import { ClinicConfig } from '../../types';
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Eye,
  EyeOff,
  UserCheck,
  IdCard,
  CreditCard,
  Building,
  Sparkles,
  Save,
  HelpCircle
} from 'lucide-react';
import {
  getAdminPassword,
  setAdminPassword,
  getFinancialPassword,
  setFinancialPassword,
  resetPasswordsToDefault,
  DEFAULT_ADMIN_PASSWORD,
  getDoctorCpf,
  setDoctorCpf
} from '../../utils/securityUtils';

interface AdminSettingsProps {
  clinic: ClinicConfig;
  onReload: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ clinic, onReload }) => {
  // Passwords State
  const [currentAdminPass, setCurrentAdminPass] = useState(getAdminPassword());
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  const [currentFinancialPass, setCurrentFinancialPass] = useState(getFinancialPassword());
  const [newFinancialPass, setNewFinancialPass] = useState('');
  const [confirmFinancialPass, setConfirmFinancialPass] = useState('');
  const [showFinancialPass, setShowFinancialPass] = useState(false);

  // Professional & Fiscal Info
  const [doctorCpfVal, setDoctorCpfVal] = useState(() => getDoctorCpf(clinic.managerCpf || '000.000.000-00'));
  const [managerName, setManagerName] = useState(clinic.managerName || 'Dra. Elays Marinho');
  const [crefito, setCrefito] = useState(clinic.managerCrefito || 'CREFITO-12');
  const [clinicAddress, setClinicAddress] = useState(clinic.address || 'Av. Coronel José Porfírio, nº 3025 - Recreio');
  const [clinicCity, setClinicCity] = useState(clinic.city || 'Altamira - Pará');
  const [clinicPhone, setClinicPhone] = useState(clinic.phone || '(93) 99126-5006');

  // Feedback Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Handle Admin Password Change
  const handleSaveAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPass.trim()) {
      showNotification('error', 'Por favor, digite a nova senha desejada.');
      return;
    }
    if (newAdminPass.trim().length < 4) {
      showNotification('error', 'A nova senha deve conter pelo menos 4 caracteres.');
      return;
    }
    if (newAdminPass.trim() !== confirmAdminPass.trim()) {
      showNotification('error', 'A confirmação de senha não confere. Digite a mesma senha nos dois campos.');
      return;
    }

    const ok = setAdminPassword(newAdminPass.trim());
    if (ok) {
      setCurrentAdminPass(newAdminPass.trim());
      setNewAdminPass('');
      setConfirmAdminPass('');
      showNotification('success', 'Senha do Painel Gestor alterada com sucesso!');
    } else {
      showNotification('error', 'Erro ao salvar nova senha.');
    }
  };

  // Handle Financial Password Change
  const handleSaveFinancialPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFinancialPass.trim()) {
      showNotification('error', 'Por favor, digite a nova senha financeira desejada.');
      return;
    }
    if (newFinancialPass.trim().length < 4) {
      showNotification('error', 'A nova senha deve conter pelo menos 4 caracteres.');
      return;
    }
    if (newFinancialPass.trim() !== confirmFinancialPass.trim()) {
      showNotification('error', 'A confirmação de senha financeira não confere.');
      return;
    }

    const ok = setFinancialPassword(newFinancialPass.trim());
    if (ok) {
      setCurrentFinancialPass(newFinancialPass.trim());
      setNewFinancialPass('');
      setConfirmFinancialPass('');
      showNotification('success', 'Senha da Gestão Financeira alterada com sucesso!');
    } else {
      showNotification('error', 'Erro ao salvar nova senha financeira.');
    }
  };

  // Handle Doctor & Fiscal Data Save
  const handleSaveFiscalData = (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorCpf(doctorCpfVal.trim());
    localStorage.setItem('fisiolys_dr_cpf', doctorCpfVal.trim());
    showNotification('success', 'Dados fiscais e profissionais da Dra. Elays salvos com sucesso!');
  };

  // Handle Reset to Default
  const handleResetPasswords = () => {
    if (window.confirm('Deseja realmente restaurar as senhas para o padrão da clínica?')) {
      resetPasswordsToDefault();
      setCurrentAdminPass(DEFAULT_ADMIN_PASSWORD);
      setCurrentFinancialPass(DEFAULT_ADMIN_PASSWORD);
      setNewAdminPass('');
      setConfirmAdminPass('');
      setNewFinancialPass('');
      setConfirmFinancialPass('');
      showNotification('success', 'Senhas restauradas para o padrão inicial da clínica com sucesso.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#242E16] via-[#31523D] to-[#1a2920] p-6 rounded-3xl text-white shadow-md border border-[#D0A73B]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-[#D0A73B] border border-[#D0A73B]/50 flex items-center justify-center shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#FBF3D5] flex items-center space-x-2">
              <span>Configurações, Senhas & Segurança</span>
              <Sparkles className="w-4 h-4 text-[#D0A73B]" />
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Personalize suas senhas de acesso, controle de segurança do painel e dados de recibos fiscais.
            </p>
          </div>
        </div>

        <button
          onClick={handleResetPasswords}
          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center space-x-1.5 shrink-0 cursor-pointer"
          title="Restaurar senhas para o padrão inicial"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#D0A73B]" />
          <span>Restaurar Senha Padrão</span>
        </button>
      </div>

      {/* Floating Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs font-bold transition-all animate-slideDown ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid: 2 Security Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: Senha do Painel Gestor / Admin */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-[#31523D] text-[#D0A73B]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Senha do Painel Gestor (Admin)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Bloqueio geral da área administrativa
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-[#EAF0DB] text-[#31523D]">
              Ativa
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
            <span className="text-slate-500 font-medium">Status da Senha Atual:</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-black text-slate-800">
                ••••••••
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                Definida
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveAdminPassword} className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nova Senha de Administrador
              </label>
              <input
                type="password"
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                placeholder="Digite a nova senha..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#31523D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmAdminPass}
                onChange={(e) => setConfirmAdminPass(e.target.value)}
                placeholder="Repita a nova senha..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#31523D]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#31523D] hover:bg-[#23372B] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer mt-2"
            >
              <Save className="w-3.5 h-3.5 text-[#D0A73B]" />
              <span>Salvar Nova Senha do Painel</span>
            </button>
          </form>
        </div>

        {/* CARD 2: Senha da Gestão Financeira */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-800 text-[#D0A73B]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Senha da Gestão Financeira & Recibos
                </h3>
                <span className="text-[11px] text-slate-500">
                  Protege faturamentos, extratos e recibos
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Protegido
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
            <span className="text-slate-500 font-medium">Status da Senha Financeira:</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-black text-slate-800">
                ••••••••
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                Definida
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveFinancialPassword} className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nova Senha Financeira
              </label>
              <input
                type="password"
                value={newFinancialPass}
                onChange={(e) => setNewFinancialPass(e.target.value)}
                placeholder="Digite a nova senha financeira..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmar Senha Financeira
              </label>
              <input
                type="password"
                value={confirmFinancialPass}
                onChange={(e) => setConfirmFinancialPass(e.target.value)}
                placeholder="Repita a senha financeira..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer mt-2"
            >
              <Save className="w-3.5 h-3.5 text-[#D0A73B]" />
              <span>Salvar Nova Senha Financeira</span>
            </button>
          </form>
        </div>

      </div>

      {/* CARD 3: Dados Profissionais, Fiscais & Emissão de Recibos */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-[#F5EED3] text-[#7E611D]">
            <IdCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Dados da Responsável Técnica & Documentos Fiscais
            </h3>
            <p className="text-xs text-slate-500">
              Estas informações são impressas automaticamente nos recibos oficiais, declarações de IRPF e frequência de pacientes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveFiscalData} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Nome da Profissional
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#31523D]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Registro Profissional (CREFITO)
            </label>
            <input
              type="text"
              value={crefito}
              onChange={(e) => setCrefito(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#31523D]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1 text-emerald-900 flex items-center space-x-1">
              <span>CPF da Dra. Elays (Recibos)</span>
              <span className="text-[#D0A73B] font-bold">*</span>
            </label>
            <input
              type="text"
              value={doctorCpfVal}
              onChange={(e) => setDoctorCpfVal(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full px-3.5 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#31523D]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Endereço da Clínica
            </label>
            <input
              type="text"
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#31523D]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Cidade / Estado
            </label>
            <input
              type="text"
              value={clinicCity}
              onChange={(e) => setClinicCity(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#31523D]"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              className="py-2.5 px-6 bg-[#31523D] hover:bg-[#23372B] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#D0A73B]" />
              <span>Salvar Dados Fiscais e Profissionais</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
