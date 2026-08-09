import { Service, ScheduleConfig, ClinicConfig, Appointment, Patient, Testimonial, LoyaltyMember } from '../types';

export const initialClinicConfig: ClinicConfig = {
  name: "Fisiolys Fisioterapia e Pilates",
  tagline: "Fisioterapia Especializada, Pilates & Bem-Estar Integrado",
  phone: "(93) 99126-5006",
  whatsapp: "5593991265006",
  address: "Av. Coronel José Porfírio, nº 3025 - Recreio",
  city: "Altamira - Pará",
  managerName: "Dra. Elays Marinho",
  webhookUrl: "https://n8n.webhook.site/v1/agendamento-fisiolys",
  webhookEnabled: true,
  googleReviewUrl: "https://www.google.com/search?q=Fisiolys+Fisioterapia+e+Pilates+Altamira+Avaliar+no+Google",
  customAppUrl: "",
};

export const initialServices: Service[] = [
  // --- PILATES ---
  {
    id: "serv-exp",
    name: "Aula Experimental de Pilates",
    description: "Sessão prática experimental individual para vivenciar o método Pilates no solo e aparelhos com acompanhamento guiado.",
    durationMinutes: 30,
    price: 49,
    category: "pilates",
    active: true,
    imageUrl: "/src/assets/images/pilates_solo_bola_1785778394647.jpg"
  },
  {
    id: "serv-1",
    name: "Pilates Clássico - 8 sessões por mês",
    description: "Programa mensal no solo e aparelhos com 8 sessões por mês (2x por semana). Trabalho de postura, alongamento e fortalecimento.",
    durationMinutes: 50,
    price: 99,
    category: "pilates",
    active: true,
    imageUrl: "/src/assets/images/pilates_solo_bola_1785778394647.jpg"
  },
  {
    id: "serv-2",
    name: "Pilates Clássico - 12 sessões por mês",
    description: "Programa mensal no solo e aparelhos com 12 sessões (3x/semana). Ganho de força, flexibilidade e consciência corporal.",
    durationMinutes: 50,
    price: 189,
    category: "pilates",
    active: true,
    imageUrl: "/src/assets/images/pilates_classico_12_1785799781453.jpg"
  },
  {
    id: "serv-3",
    name: "Pilates Clínico - 8 sessões por mês",
    description: "Tratamento individualizado com Pilates focado na reabilitação de coluna, dores crônicas e patologias (8 sessões/mês).",
    durationMinutes: 50,
    price: 280,
    category: "pilates",
    active: true,
    imageUrl: "/src/assets/images/pilates_studio_class_1785778038451.jpg"
  },
  {
    id: "serv-4",
    name: "Pilates Clínico - 12 sessões por mês",
    description: "Tratamento intensivo de Pilates Clínico (12 sessões/mês) para controle da dor, hérnias de disco e reeducação motora.",
    durationMinutes: 50,
    price: 360,
    category: "pilates",
    active: true,
    imageUrl: "/src/assets/images/pilates_clinico_rehab_1785799848290.jpg"
  },
  {
    id: "serv-pilates-gestante",
    name: "Pilates Especial para Gestantes",
    description: "Exercícios adaptados para prevenção de dores na lombar, fortalecimento do assoalho pélvico e preparação para o parto.",
    durationMinutes: 50,
    price: 160,
    category: "pilates",
    active: true,
    imageUrl: "/src/assets/images/pilates_studio_class_1785778038451.jpg"
  },

  // --- MASSOTERAPIA ---
  {
    id: "serv-mass-1",
    name: "Liberação Miofascial",
    description: "Técnica manual profunda para desfazer aderências no tecido conjuntivo, aliviando rigidez muscular e dor crônica.",
    durationMinutes: 50,
    price: 120,
    category: "massoterapia",
    active: true,
    imageUrl: "/src/assets/images/massoterapia_manual_1785778407399.jpg"
  },
  {
    id: "serv-mass-2",
    name: "Quiropraxia Lombar",
    description: "Ajuste articular e manobras neuro-músculo-esqueléticas para reequilíbrio da coluna vertebral e alívio da compressão nervosa.",
    durationMinutes: 50,
    price: 150,
    category: "massoterapia",
    active: true,
    imageUrl: "/src/assets/images/tratamento_coluna_spine_1785799814266.jpg"
  },
  {
    id: "serv-mass-3",
    name: "Massoterapia Corporal",
    description: "Massagem terapêutica completa focada na redução de tensões acumuladas, melhora da circulação e relaxamento profundo.",
    durationMinutes: 50,
    price: 150,
    category: "massoterapia",
    active: true,
    imageUrl: "/src/assets/images/massoterapia_manual_1785778407399.jpg"
  },
  {
    id: "serv-mass-4",
    name: "Ventosaterapia",
    description: "Aplicação de copos de sucção para estimulação da circulação sanguínea local, oxigenação tecidual e alívio imediato da dor.",
    durationMinutes: 40,
    price: 100,
    category: "massoterapia",
    active: true,
    imageUrl: "/src/assets/images/massoterapia_manual_1785778407399.jpg"
  },
  {
    id: "serv-mass-5",
    name: "Acupuntura",
    description: "Prática terapêutica milenar com agulhamento focal para regulação energética, analgésica e controle do estresse.",
    durationMinutes: 50,
    price: 120,
    category: "massoterapia",
    active: true,
    imageUrl: "/src/assets/images/massoterapia_manual_1785778407399.jpg"
  },

  // --- FISIOTERAPIA ---
  {
    id: "serv-5",
    name: "Avaliação Fisioterapêutica",
    description: "Exame clínico minucioso de força, mobilidade, testes ortopédicos e postura para diagnóstico e plano terapêutico.",
    durationMinutes: 60,
    price: 150,
    category: "fisioterapia",
    active: true,
    imageUrl: "/src/assets/images/avaliacao_jaleco_mesa_1785799834948.jpg"
  },
  {
    id: "serv-domiciliar",
    name: "Fisioterapia Domiciliar",
    description: "Atendimento fisioterapêutico especializado na sua residência para sua comodidade, reabilitação e alívio da dor no lar.",
    durationMinutes: 60,
    price: 150,
    category: "fisioterapia",
    active: true,
    imageUrl: "/src/assets/images/fisioterapia_domiciliar_1785799770845.jpg"
  },
  {
    id: "serv-coluna",
    name: "Protocolo de Tratamento de Coluna (20 sessões)",
    description: "Programa intensivo e especializado para hérnia de disco, ciatalgia e dores crônicas na coluna com 20 sessões completas.",
    durationMinutes: 60,
    price: 2500,
    category: "fisioterapia",
    active: true,
    imageUrl: "/src/assets/images/tratamento_coluna_spine_1785799814266.jpg"
  },
  {
    id: "serv-posop",
    name: "Fisioterapia em Pós-Operatório",
    description: "Atendimento especializado para reabilitação pós-cirúrgica, redução de edema, cicatrização e recuperação rápida da mobilidade.",
    durationMinutes: 50,
    price: 150,
    category: "fisioterapia",
    active: true,
    imageUrl: "/src/assets/images/pos_operatorio_muletas_1785799802653.jpg"
  },
  {
    id: "serv-idoso",
    name: "Reabilitação do Idoso",
    description: "Fisioterapia gerontológica focada no ganho de força muscular, equilíbrio, prevenção de quedas e independência na terceira idade.",
    durationMinutes: 50,
    price: 150,
    category: "fisioterapia",
    active: true,
    imageUrl: "/src/assets/images/reabilitacao_idoso_1785799792264.jpg"
  },
  {
    id: "serv-6",
    name: "Fisioterapia Pediátrica",
    description: "Atendimento especializado e lúdico para o desenvolvimento neuropsicomotor, alteração postural e estímulo infantil.",
    durationMinutes: 50,
    price: 180,
    category: "fisioterapia",
    active: true,
    imageUrl: "/src/assets/images/fisioterapia_pediatrica_1785799824997.jpg"
  },
  {
    id: "serv-rpg",
    name: "RPG - Reeducação Postural Global",
    description: "Método de alinhamento postural através de posturas estáticas progressivas para correção de escoliose, hipertensão e dores.",
    durationMinutes: 50,
    price: 160,
    category: "fisioterapia",
    active: true,
    imageUrl: "/src/assets/images/avaliacao_jaleco_mesa_1785799834948.jpg"
  },

  // --- TERAPIA EM ABA ---
  {
    id: "serv-aba-eval",
    name: "Avaliação Comportamental ABA",
    description: "Mapeamento minucioso dos repertórios comportamentais e marcos do desenvolvimento infantil para elaboração do PEI.",
    durationMinutes: 60,
    price: 250,
    category: "aba",
    active: true,
    imageUrl: "/src/assets/images/pediatric_physio_aba_1785778055536.jpg"
  },
  {
    id: "serv-7",
    name: "Acompanhamento Terapêutico (Ênfase em ABA)",
    description: "Atendimento terapêutico especializado com ênfase em ABA direcionado a autismo (TEA) e deficiência intelectual.",
    durationMinutes: 60,
    price: 220,
    category: "aba",
    active: true,
    imageUrl: "/src/assets/images/pediatric_physio_aba_1785778055536.jpg"
  },
  {
    id: "serv-aba-interv",
    name: "Sessão de Intervenção ABA Intensiva",
    description: "Sessão individual focada no ensino de habilidades de comunicação, socialização e diminuição de comportamentos-problema.",
    durationMinutes: 60,
    price: 200,
    category: "aba",
    active: true,
    imageUrl: "/src/assets/images/pediatric_physio_aba_1785778055536.jpg"
  },
  {
    id: "serv-aba-pais",
    name: "Treino de Pais e Cuidadores em ABA",
    description: "Capacitação prática da família para aplicação de estratégias comportamentais positivas no ambiente doméstico.",
    durationMinutes: 60,
    price: 180,
    category: "aba",
    active: true,
    imageUrl: "/src/assets/images/pediatric_physio_aba_1785778055536.jpg"
  },
  {
    id: "serv-aba-escola",
    name: "Acompanhamento Escolar Terapêutico ABA",
    description: "Orientação e suporte técnico para mediadores e escola na adaptação do ambiente de aprendizagem da criança.",
    durationMinutes: 60,
    price: 220,
    category: "aba",
    active: true,
    imageUrl: "/src/assets/images/pediatric_physio_aba_1785778055536.jpg"
  }
];

