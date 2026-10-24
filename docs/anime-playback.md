# Reprodução de episódios

O catálogo continua usando Tenrai. O botão **Assistir** abre uma busca na API de reprodução configurada. O usuário escolhe a versão/temporada e um episódio com ID próprio do provedor; IDs do MyAnimeList nunca são usados como IDs de streaming. MP4/WebM usam vídeo HTML5; HLS usa suporte nativo quando disponível ou `hls.js`, carregado sob demanda. Embeds usam um iframe com sandbox sem pop-ups nem navegação da página principal.

## Requisito externo

Sem configuração adicional, a aplicação usa a instância pública de demonstração do [AniVault Scraper](https://github.com/SH0MIK/Anivault-Scraper), em `https://anivault-scraper-test.vercel.app`, com a fonte `anikoto`. Foram verificados busca, lista de 26 episódios de Cowboy Bebop, manifesto HLS válido e reprodução efetiva do episódio 1 no Chromium em viewport de celular, com quadros de vídeo decodificados e tempo avançando. As legendas retornadas nessa consulta incluíram inglês; não foi confirmado português. É um serviço comunitário de terceiros, sem garantia de disponibilidade, idioma ou cobertura de todo o catálogo. Não exige chave no fluxo público verificado. O usuário escolhe legendado ou dublado, conforme disponibilidade, e os IDs MAL/AniList são distinguidos explicitamente.

Para usar sua própria instância AniVault, configure `ANIME_STREAM_API_URL` e `ANIME_STREAM_API_STYLE=anivault`. Para desativar a fonte pública, defina explicitamente `ANIME_STREAM_API_URL` como string vazia. No adaptador AniVault, legendas disponibilizadas pela API são expostas no controle de legendas do vídeo. Português só é oferecido quando a fonte o fornece; não há tradução automática.

O repositório Consumet consultado estava bloqueado no GitHub (HTTP 451) e a documentação consultada respondeu HTTP 403. O adaptador configurável abaixo permite instâncias compatíveis, mas elas precisam estar hospedadas e fornecer fontes válidas. Os testes automatizados com respostas controladas verificam o contrato, sem garantir disponibilidade de cada provedor.

Configure na hospedagem que executa o backend (incluindo o Lovable, enquanto ele hospedar a aplicação):

| Variável | Uso |
| --- | --- |
| `ANIME_STREAM_API_URL` | URL HTTPS base de uma instância alternativa. Sem usuário, senha, query string ou fragmento. Ausente usa a demonstração pública AniVault; vazia desativa. |
| `ANIME_STREAM_API_STYLE` | `anivault` ou `consumet`. Sem URL personalizada: `anivault`. Com URL personalizada: `consumet`. |
| `ANIME_STREAM_PROVIDER` | Fonte na instância. Padrão AniVault: `anikoto`; padrão Consumet: `gogoanime`. Não comprova que cada fonte esteja ativa. |
| `ANIME_STREAM_SEARCH_PATH` | Padrão `/anime/{provider}/search/{query}`. |
| `ANIME_STREAM_INFO_PATH` | Padrão `/anime/{provider}/info/{id}`. |
| `ANIME_STREAM_WATCH_PATH` | Padrão `/anime/{provider}/watch/{id}`. |
| `ANIME_STREAM_API_KEY` | Opcional, secreta, somente backend; no estilo Consumet, enviada como `X-RapidAPI-Key`, com `X-RapidAPI-Host` derivado da URL configurada. Nunca é enviada ao padrão público AniVault. |

Os caminhos configuráveis só se aplicam ao estilo `consumet` e seguem o exemplo solicitado. As instâncias Consumet variam: se a sua usa busca em `/anime/gogoanime/{query}` e IDs por query string, configure, conforme a documentação dessa instância:

```text
ANIME_STREAM_SEARCH_PATH=/anime/{provider}/{query}
ANIME_STREAM_INFO_PATH=/anime/{provider}/info?id={id}
ANIME_STREAM_WATCH_PATH=/anime/{provider}/watch?episodeId={id}
```

Não use `VITE_` para chaves. Não coloque credenciais no Git ou na URL. Configurar variáveis apenas no Codex não configura automaticamente o backend do Lovable. A existência de plano gratuito no RapidAPI depende da API específica; este adaptador exige respostas compatíveis com o contrato abaixo.

## Contrato aceito

Busca: `{ "results": [{ "id": "provider-show", "title": "Título", "image": "https://…" }] }`.

Informações: `{ "title": "Título", "episodes": [{ "id": "provider-episode", "number": 1, "title": "Episódio" }] }`.

Reprodução: `{ "sources": [{ "url": "https://…/video.m3u8", "isM3U8": true, "quality": "1080p" }] }`. Também aceita URLs MP4/WebM e fontes com `type: "embed"` ou `"iframe"`, ou uma URL em `embed`/`embedURL`.

Fontes diretas com cabeçalhos obrigatórios são recusadas: um elemento de vídeo não pode definir livremente `Referer`/`Origin`. Use uma fonte compatível com navegador ou o embed fornecido. Não há proxy aberto de mídia, extração de HTML arbitrário, contorno de CAPTCHA ou descriptografia de formatos proprietários.

O CDN precisa permitir o acesso do navegador e, em HLS, o CORS necessário ao manifesto e aos segmentos. URLs temporárias são buscadas novamente quando o player é reaberto e não são armazenadas em cache persistente. HTTP 429 preserva `Retry-After`; não há repetição automática. Abrir o player não marca como assistido. Vídeos HTML5 marcam o episódio ao terminar; embeds possuem o botão manual porque não expõem um evento universal de conclusão.

Valide a integração real com a URL da instância: busca → versão correta → episódios → fontes → reprodução efetiva. Confirme o idioma e a autorização das fontes antes de disponibilizar o acervo.
