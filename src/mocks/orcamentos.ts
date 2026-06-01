import type {
  Orcamento,
  OrcamentoItem,
  OrcamentoHistorico,
  ClienteResumo,
} from '@/types/orcamentos'

const now = Date.now()
const ago = (h: number) => new Date(now - h * 60 * 60 * 1000)
const future = (days: number) => new Date(now + days * 24 * 60 * 60 * 1000)

// ─── Mock clients ─────────────────────────────────────────────────────────────

export const mockClientes: ClienteResumo[] = [
  {
    id:               'cli-001',
    nome:             'Metalúrgica XYZ Ltda',
    email:            'compras@metalurgicaxyz.com.br',
    telefone:         '(11) 3456-7890',
    cnpj:             '12.345.678/0001-90',
    contatoPrincipal: 'Ricardo Souza',
  },
  {
    id:               'cli-002',
    nome:             'Indústrias ABC S.A.',
    email:            'suprimentos@industriasabc.com.br',
    telefone:         '(11) 2345-6789',
    cnpj:             '98.765.432/0001-10',
    contatoPrincipal: 'Fernanda Costa',
  },
  {
    id:               'cli-003',
    nome:             'TechFab Equipamentos',
    email:            'engenharia@techfab.com.br',
    telefone:         '(19) 3344-5566',
    cnpj:             '55.443.221/0001-33',
    contatoPrincipal: 'Marcos Almeida',
  },
  {
    id:               'cli-004',
    nome:             'SiderSul Componentes',
    email:            'comercial@sidersul.com.br',
    telefone:         '(51) 3311-4422',
    cnpj:             '22.334.556/0001-77',
    contatoPrincipal: 'Patrícia Lima',
  },
]

// ─── Helper: build item ───────────────────────────────────────────────────────

function item(
  id: string,
  orcamentoId: string,
  posicao: number,
  overrides: Partial<OrcamentoItem> & Pick<OrcamentoItem, 'descricao' | 'quantidade' | 'valorUnitario'>,
): OrcamentoItem {
  const valorTotal = overrides.quantidade * overrides.valorUnitario
  return {
    id,
    orcamentoId,
    tipo:    'peca',
    unidade: 'un',
    codigo:  undefined,
    posicao,
    valorTotal,
    ...overrides,
  }
}

// ─── Helper: build history entry ──────────────────────────────────────────────

function hist(
  id: string,
  orcamentoId: string,
  overrides: Omit<OrcamentoHistorico, 'id' | 'orcamentoId'>,
): OrcamentoHistorico {
  return { id, orcamentoId, ...overrides }
}

// ─── Mock orçamentos ──────────────────────────────────────────────────────────

const orc001Itens: OrcamentoItem[] = [
  item('itm-001-1', 'orc-001', 1, {
    tipo:         'conjunto',
    conjuntoId:   'conj-001',
    descricao:    'Painel Elétrico 800×600mm (PAINEL-800)',
    quantidade:   2,
    valorUnitario:3_850.00,
    codigo:       'PAINEL-800',
  }),
  item('itm-001-2', 'orc-001', 2, {
    tipo:         'servico',
    descricao:    'Corte e dobra chapa 3mm Aço Carbono 1020',
    quantidade:   1,
    valorUnitario:1_200.00,
    unidade:      'serv.',
  }),
  item('itm-001-3', 'orc-001', 3, {
    tipo:         'hora_maquina',
    maquinaId:    'maq-laser-001',
    descricao:    'Hora máquina LASER-001',
    quantidade:   4,
    valorUnitario:280.00,
    unidade:      'h',
  }),
]

const orc002Itens: OrcamentoItem[] = [
  item('itm-002-1', 'orc-002', 1, {
    tipo:         'conjunto',
    conjuntoId:   'conj-002',
    descricao:    'Estrutura Linha 04 (EST-L04)',
    quantidade:   1,
    valorUnitario:12_500.00,
    codigo:       'EST-L04',
  }),
  item('itm-002-2', 'orc-002', 2, {
    tipo:         'material',
    descricao:    'Aço Carbono 1020 — chapa 4mm',
    quantidade:   120,
    valorUnitario:32.50,
    unidade:      'kg',
  }),
  item('itm-002-3', 'orc-002', 3, {
    tipo:         'servico',
    descricao:    'Solda MIG — montagem estrutural',
    quantidade:   8,
    valorUnitario:320.00,
    unidade:      'h',
  }),
]

