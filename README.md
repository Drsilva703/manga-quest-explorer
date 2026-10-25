# NipponBR

Mangás em português e descoberta de livros, com busca por título ou autor e biblioteca pessoal de mangás.

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

## Livros — Google Books e Open Library

A aba **Livros** substitui a antiga aba Animes no desktop e no celular. Use o campo de título/autor, as sugestões de busca ou a busca rápida da barra superior enquanto estiver na aba Livros. Os resultados aparecem em uma grade responsiva; abra um card para consultar autores, sinopse, ISBN e a fonte da edição.

1. O serviço `src/mangaverse/services/bookService.ts` consulta `https://www.googleapis.com/books/v1/volumes?q=...`.
2. Se a chamada falhar ou não encontrar livros, consulta automaticamente `https://openlibrary.org/search.json?q=...`.
3. As capas Open Library usam `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`. Imagens maiores do Google têm prioridade, com alternativas por ISBN e miniatura quando necessário. URLs HTTP são convertidas para HTTPS; falhas percorrem as alternativas antes de usar `/book-placeholder.svg`.
4. A interface distingue carregamento, busca sem resultados e indisponibilidade das fontes, com opção de tentar novamente. Consultas antigas são canceladas ao mudar a busca ou sair da aba.

As buscas públicas funcionam sem chave obrigatória. Opcionalmente, `searchBooks` recebe `apiKey`, que adiciona o parâmetro `key` do Google Books. A interface lê `VITE_GOOGLE_BOOKS_API_KEY` se configurada. Como variáveis `VITE_` são públicas no navegador, use apenas uma chave própria para uso público, com restrições por domínio e API no Google Cloud; não coloque uma chave confidencial ali. Não é necessária para o fluxo padrão, e a Open Library nunca recebe essa chave.

Ao abrir um livro, `bookDetailsService.ts` consulta a ficha da obra (`https://openlibrary.org/works/{id}.json`) para carregar a sinopse, incluindo descrições no formato `{value: ...}`. Para volumes Google, consulta também `/books/v1/volumes/{id}`. Uma edição pode ser associada à obra Open Library por ISBN, sem busca aproximada por título. Quando nenhuma fonte informa sinopse, isso é apresentado explicitamente; nenhum resumo é inventado.

O acesso é consultado em `https://openlibrary.org/api/books?bibkeys=ISBN:...&format=json&jscmd=data`, ou com `OLID` quando não há ISBN. Apenas `ebooks[].availability=full` habilita leitura completa; empréstimos são apresentados como empréstimos e não viram leitores públicos. O Google distingue `ALL_PAGES`, `PARTIAL` e `NO_PAGES`, respeitando `embeddable` e os links oficiais. Leitura pública do Internet Archive abre em um iframe no site, com alternativa **Abrir na fonte** caso o leitor externo falhe. A disponibilidade e as permissões do navegador são controladas também pela fonte, e alguns títulos exigem conta ou não possuem versão digital.

O filtro **Somente livros com leitura gratuita** usa `filter=free-ebooks` no Google e `ebook_access:public` na Open Library. Resultados Open Library agrupam edições; se a primeira for restrita, são verificadas até duas alternativas da mesma obra quando a busca informa acesso público. Uma leitura em outra edição é identificada no leitor. A indicação da busca, por si só, nunca é tratada como confirmação de leitura.

Verificação real: sinopse em português de Dom Casmurro na obra `OL1003040W`; capa grande com dimensões naturais de 333×500; leitura de uma edição pública associada à obra `OL43027352W`, com páginas efetivamente carregadas no BookReader. A qualidade máxima depende da imagem original fornecida. Os dados antigos de mangás e animes no navegador não são apagados; a seção de animes não está mais acessível pela navegação.

Em ambientes com rede restrita, permita `www.googleapis.com`, `books.google.com`, `play.google.com`, `openlibrary.org`, `covers.openlibrary.org` e, para o leitor, `archive.org` e seus subdomínios de arquivos. Testes: `npm test`; tipos: `npx tsc --noEmit`; build: `npm run build`.
