import type { DistrictId } from '../types/integra';

export interface CrasUnit {
  id: string;
  name: string;
  address: string;
  phone: string;
  districtId: DistrictId;
  coords: [number, number];
}

export interface MunicipalSchool {
  id: string;
  name: string;
  neighborhood: string;
  districtId: DistrictId;
  coords: [number, number];
}

export interface GovernmentPolicyItem {
  id: string;
  name: string;
  sphere: 'Municipal (Maricá)' | 'Federal';
  category: 'Renda' | 'Educação' | 'Mobilidade' | 'Moradia' | 'Assistência e Saúde';
  defaultValue: number;
  summary: string;
  keywords: string[];
}

export const MARICA_CRAS_UNITS: CrasUnit[] = [
  {
    id: 'cras-centro',
    name: 'CRAS Centro',
    address: 'Rua Domício da Gama, Lote 18, Qd. 03 — Centro',
    phone: '(21) 3731-0353',
    districtId: 1,
    coords: [-22.9195, -42.8188],
  },
  {
    id: 'cras-itaipuacu',
    name: 'CRAS Itaipuaçu',
    address: 'Rua Professor Cardoso de Menezes, Lt. 37, Qd. 01 — Itaipuaçu',
    phone: '(21) 2638-6525',
    districtId: 4,
    coords: [-22.9579, -42.9612],
  },
  {
    id: 'cras-jardim-atlantico',
    name: 'CRAS Jardim Atlântico',
    address: 'Rua 36, Jardim Atlântico Central — Itaipuaçu',
    phone: '(21) 2637-3648',
    districtId: 4,
    coords: [-22.9614, -42.9502],
  },
  {
    id: 'cras-inoa',
    name: 'CRAS Inoã',
    address: 'Rua 05, Lote 01 (próximo ao CIEP) — Inoã',
    phone: '(21) 2636-6532',
    districtId: 3,
    coords: [-22.9078, -42.9315],
  },
  {
    id: 'cras-bosque-fundo',
    name: 'CRAS Bosque Fundo',
    address: 'Rua 35, Lotes 5 ao 14 — Bosque Fundo (Inoã)',
    phone: '(21) 2636-6532',
    districtId: 3,
    coords: [-22.9041, -42.9219],
  },
  {
    id: 'cras-sao-jose',
    name: 'CRAS São José do Imbassaí',
    address: 'Rua Ibiapina, Lotes 21 e 22, Qd. 44 — São José do Imbassaí',
    phone: '(21) 2636-8506',
    districtId: 5,
    coords: [-22.9325, -42.8812],
  },
  {
    id: 'cras-ponta-negra',
    name: 'CRAS Região Oceânica / Ponta Negra',
    address: 'Av. Maísa Monjardim, Qd. 195, Lt. 05 (esq. Rua 135) — Cordeirinho / Ponta Negra',
    phone: '(21) 2648-8049',
    districtId: 2,
    coords: [-22.9489, -42.7322],
  },
];

export const MARICA_MUNICIPAL_SCHOOLS: MunicipalSchool[] = [
  {
    id: 'esc-joana-benedicta',
    name: 'E.M. Joana Benedicta Rangel',
    neighborhood: 'Centro',
    districtId: 1,
    coords: [-22.9204, -42.8165],
  },
  {
    id: 'esc-zilca',
    name: 'CEPT Zilca Lopes da Fontoura',
    neighborhood: 'Flamengo',
    districtId: 1,
    coords: [-22.9128, -42.8062],
  },
  {
    id: 'esc-marques',
    name: 'E.M. Marquês de Maricá',
    neighborhood: 'Marquês de Maricá',
    districtId: 1,
    coords: [-22.9058, -42.7941],
  },
  {
    id: 'esc-benvindo',
    name: 'E.M. Benvindo Taques Horta',
    neighborhood: 'Ubatiba',
    districtId: 1,
    coords: [-22.8874, -42.7995],
  },
  {
    id: 'esc-ponta-negra',
    name: 'E.M. Alfredo Nicolau da Silva',
    neighborhood: 'Ponta Negra',
    districtId: 2,
    coords: [-22.9485, -42.7025],
  },
  {
    id: 'esc-amanda-pena',
    name: 'E.M. Amanda Peña de Azevedo Soares',
    neighborhood: 'Bananal',
    districtId: 2,
    coords: [-22.9251, -42.7094],
  },
  {
    id: 'esc-darcy-inoa',
    name: 'E.M. Darcy Ribeiro',
    neighborhood: 'Inoã',
    districtId: 3,
    coords: [-22.9082, -42.9265],
  },
  {
    id: 'esc-carlos-magno',
    name: 'E.M. Carlos Magno Legentil de Mattos',
    neighborhood: 'Jardim Atlântico Central',
    districtId: 4,
    coords: [-22.9628, -42.9532],
  },
  {
    id: 'esc-cept-itaipuacu',
    name: 'CEPT Itaipuaçu (Rua Elisa Vieira Veras)',
    neighborhood: 'Jardim Atlântico Central',
    districtId: 4,
    coords: [-22.9569, -42.9541],
  },
  {
    id: 'esc-sao-jose',
    name: 'E.M. João Monteiro',
    neighborhood: 'São José do Imbassaí',
    districtId: 5,
    coords: [-22.9195, -42.8645],
  },
];