const orc003Itens: OrcamentoItem[] = [
  item('itm-003-1', 'orc-003', 1, {
    tipo:         'peca',
    pecaId:       'peca-sup-ext',
    descricao:    'Suporte Externo 450mm (SUP-EXT-450)',
    quantidade:   10,
    valorUnitario:185.00,
    codigo:       'SUP-EXT-450',
  }),
  item('itm-003-2', 'orc-003', 2, {
    tipo:         'peca',
    descricao:    'Flange DN200 PN10',
    quantidade:   4,
    valorUnitario:420.00,
    codigo:       'FLG-DN200',
  }),
]

const orc004Itens: OrcamentoItem[] = [
  item('itm-004-1', 'orc-004', 1, {
    tipo:         'conjunto',
    descricao:    'Gabinete Industrial 1000×800×300mm',
    quantidade:   3,
    valorUnitario:6_800.00,
    codigo:       'GAB-IND-1000',
  }),
  item('itm-004-2', 'orc-004', 2, {
    tipo:         'servico',
    descricao:    'Pintura epóxi — acabamento industrial',
    quantidade:   3,
    valorUnitario:580.00,
    unidade:      'serv.',
  }),
]

const orc001Total = orc001Itens.reduce((s, i) => s + i.valorTotal, 0)  // 9_990.00
const orc002Total = orc002Itens.reduce((s, i) => s + i.valorTotal, 0)  // 18_360.00
const orc003Total = orc003Itens.reduce((s, i) => s + i.valorTotal, 0)  // 3_530.00
const orc004Total = orc004Itens.reduce((s, i) => s + i.valorTotal, 0)  // 22_140.00

