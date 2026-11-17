// Primeira abertura: conhecer as funções, entender a permissão da câmera e aceitar os termos.
// Mudou o texto dos termos: suba VERSAO_DOS_TERMOS e a pessoa aceita de novo.
export const VERSAO_DOS_TERMOS = 2;
const CHAVE_TERMOS = "vyntem.termos";
const CHAVE_TOUR = "vyntem.tour";

export interface PassoDoTour { icone: string; titulo: string; texto: string; como?: string[] }

export const TOUR: PassoDoTour[] = [
  { icone: "🪙", titulo: "Bem-vindo ao Vyntem", texto: "O seu controle de gastos com inteligência artificial: simples de lançar, claro de entender.", como: ["Deslize ou toque em Próximo para conhecer as funções.", "Você pode rever esta apresentação em Ajustes › Sobre o Vyntem."] },
  { icone: "✍️", titulo: "Lance em segundos", texto: "Escreva do seu jeito, como “gastei 45 no mercado ontem” ou “recebi 1200 de salário”, e o Vyntem entende valor, data, categoria e conta. Em categorias como Transporte, escolha uma subcategoria (Gasolina, Uber…) com um toque.", como: ["Use o botão + e escolha Receita, Despesa ou Transferência.", "Ou abra o Assistente e digite a frase: ele mostra o lançamento antes de salvar."] },
  { icone: "📷", titulo: "Foto da nota", texto: "Fotografe uma nota ou um comprovante (ou escolha da galeria) e a IA lê o valor, a loja e a data, e já lança o gasto.", como: ["Errou algo? Toque em Editar ou Desfazer na conversa.", "A foto fica só neste aparelho, anexada ao lançamento."] },
  { icone: "📅", titulo: "Diário, calendário e mais", texto: "Veja os gastos por dia, no calendário com o total de cada dia, por semana, por mês e no total, e navegue pelos períodos.", como: ["Toque num dia do calendário para ver os lançamentos dele.", "Filtre por conta quando quiser."] },
  { icone: "🍩", titulo: "Gráficos", texto: "Rosca por categoria com porcentagens, linha do seu saldo e barras de receitas e despesas mês a mês.", como: ["Crie categorias com o ícone e a cor que quiser.", "Toque numa categoria para ver o que entrou nela."] },
  { icone: "💳", titulo: "Contas e cartões", texto: "Dinheiro, banco e cartão de crédito com fatura, limite, fechamento e vencimento. Transferências entre contas não contam como gasto.", como: ["Parcelou? Informe em quantas vezes e o Vyntem distribui nas faturas.", "Pagou a fatura? Registre como transferência para o cartão."] },
  { icone: "🔄", titulo: "Sempre atualizado", texto: "Ligue Atualizar sozinho em Ajustes e o Vyntem busca versões novas e mostra o que mudou. Em Personalizar você muda cor, botões e ícones.", como: ["Seus dados ficam só neste aparelho; faça cópia em Ajustes › Cópia de segurança."] },
];

export const TERMOS: { titulo: string; texto: string }[] = [
  { titulo: "1. O que é o Vyntem", texto: "O Vyntem é um aplicativo da Vetorial Tech para controlar gastos e receitas pessoais. Ele é gratuito. Nesta fase ainda está em testes (beta): pode ter erros e mudar sem aviso." },
  { titulo: "2. Conta", texto: "Você entra com o seu Vetorial ID, o mesmo dos outros apps da Vetorial Tech, e o uso do Vyntem é gratuito. Se ainda não tem conta, você cria na hora, dentro do app. Você é responsável pela sua conta e pelo que é feito com ela." },
  { titulo: "3. Seus dados", texto: "Os seus lançamentos, contas, categorias e fotos ficam guardados neste aparelho. A Vetorial Tech não os recebe, a menos que você use um recurso de inteligência artificial (item 5)." },
  { titulo: "4. Cópia de segurança", texto: "Se você apagar os dados do app ou trocar de aparelho, perde o que não copiou. Use Ajustes › Cópia de segurança para guardar uma cópia." },
  { titulo: "5. Inteligência artificial", texto: "Para ler a foto de uma nota ou responder perguntas mais livres, o texto ou a imagem enviados são processados por serviços de IA contratados pela Vetorial Tech. Só é enviado o que você escolhe analisar. Sem internet, o Vyntem usa o entendimento básico do próprio aparelho." },
  { titulo: "6. Câmera", texto: "A câmera só é usada quando você toca em tirar foto de uma nota. Você pode retirar a permissão nas configurações do aparelho; o resto do app continua funcionando." },
  { titulo: "7. Não é consultoria", texto: "As dicas do Vyntem são sugestões automáticas e não substituem orientação financeira profissional. Confira sempre os valores lidos pela IA antes de salvar." },
  { titulo: "8. Garantias", texto: "O Vyntem é oferecido como está. A Vetorial Tech não se responsabiliza por perdas decorrentes do uso, por isso mantenha cópias de segurança." },
  { titulo: "9. Mudanças", texto: "Estes termos podem mudar. Quando mudarem, o Vyntem pede que você aceite de novo antes de continuar." },
];

export const termosAceitos = (): boolean => { try { return localStorage.getItem(CHAVE_TERMOS) === String(VERSAO_DOS_TERMOS); } catch { return false; } };
export const aceitarTermos = (): void => { try { localStorage.setItem(CHAVE_TERMOS, String(VERSAO_DOS_TERMOS)); } catch { /* pede de novo */ } };
export const tourVisto = (): boolean => { try { return localStorage.getItem(CHAVE_TOUR) === "1"; } catch { return false; } };
export const marcarTourVisto = (): void => { try { localStorage.setItem(CHAVE_TOUR, "1"); } catch { /* ok */ } };
/** Precisa mostrar a apresentação (tour + permissão + termos) antes de usar? */
export const precisaApresentar = (): boolean => !termosAceitos() || !tourVisto();
