// "O que há de novo": a tela que aparece depois de uma atualização.
// REGRA: toda mudança que altere o que o app faz ou como se usa (função nova, melhoria de fluxo, correção) ganha uma linha AQUI,
// com id = o maior id + 1. A tela mostra só o que a pessoa ainda não viu, então não depende do número da versão.
export type TipoNovidade = "novo" | "melhoria" | "correcao";
export interface Novidade { id: number; data: string; tipo: TipoNovidade; titulo: string; texto: string }

export const NOVIDADES: Novidade[] = [
  { id: 1, data: "2026-11-17", tipo: "novo", titulo: "Nasce o Vyntem", texto: "Controle de gastos com inteligência artificial: lance por frase (“gastei 45 no mercado”), por foto da nota, veja o calendário, os gráficos por categoria, suas contas e cartões com fatura, e pergunte ao assistente como está o seu mês." },
  { id: 2, data: "2026-11-17", tipo: "melhoria", titulo: "Assistente com a caixa embaixo", texto: "Na aba Assistente, a caixa de escrever agora fica fixa embaixo da tela, como nos outros assistentes de IA, e as mensagens aparecem acima dela." },
  { id: 3, data: "2026-11-17", tipo: "novo", titulo: "Subcategorias prontas", texto: "Ao lançar um gasto, depois de escolher a categoria aparecem opções para um toque, como Gasolina ou Uber/Táxi em Transporte. Você pode mudar essas opções em Categorias. Se escrever “100 de gasolina” no assistente, ele já escolhe sozinho." },
  { id: 4, data: "2026-11-17", tipo: "melhoria", titulo: "Caixas de escolha do Vyntem", texto: "A escolha de conta, tipo, parcelas e data agora abre telinhas no visual do Vyntem, com calendário próprio, no lugar das caixas cinzas do Android." },
  { id: 5, data: "2026-11-17", tipo: "correcao", titulo: "Tirar foto da nota", texto: "Agora dá para abrir a câmera direto para fotografar a nota, ou escolher uma foto da galeria. Antes só aparecia a galeria." },
  { id: 6, data: "2026-11-17", tipo: "correcao", titulo: "Botão + não cobre mais os valores", texto: "Ao rolar a tela até o fim, o botão de novo lançamento não fica mais por cima das últimas linhas." },
  { id: 7, data: "2026-11-17", tipo: "correcao", titulo: "Novidades rolam até o fim", texto: "A tela “O que há de novo” agora rola, e o botão Entendi sempre aparece embaixo, mesmo quando há muitas novidades." },
  { id: 8, data: "2026-11-17", tipo: "melhoria", titulo: "Lançamento direto no Assistente", texto: "Ao escrever “gastei 45 no mercado” ou mandar a foto de uma nota, o gasto agora é lançado na hora, sem tela de confirmação. Na própria conversa você pode tocar em Editar para ajustar ou em Desfazer para apagar." },
  { id: 9, data: "2026-11-17", tipo: "novo", titulo: "Vyntem grátis, com Vetorial ID", texto: "O Vyntem agora é gratuito para sempre: não tem teste nem plano. Para usar, entre com o seu Vetorial ID, ou crie a conta na hora, dentro do próprio app. Também corrigi a leitura da data nas notas fiscais: 08/11 agora é 8 de novembro." },
  { id: 10, data: "2026-11-17", tipo: "novo", titulo: "Recuperar a senha sem e-mail", texto: "Ao criar a conta você define uma senha de recuperação de 6 números e uma pergunta secreta com a resposta. Se esquecer a senha, toque em “Recupere aqui” na tela de entrada, escolha um dos dois jeitos e crie a senha nova. Guarde bem esses dados." },
  { id: 11, data: "2026-11-18", tipo: "melhoria", titulo: "Botões mais fáceis de tocar", texto: "Os botões de fechar, pular e ver mais ficaram maiores, para acertar com o dedo sem errar." },
  { id: 12, data: "2026-11-21", tipo: "novo", titulo: "Feedback e relato de erros", texto: "Em Ajustes › Sobre o Vyntem você encontra Enviar feedback e Reportar um erro: conte o que achou, avise quando algo não funcionou e responda uma pesquisa rápida de 1 minuto. O Vyntem está em fase de testes (beta) e cada relato ajuda a melhorar." },
  { id: 13, data: "2026-11-22", tipo: "novo", titulo: "Vendas da Vênus caem no seu caixa", texto: "Se você usa a Vênus na sua loja, cada venda paga e confirmada entra sozinha aqui, na conta Caixa da loja, com o número do pedido e o nome do cliente. Pedido aguardando pagamento não entra, e venda cancelada ou devolvida vira um estorno. Ative a ligação na Vênus, em Minha loja." },
  { id: 14, data: "2026-11-25", tipo: "novo", titulo: "Contas a pagar e a receber", texto: "Nova tela A pagar e receber: cadastre o que vai vencer (aluguel, fornecedor, uma venda a receber) e veja o que está atrasado, o que vence hoje e nos próximos dias, também na tela Início. Toque em Paguei ou Recebi e o Vyntem faz o lançamento sozinho. No Android, ele avisa na véspera (18h) e no dia do vencimento (9h); dá para desligar em Ajustes." },
  { id: 15, data: "2026-11-25", tipo: "novo", titulo: "Pessoal e Negócio no mesmo app", texto: "Agora cada conta pode ser Pessoal ou Negócio (em Contas, toque em editar). Use a chave no topo, Tudo, Pessoal ou Negócio, para ver só um lado em Início, Lançamentos, Gráficos, Contas e A pagar e receber. O Caixa da loja da Vênus já fica no Negócio." },
  { id: 16, data: "2026-11-25", tipo: "novo", titulo: "Relatório do mês em PDF", texto: "Em Gráficos, no fim da tela, gere o relatório do mês em PDF: entradas, saídas, quanto sobrou, gastos por categoria, maiores saídas e contas em aberto. Dá para mandar pelo WhatsApp ou e-mail, ou guardar. Ele respeita a chave Pessoal ou Negócio. É feito no seu aparelho e não tem valor fiscal." },
];

export const ROTULO: Record<TipoNovidade, string> = { novo: "Novo", melhoria: "Melhorou", correcao: "Corrigido" };
export const ultimoId = (lista: Novidade[] = NOVIDADES): number => lista.reduce((m, n) => Math.max(m, n.id), 0);
/** O que a pessoa ainda não viu, da mais nova para a mais antiga. */
export const novasDesde = (visto: number, lista: Novidade[] = NOVIDADES): Novidade[] => lista.filter((n) => n.id > visto).sort((a, b) => b.id - a.id);

const CHAVE = "vyntem.novidades.vistas";
/** null = nunca guardou (primeira instalação: a apresentação já explica tudo, então não mostra o histórico). */
export function lerVisto(): number | null {
  try { const v = localStorage.getItem(CHAVE); if (v === null) return null; const n = Number(v); return Number.isInteger(n) && n >= 0 ? n : null; } catch { return null; }
}
export function marcarVisto(id: number = ultimoId()): void {
  try { localStorage.setItem(CHAVE, String(id)); } catch { /* sem armazenamento: mostra de novo na próxima vez */ }
}
