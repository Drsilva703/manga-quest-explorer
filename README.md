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
3. As capas Open Library usam `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg`. Capas Google HTTP são convertidas para HTTPS. Ausências e falhas usam `/book-placeholder.svg`.
4. A interface distingue carregamento, busca sem resultados e indisponibilidade das fontes, com opção de tentar novamente. Consultas antigas são canceladas ao mudar a busca ou sair da aba.

As buscas públicas funcionam sem chave obrigatória. Opcionalmente, `searchBooks` recebe `apiKey`, que adiciona o parâmetro `key` do Google Books. A interface lê `VITE_GOOGLE_BOOKS_API_KEY` se configurada. Como variáveis `VITE_` são públicas no navegador, use apenas uma chave própria para uso público, com restrições por domínio e API no Google Cloud; não coloque uma chave confidencial ali. Não é necessária para o fluxo padrão, e a Open Library nunca recebe essa chave.

São solicitados os campos de ISBN explicitamente na Open Library, pois eles podem não vir na resposta padrão. Essa busca não oferece sinopse no contrato usado: nesses casos a interface informa “Sinopse não disponível nesta fonte”. O catálogo não fornece arquivos completos dos livros. Os dados antigos de mangás e animes no navegador não são apagados; a seção de animes não está mais acessível pela navegação.

Em ambientes com rede restrita, permita `www.googleapis.com`, `books.google.com`, `openlibrary.org` e `covers.openlibrary.org`. Testes: `npm test`; tipos: `npx tsc --noEmit`; build: `npm run build`.