export const PASSAPORTE_UNIVERSITIES = [
  'Universidade de Vassouras — Campus Maricá',
  'Universidade Estácio de Sá — Campus Maricá',
  'Faculdade de Ciências Médicas de Maricá (FACMAR)',
  'Centro Universitário La Salle (Unilasalle-RJ)',
  'Centro Universitário Serra dos Órgãos (UNIFESO)',
  'Faculdade União Araruama de Ensino (UNILAGOS)',
  'Faculdade Cenecista',
  'Outra instituição credenciada',
] as const;

export const PASSAPORTE_COURSES = [
  'Administração',
  'Análise e Desenvolvimento de Sistemas',
  'Arquitetura e Urbanismo',
  'Biomedicina',
  'Ciências Aeronáuticas',
  'Direito',
  'Educação Física',
  'Enfermagem',
  'Engenharia Civil',
  'Engenharia de Produção',
  'Farmácia',
  'Medicina',
  'Pedagogia',
  'Psicologia',
  'Terapia Ocupacional',
  'Outro curso',
] as const;

export const GOVERNMENT_POLICIES_CATALOG: GovernmentPolicyItem[] = [
  {
    id: 'pol-rbc',
    name: 'Renda Básica de Cidadania (Mumbuca)',
    sphere: 'Municipal (Maricá)',
    category: 'Renda',
    defaultValue: 460,
    summary: 'Transferência mensal em moeda social Mumbuca para famílias cadastradas.',
    keywords: ['mumbuca', 'renda', 'beneficio', 'cartao', 'desempregado', 'baixa renda', 'cadunico'],
  },
  {
    id: 'pol-mumbuca-trabalho',
    name: 'Mumbuca Trabalho',
    sphere: 'Municipal (Maricá)',
    category: 'Renda',
    defaultValue: 350,
    summary: 'Complemento mensal para beneficiários inseridos no emprego formal (CLT).',
    keywords: ['clt', 'emprego', 'carteira assinada', 'trabalho', 'salario'],
  },
  {
    id: 'pol-mumbuca-futuro',
    name: 'Mumbuca Futuro (Poupança Jovem)',
    sphere: 'Municipal (Maricá)',
    category: 'Educação',
    defaultValue: 150,
    summary: 'Bolsa e poupança educacional para estudantes da rede pública de ensino.',
    keywords: ['escola', 'aluno', 'estudante', 'filho', 'adolescente', 'ensino medio', 'poupanca'],
  },
  {
    id: 'pol-mumbuca-gestante',
    name: 'Mumbuca Gestante / Mãe Maricaense',
    sphere: 'Municipal (Maricá)',
    category: 'Assistência e Saúde',
    defaultValue: 230,
    summary: 'Apoio à gestante e primeira infância com acompanhamento em Unidade de Saúde da Família.',
    keywords: ['gestante', 'gravida', 'bebe', 'pre-natal', 'mae', 'ubs', 'usf'],
  },
  {
    id: 'pol-passaporte',
    name: 'Passaporte Universitário',
    sphere: 'Municipal (Maricá)',
    category: 'Educação',
    defaultValue: 680,
    summary: 'Bolsa integral de graduação em instituições credenciadas pelo município.',
    keywords: ['faculdade', 'universidade', 'graduacao', 'passaporte', 'curso superior', 'vassouras', 'estacio'],
  },
  {
    id: 'pol-ppt',
    name: 'Programa de Proteção ao Trabalhador (PPT)',
    sphere: 'Municipal (Maricá)',
    category: 'Renda',
    defaultValue: 300,
    summary: 'Apoio municipal voltado a autônomos, MEIs e trabalhadores informais.',
    keywords: ['autonomo', 'mei', 'informal', 'empreendedor', 'conta propria'],
  },
  {
    id: 'pol-aluguel',
    name: 'Auxílio Aluguel / Locação Social',
    sphere: 'Municipal (Maricá)',
    category: 'Moradia',
    defaultValue: 500,
    summary: 'Subsídio habitacional para famílias em vulnerabilidade que residem de aluguel.',
    keywords: ['aluguel', 'alugada', 'moradia', 'casa'],
  },
  {
    id: 'pol-vermelhinho',
    name: 'Tarifa Zero (Vermelhinhos — Ônibus)',
    sphere: 'Municipal (Maricá)',
    category: 'Mobilidade',
    defaultValue: 0,
    summary: 'Transporte coletivo gratuito operado pela EPT em todo o município.',
    keywords: ['onibus', 'transporte', 'vermelhinho', 'tarifa zero', 'trabalho', 'deslocamento'],
  },
  {
    id: 'pol-vermelhinhas',
    name: 'Vermelhinhas (Bicicletas Compartilhadas)',
    sphere: 'Municipal (Maricá)',
    category: 'Mobilidade',
    defaultValue: 0,
    summary: 'Sistema municipal gratuito com 68 estações de bicicletas adulto e infantil.',
    keywords: ['bicicleta', 'bike', 'vermelhinha', 'ciclovia', 'estacao'],
  },
  {
    id: 'pol-bolsa-familia',
    name: 'Bolsa Família',
    sphere: 'Federal',
    category: 'Renda',
    defaultValue: 600,
    summary: 'Programa federal de transferência de renda vinculado ao CadÚnico.',
    keywords: ['bolsa familia', 'cadunico', 'federal', 'filhos', 'dependentes', 'desempregado'],
  },
  {
    id: 'pol-bpc',
    name: 'BPC / LOAS',
    sphere: 'Federal',
    category: 'Assistência e Saúde',
    defaultValue: 1518,
    summary: 'Benefício de Prestação Continuada para idosos (65+) e pessoas com deficiência.',
    keywords: ['bpc', 'loas', 'idoso', 'aposentado', 'pcd', 'deficiencia'],
  },
  {
    id: 'pol-tarifa-social',
    name: 'Tarifa Social de Energia Elétrica',
    sphere: 'Federal',
    category: 'Moradia',
    defaultValue: 0,
    summary: 'Desconto na conta de energia elétrica para famílias inscritas no CadÚnico.',
    keywords: ['luz', 'energia', 'enel', 'tarifa social', 'cadunico'],
  },
];