export const initialScheduleConfig: ScheduleConfig = {
  slotIntervalMinutes: 60,
  advanceDaysMax: 30,
  days: [
    { dayOfWeek: 0, dayName: "Domingo", active: false, startTime: "09:00", endTime: "19:00" },
    { dayOfWeek: 1, dayName: "Segunda-feira", active: true, startTime: "09:00", endTime: "19:00", lunchStart: "12:00", lunchEnd: "14:00" },
    { dayOfWeek: 2, dayName: "Terça-feira", active: true, startTime: "09:00", endTime: "19:00", lunchStart: "12:00", lunchEnd: "14:00" },
    { dayOfWeek: 3, dayName: "Quarta-feira", active: true, startTime: "09:00", endTime: "19:00", lunchStart: "12:00", lunchEnd: "14:00" },
    { dayOfWeek: 4, dayName: "Quinta-feira", active: true, startTime: "09:00", endTime: "19:00", lunchStart: "12:00", lunchEnd: "14:00" },
    { dayOfWeek: 5, dayName: "Sexta-feira", active: true, startTime: "09:00", endTime: "19:00", lunchStart: "12:00", lunchEnd: "14:00" },
    { dayOfWeek: 6, dayName: "Sábado", active: false, startTime: "09:00", endTime: "13:00" },
  ]
};

