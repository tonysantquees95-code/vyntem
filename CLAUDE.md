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

- Vênus → Vyntem (`app/src/caixa.ts`, lógica pura testada em `teste/caixa.test.mjs`; `sincCaixa.ts` busca no servidor): venda PAGA e confirmada na Vênus vira lançamento de receita na conta `a-loja` "Caixa da loja" (categoria "Vendas da loja", nota "Pedido #N · Cliente"); cancelada ou devolvida vira estorno (despesa). O id do lançamento é fixo (`loja-<tipo>-<ref>`): reaplicar nunca duplica. Pedido aguardando pagamento nunca entra. Servidor: `GET /financas/caixa?desde=<seq>` (`servidor/src/financas/caixa.js`).

## Inteligência artificial
- DeepSeek lê texto/perguntas; Groq lê a foto da nota (plano gratuito). Entrada e licença pelo Vetorial ID. As chaves ficam no servidor, nunca no app. Contrato em `docs/IA.md`. Sem servidor/internet o app usa o entendimento local.

## Visual e personalização (padrão da suíte Vetorial)
- Cores, formato/estilo de botão e pacote de ícones vêm de Ajustes › Personalizar (variáveis `--color-neon`, `--color-magenta`, `--raio-botao`, `--icone-traco`). Telas novas usam `Cartao`, `Botao`, `Folha` e `Icone`, nunca o visual padrão do sistema.
- Ícone novo: desenhe em `icones.tsx` no mesmo estilo de traço.
- Atualização: verificar → barra de download → a pessoa toca em Instalar (igual à Vênus).

## Teste visual das telas
- `app/teste-visual/telas.mjs` (motor) + `config.mjs` (telas a visitar) — `npm run build && npm run test:visual` abre o app em 7 tamanhos (celular pequeno até janela do Windows) e confere se cada tela e janela cabe, não estoura para o lado e se todo botão dá para alcançar. Roda na publicação e guarda as fotos como artefato `fotos-das-telas`.
- Tela ou janela nova: acrescente um cenário em `config.mjs`.

## Feedback e relato de erro
- Ajustes › Sobre tem "Enviar feedback" e "Reportar um erro": abrem `telas/FeedbackDoApp.tsx` (página do servidor `/feedback?app=vyntem&v=<versão>&p=<plataforma>` num iframe, com o visual do app). Os relatos chegam no Painel Dev › Feedback. Windows: o CSP do `tauri.conf.json` precisa de `frame-src` do servidor. Cenário `feedback` no teste visual.

## Contas a pagar/receber, Pessoal/Negócio e relatório em PDF
- Pendências (`app/src/pendencias.ts`, pura e testada em `teste/negocio.test.mjs`): `Banco.pendencias`; pagar cria o lançamento de id fixo `pend-<id>` (reaplicar não duplica) e desfazer apaga. Tela `telas/Pendencias.tsx` (aba "A pagar e receber"). Lembretes: `lembretes()` (véspera 18h e dia 9h, só futuros, até 60) → `motor.agendarLembretes` (Capacitor LocalNotifications; só pede a permissão POST_NOTIFICATIONS quando há lembrete; `POST_NOTIFICATIONS` também está no `PERMS` do workflow). Chave em Ajustes: "Lembrar das contas a vencer". A permissão é explicada na apresentação antes de pedir (`VERSAO_DOS_TERMOS` = 3).
- Pessoal/Negócio (`escopo.ts`): cada conta tem `escopo`; a conta `a-loja` nasce como negócio. A visão (Tudo/Pessoal/Negócio, `vyntem.visao`) filtra Início, Lançamentos, A pagar, Gráficos e Contas (`useBancoDaVisao`).
- Relatório do mês (`relatorio.ts`): `montarRelatorio` + `pdfDoRelatorio` (pdf-lib, A4) em Gráficos; sai por `motor.entregarArquivo` (Android: Filesystem cache + Share; outros: download).
- Dependências novas: pdf-lib, @capacitor/local-notifications, @capacitor/filesystem, @capacitor/share (versão 7). Notificação e compartilhamento só dá para testar de verdade no aparelho.
- Teste visual: modo "contas" (`bancoComContas()`) com cenários `pendencias-*`, `inicio-contas-a-vencer`, `visao-*`, `conta-escopo`, `relatorio-pdf`.