export interface AiPolicySuggestion {
  policy: GovernmentPolicyItem;
  reason: string;
}

/**
 * Assistente inteligente que analisa o perfil preenchido e/ou descrição em linguagem natural
 * para sugerir políticas municipais e federais compatíveis para autodeclaração.
 */
export function suggestPoliciesWithAI(
  profile: {
    age: number;
    employmentStatus: string;
    workRegime: string;
    housingType: string;
    individualIncome: number;
    householdSize: number;
    dependentsCount: number;
    education: string;
    hasPublicSchoolStudent: boolean;
    hasPassaporte: boolean;
    hasCadUnico: boolean;
  },
  promptText: string
): AiPolicySuggestion[] {
  const normalized = promptText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const suggestions: AiPolicySuggestion[] = [];
  const add = (id: string, reason: string) => {
    if (suggestions.some((s) => s.policy.id === id)) return;
    const policy = GOVERNMENT_POLICIES_CATALOG.find((p) => p.id === id);
    if (policy) suggestions.push({ policy, reason });
  };

  // Profile-based rules
  if (profile.hasCadUnico || profile.individualIncome <= 3036) {
    add('pol-rbc', 'Perfil compatível com a Renda Básica de Cidadania de Maricá (CadÚnico / renda).');
  }
  if (profile.workRegime === 'CLT') {
    add('pol-mumbuca-trabalho', 'Vínculo CLT declarado — verifique se acessa o Mumbuca Trabalho.');
  }
  if (profile.workRegime === 'MEI' || profile.workRegime === 'INFORMAL' || profile.employmentStatus === 'AUTONOMO') {
    add('pol-ppt', 'Atuação autônoma/MEI/informal compatível com o Programa de Proteção ao Trabalhador.');
  }
  if (profile.hasPublicSchoolStudent || profile.dependentsCount > 0) {
    add('pol-mumbuca-futuro', 'Núcleo familiar com dependentes/estudantes elegível ao Mumbuca Futuro.');
  }
  if (profile.hasPassaporte || profile.education === 'Superior incompleto') {
    add('pol-passaporte', 'Ensino superior em andamento — compatível com o Passaporte Universitário.');
  }
  if (profile.housingType === 'ALUGADA') {
    add('pol-aluguel', 'Moradia alugada informada — confira se recebe Auxílio Aluguel / Locação Social.');
  }
  if (profile.age >= 65 || profile.employmentStatus === 'APOSENTADO') {
    add('pol-bpc', 'Faixa etária/perfil previdenciário compatível com BPC / LOAS.');
  }
  if (profile.hasCadUnico && (profile.dependentsCount > 0 || profile.individualIncome <= 1518)) {
    add('pol-bolsa-familia', 'Cadastro no CadÚnico com perfil compatível com o Bolsa Família.');
    add('pol-tarifa-social', 'Famílias no CadÚnico costumam acessar a Tarifa Social de Energia.');
  }

  // Always helpful municipal mobility policies
  add('pol-vermelhinho', 'Mobilidade gratuita municipal (Tarifa Zero) amplamente usada por moradores.');
  add('pol-vermelhinhas', 'Rede gratuita de 68 estações de bicicletas compartilhadas em Maricá.');

  // Natural-language keyword boost from user prompt
  if (normalized.trim().length > 1) {
    for (const pol of GOVERNMENT_POLICIES_CATALOG) {
      const matched = pol.keywords.find((kw) => normalized.includes(kw));
      if (matched) {
        add(pol.id, `Identificado na sua descrição ("${matched}").`);
      }
    }
  }

  return suggestions;
}