const getTodayString = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const initialAppointments: Appointment[] = [
  {
    id: "app-101",
    patientName: "Mariana Silva Santos",
    patientPhone: "(11) 99876-5432",
    serviceId: "serv-1",
    serviceName: "Pilates Studio (Aparelhos & Solo)",
    servicePrice: 120,
    durationMinutes: 50,
    date: getTodayString(0),
    time: "08:00",
    status: "agendado",
    notes: "Paciente com lombalgia leve.",
    createdAt: new Date().toISOString(),
    webhookSent: true
  },
  {
    id: "app-102",
    patientName: "Carlos Eduardo Oliveira",
    patientPhone: "(11) 98111-2233",
    serviceId: "serv-2",
    serviceName: "Fisioterapia Ortopédica & Esportiva",
    servicePrice: 150,
    durationMinutes: 60,
    date: getTodayString(0),
    time: "09:00",
    status: "concluido",
    notes: "Reabilitação de joelho pós-meniscectomia.",
    createdAt: new Date().toISOString(),
    webhookSent: true
  },
  {
    id: "app-103",
    patientName: "Fernanda Lima de Souza",
    patientPhone: "(11) 97654-3210",
    serviceId: "serv-3",
    serviceName: "RPG - Reeducação Postural Global",
    servicePrice: 160,
    durationMinutes: 50,
    date: getTodayString(0),
    time: "14:00",
    status: "agendado",
    notes: "Foco na cervical e postura de escritório.",
    createdAt: new Date().toISOString(),
    webhookSent: true
  },
  {
    id: "app-104",
    patientName: "Patricia Mendes",
    patientPhone: "(11) 99123-4567",
    serviceId: "serv-1",
    serviceName: "Pilates Studio (Aparelhos & Solo)",
    servicePrice: 120,
    durationMinutes: 50,
    date: getTodayString(1),
    time: "10:00",
    status: "agendado",
    notes: "Gestante no 2º trimestre.",
    createdAt: new Date().toISOString(),
    webhookSent: false
  },
  {
    id: "app-105",
    patientName: "Roberto Alves Costa",
    patientPhone: "(11) 98888-7766",
    serviceId: "serv-2",
    serviceName: "Fisioterapia Ortopédica & Esportiva",
    servicePrice: 150,
    durationMinutes: 60,
    date: getTodayString(2),
    time: "11:00",
    status: "agendado",
    createdAt: new Date().toISOString(),
    webhookSent: false
  }
];

