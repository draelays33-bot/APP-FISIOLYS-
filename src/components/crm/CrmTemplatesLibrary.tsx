import React, { useState } from 'react';
import { 
  FileText, MessageSquare, ScrollText, ClipboardList, Copy, Check, 
  ExternalLink, Share2, Sparkles, Download, Search, CheckCircle2,
  Calendar, Clock, Heart, ShieldCheck, UserCheck, AlertCircle, Bookmark
} from 'lucide-react';
import { ClinicConfig } from '../../types';

interface CrmTemplatesLibraryProps {
  clinicConfig?: Partial<ClinicConfig>;
}

interface TemplateItem {
  id: string;
  category: 'whatsapp' | 'contratos' | 'avaliacoes';
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  content: string;
  variables: string[];
}

export const CrmTemplatesLibrary: React.FC<CrmTemplatesLibraryProps> = ({ clinicConfig }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'whatsapp' | 'contratos' | 'avaliacoes'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);

  const clinicName = clinicConfig?.name || 'Clínica Dra. Elays Marinho';
  const clinicPhone = clinicConfig?.phone || '(93) 99126-5006';
  const clinicAddress = clinicConfig?.address || 'Altamira - PA';

  const templates: TemplateItem[] = [
    // 📱 WHATSAPP TEMPLATES
    {
      id: 'wa-confirmacao-consulta',
      category: 'whatsapp',
      title: 'Confirmação de Consulta / Avaliação',
      badge: 'Lembrete Oficial',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      description: 'Disparo no dia anterior ou 2 horas antes para confirmar presença.',
      variables: ['{NOME_PACIENTE}', '{DATA}', '{HORARIO}', '{SERVICO}'],
      content: `Olá, *{NOME_PACIENTE}*! Tudo bem? 🌿

Aqui é da *${clinicName}*.

Passando para confirmar o seu atendimento:
🗓️ *Data:* {DATA}
⏰ *Horário:* {HORARIO} hs
🩺 *Procedimento:* {SERVICO}
📍 *Endereço:* ${clinicAddress}

Por favor, responda com *1 para CONFIRMAR* ou nos avise caso precise reagendar com antecedência.

Estamos te aguardando com muito carinho! ✨`
    },
    {
      id: 'wa-boas-vindas',
      category: 'whatsapp',
      title: 'Boas-Vindas ao Studio & Orientações Iniciais',
      badge: 'Boas-Vindas',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      description: 'Orientações de vestimenta (roupa leve/meias) e pontualidade para novos alunos.',
      variables: ['{NOME_PACIENTE}', '{SERVICO}'],
      content: `Olá, *{NOME_PACIENTE}*! Seja muito bem-vindo(a) à *${clinicName}*! 🌸

Estamos muito felizes em cuidar da sua saúde, postura e bem-estar.

📋 *Dicas para a sua primeira sessão de {SERVICO}:*
• Venha com roupas confortáveis e flexíveis (legging, bermuda de lycra ou tactel).
• Para o Studio Pilates, recomendamos o uso de meias antiderrapantes.
• Chegue com 5 a 10 minutinhos de antecedência.
• Traga seus exames anteriores (se houver).

Qualquer dúvida, estamos à disposição aqui pelo WhatsApp: ${clinicPhone}. Até breve!`
    },
    {
      id: 'wa-reagendamento',
      category: 'whatsapp',
      title: 'Reagendamento de Horário Solicitado',
      badge: 'Reagendamento',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      description: 'Mensagem carinhosa com novas opções de datas e horários disponíveis.',
      variables: ['{NOME_PACIENTE}', '{OPCOES_HORARIOS}'],
      content: `Olá, *{NOME_PACIENTE}*! Compreendemos perfeitamente seu imprevisto. 🤝

Para mantermos a regularidade do seu tratamento, separei os seguintes horários para você:

🗓️ *Opções disponíveis:*
{OPCOES_HORARIOS}

Qual dessas opções fica melhor para você? Fico no seu aguardo para reservar sua vaga! 🤍`
    },
    {
      id: 'wa-followup-pos-avaliacao',
      category: 'whatsapp',
      title: 'Follow-up Pós-Avaliação & Envio do Plano',
      badge: 'Follow-up',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      description: 'Feedback pós-consulta com plano de tratamento sugerido.',
      variables: ['{NOME_PACIENTE}', '{DIAGNOSTICO}', '{PLANO_RECOMENDADO}'],
      content: `Olá, *{NOME_PACIENTE}*! Como você está se sentindo hoje após a nossa avaliação? 🌿

Foi um prazer te receber aqui no Studio.

Com base na sua avaliação clínica (*{DIAGNOSTICO}*), estruturamos o seguinte plano de acompanhamento:
✨ *Plano Recomendado:* {PLANO_RECOMENDADO}

Seu objetivo é alívio da dor, fortalecimento biomecânico e qualidade de vida.

Podemos dar início e garantir seus horários fixos na grade da semana? Fico à disposição!`
    },
    {
      id: 'wa-parabens-aniversario',
      category: 'whatsapp',
      title: 'Mensagem de Parabéns / Aniversário com Cortesia',
      badge: 'Fidelização',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
      description: 'Mensagem de afeto no dia do aniversário com benefício exclusivo.',
      variables: ['{NOME_PACIENTE}'],
      content: `🎉 *Feliz Aniversário, {NOME_PACIENTE}!* 🎂✨

A equipe da *${clinicName}* deseja a você um novo ciclo repleto de saúde, vitalidade, leveza e muitas conquistas!

Para celebrar este dia especial, preparamos uma condição de presente especial em nosso Studio Pilates & Fisioterapia para você aproveitar neste mês!

Um abraço caloroso da Dra. Elays e equipe! 💖`
    },
    {
      id: 'wa-clube-fidelidade-99',
      category: 'whatsapp',
      title: 'Convite Especial: Clube Fidelidade Fisiolys R$ 99/mês',
      badge: 'Clube Fidelidade',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      description: 'Apresentação dos benefícios exclusivos para membros do Clube R$ 99.',
      variables: ['{NOME_PACIENTE}'],
      content: `Olá, *{NOME_PACIENTE}*! Tudo bem? 👑

Tenho um convite exclusivo para você: o *Clube Fidelidade Fisiolys*!

Por apenas *R$ 99,00 / mês*, você garante:
⭐ Desconto VIP de 25% a 40% em todas as sessões e pacotes;
⭐ Prioridade máxima na grade de horários da Dra. Elays;
⭐ 1 Avaliação Postural ou Pélvica sem custo adicional a cada semestre;
⭐ Desconto especial para familiares de 1º grau.

Gostaria de ativar sua vaga no Clube este mês? Me avise por aqui!`
    },
    {
      id: 'wa-lembrete-cobranca-educada',
      category: 'whatsapp',
      title: 'Lembrete Educado de Pagamento / Mensalidade',
      badge: 'Financeiro',
      badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
      description: 'Lembrete profissional e delicado sobre renovação do pacote.',
      variables: ['{NOME_PACIENTE}', '{VALOR}', '{CHAVE_PIX}'],
      content: `Olá, *{NOME_PACIENTE}*! Tudo bem? 💳

Passando para informar os dados para a renovação da sua mensalidade / pacote de atendimentos:

💰 *Valor:* {VALOR}
🔑 *Chave PIX:* {CHAVE_PIX}
🏦 *Favorecido:* Dra. Elays Marinho Fisioterapia

Assim que realizar a transferência, por favor nos envie o comprovante para emitirmos o seu Recibo Oficial com carimbo. Muito obrigada!`
    },

    // 📄 CONTRATOS & TERMOS
    {
      id: 'contrato-prestacao-servicos',
      category: 'contratos',
      title: 'Contrato de Prestação de Serviços Fisioterapêuticos',
      badge: 'Jurídico / COFFITO',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      description: 'Minuta padrão em conformidade com o COFFITO, Código de Defesa do Consumidor e LGPD.',
      variables: ['{NOME_PACIENTE}', '{CPF_PACIENTE}', '{PLANO_CONTRATADO}', '{VALOR_TOTAL}'],
      content: `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS FISIOTERAPÊUTICOS E/OU STUDIO PILATES

CONTRATADA: DRA. ELAYS MARINHO, Fisioterapeuta inscrita no CREFITO, responsável técnica pela ${clinicName}.
CONTRATANTE / PACIENTE: {NOME_PACIENTE}, portador(a) do CPF nº {CPF_PACIENTE}.

CLÁUSULA 1ª - DO OBJETO: O presente contrato tem por objeto a prestação de serviços na área de Fisioterapia e/ou Pilates Clínico, conforme plano terapêutico personalizado acordado.

CLÁUSULA 2ª - DA FREQUÊNCIA E HORÁRIOS: Os atendimentos ocorrerão conforme grade pré-estabelecida. Faltas deverão ser comunicadas com antecedência mínima de 4 (quatro) horas para que seja permitida a reposição conforme disponibilidade do Studio.

CLÁUSULA 3ª - DOS HONORÁRIOS: O CONTRATANTE pagará à CONTRATADA o valor de {VALOR_TOTAL} referente ao plano {PLANO_CONTRATADO}.

CLÁUSULA 4ª - DA PROTEÇÃO DE DADOS (LGPD): Os dados de saúde coletados serão mantidos sob sigilo ético e profissional estrito, utilizados unicamente para a condução do plano terapêutico.`
    },
    {
      id: 'tcle-consentimento-informado',
      category: 'contratos',
      title: 'Termo de Consentimento Livre e Esclarecido (TCLE)',
      badge: 'Ética Clínica',
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
      description: 'Esclarecimento de objetivos, condutas terapêuticas e ciência do paciente.',
      variables: ['{NOME_PACIENTE}', '{PROCEDIMENTO}'],
      content: `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)

Eu, {NOME_PACIENTE}, declaro que fui devidamente informado(a) pela Dra. Elays Marinho acerca dos objetivos, benefícios e eventuais desconfortos transitórios decorrentes do plano de {PROCEDIMENTO}.

Declaro que:
1. Tive a oportunidade de esclarecer todas as dúvidas sobre o tratamento;
2. Informei com veracidade todo o meu histórico de saúde preexistente, cirurgias e medicamentos;
3. Comprometo-me a seguir as orientações posturais e de exercícios para o domicílio;
4. Autorizo a condução dos atendimentos fisioterapêuticos propostos.`
    },
    {
      id: 'termo-imagem-voz-coffito',
      category: 'contratos',
      title: 'Termo de Autorização de Imagem e Voz (COFFITO 532/2021)',
      badge: 'Resolução 532',
      badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      description: 'Autorização expressa para fins científicos e/ou divulgação educativa em redes sociais.',
      variables: ['{NOME_PACIENTE}', '{TIPO_AUTORIZACAO}'],
      content: `AUTORIZAÇÃO DE USO DE IMAGEM, VOZ E DEPOIMENTO
(Em conformidade com a Resolução COFFITO nº 532/2021 e Lei 13.709/2018 - LGPD)

Pelo presente termo, eu, {NOME_PACIENTE}, autorizo a Dra. Elays Marinho a capturar e utilizar imagens (fotos e vídeos) e registros sonoros de minhas sessões e evolução para a finalidade de:
( ) Fins estritamente didáticos, prontuário e acompanhamento clínico.
( ) Divulgação de caráter educativo e informativo sobre Fisioterapia e Pilates em redes sociais e canais digitais.

Esta autorização é concedida a título gratuito, preservando sempre o decoro e o respeito à dignidade do(a) paciente.`
    },

    // 📋 FICHAS DE AVALIAÇÃO CLÍNICA
    {
      id: 'ficha-anamnese-ortopedica-pilates',
      category: 'avaliacoes',
      title: 'Modelo: Anamnese Ortopédica, Coluna & Studio Pilates',
      badge: 'Prontuário Ortopédico',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      description: 'Roteiro completo de avaliação postural, testes funcionais e escala de dor EVA.',
      variables: ['{NOME_PACIENTE}', '{IDADE}', '{PROFISSAO}'],
      content: `ROTEIRO DE AVALIAÇÃO ORTOPÉDICA & PILATES CLÍNICO

1. IDENTIFICAÇÃO:
• Nome: {NOME_PACIENTE} | Idade: {IDADE} | Profissão: {PROFISSAO}

2. ANAMNESE:
• Queixa Principal (QP):
• História da Doença Atual (HDA):
• Escala Visual Analógica de Dor (EVA de 0 a 10):
• Tipo de Dor: ( ) Pontada ( ) Queimação ( ) Peso ( ) Irradiada

3. INSPEÇÃO & EXAME FÍSICO:
• Postura Estática (Vista Anterior / Lateral / Posterior):
• Amplitude de Movimento (ADM): Flexão, Extensão, Inclinações e Rotações
• Testes Especiais: Lasegue, Adams, Spurling, Phalen, Thomas
• Força Muscular (Oxford 0 a 5):

4. DIAGNÓSTICO CINESIOLÓGICO FUNCIONAL:

5. OBJETIVOS E CONDUTA TERAPÊUTICA:
• Frequência recomendada: ( ) 2x/sem ( ) 3x/sem
• Exercícios nos Aparelhos (Reformer, Cadillac, Barrel, Chair) e Solo`
    },
    {
      id: 'ficha-fisioterapia-pelvica',
      category: 'avaliacoes',
      title: 'Modelo: Avaliação de Fisioterapia Pélvica & Obstétrica',
      badge: 'Saúde da Mulher',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
      description: 'Anamnese ginecológica, obstétrica, continência urinária e assoalho pélvico.',
      variables: ['{NOME_PACIENTE}', '{IDADE}', '{IG_GESTACOES}'],
      content: `ROTEIRO DE AVALIAÇÃO FISIOTERAPÊUTICA PÉLVICA & OBSTÉTRICA

1. IDENTIFICAÇÃO & DADOS OBSTÉTRICOS:
• Paciente: {NOME_PACIENTE} | Idade: {IDADE}
• Histórico Gestacional (G / P / A): {IG_GESTACOES}
• Idade Gestacional (IG) atual ou tempo de Pós-parto:

2. HISTÓRICO MICCIONAL E INTESTINAL:
• Perda Urinária: ( ) Aos esforços (tosse/riso/pulo) ( ) Urgência ( ) Não relata
• Ingesta hídrica diária:
• Frequência evacuatória (Escala de Bristol 1 a 7):

3. AVALIAÇÃO DO ASSOALHO PÉLVICO (MAP):
• Inspeção da musculatura perineal / Reflexos
• Escala PERFECT (Power, Endurance, Repetitions, Fast, Every Contraction Timed)
• Presença de dor pélvica / Dispareunia / Diástase Abdominal (em cm):

4. PLANO TERAPÊUTICO PÉLVICO:
• Biofeedback, Cinesioterapia do Assoalho Pélvico, EPI-NO, Mobilidade de Quadril`
    },
    {
      id: 'ficha-pos-operatorio-drenagem',
      category: 'avaliacoes',
      title: 'Modelo: Avaliação Pós-Operatório & Drenagem Linfática',
      badge: 'Pós-Cirúrgico',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      description: 'Avaliação de edema, fibroses, cicatriz e uso de cintas compressivas.',
      variables: ['{NOME_PACIENTE}', '{CIRURGIA_REALIZADA}', '{DATA_CIRURGIA}'],
      content: `ROTEIRO DE AVALIAÇÃO PÓS-OPERATÓRIO & REABILITAÇÃO TECIDUAL

1. DADOS CIRÚRGICOS:
• Cirurgia: {CIRURGIA_REALIZADA} | Data da Cirurgia: {DATA_CIRURGIA}
• Médico Cirurgião Responsável:

2. AVALIAÇÃO CLÍNICA:
• Localização e aspecto do edema: ( ) Geral ( ) Localizado
• Cicatriz cirúrgica: ( ) Fechada ( ) Deiscência ( ) Equimose
• Presença de Fibrose tecidual / Aderência cicatricial:
• Uso de cinta compressiva / placas de contenção:

3. CONDUTA FISIOTERAPÊUTICA:
• Drenagem Linfática Manual (Método Leduc/Vodder)
• Terapia Manual Tecidual / Liberação Miofascial suave
• Cinesioterapia respiratória e circulatória`
    }
  ];

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (t: TemplateItem) => {
    navigator.clipboard.writeText(t.content);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenWhatsAppDirect = (t: TemplateItem) => {
    const encoded = encodeURIComponent(t.content);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1B2E24] via-[#264434] to-[#1B2E24] rounded-3xl p-6 text-[#FAF7F0] border border-[#3E6550] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#DCC58F] text-[#1B2E24]">
              <Bookmark className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-serif font-bold text-[#FAF7F0]">
              Central de Templates & Scripts • Dra. Elays Marinho
            </h2>
          </div>
          <p className="text-xs text-[#D1DDD5] max-w-2xl leading-relaxed">
            Modelos padronizados de mensagens do WhatsApp, contratos de serviços com validade ética, TCLE e fichas de avaliação clínica prontas para cópia e envio em 1 clique.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF7F0]/10 text-[#DCC58F] border border-[#DCC58F]/30">
            {templates.length} Modelos Disponíveis
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E4DCC8] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({templates.length})
          </button>

          <button
            onClick={() => setSelectedCategory('whatsapp')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'whatsapp'
                ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#DCC58F]" />
            <span>WhatsApp (7)</span>
          </button>

          <button
            onClick={() => setSelectedCategory('contratos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'contratos'
                ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5 text-[#DCC58F]" />
            <span>Contratos & TCLE (3)</span>
          </button>

          <button
            onClick={() => setSelectedCategory('avaliacoes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === 'avaliacoes'
                ? 'bg-[#1B2E24] text-[#FAF7F0] shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-[#DCC58F]" />
            <span>Fichas de Avaliação (3)</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar modelo de texto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B2E24] font-medium"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => {
          const isCopied = copiedId === template.id;

          return (
            <div
              key={template.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div>
                {/* Header Badge & Title */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="space-y-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${template.badgeColor}`}>
                      {template.badge}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1B2E24] transition-colors">
                      {template.title}
                    </h3>
                  </div>

                  <span className="p-2 rounded-xl bg-slate-50 text-slate-500 group-hover:bg-[#1B2E24] group-hover:text-[#DCC58F] transition-colors shrink-0">
                    {template.category === 'whatsapp' && <MessageSquare className="w-4 h-4" />}
                    {template.category === 'contratos' && <ScrollText className="w-4 h-4" />}
                    {template.category === 'avaliacoes' && <ClipboardList className="w-4 h-4" />}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  {template.description}
                </p>

                {/* Text Content Box */}
                <div className="relative">
                  <pre className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-sans text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-medium select-all">
                    {template.content}
                  </pre>
                </div>

                {/* Variable Tags */}
                {template.variables.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400">Variáveis:</span>
                    {template.variables.map((v, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy(template)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>

                  {template.category === 'whatsapp' && (
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsAppDirect(template)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Abrir WhatsApp com este texto"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>WhatsApp</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate(template)}
                  className="text-xs font-bold text-[#1B2E24] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Visualizar Completo</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${selectedTemplate.badgeColor}`}>
                  {selectedTemplate.badge}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedTemplate.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">{selectedTemplate.description}</p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
              {selectedTemplate.content}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => handleCopy(selectedTemplate)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1B2E24] hover:bg-[#2A4435] text-[#DCC58F] shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Todo o Conteúdo</span>
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
