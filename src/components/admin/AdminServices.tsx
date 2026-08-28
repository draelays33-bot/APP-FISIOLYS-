import React, { useState, useMemo } from 'react';
import { Service, ServiceCategory } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/qrUtils';
import { Plus, Edit2, Trash2, Clock, Check, X, Sparkles, AlertCircle, Package, Layers, Crown, Search, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

interface AdminServicesProps {
  services: Service[];
  onReload: () => void;
}

export const AdminServices: React.FC<AdminServicesProps> = ({ services, onReload }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'avulso' | 'planos' | 'fidelidade'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(50);
  const [price, setPrice] = useState<number>(120);
  const [category, setCategory] = useState<ServiceCategory>('fisioterapia');
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPlanOrPackage = (service: Service) => {
    const text = (service.name + ' ' + (service.description || '')).toLowerCase();
    return text.includes('pacote') || text.includes('plano') || text.includes('sessões') || text.includes('mensal') || text.includes('fidelidade') || text.includes('recorrente');
  };

  const isLoyaltyItem = (service: Service) => {
    const text = (service.name + ' ' + (service.description || '')).toLowerCase();
    return text.includes('fidelidade') || text.includes('clube') || service.price === 99;
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'avulso') {
        return !isPlanOrPackage(s);
      }
      if (filterType === 'planos') {
        return isPlanOrPackage(s);
      }
      if (filterType === 'fidelidade') {
        return isLoyaltyItem(s);
      }
      return true;
    });
  }, [services, filterType, searchQuery]);

  const openNewModal = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setDurationMinutes(50);
    setPrice(120);
    setCategory('fisioterapia');
    setActive(true);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description);
    setDurationMinutes(service.durationMinutes);
    setPrice(service.price);
    setCategory(service.category);
    setActive(service.active);
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do serviço é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (editingService) {
        await api.updateService(editingService.id, {
          name,
          description,
          durationMinutes,
          price,
          category,
          active,
        });
      } else {
        await api.createService({
          name,
          description,
          durationMinutes,
          price,
          category,
          active,
        });
      }
      setIsModalOpen(false);
      onReload();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar serviço.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id: string, serviceName: string) => {
    if (confirm(`Tem certeza que deseja excluir o serviço "${serviceName}"?`)) {
      try {
        await api.deleteService(id);
        onReload();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir serviço.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#31523D]/10 text-[#31523D] flex items-center justify-center font-bold">
              🏷️
            </span>
            <h3 className="text-lg font-serif font-extrabold text-[#23372B]">
              Serviços Avulsos & Planos de Tratamento
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Aqui você gerencia tanto as sessões individuais quanto os pacotes e planos que agrupam ou substituem atendimentos avulsos.
          </p>
        </div>
        <button
          id="btn-add-service"
          onClick={openNewModal}
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#31523D] hover:bg-[#23372B] text-white shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#D0A73B]" />
          <span>Cadastrar Serviço / Plano</span>
        </button>
      </div>

      {/* Concept Architecture Card: Como Planos e Serviços se conectam */}
      <div className="bg-gradient-to-r from-[#FAF7F0] via-white to-[#F4F7F4] p-5 rounded-2xl border border-[#DCC58F]/50 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#31523D] text-[#D0A73B] flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-extrabold text-[#1B2E24] text-sm">
              Visão Integrada: Sessão Avulsa vs. Planos & Pacotes
            </h4>
            <p className="text-slate-600 leading-relaxed">
              O paciente pode optar por uma <strong>Sessão Avulsa</strong> (para atendimento pontual ou avaliação) ou aderir a um <strong>Plano / Pacote de Sessões</strong> (que oferece menor custo por sessão, recorrência e acompanhamento continuado) ou ao <strong>Clube Fidelidade R$ 99</strong>. Ambos convivem no mesmo catálogo com precificação e regras próprias.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'all'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Todos ({services.length})
          </button>
          <button
            onClick={() => setFilterType('avulso')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'avulso'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Sessões Avulsas
          </button>
          <button
            onClick={() => setFilterType('planos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'planos'
                ? 'bg-[#31523D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Pacotes & Planos
          </button>
          <button
            onClick={() => setFilterType('fidelidade')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterType === 'fidelidade'
                ? 'bg-[#B08A3E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            👑 Clube Fidelidade
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar serviço ou plano..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31523D]"
          />
        </div>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => {
          const isPlan = isPlanOrPackage(service);
          const isLoyalty = isLoyaltyItem(service);

          return (
            <div
              key={service.id}
              className={`bg-white rounded-2xl p-5 border shadow-2xs relative flex flex-col justify-between transition-all ${
                isLoyalty
                  ? 'border-[#DCC58F] bg-gradient-to-b from-[#FAF7F0]/40 to-white ring-1 ring-[#DCC58F]/50'
                  : isPlan
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200 hover:border-teal-300'
              } ${!service.active ? 'opacity-60 bg-slate-50' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                      service.category === 'pilates'
                        ? 'bg-purple-100 text-purple-800'
                        : service.category === 'fisioterapia'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {service.category}
                    </span>

                    {isPlan && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#B08A3E]/20 text-[#7A5B18] border border-[#B08A3E]/40 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        <span>Pacote/Plano</span>
                      </span>
                    )}
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    service.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {service.active ? 'ATIVO' : 'INATIVO'}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-800 leading-snug">
                  {service.name}
                </h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                  {service.description || 'Sem descrição.'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{service.durationMinutes} minutos</span>
                  </span>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[#1B2E24]">
                      {formatCurrency(service.price)}
                    </span>
                    {isPlan && (
                      <span className="block text-[10px] font-bold text-emerald-700">
                        Economia p/ sessão
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => openEditModal(service)}
                  className="px-3 py-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => handleDeleteService(service.id, service.name)}
                  className="px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-serif font-bold text-slate-800 mb-1">
              {editingService ? 'Editar Serviço / Plano' : 'Cadastrar Serviço / Plano'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Defina se o item é uma sessão avulsa ou um pacote de tratamento recorrente.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nome do Serviço / Plano *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fisioterapia Avulsa ou Pacote Mensal 8 Sessões"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#31523D] text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#31523D] text-sm text-slate-800"
                >
                  <option value="fisioterapia">Fisioterapia</option>
                  <option value="pilates">Pilates</option>
                  <option value="outros">Outros / Pacotes Especiais</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#31523D] text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#31523D] text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Descrição do Atendimento / Benefícios do Plano
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva as condições, número de sessões no pacote ou detalhes do atendimento..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#31523D] text-sm text-slate-800"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 text-[#31523D] rounded border-slate-300 focus:ring-[#31523D]"
                />
                <label htmlFor="chk-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Ativo para Agendamento Público e Contratação
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl font-bold text-xs bg-[#31523D] text-white hover:bg-[#23372B] shadow-xs cursor-pointer"
                >
                  {loading ? 'Salvando...' : 'Salvar Item'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};