export const initialPatients: Patient[] = [
  {
    id: "pat-1",
    name: "Mariana Silva Santos",
    phone: "(11) 99876-5432",
    email: "mariana.santos@email.com",
    cpf: "341.892.108-45",
    firstSessionDate: getTodayString(-30),
    lastSessionDate: getTodayString(0),
    totalSessions: 8,
    notes: "Frequenta Pilates 2x por semana. Apresenta boa evolução na estabilização de core.",
    createdAt: getTodayString(-30)
  },
  {
    id: "pat-2",
    name: "Carlos Eduardo Oliveira",
    phone: "(11) 98111-2233",
    email: "carlos.edu@email.com",
    cpf: "219.450.812-90",
    firstSessionDate: getTodayString(-15),
    lastSessionDate: getTodayString(0),
    totalSessions: 4,
    notes: "Pós-operatório de joelho direito. Amplitude de movimento recuperada em 85%.",
    createdAt: getTodayString(-15)
  },
  {
    id: "pat-3",
    name: "Fernanda Lima de Souza",
    phone: "(11) 97654-3210",
    email: "fernanda.lima@email.com",
    cpf: "105.782.934-11",
    firstSessionDate: getTodayString(-60),
    lastSessionDate: getTodayString(-5),
    totalSessions: 12,
    notes: "RPG semanal. Alívio significativo das cervicalgias crônicas.",
    createdAt: getTodayString(-60)
  },
  {
    id: "pat-4",
    name: "Patricia Mendes",
    phone: "(11) 99123-4567",
    email: "patricia.m@email.com",
    cpf: "452.190.638-77",
    firstSessionDate: getTodayString(-10),
    lastSessionDate: getTodayString(1),
    totalSessions: 2,
    notes: "Pilates para gestantes.",
    createdAt: getTodayString(-10)
  }
];

export const initialTestimonials: Testimonial[] = [
  {
    id: "test-1",
    patientName: "Dr. Roberto Guimarães",
    treatmentName: "Protocolo de Tratamento de Coluna",
    rating: 5,
    comment: "Estava com crises terríveis de hérnia de disco e sem conseguir trabalhar. A Dra. Elays Marinho foi extremamente atenciosa e precisa no tratamento. Em poucas semanas voltei a ter qualidade de vida sem dor!",
    date: "2026-07-28",
    verified: true,
    highlight: true,
    patientAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "test-2",
    patientName: "Ana Paula Vasconcelos",
    treatmentName: "Pilates Clínico",
    rating: 5,
    comment: "Faço Pilates no estúdio Fisiolys há 6 meses. O ambiente é acolhedor, limpo e os aparelhos são impecáveis. A Dra. Elays corrige cada movimento com muito carinho. Super recomendo!",
    date: "2026-07-15",
    verified: true,
    highlight: true,
    patientAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "test-3",
    patientName: "Marcos Vinicius Ribeiro",
    treatmentName: "Fisioterapia Domiciliar",
    rating: 5,
    comment: "Minha mãe precisou de atendimento domiciliar pós cirurgia de fêmur. A pontualidade e o carinho com que a equipe Fisiolys a tratou no aconchego do lar foram fundamentais para sua recuperação rápida.",
    date: "2026-06-30",
    verified: true,
    highlight: true,
    patientAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "test-4",
    patientName: "Juliana & Lucas (Mãe do Theo)",
    treatmentName: "Fisioterapia Pediátrica & Ênfase em ABA",
    rating: 5,
    comment: "A Dra. Elays tem um dom maravilhoso com crianças! O Theo ama as sessões lúdicas, evoluiu muito na coordenação e sociabilidade. A melhor clínica de Altamira sem dúvidas!",
    date: "2026-07-02",
    verified: true,
    highlight: false,
    patientAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "test-5",
    patientName: "Camila Fernandes",
    treatmentName: "Massoterapia & Terapia Manual",
    rating: 5,
    comment: "A sessão de massoterapia e libertação miofascial é surreal! Saio leve, sem tensão no pescoço e ombros. Nota 1000 para o atendimento da Fisiolys!",
    date: "2026-06-18",
    verified: true,
    highlight: false,
    patientAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200"
  }
];

