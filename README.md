# NipponBR

Mangás em português e descoberta de animes, com biblioteca pessoal e acompanhamento de episódios.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://manga-quest-explorer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f15f01fe-51fe-429c-bde0-956bfad1148d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

O repositório também inclui `bun.lock`: use `bun install --frozen-lockfile` para instalar as versões fixadas sem alterar o lockfile. Valide com `npm test`, `npx tsc --noEmit` e `npm run build`.

## Animes — Tenrai

A aba **Animes** está disponível na navegação desktop e mobile. Ela inclui carrossel da temporada, populares, ranking, busca paginada e detalhes com sinopse, capa, nota, gêneros, estúdios, ano, trailer do YouTube e episódios paginados. O catálogo fornece títulos e datas dos episódios, sem transmissão dos episódios completos.

As chamadas passam por `/api/anime`, no backend, sem necessidade de chave:

| Funcionalidade | Tenrai |
| --- | --- |
| Busca | `/v1/anime?q=...` |
| Temporada atual | `/v1/seasons/now` |
| Populares | `/v1/top/anime?filter=bypopularity` |
| Ranking | `/v1/top/anime` |
| Detalhes | `/v1/anime/{id}` |
| Episódios | `/v1/anime/{id}/episodes?page=...` |

O backend valida as respostas, mantém cache de cinco minutos, revalida com ETag e respeita `Retry-After` em respostas 429. Se a conexão ao backend falhar ou ele retornar HTTP 5xx, o navegador consulta diretamente a mesma API pública da Tenrai, que oferece CORS aberto e não exige credenciais. Ambas as rotas usam os mesmos endpoints e a mesma validação de dados. Erros 400, 404 e 429 do backend não acionam essa alternativa.

As consultas de cada instância e as consultas diretas do navegador são espaçadas para respeitar os limites públicos de 4/s e 120/min por IP; várias instâncias no mesmo IP podem compartilhar a cota. Falhas da API aparecem com opção de tentar novamente, sem títulos inventados. Falhas inesperadas do backend são registradas nos logs com o prefixo `[Tenrai]`.

Favoritos, status (assistindo, quero assistir, concluído e abandonado) e progresso ficam na seção **Meus animes**, dentro da biblioteca. São salvos **neste navegador**, sem sincronização entre aparelhos. As chaves antigas de armazenamento de mangás foram preservadas durante a mudança de marca.

Em ambientes com rede restrita, libere `api.tenrai.org`, `cdn.myanimelist.net` (capas) e `www.youtube-nocookie.com` (trailer). O player do YouTube pode carregar recursos de outros domínios do próprio YouTube. Dados do MyAnimeList, fornecidos pela [Tenrai](https://api.tenrai.org/llms.txt), uma API não oficial em beta.
