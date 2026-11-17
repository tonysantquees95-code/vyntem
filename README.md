# Vyntem

Controle de gastos com inteligência artificial, da Vetorial Tech. Android (Capacitor) e Windows (Tauri), mesma interface.

- Lance por frase ("gastei 45 no mercado ontem"), por foto da nota (Grok) ou à mão.
- Diário, calendário com total por dia, semana, mês e total; navegação por período; filtro por conta.
- Rosca por categoria, linha do saldo, barras de receitas e despesas.
- Contas, cartões com fatura/limite/fechamento/vencimento, transferências, parcelas.
- Categorias com ícone e cor próprios; personalização da suíte (cor, botões, ícones); modo "esconder valores".
- Dados só no aparelho (localStorage + IndexedDB para fotos); backup por texto em Ajustes.

## Desenvolvimento
```
cd app && npm install && npm run test && npm run typecheck && npm run build
```
Leia `CLAUDE.md` antes de mexer. Contrato da IA: `docs/IA.md`.