export const initialLoyaltyMembers: LoyaltyMember[] = [
  {
    id: "fid-1",
    patientName: "Maria Aparecida Silva",
    patientPhone: "(93) 99188-4422",
    patientCpf: "012.345.678-90",
    patientEmail: "maria.silva@email.com",
    status: "ativo",
    monthlyFee: 99,
    dueDay: 10,
    joinedDate: "2026-01-10",
    accumulatedBalance: 198,
    totalSpent: 297,
    beneficiaries: [
      { id: "ben-1", name: "Gabriel Silva (Filho)", relationship: "Filho(a)", phone: "(93) 99188-4423" },
      { id: "ben-2", name: "Dona Francisca (Mãe)", relationship: "Mãe / Parente 2º Grau", phone: "(93) 99188-1100" }
    ],
    payments: [
      { id: "pay-1", monthYear: "06/2026", amount: 99, paidAt: "2026-06-10", paymentMethod: "pix", receiptNotes: "Mensalidade referente a Junho" },
      { id: "pay-2", monthYear: "07/2026", amount: 99, paidAt: "2026-07-10", paymentMethod: "pix", receiptNotes: "Mensalidade referente a Julho" },
      { id: "pay-3", monthYear: "08/2026", amount: 99, paidAt: "2026-08-01", paymentMethod: "cartao", receiptNotes: "Mensalidade referente a Agosto" }
    ],
    overdueMonths: [],
    notes: "Plano Familiar. A paciente utiliza o saldo acumulado para sessões de Pilates dela e da mãe.",
    createdAt: "2026-01-10T10:00:00Z"
  },
  {
    id: "fid-2",
    patientName: "Carlos Eduardo Mendes",
    patientPhone: "(93) 99201-3344",
    patientCpf: "123.456.789-01",
    patientEmail: "carlos.mendes@email.com",
    status: "ativo",
    monthlyFee: 99,
    dueDay: 15,
    joinedDate: "2026-03-15",
    accumulatedBalance: 99,
    totalSpent: 198,
    beneficiaries: [
      { id: "ben-3", name: "Lucas Mendes (Filho)", relationship: "Filho(a)" }
    ],
    payments: [
      { id: "pay-4", monthYear: "06/2026", amount: 99, paidAt: "2026-06-15", paymentMethod: "pix" },
      { id: "pay-5", monthYear: "07/2026", amount: 99, paidAt: "2026-07-15", paymentMethod: "pix" }
    ],
    overdueMonths: [],
    notes: "Utiliza saldo para sessões de Fisioterapia preventiva.",
    createdAt: "2026-03-15T14:30:00Z"
  },
  {
    id: "fid-3",
    patientName: "Beatriz Nogueira Costa",
    patientPhone: "(93) 99144-5566",
    patientCpf: "234.567.890-12",
    status: "inadimplente",
    monthlyFee: 99,
    dueDay: 5,
    joinedDate: "2026-02-05",
    accumulatedBalance: 0,
    totalSpent: 396,
    beneficiaries: [],
    payments: [
      { id: "pay-6", monthYear: "05/2026", amount: 99, paidAt: "2026-05-05", paymentMethod: "dinheiro" },
      { id: "pay-7", monthYear: "06/2026", amount: 99, paidAt: "2026-06-05", paymentMethod: "pix" }
    ],
    overdueMonths: ["07/2026", "08/2026"],
    notes: "Aguardando pagamento referente aos meses 07 e 08. Lembrete enviado por WhatsApp.",
    createdAt: "2026-02-05T09:00:00Z"
  },
  {
    id: "fid-4",
    patientName: "Dr. Roberto Guimarães",
    patientPhone: "(93) 99111-2233",
    patientCpf: "345.678.901-23",
    status: "inativo",
    monthlyFee: 99,
    dueDay: 20,
    joinedDate: "2025-11-20",
    accumulatedBalance: 0,
    totalSpent: 594,
    beneficiaries: [],
    payments: [
      { id: "pay-8", monthYear: "04/2026", amount: 99, paidAt: "2026-04-20", paymentMethod: "pix" }
    ],
    overdueMonths: [],
    notes: "Plano pausado a pedido do paciente por motivo de viagem prolongada.",
    createdAt: "2025-11-20T11:00:00Z"
  }
];