export const mockOrcamentos: Orcamento[] = [
  // ── ORC-2026-001: Aprovado ─────────────────────────────────────────────────
  {
    id:               'orc-001',
    numero:           'ORC-2026-001',
    titulo:           'Painéis Elétricos — Lote 02',
    status:           'aprovado',
    prioridade:       'alta',
    moeda:            'BRL',
    cliente:          mockClientes[0],
    itens:            orc001Itens,
    revisoes:         [],
    historico:        [
      hist('hst-001-1', 'orc-001', { tipo: 'criacao',   descricao: 'Orçamento criado',                    usuario: 'Carlos Mendes', timestamp: ago(96) }),
      hist('hst-001-2', 'orc-001', { tipo: 'envio',     descricao: 'Orçamento enviado ao cliente',        usuario: 'Carlos Mendes', timestamp: ago(72) }),
      hist('hst-001-3', 'orc-001', { tipo: 'aprovacao', descricao: 'Aprovado pelo cliente via e-mail',    usuario: 'Carlos Mendes', timestamp: ago(24) }),
    ],
    conjuntoIds:       ['conj-001'],
    solicitacaoProducaoId: undefined,
    valorTotal:        orc001Total,
    validadeAte:       future(15),
    condicoesPagamento:'50% entrada, 50% na entrega',
    prazoEntrega:      '20 dias úteis',
    garantia:          '12 meses contra defeitos de fabricação',
    condicoesComerciais:'Os preços são válidos pelo período de validade da proposta. Quaisquer alterações no escopo implicarão em nova proposta. Frete não incluso.',
    revisaoAtual:      0,
    descricao:         'Fornecimento e fabricação de 2 painéis elétricos 800×600mm conforme especificação técnica Rev. 03.',
    observacoes:       'Cliente solicita entrega parcial — 1 painel em 10 dias, 1 painel em 20 dias.',
    responsavel:       'Carlos Mendes',
    criadoPor:         'Carlos Mendes',
    criadoEm:          ago(96),
    atualizadoEm:      ago(24),
    enviadoEm:         ago(72),
    aprovadoEm:        ago(24),
  },

  // ── ORC-2026-002: Enviado ──────────────────────────────────────────────────
  {
    id:               'orc-002',
    numero:           'ORC-2026-002',
    titulo:           'Estrutura Metálica — Linha 04',
    status:           'enviado',
    prioridade:       'alta',
    moeda:            'BRL',
    cliente:          mockClientes[1],
    itens:            orc002Itens,
    revisoes:         [],
    historico:        [
      hist('hst-002-1', 'orc-002', { tipo: 'criacao', descricao: 'Orçamento criado', usuario: 'Ana Lima', timestamp: ago(48) }),
      hist('hst-002-2', 'orc-002', { tipo: 'envio',   descricao: 'Enviado por e-mail — aguardando retorno', usuario: 'Ana Lima', timestamp: ago(6) }),
    ],
    conjuntoIds:       ['conj-002'],
    valorTotal:        orc002Total,
    validadeAte:       future(25),
    condicoesPagamento:'30/70 — 30% entrada, 70% contra entrega NF',
    prazoEntrega:      '30 dias corridos',
    revisaoAtual:      0,
    descricao:         'Estrutura metálica completa para linha de produção 04, incluindo solda e pintura.',
    observacoes:       'Aguardando aprovação da engenharia do cliente.',
    responsavel:       'Ana Lima',
    criadoPor:         'Ana Lima',
    criadoEm:          ago(48),
    atualizadoEm:      ago(6),
    enviadoEm:         ago(6),
  },

  // ── ORC-2026-003: Em Elaboração ────────────────────────────────────────────
  {
    id:               'orc-003',
    numero:           'ORC-2026-003',
    titulo:           'Suportes e Flanges — Pedido Especial',
    status:           'em_elaboracao',
    prioridade:       'media',
    moeda:            'BRL',
    cliente:          mockClientes[2],
    itens:            orc003Itens,
    revisoes:         [],
    historico:        [
      hist('hst-003-1', 'orc-003', { tipo: 'criacao', descricao: 'Orçamento criado a partir de solicitação telefônica', usuario: 'Roberto Silva', timestamp: ago(4) }),
    ],
    conjuntoIds:       [],
    valorTotal:        orc003Total,
    validadeAte:       future(30),
    revisaoAtual:      0,
    descricao:         'Suportes externos e flanges para linha de montagem do cliente.',
    observacoes:       'Verificar disponibilidade de inox 316 no estoque antes de fechar valor.',
    responsavel:       'Roberto Silva',
    criadoPor:         'Roberto Silva',
    criadoEm:          ago(4),
    atualizadoEm:      ago(4),
  },

  // ── ORC-2026-004: Reprovado ────────────────────────────────────────────────
  {
    id:               'orc-004',
    numero:           'ORC-2026-004',
    titulo:           'Gabinetes Industriais — Série GI-1000',
    status:           'reprovado',
    prioridade:       'baixa',
    moeda:            'BRL',
    cliente:          mockClientes[3],
    itens:            orc004Itens,
    revisoes:         [],
    historico:        [
      hist('hst-004-1', 'orc-004', { tipo: 'criacao',    descricao: 'Orçamento criado',           usuario: 'Fernanda Rocha', timestamp: ago(240) }),
      hist('hst-004-2', 'orc-004', { tipo: 'envio',      descricao: 'Enviado ao cliente',          usuario: 'Fernanda Rocha', timestamp: ago(216) }),
      hist('hst-004-3', 'orc-004', { tipo: 'reprovacao', descricao: 'Reprovado — preço acima do orçamento disponível do cliente', usuario: 'Fernanda Rocha', timestamp: ago(168) }),
    ],
    conjuntoIds:       [],
    valorTotal:        orc004Total,
    validadeAte:       ago(2),   // already expired
    condicoesPagamento:'À vista com 5% de desconto',
    prazoEntrega:      '25 dias úteis',
    revisaoAtual:      0,
    descricao:         'Fabricação de 3 gabinetes industriais com acabamento em pintura epóxi.',
    observacoes:       'Cliente indicou que o preço está 18% acima do teto de orçamento.',
    observacoesInternas: 'Possível renegociação reduzindo o acabamento de pintura epóxi para esmalte sintético.',
    responsavel:       'Fernanda Rocha',
    criadoPor:         'Fernanda Rocha',
    criadoEm:          ago(240),
    atualizadoEm:      ago(168),
    enviadoEm:         ago(216),
    reprovadoEm:       ago(168),
  },
]
