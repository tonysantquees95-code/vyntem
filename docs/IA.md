# Inteligência artificial do Vyntem

O app chama **`POST {SERVIDOR}/financas/ia`** (JSON). O servidor guarda as chaves (DeepSeek e xAI/Grok) como segredos do Worker e nunca as repassa ao app. Se o endpoint não existir (404) ou falhar, o app cai no entendimento local (`parser.ts`, `perguntas.ts`).

Valores em **centavos inteiros**; datas `AAAA-MM-DD`.

| `tarefa` | Modelo | Entrada | Resposta |
|---|---|---|---|
| `texto` | DeepSeek | `texto`, `hoje`, `categorias[{id,nome,tipo}]`, `contas[{id,nome}]` | `{tipo:"despesa"\|"receita", valor, data, nota, categoriaId?, contaId?}` |
| `foto` | Grok (visão) | `imagem` (base64 JPEG, sem prefixo), `hoje`, `categorias[]` | `{valor, data, loja, categoriaId?}` — valor = total pago |
| `pergunta` | DeepSeek | `pergunta`, `resumo` (totais do mês, sem a lista de lançamentos) | `{resposta}` em português, curta |

Regras do servidor: limitar o tamanho da imagem (~1,5 MB) e do texto (500 caracteres), aplicar limite de uso por aparelho/IP, responder só JSON, e pedir ao modelo que devolva `null`/valor 0 quando não tiver certeza (o app trata isso como "não entendi").

Ainda não implementado no servidor: precisa de permissão explícita para mexer em `vetorial-servidor`.
