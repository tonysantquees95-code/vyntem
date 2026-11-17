# Vyntem (Android + Windows) — notas para quem mexe no código

## Regra de ouro: toda mudança de função vai para a tela "O que há de novo"
- Qualquer melhoria que mude o que o app faz ou como se usa (função nova, fluxo melhorado, correção de erro visível) ganha uma linha em `app/src/novidades.ts`.
- `id` = o maior id existente + 1; `tipo` = `novo`, `melhoria` ou `correcao`; `titulo` curto; `texto` em português simples, dizendo o que mudou para a pessoa (não o que mudou no código).
- A tela aparece sozinha depois da atualização e mostra só o que a pessoa ainda não viu (não depende do número da versão). Na primeira instalação ela não aparece: quem explica é a apresentação.
- O teste `app/teste/novidades.test.mjs` confere ids, tipos e textos.

## Apresentação da primeira abertura
- Tour → permissões explicadas → termos a aceitar, em `app/src/telas/Apresentacao.tsx`; conteúdo em `app/src/apresentacao.ts`.
- Função nova: acrescente (ou ajuste) um passo em `TOUR`. Permissão nova: explique o porquê na tela de permissões ANTES de pedir. Mudou o texto dos termos: suba `VERSAO_DOS_TERMOS`.
- A apresentação e os termos também ficam em Ajustes › Sobre o Vyntem.

## Dados e cálculos
- Dinheiro sempre em **centavos inteiros**; datas como `AAAA-MM-DD` sem fuso. Nada de ponto flutuante para dinheiro.
- Tudo que vem do disco ou de backup passa por `limparBanco` (`dados.ts`). Lógica pura fica em `dados.ts`, `calculos.ts`, `parser.ts`, `perguntas.ts` (testada em `app/teste`); imports entre esses arquivos levam `.ts` para o teste do Node rodar.
- Transferência entre contas não é receita nem despesa. Cartão: saldo negativo = dívida; pagar a fatura é uma transferência para o cartão.

## Inteligência artificial
- DeepSeek lê texto/perguntas; Grok lê a foto da nota. As chaves ficam no servidor, nunca no app. Contrato em `docs/IA.md`. Sem servidor/internet o app usa o entendimento local.

## Visual e personalização (padrão da suíte Vetorial)
- Cores, formato/estilo de botão e pacote de ícones vêm de Ajustes › Personalizar (variáveis `--color-neon`, `--color-magenta`, `--raio-botao`, `--icone-traco`). Telas novas usam `Cartao`, `Botao`, `Folha` e `Icone`, nunca o visual padrão do sistema.
- Ícone novo: desenhe em `icones.tsx` no mesmo estilo de traço.
- Atualização: verificar → barra de download → a pessoa toca em Instalar (igual à Vênus).
