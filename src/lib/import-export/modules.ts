// ─── Per-module field aliases for flexible column matching ───────────────────
// These allow the parser to recognize common column name variations
// (exported files, custom spreadsheets, different languages)

export type ModuleAliasMap = Record<string, string[]>

export const MODULE_ALIASES: Record<string, ModuleAliasMap> = {
  pecas: {
    codigo:          ['cod', 'code', 'sku'],
    espessura:       ['esp', 'thickness', 'espessuramm', 'mm'],
    descricao:       ['desc', 'nome', 'name', 'description', 'peca', 'item'],
    grupo:           ['group', 'grp'],
    familia:         ['family', 'fam'],
    codigoSistema:   ['codigosistema', 'systemcode', 'syscode', 'codigosist'],
    areaPeca:        ['area', 'areapeca', 'areamm2', 'area_mm2'],
    desperdicio:     ['scrap', 'waste', 'desperdiciom2'],
    percFabricacao:  ['fabricacao', 'fab', 'percfab', 'fabricacaopercent'],
    percPintura:     ['pintura', 'paint', 'percpintura', 'pinturapercent'],
    peso:            ['weight', 'kg', 'massakg', 'pesokg'],
    cor:             ['color', 'colour'],
    arquivo3d:       ['model3d', 'arquivo3d', 'ipt', '3d'],
    planoDobra:      ['plano', 'dobra', 'pdf', 'dwg', 'benddrawing'],
    atualizadoEm:    ['atualizadoem', 'updatedat', 'updated'],
  },
  programas: {
    codigo:            ['cod', 'code', 'programcode', 'id'],
    nome:              ['name', 'description', 'desc', 'programa'],
    maquina:           ['machine', 'equipamento', 'cnc', 'equipment'],
    material:          ['mat', 'materia'],
    versao:            ['version', 'ver', 'rev', 'revision'],
    status:            ['situacao', 'state'],
    tempoEstimado:     ['tempo', 'timemin', 'tempominutos', 'estimatedtime', 'duracao'],
    operador:          ['operator', 'responsavel', 'programador', 'programmer'],
  },
  retalhos: {
    codigo:            ['cod', 'code', 'scrapcode'],
    material:          ['mat', 'materia'],
    largura:           ['width', 'w', 'larguramm', 'widthmm'],
    altura:            ['height', 'h', 'alturamm', 'heightmm'],
    espessura:         ['esp', 'thickness', 'e'],
    peso:              ['weight', 'kg'],
    localizacao:       ['local', 'location', 'prateleira'],
    status:            ['situacao', 'state'],
    pecaOrigem:        ['origem', 'source', 'origempeca', 'pecadeorigem', 'sourcepartnumber'],
  },
  estoque: {
    codigoPeca:        ['codigo', 'cod', 'code', 'sku', 'partnumber'],
    descricao:         ['nome', 'name', 'description', 'desc'],
    material:          ['mat'],
    espessura:         ['esp', 'thickness'],
    quantidade:        ['qtd', 'qty', 'quantity', 'stock'],
    quantidadeMinima:  ['qtdmin', 'minimo', 'safetystock'],
    localizacao:       ['local', 'location'],
    status:            ['situacao'],
    unidade:           ['unit', 'un'],
    origemPrograma:    ['programa', 'origin', 'source'],
  },
}

export function getAliasesForModule(
  moduleName: string,
  fieldKey: string
): string[] {
  return MODULE_ALIASES[moduleName]?.[fieldKey] ?? []
}
