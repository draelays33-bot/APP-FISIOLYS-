import React, { useState } from 'react';
import {
  KeyRound,
  X,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  IdCard
} from 'lucide-react';
import { ClinicConfig } from '../../types';
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinic: ClinicConfig | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, clinic }) => {
  const [activeTab, setActiveTab] = useState<'passwords' | 'fiscal'>('passwords');

  // Password state
  const [currentAdminPass, setCurrentAdminPass] = useState(getAdminPassword());
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  const [currentFinancialPass, setCurrentFinancialPass] = useState(getFinancialPassword());
  const [newFinancialPass, setNewFinancialPass] = useState('');
  const [confirmFinancialPass, setConfirmFinancialPass] = useState('');
  const [showFinancialPass, setShowFinancialPass] = useState(false);

  // Fiscal state
  const [doctorCpfVal, setDoctorCpfVal] = useState(() => getDoctorCpf(clinic?.managerCpf || '000.000.000-00'));

  // Notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  if (!isOpen) return null;

  const handleSaveAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPass.trim() || newAdminPass.trim().length < 4) {
      showNotification('error', 'A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (newAdminPass.trim() !== confirmAdminPass.trim()) {
      showNotification('error', 'As senhas digitadas não coincidem.');
      return;
    }
    if (setAdminPassword(newAdminPass.trim())) {
      setCurrentAdminPass(newAdminPass.trim());
      setNewAdminPass('');
      setConfirmAdminPass('');
      showNotification('success', 'Senha do Painel Gestor alterada com sucesso!');
    }
  };

  const handleSaveFinancialPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFinancialPass.trim() || newFinancialPass.trim().length < 4) {
      showNotification('error', 'A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (newFinancialPass.trim() !== confirmFinancialPass.trim()) {
      showNotification('error', 'As senhas financeiras não coincidem.');
      return;
    }
    if (setFinancialPassword(newFinancialPass.trim())) {
      setCurrentFinancialPass(newFinancialPass.trim());
      setNewFinancialPass('');
      setConfirmFinancialPass('');
      showNotification('success', 'Senha da Gestão Financeira alterada com sucesso!');
    }
  };

  const handleSaveFiscal = (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorCpf(doctorCpfVal.trim());
    showNotification('success', 'CPF e dados fiscais salvos com sucesso!');
  };

  const handleReset = () => {
    if (window.confirm('Deseja realmente restaurar as senhas para o padrão da clínica?')) {
      resetPasswordsToDefault();
      setCurrentAdminPass(DEFAULT_ADMIN_PASSWORD);
      setCurrentFinancialPass(DEFAULT_ADMIN_PASSWORD);
      setNewAdminPass('');
      setConfirmAdminPass('');
      setNewFinancialPass('');
      setConfirmFinancialPass('');
      showNotification('success', 'Senhas restauradas para o padrão com sucesso.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 relative my-8 animate-scaleIn">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Configurações & Alteração de Senhas
            </h3>
            <p className="text-xs text-slate-500">
              Segurança e preferências da Clínica Fisiolys
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2 mt-4 border-b border-slate-100 pb-3">
          <button
            onClick={() => setActiveTab('passwords')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'passwords'
                ? 'bg-[#31523D] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#D0A73B]" />
            <span>Senhas de Acesso</span>
          </button>

          <button
            onClick={() => setActiveTab('fiscal')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'fiscal'
                ? 'bg-[#31523D] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <IdCard className="w-3.5 h-3.5 text-[#D0A73B]" />
            <span>CPF & Recibos Fiscais</span>
          </button>
        </div>

        {/* Notification */}
        {feedback && (
          <div
            className={`mt-3 p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TAB 1: PASSWORDS */}
        {activeTab === 'passwords' && (
          <div className="space-y-4 mt-4 text-xs">
            
            {/* Admin Password Block */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#31523D]" />
                  <span>Senha do Painel Gestor</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-[#EAF0DB] text-[#31523D] px-2 py-0.5 rounded-md">
                  Atual: {showAdminPass ? currentAdminPass : '••••••'}
                </span>
              </div>

              <form onSubmit={handleSaveAdminPassword} className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    placeholder="Nova senha..."
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-1 focus:ring-[#31523D]"
                  />
                  <input
                    type="password"
                    placeholder="Confirmar..."
                    value={confirmAdminPass}
                    onChange={(e) => setConfirmAdminPass(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-1 focus:ring-[#31523D]"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                  >
                    {showAdminPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showAdminPass ? 'Ocultar' : 'Ver atual'}</span>
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#31523D] hover:bg-[#23372B] text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer"
                  >
                    Atualizar Senha Gestor
                  </button>
                </div>
              </form>
            </div>

            {/* Financial Password Block */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-800" />
                  <span>Senha Gestão Financeira</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Atual: {showFinancialPass ? currentFinancialPass : '••••••'}
                </span>
              </div>

              <form onSubmit={handleSaveFinancialPassword} className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    placeholder="Nova senha financeira..."
                    value={newFinancialPass}
                    onChange={(e) => setNewFinancialPass(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-1 focus:ring-emerald-700"
                  />
                  <input
                    type="password"
                    placeholder="Confirmar..."
                    value={confirmFinancialPass}
                    onChange={(e) => setConfirmFinancialPass(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFinancialPass(!showFinancialPass)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                  >
                    {showFinancialPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showFinancialPass ? 'Ocultar' : 'Ver atual'}</span>
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer"
                  >
                    Atualizar Senha Financeira
                  </button>
                </div>
              </form>
            </div>

            {/* Reset to Default */}
            <div className="pt-2 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={handleReset}
                className="text-slate-500 hover:text-rose-600 flex items-center space-x-1 font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Senhas Padrão</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Concluído
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: FISCAL */}
        {activeTab === 'fiscal' && (
          <form onSubmit={handleSaveFiscal} className="space-y-4 mt-4 text-xs">
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider mb-1">
                  CPF da Dra. Elays Marinho (Impressão em Recibos)
                </label>
                <input
                  type="text"
                  value={doctorCpfVal}
                  onChange={(e) => setDoctorCpfVal(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-[#31523D]"
                />
              </div>

              <div className="text-[11px] text-slate-600 leading-relaxed">
                Este CPF é adicionado automaticamente em todos os recibos de pacientes, comprovantes de quitação e declarações de imposto de renda (IRPF).
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#31523D] hover:bg-[#23372B] text-white font-bold rounded-xl shadow-2xs flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5 text-[#D0A73B]" />
                <span>Salvar CPF</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
