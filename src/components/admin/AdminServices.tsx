import React, { useState } from 'react';
import { Service, ServiceCategory } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/qrUtils';
import { Plus, Edit2, Trash2, Clock, Check, X, Sparkles, AlertCircle } from 'lucide-react';

interface AdminServicesProps {
  services: Service[];
  onReload: () => void;
}

export const AdminServices: React.FC<AdminServicesProps> = ({ services, onReload }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(50);
  const [price, setPrice] = useState<number>(120);
  const [category, setCategory] = useState<ServiceCategory>('fisioterapia');
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Cadastro de Serviços & Tratamentos</h3>
          <p className="text-xs text-slate-500">
            Gerencie as modalidades oferecidas na clínica, tempos de duração e valores das sessões.
          </p>
        </div>
        <button
          id="btn-add-service"
          onClick={openNewModal}
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-teal-700 hover:bg-teal-800 text-white shadow-xs flex items-center justify-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Serviço</span>
        </button>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className={`bg-white rounded-2xl p-5 border shadow-2xs relative flex flex-col justify-between transition-all ${
              service.active ? 'border-slate-200 hover:border-teal-300' : 'border-slate-200 opacity-60 bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                  service.category === 'pilates'
                    ? 'bg-purple-100 text-purple-800'
                    : service.category === 'fisioterapia'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {service.category}
                </span>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  service.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {service.active ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-800 leading-snug">
                {service.name}
              </h4>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                {service.description || 'Sem descrição.'}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{service.durationMinutes} minutos</span>
                </span>
                <span className="text-base font-extrabold text-teal-800">
                  {formatCurrency(service.price)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => openEditModal(service)}
                className="p-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => handleDeleteService(service.id, service.name)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 mb-1">
              {editingService ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Preencha os detalhes da modalidade oferecida na clínica.
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
                  Nome do Serviço / Tratamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pilates Solo & Aparelhos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                >
                  <option value="fisioterapia">Fisioterapia</option>
                  <option value="pilates">Pilates</option>
                  <option value="outros">Outros</option>
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Descrição do Atendimento
                </label>
                <textarea
                  rows={2}
                  placeholder="Resumo do tratamento, indicações ou diferenciais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <label htmlFor="chk-active" className="text-xs font-semibold text-slate-700">
                  Ativo para Agendamento Público
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl font-bold text-xs bg-teal-700 text-white hover:bg-teal-800 shadow-xs"
                >
                  {loading ? 'Salvando...' : 'Salvar Serviço'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};
