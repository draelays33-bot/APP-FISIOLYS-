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
      <div className="bg-[#1B2E24] rounded-3xl p-6 sm:p-8 text-[#FAF7F0] shadow-lg relative overflow-hidden border border-[#B08A3E]/30">
        {/* Subtle ambient spine gradient */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#B08A3E]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 bg-[#FAF7F0]/10 border border-[#DCC58F]/30 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-semibold text-[#DCC58F]">
              <Sparkles className="w-3.5 h-3.5 text-[#DCC58F]" />
              <span>Depoimentos & Experiência de Pacientes Verificados</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#FAF7F0] tracking-tight">
              A Confiança de Quem Se Cuidou com a Dra. Elays
            </h2>
            <p className="text-xs sm:text-sm text-[#FAF7F0]/80 max-w-2xl font-normal leading-relaxed">
              Relatos reais dos nossos pacientes de Altamira sobre a recuperação de dores, reabilitação biomecânica no Pilates e atendimento acolhedor Fisiolys.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs">
              <div className="flex items-center space-x-2 bg-black/25 px-3.5 py-1.5 rounded-full border border-white/10">
                <div className="flex items-center text-[#B08A3E] space-x-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-[#B08A3E] text-[#B08A3E]" />
                  ))}
                </div>
                <span className="font-bold text-[#FAF7F0] text-sm">{avgRating}</span>
                <span className="text-[#DCC58F]/80 text-[11px]">(Mais de 180 avaliações 5 Estrelas)</span>
              </div>

              <a
                href={getGoogleReviewUrl(undefined, "Av. Coronel José Porfírio, nº 3025 - Recreio", "Altamira - Pará")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-[#FAF7F0] hover:bg-[#F3EEE2] text-[#1B2E24] font-bold px-4 py-1.5 rounded-full text-xs shadow-xs border border-[#E4DCC8] transition-all cursor-pointer"
              >
                <GoogleGIcon className="w-4 h-4" />
                <span>Avaliação do Google</span>
                <span className="text-[#B08A3E] font-bold">5.0 ★</span>
              </a>

              <div className="flex items-center space-x-1.5 text-[#DCC58F] font-medium text-xs">
                <Award className="w-4 h-4 text-[#DCC58F]" />
                <span>Excelência em Fisioterapia & Pilates em Altamira</span>
              </div>
            </div>
          </div>

          {/* Mascot Call-to-action */}
          <div className="bg-[#FAF7F0]/10 backdrop-blur-md border border-[#DCC58F]/25 p-4 rounded-2xl flex items-center space-x-3.5 shrink-0 max-w-sm">
            <div className="relative shrink-0">
              <img
                src={getImageUrl("/src/assets/images/mascot_griffin_lys_1785804022309.jpg")}
                alt="Lys Mascotinha Fisiolys"
                referrerPolicy="no-referrer"
                className="w-13 h-13 rounded-full object-cover border border-[#DCC58F] shadow-sm"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <p className="text-xs text-[#FAF7F0] font-medium">
                Lys: "Sua história de superação inspira outros pacientes!"
              </p>
              <div className="flex items-center space-x-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#B08A3E] hover:bg-[#9A7632] text-[#FAF7F0] font-bold px-3.5 py-1.5 rounded-full text-xs transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>Depoimento</span>
                </button>

                <a
                  href={getGoogleReviewUrl(undefined, "Av. Coronel José Porfírio, nº 3025 - Recreio", "Altamira - Pará")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#FAF7F0] hover:bg-[#F3EEE2] text-[#1B2E24] font-semibold px-3 py-1.5 rounded-full text-xs transition-all shadow-xs cursor-pointer flex items-center space-x-1 border border-[#E4DCC8]"
                  title="Avalie também no Google"
                >
                  <GoogleGIcon className="w-3.5 h-3.5" />
                  <span>Google</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#E4DCC8]">
        <div className="flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar">
          <span className="text-xs font-semibold text-[#5B5A52] flex items-center space-x-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#B08A3E]" />
            <span>Filtrar:</span>
          </span>

          {[
            { id: 'todos', label: 'Todos os Depoimentos' },
            { id: 'pilates', label: 'Pilates' },
            { id: 'fisioterapia', label: 'Fisioterapia' },
            { id: 'coluna', label: 'Coluna & Hérnia' },
            { id: 'pediatrico', label: 'Pediátrico / ABA' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs'
                  : 'bg-[#F3EEE2] hover:bg-[#ECE4D3] text-[#5B5A52] border border-[#E4DCC8]'
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
            className="text-xs font-semibold text-[#1B2E24] bg-[#FAF7F0] hover:bg-[#F3EEE2] px-3.5 py-1.5 rounded-full border border-[#E4DCC8] shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <GoogleGIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Avaliar no</span>
            <span>Google 5★</span>
          </a>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold text-[#FAF7F0] bg-[#1B2E24] hover:bg-[#22392C] px-4 py-1.5 rounded-full transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-[#DCC58F]" />
            <span>Escrever Avaliação</span>
          </button>
        </div>
      </div>

      {/* Testimonials Grid */}
      {loading ? (
        <div className="py-12 text-center text-[#5B5A52] text-xs font-medium animate-pulse">
          Carregando relatos dos pacientes...
        </div>
      ) : filteredTestimonials.length === 0 ? (
        <div className="p-8 text-center bg-[#F3EEE2] rounded-2xl border border-dashed border-[#E4DCC8] text-[#5B5A52] text-xs space-y-2">
          <Quote className="w-6 h-6 mx-auto text-[#B08A3E]" />
          <p className="font-semibold text-[#26241F]">Nenhum depoimento encontrado para esta categoria.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[#B08A3E] font-bold underline cursor-pointer"
          >
            Seja o primeiro a avaliar este tratamento!
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTestimonials.map((item) => (
            <div
              key={item.id}
              className={`bg-[#FAF7F0] rounded-2xl p-5 border transition-all hover:shadow-md flex flex-col justify-between space-y-3 relative ${
                item.highlight
                  ? 'border-[#B08A3E] ring-1 ring-[#B08A3E]/30 bg-[#F3EEE2]/70'
                  : 'border-[#E4DCC8]'
              }`}
            >
              {/* Quote icon watermark */}
              <Quote className="w-8 h-8 text-[#DCC58F]/30 absolute top-4 right-4 pointer-events-none" />

              <div className="space-y-2.5">
                {/* Rating Stars */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-[#B08A3E] space-x-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < item.rating ? 'fill-[#B08A3E] text-[#B08A3E]' : 'text-[#E4DCC8]'}`}
                      />
                    ))}
                  </div>

                  {item.verified && (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-[#1B2E24] bg-[#DCC58F]/25 px-2.5 py-0.5 rounded-full border border-[#B08A3E]/30">
                      <CheckCircle2 className="w-3 h-3 text-[#B08A3E]" />
                      <span>Paciente Verificado</span>
                    </span>
                  )}
                </div>

                {/* Comment Text */}
                <p className="text-xs text-[#26241F] leading-relaxed font-normal italic relative z-10">
                  "{item.comment}"
                </p>
              </div>

              {/* Patient Footer */}
              <div className="pt-3 border-t border-[#E4DCC8] flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  {item.patientAvatar ? (
                    <img
                      src={getImageUrl(item.patientAvatar)}
                      alt={item.patientName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-[#B08A3E]/50 shadow-xs"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center font-bold text-xs border border-[#B08A3E]/40">
                      {item.patientName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-semibold text-[#1B2E24] leading-tight">
                      {item.patientName}
                    </h4>
                    <span className="text-[10px] font-medium text-[#B08A3E] block">
                      {item.treatmentName}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-[#5B5A52] font-medium shrink-0">
                  {item.date ? new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'Recente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form: Submit New Testimonial */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1B2E24]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#FAF7F0] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E4DCC8] space-y-4 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[#5B5A52] hover:text-[#26241F] p-1.5 rounded-full hover:bg-[#F3EEE2] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3 pb-3 border-b border-[#E4DCC8]">
              <div className="w-11 h-11 rounded-2xl bg-[#1B2E24] text-[#DCC58F] flex items-center justify-center font-bold shrink-0 border border-[#B08A3E]/30">
                <Heart className="w-5 h-5 text-[#DCC58F]" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-[#1B2E24]">
                  Deixe seu Depoimento Fisiolys
                </h3>
                <p className="text-xs text-[#5B5A52]">
                  Compartilhe sua experiência de recuperação com a Dra. Elays Marinho!
                </p>
              </div>
            </div>

            {successMessage ? (
              <div className="p-6 bg-[#F3EEE2] rounded-2xl border border-[#B08A3E] text-center space-y-2 text-[#1B2E24]">
                <ThumbsUp className="w-10 h-10 mx-auto text-[#B08A3E] animate-bounce" />
                <h4 className="font-bold text-base font-serif">Obrigado pela Avaliação!</h4>
                <p className="text-xs text-[#5B5A52] font-medium">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#26241F] mb-1">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Ex: Maria Auxiliadora"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4DCC8] bg-[#FAF7F0] text-xs font-medium text-[#26241F] focus:ring-2 focus:ring-[#B08A3E]/30 focus:border-[#B08A3E] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26241F] mb-1">
                    Tratamento / Serviço Realizado
                  </label>
                  <select
                    value={treatmentName}
                    onChange={(e) => setTreatmentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4DCC8] bg-[#FAF7F0] text-xs font-medium text-[#26241F] focus:ring-2 focus:ring-[#B08A3E]/30 focus:border-[#B08A3E] focus:outline-hidden"
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
                  <label className="block text-xs font-semibold text-[#26241F] mb-1">
                    Sua Avaliação (Estrelas) *
                  </label>
                  <div className="flex items-center space-x-2 bg-[#F3EEE2] p-2.5 rounded-xl border border-[#E4DCC8]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer transform hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= rating
                              ? 'fill-[#B08A3E] text-[#B08A3E]'
                              : 'text-[#E4DCC8]'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-[#1B2E24] ml-2">
                      {rating} de 5 Estrelas
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26241F] mb-1">
                    Seu Depoimento *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Conte como foi sua experiência, o alívio da dor ou o atendimento da Dra. Elays..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4DCC8] bg-[#FAF7F0] text-xs font-medium text-[#26241F] focus:ring-2 focus:ring-[#B08A3E]/30 focus:border-[#B08A3E] focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-[#E4DCC8] text-[#5B5A52] text-xs font-semibold hover:bg-[#F3EEE2] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-full bg-[#1B2E24] hover:bg-[#22392C] text-[#FAF7F0] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
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
