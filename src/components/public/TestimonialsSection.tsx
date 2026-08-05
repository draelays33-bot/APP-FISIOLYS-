import React, { useState, useEffect } from 'react';
import { Star, MessageSquarePlus, CheckCircle2, Quote, Sparkles, Filter, User, Send, Heart, Award, X, ThumbsUp, ExternalLink } from 'lucide-react';
import { Testimonial } from '../../types';
import { api } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import { GoogleGIcon } from './DownloadAppQRSection';
import { getGoogleReviewUrl } from '../../utils/qrUtils';

export const TestimonialsSection: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Testimonial Form state
  const [patientName, setPatientName] = useState('');
  const [treatmentName, setTreatmentName] = useState('Pilates / Fisioterapia');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const data = await api.getTestimonials();
      setTestimonials(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !comment.trim()) {
      setErrorMessage('Por favor, preencha seu nome e seu depoimento.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const created = await api.addTestimonial({
        patientName: patientName.trim(),
        treatmentName: treatmentName.trim(),
        rating,
        comment: comment.trim()
      });

      setTestimonials((prev) => [created, ...prev]);
      setSuccessMessage('Depoimento enviado com sucesso! Muito obrigado pelo carinho com a Dra. Elays Marinho & Fisiolys 💚');
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage('');
        setPatientName('');
        setComment('');
      }, 2200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao enviar depoimento.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTestimonials = testimonials.filter((t) => {
    if (activeFilter === 'todos') return true;
    const treatLower = (t.treatmentName || '').toLowerCase();
    if (activeFilter === 'pilates') return treatLower.includes('pilates');
    if (activeFilter === 'fisioterapia') return treatLower.includes('fisio') || treatLower.includes('reabilitação');
    if (activeFilter === 'coluna') return treatLower.includes('coluna') || treatLower.includes('hérnia');
    if (activeFilter === 'pediatrico') return treatLower.includes('pediátr') || treatLower.includes('aba');
    return true;
  });

  // Calculate average rating
  const avgRating = testimonials.length > 0
    ? (testimonials.reduce((acc, curr) => acc + curr.rating, 0) / testimonials.length).toFixed(1)
    : '5.0';

  return (
    <section className="mt-12 mb-8 space-y-6">
      {/* Testimonials Banner Header */}
      <div className="bg-gradient-to-br from-[#23372B] via-[#31523D] to-[#2B4533] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#9CB55E]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 bg-[#EAF0DB]/20 border border-[#9CB55E]/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#EAF0DB]">
              <Sparkles className="w-3.5 h-3.5 text-[#D0A73B]" />
              <span>Depoimentos & Experiência de Pacientes Verificados</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              A Confiança de Quem Se Cuidou com a Dra. Elays
            </h2>
            <p className="text-sm text-[#EAF0DB]/90 max-w-2xl font-medium leading-relaxed">
              Veja os relatos reais dos nossos pacientes de Altamira sobre a recuperação de dores, melhora da postura no Pilates e atendimento acolhedor Fisiolys.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs">
              <div className="flex items-center space-x-2 bg-black/20 px-3.5 py-1.5 rounded-xl border border-white/10">
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="font-extrabold text-white text-sm">{avgRating}</span>
                <span className="text-[#EAF0DB]/70 text-[11px]">(Mais de 180 avaliações 5 Estrelas)</span>
              </div>

              <a
                href={getGoogleReviewUrl(undefined, "Av. Coronel José Porfírio, nº 3025 - Recreio", "Altamira - Pará")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-800 font-extrabold px-3.5 py-1.5 rounded-xl text-xs shadow-md border border-slate-200 transition-all transform hover:scale-105 cursor-pointer"
              >
                <GoogleGIcon className="w-4 h-4" />
                <span>Avaliação do Google</span>
                <span className="text-amber-500 font-bold">5.0 ★</span>
              </a>

              <div className="flex items-center space-x-1.5 text-[#EAF0DB] font-semibold text-xs">
                <Award className="w-4 h-4 text-[#D0A73B]" />
                <span>Excelência em Fisioterapia & Pilates em Altamira</span>
              </div>
            </div>
          </div>

          {/* Mascot Call-to-action */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center space-x-3.5 shrink-0 max-w-sm">
            <div className="relative shrink-0">
              <img
                src={getImageUrl("/src/assets/images/mascot_griffin_lys_1785804022309.jpg")}
                alt="Lys Mascotinha Fisiolys"
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border-2 border-[#D0A73B] shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 bg-[#25D366] text-white p-0.5 rounded-full text-[10px]">
                💬
              </span>
            </div>
            <div className="space-y-1 text-left">
              <p className="text-xs text-white font-bold">
                Lys diz: "Sua história inspira outros pacientes!"
              </p>
              <div className="flex items-center space-x-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#D0A73B] hover:bg-[#b8912e] text-[#23372B] font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center space-x-1"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>Depoimento</span>
                </button>

                <a
                  href={getGoogleReviewUrl(undefined, "Av. Coronel José Porfírio, nº 3025 - Recreio", "Altamira - Pará")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white hover:bg-slate-100 text-slate-800 font-extrabold px-2.5 py-1.5 rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center space-x-1"
                  title="Avalie também no Google"
                >
                  <GoogleGIcon className="w-3.5 h-3.5" />
                  <span>Avaliar Google</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200/80">
        <div className="flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar">
          <span className="text-xs font-bold text-slate-500 flex items-center space-x-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#5F6D33]" />
            <span>Filtrar:</span>
          </span>

          {[
            { id: 'todos', label: 'Todos os Depoimentos' },
            { id: 'pilates', label: '🧘‍♀️ Pilates' },
            { id: 'fisioterapia', label: '🏥 Fisioterapia' },
            { id: 'coluna', label: '🦴 Coluna & Hérnia' },
            { id: 'pediatrico', label: '👶 Pediátrico / ABA' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-[#31523D] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 ml-auto">
          <a
            href={getGoogleReviewUrl(undefined, "Av. Coronel José Porfírio, nº 3025 - Recreio", "Altamira - Pará")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-extrabold text-slate-800 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <GoogleGIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Avaliar no</span>
            <span>Google 5★</span>
          </a>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-extrabold text-[#31523D] hover:text-[#23372B] bg-[#EAF0DB] hover:bg-[#d5e0ba] px-3.5 py-1.5 rounded-xl border border-[#9CB55E]/50 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-[#5F6D33]" />
            <span>Escrever Avaliação</span>
          </button>
        </div>
      </div>

      {/* Testimonials Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs font-medium animate-pulse">
          Carregando depoimentos carinhosos dos pacientes...
        </div>
      ) : filteredTestimonials.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-2">
          <Quote className="w-6 h-6 mx-auto text-slate-400" />
          <p className="font-semibold text-slate-700">Nenhum depoimento encontrado para esta categoria.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[#5F6D33] font-bold underline cursor-pointer"
          >
            Seja o primeiro a avaliar este tratamento!
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTestimonials.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-5 border transition-all hover:shadow-md flex flex-col justify-between space-y-3 relative ${
                item.highlight
                  ? 'border-[#9CB55E] ring-2 ring-[#9CB55E]/20 bg-gradient-to-b from-white to-[#F4F7F4]/40'
                  : 'border-slate-200/80'
              }`}
            >
              {/* Quote icon watermark */}
              <Quote className="w-8 h-8 text-[#EAF0DB] absolute top-4 right-4 pointer-events-none opacity-60" />

              <div className="space-y-2.5">
                {/* Rating Stars */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-amber-400 space-x-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>

                  {item.verified && (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold text-[#31523D] bg-[#EAF0DB] px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-[#5F6D33]" />
                      <span>Paciente Verificado</span>
                    </span>
                  )}
                </div>

                {/* Comment Text */}
                <p className="text-xs text-slate-700 leading-relaxed font-medium italic relative z-10">
                  "{item.comment}"
                </p>
              </div>

              {/* Patient Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  {item.patientAvatar ? (
                    <img
                      src={getImageUrl(item.patientAvatar)}
                      alt={item.patientName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-[#9CB55E]/60 shadow-xs"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#EAF0DB] text-[#31523D] flex items-center justify-center font-black text-xs border border-[#9CB55E]/40">
                      {item.patientName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">
                      {item.patientName}
                    </h4>
                    <span className="text-[10px] font-semibold text-[#5F6D33] block">
                      {item.treatmentName}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {item.date ? new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'Recente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form: Submit New Testimonial */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF0DB] text-[#31523D] flex items-center justify-center font-bold shrink-0">
                <Heart className="w-6 h-6 text-[#5F6D33] fill-[#5F6D33]/20" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  Deixe seu Depoimento Fisiolys
                </h3>
                <p className="text-xs text-slate-500">
                  Compartilhe como foi seu atendimento com a Dra. Elays Marinho!
                </p>
              </div>
            </div>

            {successMessage ? (
              <div className="p-6 bg-[#EAF0DB] rounded-2xl border border-[#9CB55E] text-center space-y-2 text-[#23372B]">
                <ThumbsUp className="w-10 h-10 mx-auto text-[#5F6D33] animate-bounce" />
                <h4 className="font-extrabold text-base text-[#31523D]">Obrigado pela Avaliação!</h4>
                <p className="text-xs font-medium">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Ex: Maria Auxiliadora"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#5F6D33] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Tratamento / Serviço Realizado
                  </label>
                  <select
                    value={treatmentName}
                    onChange={(e) => setTreatmentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#5F6D33] focus:outline-hidden bg-white"
                  >
                    <option value="Pilates Clínico / Clássico">Pilates Clínico / Clássico</option>
                    <option value="Protocolo de Tratamento de Coluna">Protocolo de Coluna & Hérnia</option>
                    <option value="Avaliação Fisioterapêutica">Avaliação Fisioterapêutica</option>
                    <option value="Fisioterapia Domiciliar">Fisioterapia Domiciliar</option>
                    <option value="Fisioterapia Pediátrica & ABA">Fisioterapia Pediátrica / ABA</option>
                    <option value="Massoterapia & Terapia Manual">Massoterapia / Terapia Manual</option>
                    <option value="Outro Atendimento Fisiolys">Outro Atendimento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Sua Avaliação (Estrelas) *
                  </label>
                  <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer transform hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-extrabold text-slate-700 ml-2">
                      {rating} de 5 Estrelas
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Seu Depoimento *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Conte como foi sua experiência, o alívio da dor ou o atendimento da Dra. Elays..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#5F6D33] focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-[#31523D] hover:bg-[#23372B] text-white text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Enviando...' : 'Publicar Depoimento'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
