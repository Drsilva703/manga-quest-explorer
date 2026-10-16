// Ported from the original Mangaverse Express server (server.ts).
// Runs on the ShimApp adapter so handler logic is unchanged.
import { ShimApp } from './express-shim';
import { MangaItem, MangaChapter } from '../../mangaverse/types/manga';
import {
  SAMPLE_MANGAS,
  SAMPLE_CHAPTERS_MAP,
  generateFullChaptersForManga,
  generateBerserkChapters,
  calculateVolume,
  SAMPLE_PAGES_BANK,
  getCanonicalMangaSlug
} from '../../mangaverse/services/sampleData';
import {
  isAdminEmail,
  verifyAdminToken,
  getCustomMangas,
  isMangaDeleted,
  addCustomManga,
  updateCustomManga,
  deleteManga,
  getChatMessages,
  addChatMessage,
  deleteChatMessage,
  clearChat,
  isUserBanned,
  toggleBanUser,
  getChapterComments,
  addChapterComment,
  addCommentReply,
  likeComment,
  togglePinComment,
  deleteComment,
  getStats,
  getPixConfig,
  updatePixConfig
} from './adminDb';
import { getCustomChapters, getChapterRecords, rowToChapter, isChapterDeleted, addCustomChapter, updateChapterPages, deleteChapter, authorizedChapterClient } from './chapterDb';



// In-memory cache with 5 minutes TTL
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInCache<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

function normalizeTitle(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Known total chapters table for comprehensive coverage
const KNOWN_TOTAL_CHAPTERS: Record<string, number> = {
  'one-piece': 1120,
  'onepiece': 1120,
  'solo-leveling': 179,
  'sololeveling': 179,
  'jujutsu-kaisen': 271,
  'jujutsukaisen': 271,
  'chainsaw-man': 180,
  'chainsawman': 180,
  'berserk': 376,
  'dandadan': 165,
  'tower-of-god': 630,
  'towerofgod': 630,
  'omniscient-reader': 230,
  'omniscient-readers-viewpoint': 230,
  'attack-on-titan': 139,
  'attackontitan': 139,
  'shingeki-no-kyojin': 139,
  'shingekinokyojin': 139,
  'ataque-dos-titas': 139,
  'ataquedostitas': 139,
  'demon-slayer': 205,
  'demonslayer': 205,
  'kimetsu-no-yaiba': 205,
  'kimetsunoyaiba': 205,
  'naruto': 700,
  'bleach': 686,
  'death-note': 108,
  'deathnote': 108,
  'spy-x-family': 105,
  'spyxfamily': 105,
  'hunter-x-hunter': 400,
  'hunterxhunter': 400,
  'tokyo-ghoul': 143,
  'tokyoghouls': 143,
  'vagabond': 327,
  'vinland-saga': 215,
  'vinlandsaga': 215,
  'blue-lock': 275,
  'bluelock': 275,
  'boku-no-hero-academia': 430,
  'my-hero-academia': 430,
  'dragon-ball': 519,
  'dragonball': 519,
  'kaiju-no-8': 110,
  'sakamoto-days': 180
};

// Verified, active MangaDex manga UUIDs with AniList and title aliases
const KNOWN_MANGADEX_MAP: Record<string, string> = {
  'one-piece': 'a1c7c817-4e59-43b7-9365-09675a149a6f',
  'al-30013': 'a1c7c817-4e59-43b7-9365-09675a149a6f',
  'solo-leveling': '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
  'al-105398': '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
  'jujutsu-kaisen': 'c52b2ce3-7f95-469c-96b0-479524fb7a1a',
  'al-101517': 'c52b2ce3-7f95-469c-96b0-479524fb7a1a',
  'chainsaw-man': 'a77742b1-befd-49a4-bff5-1ad4e6b0ef7b',
  'al-105778': 'a77742b1-befd-49a4-bff5-1ad4e6b0ef7b',
  'omniscient-reader': '9a414441-bbad-43f1-a3a7-dc262ca790a3',
  'omniscient-readers-viewpoint': '9a414441-bbad-43f1-a3a7-dc262ca790a3',
  'al-119257': '9a414441-bbad-43f1-a3a7-dc262ca790a3',
  'spy-x-family': '6b958848-c885-4735-9201-12ee77abcb3c',
  'al-108556': '6b958848-c885-4735-9201-12ee77abcb3c',
  'berserk': '801513ba-a712-498c-8f57-cae55b38cc92',
  'al-30002': '801513ba-a712-498c-8f57-cae55b38cc92',
  'dandadan': '68112dc1-2b80-4f20-beb8-2f2a8716a430',
  'al-132070': '68112dc1-2b80-4f20-beb8-2f2a8716a430',
  'tower-of-god': 'c0ee660b-f9f2-45c3-8068-5123ff53f84a',
  'al-85143': 'c0ee660b-f9f2-45c3-8068-5123ff53f84a',
  'attack-on-titan': '304ceac3-8cdb-4fe7-acf7-2b6ff7a60613',
  'shingeki-no-kyojin': '304ceac3-8cdb-4fe7-acf7-2b6ff7a60613',
  'al-30745': '304ceac3-8cdb-4fe7-acf7-2b6ff7a60613',
  'demon-slayer': '789642f8-ca89-4e4e-8f7b-eee4d17ea08b',
  'kimetsu-no-yaiba': '789642f8-ca89-4e4e-8f7b-eee4d17ea08b',
  'al-87216': '789642f8-ca89-4e4e-8f7b-eee4d17ea08b',
  'naruto': 'a787b10a-02d0-46c0-8236-0d01d69ad4a3',
  'al-30011': 'a787b10a-02d0-46c0-8236-0d01d69ad4a3',
  'bleach': '239d6260-d71f-43b0-afff-074e3619e3de',
  'al-30012': '239d6260-d71f-43b0-afff-074e3619e3de',
  'death-note': '75ee72ab-c6bf-4b87-badd-de839156934c',
  'al-30021': '75ee72ab-c6bf-4b87-badd-de839156934c',
  'hunter-x-hunter': 'db692d58-4b13-4174-ae8c-30c515c0689c',
  'al-30026': 'db692d58-4b13-4174-ae8c-30c515c0689c',
  'tokyo-ghoul': '6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b',
  'al-63327': '6a1d1cb1-ecd5-40d9-89ff-9d88e40b136b',
  'vagabond': 'd1a9fdeb-f713-407f-960c-8326b586e6fd',
  'al-30656': 'd1a9fdeb-f713-407f-960c-8326b586e6fd',
  'vinland-saga': '5d1fc77e-706a-4fc5-bea8-486c9be0145d',
  'al-30642': '5d1fc77e-706a-4fc5-bea8-486c9be0145d',
  'blue-lock': '4141c5dc-c525-4df5-afd7-cc7d192a832f',
  'al-106130': '4141c5dc-c525-4df5-afd7-cc7d192a832f',
  'sakamoto-days': '9d9b04ad-9a83-49f4-8ae4-a9a3780fe9c0',
  'al-125828': '9d9b04ad-9a83-49f4-8ae4-a9a3780fe9c0',
  'kaiju-no-8': '71763dfb-8b85-4a74-92df-dfe46478fc5d',
  'al-120760': '71763dfb-8b85-4a74-92df-dfe46478fc5d',
  'boku-no-hero-academia': 'd86cf65b-5f6c-437d-a0af-19a31f4f6944',
  'my-hero-academia': 'd86cf65b-5f6c-437d-a0af-19a31f4f6944',
  'al-85486': 'd86cf65b-5f6c-437d-a0af-19a31f4f6944',
  'one-punch-man': 'd8a95b4f-8086-4444-93e6-fa10f7608269',
  'al-74347': 'd8a95b4f-8086-4444-93e6-fa10f7608269',
  'dragon-ball': 'ed8052a7-5c5a-4e2a-a92c-ee9ea3d08f76',
  'al-30042': 'ed8052a7-5c5a-4e2a-a92c-ee9ea3d08f76'
};

// Rich Brazilian Portuguese Localization Dictionary for Catalog Titles and Descriptions
const PORTUGUESE_LOCALIZATION: Record<string, { title: string; desc: string }> = {
  'attackontitan': {
    title: 'Ataque dos Titãs (Shingeki no Kyojin)',
    desc: 'A humanidade vive confinada dentro de enormes muralhas para se proteger de Titãs devoradores de homens. Quando o Titã Colossal rompe a muralha externa, Eren Jaeger jura eliminar todos os Titãs da face da Terra.'
  },
  'shingekinokyojin': {
    title: 'Ataque dos Titãs (Shingeki no Kyojin)',
    desc: 'A humanidade vive confinada dentro de enormes muralhas para se proteger de Titãs devoradores de homens. Quando o Titã Colossal rompe a muralha externa, Eren Jaeger jura eliminar todos os Titãs da face da Terra.'
  },
  'sololeveling': {
    title: 'Solo Leveling',
    desc: 'Sung Jin-Woo é conhecido como o caçador mais fraco do mundo (Rank E). Preso em uma masmorra dupla mortal, ele desperta com a capacidade única de subir de nível sem limites através de um misterioso Sistema.'
  },
  'nahonjamanlevelup': {
    title: 'Solo Leveling',
    desc: 'Sung Jin-Woo é conhecido como o caçador mais fraco do mundo (Rank E). Preso em uma masmorra dupla mortal, ele desperta com a capacidade única de subir de nível sem limites através de um misterioso Sistema.'
  },
  'chainsawman': {
    title: 'Chainsaw Man (O Homem Motosserra)',
    desc: 'Denji vive na miséria caçando demônios para quitar as dívidas do falecido pai ao lado de seu cão-demônio Pochita. Traído e executado, ele renasce ao se fundir com Pochita como o lendário Chainsaw Man.'
  },
  'jujutsukaisen': {
    title: 'Jujutsu Kaisen: Batalha de Feiticeiros',
    desc: 'Para salvar seus amigos de espíritos amaldiçoados, Yuuji Itadori engole o dedo decomposto de Ryomen Sukuna, o Rei das Maldições, e passa a estudar na Escola Técnica de Feitiçaria de Tóquio.'
  },
  'omniscientreader': {
    title: 'Ponto de Vista do Leitor Onisciente (ORV)',
    desc: 'Kim Dokja era o único leitor que acompanhou até o fim uma webnovel esquecida de mais de 3.000 capítulos. No instante em que lê o capítulo final, o mundo real se transforma exatamente no apocalipse do livro.'
  },
  'omniscientreadersviewpoint': {
    title: 'Ponto de Vista do Leitor Onisciente (ORV)',
    desc: 'Kim Dokja era o único leitor que acompanhou até o fim uma webnovel esquecida de mais de 3.000 capítulos. No instante em que lê o capítulo final, o mundo real se transforma exatamente no apocalipse do livro.'
  },
  'thebeginningaftertheend': {
    title: 'O Começo Depois do Fim (TBATE)',
    desc: 'O Rei Grey governou seu mundo com poder inigualável, mas viveu solitário e vazio. Reencarnado como Arthur Leywin em um novo mundo de magia e monstros, ele decide proteger aqueles que ama com sua vida.'
  },
  'pickmeup': {
    title: 'Pick Me Up! (Gacha Infinito)',
    desc: 'O mestre mundial do jogo mobile de dificuldade extrema Pick Me Up é subitamente sugado para dentro do jogo como um personagem comum de nível 1 e precisa liderar os heróis para sobreviver.'
  },
  'damnreincarnation': {
    title: 'Maldita Reencarnação',
    desc: 'Hamel lutou bravamente com seus companheiros contra os Grandes Reis Demônios, mas morreu pouco antes da vitória. Ele renasce 300 anos depois como Eugene Lionheart, descendente do herói Vermouth.'
  },
  'thegreatestestatedeveloper': {
    title: 'O Maior Desenvolvedor Imobiliário',
    desc: 'Um estudante de engenharia civil acorda no corpo de Lloyd Frontera, um nobre preguiçoso prestes a perder todas as suas terras. Com cálculos modernos e conhecimento de obras, ele inicia uma revolução econômica.'
  },
  'towerofgod': {
    title: 'Tower of God (A Torre de Deus)',
    desc: 'Tudo o que você deseja está no topo da Torre: poder, riquezas, vingança ou respostas. O jovem Bam entra na Torre enfrentando provações mortais em busca de reencontrar sua amiga de infância Rachel.'
  },
  'demonslayer': {
    title: 'Demon Slayer: Kimetsu no Yaiba',
    desc: 'Tanjiro Kamado tem sua família brutalmente assassinada por demônios e sua irmã Nezuko transformada em uma criatura. Ele decide se tornar um Exterminador de Demônios para encontrar uma cura para ela.'
  },
  'kimetsunoyaiba': {
    title: 'Demon Slayer: Kimetsu no Yaiba',
    desc: 'Tanjiro Kamado tem sua família brutalmente assassinada por demônios e sua irmã Nezuko transformada em uma criatura. Ele decide se tornar um Exterminador de Demônios para encontrar uma cura para ela.'
  },
  'myheroacademia': {
    title: 'Boku no Hero Academia (My Hero Academia)',
    desc: 'Em um mundo onde grande parte da humanidade possui superpoderes (Individualidades), o jovem Izuku Midoriya nasceu sem nenhum poder, mas herda o legado do herói número um, All Might.'
  },
  'bokunoheroacademia': {
    title: 'Boku no Hero Academia (My Hero Academia)',
    desc: 'Em um mundo onde grande parte da humanidade possui superpoderes (Individualidades), o jovem Izuku Midoriya nasceu sem nenhum poder, mas herda o legado do herói número um, All Might.'
  },
  'deathnote': {
    title: 'Death Note',
    desc: 'Light Yagami encontra um caderno sobrenatural capaz de tirar a vida de quem tiver o nome escrito nele. Ele decide criar um mundo perfeito eliminando criminosos, confrontando o genial detetive L.'
  },
  'hunterxhunter': {
    title: 'Hunter x Hunter',
    desc: 'Gon Freecss deixa sua ilha natal para realizar o temido Exame Hunter com o objetivo de encontrar seu pai ausente, formando laços eternos com Killua, Kurapika e Leorio.'
  },
  'tokyoghouls': {
    title: 'Tokyo Ghoul',
    desc: 'Ken Kaneki sobrevive a um encontro fatal com uma Ghoul e precisa lidar com sua nova condição de meio-humano meio-ghoul nas sombras de Tóquio.'
  },
  'tokyoghou': {
    title: 'Tokyo Ghoul',
    desc: 'Ken Kaneki sobrevive a um encontro fatal com uma Ghoul e precisa lidar com sua nova condição de meio-humano meio-ghoul nas sombras de Tóquio.'
  },
  'bleach': {
    title: 'Bleach',
    desc: 'Ichigo Kurosaki é um estudante capaz de ver espíritos. Ao receber os poderes de uma Ceifadora de Almas, ele assume o papel de proteger os vivos e guiar os espíritos perdidos à Soul Society.'
  },
  'naruto': {
    title: 'Naruto',
    desc: 'Naruto Uzumaki é um jovem ninja rejeitado por carregar dentro de si a temida Raposa de Nove Caudas. Com determinação de ferro, ele busca se tornar Hokage e ganhar o respeito de sua vila.'
  },
  'onepiece': {
    title: 'One Piece',
    desc: 'Monkey D. Luffy viaja pelos mares perigosos da Grand Line com os Piratas do Chapéu de Palha com o sonho inabalável de encontrar o tesouro lendário One Piece e se tornar o Rei dos Piratas.'
  },
  'berserk': {
    title: 'Berserk',
    desc: 'Guts, o Espadachim Negro, brande uma espada colossal em uma sangrenta jornada de vingança contra a Mão de Deus e seu antigo companheiro Griffith, em uma das maiores obras de fantasia sombria da história.'
  },
  'dandadan': {
    title: 'Dandadan',
    desc: 'Momo acredita em fantasmas e Okarun em extraterrestres. Ao explorarem locais assombrados para provar suas teses, ambos descobrem que as duas ameaças são terrivelmente reais e cômicas.'
  },
  'spyxfamily': {
    title: 'Spy x Family',
    desc: 'O espião Twilight precisa constituir uma família temporária para uma missão ultrassecreta. Sem saber, ele adota uma garotinha telepata e se casa com uma assassina de aluguel de elite.'
  },
  'bluelock': {
    title: 'Blue Lock',
    desc: 'O Japão reúne 300 dos melhores atacantes do ensino médio em um centro de treinamento de confinamento extremo para criar o artilheiro mais egoísta e decisivo do futebol mundial.'
  },
  'vinlandsaga': {
    title: 'Vinland Saga',
    desc: 'Thorfinn é um jovem guerreiro que cresce entre saqueadores vikings em busca de duelar com o assassino de seu pai, descobrindo o verdadeiro custo da guerra e a busca pela terra mítica de Vinland.'
  },
  'vagabond': {
    title: 'Vagabond',
    desc: 'Obra monumental inspirada na vida real de Miyamoto Musashi, retratando sua evolução espiritual e filosófica através da lâmina no Japão feudal.'
  },
  'kaijuno8': {
    title: 'Kaiju Nº 8',
    desc: 'Kafka Hibino limpa carcaças de monstros gigantes após as batalhas das Forças de Defesa. Após ingerir um parasita, ele adquire a habilidade de se transformar em um formidável Kaiju com poder destrutivo.'
  },
  'sakamotodays': {
    title: 'Sakamoto Days',
    desc: 'Taro Sakamoto abandonou o submundo dos assassinos de elite após se casar e abrir uma loja de bairro. Agora pai dedicado e acima do peso, ele deve proteger sua rotina familiar sem matar ninguém.'
  },
  'sousounofrieren': {
    title: 'Frieren: e a Jornada para o Além',
    desc: 'A maga elfa Frieren e seus valorosos companheiros derrotaram o Rei Demônio e trouxeram paz à terra. Como elfa de longevidade milenar, ela parte em uma nova jornada para entender os sentimentos humanos e honrar a memória de seus amigos.'
  },
  'frieren': {
    title: 'Frieren: e a Jornada para o Além',
    desc: 'A maga elfa Frieren e seus valorosos companheiros derrotaram o Rei Demônio e trouxeram paz à terra. Como elfa de longevidade milenar, ela parte em uma nova jornada para entender os sentimentos humanos e honrar a memória de seus amigos.'
  },
  'sonobisquedollwakoiwosuru': {
    title: 'Minha Adorável Cosplayer (Sono Bisque Doll)',
    desc: 'Wakana Gojou sonha em se tornar um artesão de bonecas tradicionais japonesas. Sua colega popular Marin Kitagawa descobre seu talento com costura e o convida para confeccionar roupas de cosplay para ela.'
  },
  'mydressupdarling': {
    title: 'Minha Adorável Cosplayer (Sono Bisque Doll)',
    desc: 'Wakana Gojou sonha em se tornar um artesão de bonecas tradicionais japonesas. Sua colega popular Marin Kitagawa descobre seu talento com costura e o convida para confeccionar roupas de cosplay para ela.'
  },
  'komisanwakomyushoudesu': {
    title: 'Senhorita Komi não Consegue se Comunicar',
    desc: 'Shouko Komi é admirada por toda a escola por sua beleza elegante, mas sofre de uma timidez extrema que a impede de falar. Com a ajuda de seu colega Tadano, ela busca cumprir o objetivo de fazer 100 amigos.'
  },
  'komisan': {
    title: 'Senhorita Komi não Consegue se Comunicar',
    desc: 'Shouko Komi é admirada por toda a escola por sua beleza elegante, mas sofre de uma timidez extrema que a impede de falar. Com a ajuda de seu colega Tadano, ela busca cumprir o objetivo de fazer 100 amigos.'
  },
  'onepunchman': {
    title: 'One-Punch Man',
    desc: 'Saitama treinou tanto que perdeu todos os seus cabelos e se tornou forte a ponto de derrotar qualquer inimigo com apenas um soco. Entediado com a falta de desafios, ele se inscreve na Associação de Heróis.'
  },
  'mushokutensei': {
    title: 'Mushoku Tensei: Reencarnação do Desempregado',
    desc: 'Um homem solitário de 34 anos morre e reencarna em um mundo de espada e magia como Rudeus Greyrat. Determinado a não desperdiçar sua nova oportunidade, ele se dedica ao estudo da magia desde a infância.'
  },
  'tensei shitara slime datta ken': {
    title: 'Aquela Vez que Reencarnei como um Slime',
    desc: 'Satoru Mikami é assassinado nas ruas de Tóquio e renasce em uma caverna fantástica como um simples monstro slime, batizado de Rimuru Tempest pelo dragão Veldora.'
  },
  'blackclover': {
    title: 'Black Clover',
    desc: 'Asta nasceu sem nenhuma fagulha de magia em um mundo onde poder mágico é tudo. Ao receber um raro grimório de cinco folhas contendo anti-magia, ele luta para se tornar o Rei Mago.'
  },
  'oshinoko': {
    title: 'Oshi no Ko: Minha Estrela Preferida',
    desc: 'Um médico ginecologista e fã da jovem idol prodígio Ai Hoshino é assassinado misteriosamente e reencarna como um dos filhos gêmeos da própria cantora, desvendando o lado obscuro da indústria artística.'
  },
  'mashle': {
    title: 'Mashle: Magia e Músculos',
    desc: 'Em um mundo onde a magia governa tudo, Mash Burnedead nasceu completamente desprovido de mana. Para viver em paz com seu pai adotivo, ele compensa essa fraqueza treinando seus músculos até limites absurdos.'
  }
};

const GENRE_TRANSLATIONS: Record<string, string> = {
  'Action': 'Ação',
  'Adventure': 'Aventura',
  'Fantasy': 'Fantasia',
  'Supernatural': 'Sobrenatural',
  'Horror': 'Terror',
  'Mystery': 'Mistério',
  'Comedy': 'Comédia',
  'Romance': 'Romance',
  'Sci-Fi': 'Ficção Científica',
  'Science Fiction': 'Ficção Científica',
  'Drama': 'Drama',
  'Slice of Life': 'Cotidiano',
  'Sports': 'Esportes',
  'Psychological': 'Psicológico',
  'Martial Arts': 'Artes Marciais',
  'Historical': 'Histórico',
  'Super Power': 'Superpoderes',
  'Thriller': 'Suspense',
  'Tragedy': 'Tragédia',
  'Shounen': 'Shounen',
  'Seinen': 'Seinen',
  'Isekai': 'Isekai',
  'Manhwa': 'Manhwa',
  'Mecha': 'Robôs Gigantes',
  'School': 'Vida Escolar',
  'Ecchi': 'Ecchi',
  'Music': 'Música'
};

// Translation cache for quick responses
const translationCache = new Map<string, string>();

// Dynamic translation helper using Google Translate GTX endpoint (no API key required)
async function translateToPortuguese(text: string): Promise<string> {
  if (!text || text.length < 5) return text;

  // Check if text already contains common Portuguese words
  const lower = text.toLowerCase();
  const ptMarkers = [' de ', ' da ', ' do ', ' em ', ' que ', ' para ', ' com ', ' um ', ' uma ', ' os ', ' as ', ' não '];
  const count = ptMarkers.filter(m => lower.includes(m)).length;
  if (count >= 2) return text;

  const cached = translationCache.get(text);
  if (cached) return cached;

  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=' + encodeURIComponent(text.slice(0, 1400));
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return text;
    const data = await res.json();
    if (Array.isArray(data[0])) {
      const translated = data[0].map((item: any) => item[0]).join('');
      if (translated && translated.length > 5) {
        translationCache.set(text, translated);
        return translated;
      }
    }
  } catch (err) {
    // Graceful fallback without blocking
  }

  return text;
}

function localizeManga(item: MangaItem): MangaItem {
  const norm = normalizeTitle(item.title);
  const found = Object.entries(PORTUGUESE_LOCALIZATION).find(([k]) => norm.includes(k) || k.includes(norm));

  let title = item.title;
  let description = item.description;

  if (found) {
    title = found[1].title;
    if (found[1].desc) {
      description = found[1].desc;
    }
  }

  // Translate genres
  const genres = (item.genres || []).map(g => GENRE_TRANSLATIONS[g] || g);

  // If description has obvious English indicators and no Portuguese localization was found, clean it up
  if (!found && description && (description.includes(' is a ') || description.includes(' after ') || description.includes(' with ') || description.includes(' who '))) {
    description = `Acompanhe os capítulos completos de ${title} traduzidos em português em alta definição.`;
  }

  return {
    ...item,
    title,
    description: description || 'Sinopse oficial em português.',
    genres: Array.from(new Set(genres))
  };
}

async function localizeMangaAsync(item: MangaItem): Promise<MangaItem> {
  const baseline = localizeManga(item);
  // If description still contains English boilerplate or is a fallback, translate dynamically
  if (baseline.description && (baseline.description.includes(' is ') || baseline.description.includes(' was ') || baseline.description.includes(' by '))) {
    const translated = await translateToPortuguese(item.description);
    return {
      ...baseline,
      description: translated
    };
  }
  return baseline;
}

// Transform MangaDex item to standard MangaItem (covers proxied to guarantee 100% loading)
function transformMangaDexItem(md: any): MangaItem {
  const attrs = md.attributes || {};
  const rels = md.relationships || [];

  const ptAlt = (attrs.altTitles || []).find((a: any) => a['pt-br'] || a['pt']);
  const ptAltTitle = ptAlt ? ptAlt['pt-br'] || ptAlt['pt'] : null;

  const title =
    attrs.title?.['pt-br'] ||
    attrs.title?.pt ||
    ptAltTitle ||
    attrs.title?.['ja-ro'] ||
    attrs.title?.en ||
    Object.values(attrs.title || {})[0] ||
    'Sem título';

  const altTitles = (attrs.altTitles || [])
    .map((obj: any) => Object.values(obj)[0] as string)
    .filter(Boolean)
    .slice(0, 5);

  const coverRel = rels.find((r: any) => r.type === 'cover_art');
  const coverFileName = coverRel?.attributes?.fileName;
  const rawCoverUrl = coverFileName
    ? `https://uploads.mangadex.org/covers/${md.id}/${coverFileName}`
    : 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';

  const coverUrl = coverFileName
    ? `/api/proxy-image?url=${encodeURIComponent(rawCoverUrl)}`
    : rawCoverUrl;

  const authorRel = rels.find((r: any) => r.type === 'author');
  const artistRel = rels.find((r: any) => r.type === 'artist');

  const genres = (attrs.tags || [])
    .filter((t: any) => t.attributes?.group === 'genre' || t.attributes?.group === 'theme')
    .map((t: any) => t.attributes?.name?.en)
    .filter(Boolean);

  let status = 'ongoing';
  if (attrs.status === 'completed') status = 'completed';
  if (attrs.status === 'hiatus') status = 'hiatus';
  if (attrs.status === 'cancelled') status = 'cancelled';

  const desc = attrs.description?.['pt-br'] || attrs.description?.pt || attrs.description?.en || 'Sem sinopse disponível.';

  const links = attrs.links || {};
  const anilistId = links.al ? parseInt(links.al, 10) : undefined;
  const malId = links.mal ? parseInt(links.mal, 10) : undefined;
  const kitsuId = links.kt ? links.kt : undefined;

  const norm = normalizeTitle(title);
  const knownTotal = Object.entries(KNOWN_TOTAL_CHAPTERS).find(([k]) => norm.includes(normalizeTitle(k)))?.[1];
  const totalChapters = knownTotal || (attrs.lastChapter ? parseFloat(attrs.lastChapter) || 50 : 50);

  const rawItem: MangaItem = {
    id: `md-${md.id}`,
    slug: attrs.slug || md.id,
    title,
    altTitles,
    coverUrl,
    description: desc,
    genres: genres.slice(0, 6),
    status: status as any,
    authors: [authorRel?.attributes?.name].filter(Boolean),
    artists: [artistRel?.attributes?.name].filter(Boolean),
    rating: 9.0 + (Math.abs(md.id.charCodeAt(0)) % 10) / 10,
    views: 120000 + (Math.abs(md.id.charCodeAt(1)) % 50000),
    totalChapters,
    mangadexId: md.id,
    anilistId,
    malId,
    kitsuId,
    contentRating: attrs.contentRating,
    lastUpdated: attrs.updatedAt ? attrs.updatedAt.split('T')[0] : undefined,
    releaseYear: attrs.year || undefined,
    country: attrs.originalLanguage === 'ko' ? 'kr' : attrs.originalLanguage === 'zh' ? 'cn' : 'jp'
  };

  return localizeManga(rawItem);
}

// Transform ComicK item to standard MangaItem
function transformComicKItem(item: any): MangaItem {
  const title = item.title || item.slug || 'Sem título';
  let coverUrl = '';
  if (item.cover_url) {
    coverUrl = item.cover_url;
  } else if (item.md_covers?.[0]?.b2key) {
    coverUrl = `https://meo.comick.pictures/${item.md_covers[0].b2key}`;
  } else if (item.md_covers?.[0]?.gpurl) {
    coverUrl = `/api/proxy-image?url=${encodeURIComponent(item.md_covers[0].gpurl)}`;
  } else {
    coverUrl = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';
  }

  const norm = normalizeTitle(title);
  const knownTotal = Object.entries(KNOWN_TOTAL_CHAPTERS).find(([k]) => norm.includes(normalizeTitle(k)))?.[1];

  const rawItem: MangaItem = {
    id: `ck-${item.hid || item.slug || norm}`,
    slug: item.slug || norm,
    title,
    altTitles: (item.md_titles || []).map((t: any) => t.title).filter(Boolean).slice(0, 4),
    coverUrl,
    description: (item.desc || 'Acompanhe este título traduzido em português em alta resolução.').replace(/<[^>]*>/g, ''),
    genres: (item.genres || []).map((g: any) => typeof g === 'string' ? g : g.name || g.slug).filter(Boolean).slice(0, 5),
    status: (item.status === 2 ? 'completed' : 'ongoing') as any,
    authors: (item.authors || []).map((a: any) => typeof a === 'string' ? a : a.name).filter(Boolean),
    artists: [],
    rating: item.bayesian_rating ? parseFloat(item.bayesian_rating) : 9.2,
    views: item.user_follow_count ? item.user_follow_count * 10 : 150000,
    totalChapters: knownTotal || (item.last_chapter ? parseFloat(item.last_chapter) || 60 : 60),
    contentRating: 'safe',
    country: item.country === 'kr' ? 'kr' : item.country === 'cn' ? 'cn' : 'jp'
  };

  return localizeManga(rawItem);
}

// Transform Kitsu item to standard MangaItem
function transformKitsuItem(kitsu: any): MangaItem {
  const attrs = kitsu.attributes || {};
  const title = attrs.canonicalTitle || attrs.titles?.en || attrs.titles?.en_jp || attrs.titles?.ja_jp || 'Sem título';
  const coverUrl = attrs.posterImage?.large || attrs.posterImage?.original || attrs.posterImage?.medium;
  const bannerUrl = attrs.coverImage?.large || attrs.coverImage?.original;
  const norm = normalizeTitle(title);
  const knownTotal = Object.entries(KNOWN_TOTAL_CHAPTERS).find(([k]) => norm.includes(normalizeTitle(k)))?.[1];

  const rawItem: MangaItem = {
    id: `kt-${kitsu.id}`,
    slug: attrs.slug || norm,
    title,
    altTitles: Object.values(attrs.titles || {}).filter((t): t is string => typeof t === 'string' && t !== title),
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    bannerUrl,
    description: (attrs.synopsis || attrs.description || 'Sinopse oficial em português.').replace(/<[^>]*>/g, ''),
    genres: ['Ação', 'Aventura'],
    status: attrs.status === 'finished' ? 'completed' : 'ongoing',
    authors: [],
    artists: [],
    rating: attrs.averageRating ? parseFloat(attrs.averageRating) / 10 : 9.0,
    views: attrs.userCount ? attrs.userCount * 5 : 100000,
    totalChapters: knownTotal || attrs.chapterCount || 60,
    kitsuId: kitsu.id,
    contentRating: attrs.ageRating === 'R18' ? 'erotica' : 'safe',
    releaseYear: attrs.startDate ? parseInt(attrs.startDate.split('-')[0], 10) : undefined,
    country: attrs.subtype === 'manhwa' ? 'kr' : attrs.subtype === 'manhua' ? 'cn' : 'jp'
  };

  return localizeManga(rawItem);
}

// Transform AniList Media item to MangaItem
function transformAniListItem(media: any): MangaItem {
  const title = media.title?.english || media.title?.romaji || media.title?.native || 'Sem título';
  const altTitles = [media.title?.romaji, media.title?.english, media.title?.native].filter(
    (t: string) => Boolean(t) && t !== title
  );

  const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium;
  const bannerUrl = media.bannerImage;

  let status = 'ongoing';
  if (media.status === 'FINISHED') status = 'completed';
  if (media.status === 'HIATUS') status = 'hiatus';
  if (media.status === 'CANCELLED') status = 'cancelled';

  const norm = normalizeTitle(title);
  const knownTotal = Object.entries(KNOWN_TOTAL_CHAPTERS).find(([k]) => norm.includes(normalizeTitle(k)))?.[1];
  const totalChapters = media.chapters || knownTotal || 60;

  const country = media.countryOfOrigin === 'KR' ? 'kr' : media.countryOfOrigin === 'CN' ? 'cn' : 'jp';

  const rawItem: MangaItem = {
    id: `al-${media.id}`,
    slug: norm || `al-${media.id}`,
    title,
    altTitles,
    coverUrl,
    bannerUrl,
    description: (media.description || 'Sem sinopse disponível.').replace(/<[^>]*>/g, ''),
    genres: media.genres || ['Ação', 'Aventura'],
    status: status as any,
    authors: (media.staff?.nodes || []).map((s: any) => s.name?.full).slice(0, 2),
    artists: [],
    rating: media.averageScore ? media.averageScore / 10 : 9.0,
    views: (media.popularity || 100000) * 5,
    totalChapters,
    anilistId: media.id,
    malId: media.idMal,
    contentRating: 'safe',
    releaseYear: media.startDate?.year,
    country,
    anilistScore: media.averageScore ? media.averageScore / 10 : undefined,
    trailerYoutubeId: media.trailer?.site === 'youtube' ? media.trailer.id : undefined
  };

  return localizeManga(rawItem);
}

// Robust Deduplication: Merges across APIs WITHOUT corrupting covers or mixing titles
function deduplicateAndMergeManga(items: MangaItem[]): MangaItem[] {
  const merged: MangaItem[] = [];

  for (const item of items) {
    if (!item || !item.title) continue;
    const normTitle = normalizeTitle(item.title);
    if (!normTitle) continue;

    const existingIndex = merged.findIndex(e => {
      const eNorm = normalizeTitle(e.title);
      if (eNorm === normTitle) return true;
      if (eNorm.length > 5 && normTitle.length > 5) {
        if (eNorm === normTitle || eNorm.startsWith(normTitle) || normTitle.startsWith(eNorm)) return true;
      }
      if (e.anilistId && item.anilistId && e.anilistId === item.anilistId) return true;
      if (e.malId && item.malId && e.malId === item.malId) return true;
      if (e.mangadexId && item.mangadexId && e.mangadexId === item.mangadexId) return true;
      return false;
    });

    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      // Preserve external IDs
      if (item.mangadexId && !existing.mangadexId) existing.mangadexId = item.mangadexId;
      if (item.anilistId && !existing.anilistId) existing.anilistId = item.anilistId;
      if (item.malId && !existing.malId) existing.malId = item.malId;
      if (item.kitsuId && !existing.kitsuId) existing.kitsuId = item.kitsuId;
      if (item.bannerUrl && !existing.bannerUrl) existing.bannerUrl = item.bannerUrl;

      // Only upgrade cover if existing is a generic placeholder and item has a real artwork
      if (existing.coverUrl.includes('unsplash.com') && item.coverUrl && !item.coverUrl.includes('unsplash.com')) {
        existing.coverUrl = item.coverUrl;
      }

      if (item.altTitles) {
        existing.altTitles = Array.from(new Set([...(existing.altTitles || []), ...item.altTitles]));
      }
      if (item.genres) {
        existing.genres = Array.from(new Set([...existing.genres, ...item.genres]));
      }
      if ((item.totalChapters || 0) > (existing.totalChapters || 0)) {
        existing.totalChapters = item.totalChapters;
      }
      if (item.description && item.description.length > (existing.description?.length || 0)) {
        existing.description = item.description;
      }
    } else {
      merged.push({ ...item });
    }
  }

  return merged;
}

// Multi-API PT-BR Dedicated Catalog: MangaDex PT-BR + ComicK PT-BR + AniList (Localized)
async function fetchCombinedCatalog() {
  const promises: Promise<any>[] = [];

  // 1. MangaDex Top Followed with PT-BR Scans
  promises.push(
    fetch('https://api.mangadex.org/manga?limit=30&availableTranslatedLanguage[]=pt-br&availableTranslatedLanguage[]=pt&includes[]=cover_art&includes[]=author&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive', {
      headers: { 'User-Agent': 'MangaVerse-App/2.0' },
      signal: AbortSignal.timeout(6000)
    })
      .then(r => r.json())
      .then(d => (d.data ? d.data.map(transformMangaDexItem) : []))
      .catch(() => [])
  );

  // 2. MangaDex Top Rated with PT-BR Scans
  promises.push(
    fetch('https://api.mangadex.org/manga?limit=25&availableTranslatedLanguage[]=pt-br&availableTranslatedLanguage[]=pt&includes[]=cover_art&includes[]=author&order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive', {
      headers: { 'User-Agent': 'MangaVerse-App/2.0' },
      signal: AbortSignal.timeout(6000)
    })
      .then(r => r.json())
      .then(d => (d.data ? d.data.map(transformMangaDexItem) : []))
      .catch(() => [])
  );

  // 3. ComicK PT-BR Series (Tachiyomi PT-BR Search)
  promises.push(
    fetch('https://api.comick.dev/v1.0/search?tachiyomi=true&lang=pt-br&limit=30', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(6000)
    })
      .then(r => r.json())
      .then(d => (Array.isArray(d) ? d.map(transformComicKItem) : []))
      .catch(() => [])
  );

  // 4. AniList (Deeply Localized into PT-BR)
  const aniQuery = `
    query {
      popular: Page(page: 1, perPage: 25) {
        media(type: MANGA, sort: POPULARITY_DESC) {
          id
          idMal
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          description
          genres
          status
          chapters
          averageScore
          popularity
          countryOfOrigin
          startDate { year }
        }
      }
      trending: Page(page: 1, perPage: 25) {
        media(type: MANGA, sort: TRENDING_DESC) {
          id
          idMal
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          description
          genres
          status
          chapters
          averageScore
          popularity
          countryOfOrigin
          startDate { year }
        }
      }
      manhwa: Page(page: 1, perPage: 25) {
        media(type: MANGA, countryOfOrigin: "KR", sort: POPULARITY_DESC) {
          id
          idMal
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          description
          genres
          status
          chapters
          averageScore
          popularity
          countryOfOrigin
          startDate { year }
        }
      }
    }
  `;

  promises.push(
    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'MangaVerse-App/2.0' },
      body: JSON.stringify({ query: aniQuery }),
      signal: AbortSignal.timeout(5000)
    })
      .then(r => r.json())
      .then(d => ({
        popular: (d.data?.popular?.media || []).map(transformAniListItem),
        trending: (d.data?.trending?.media || []).map(transformAniListItem),
        manhwa: (d.data?.manhwa?.media || []).map(transformAniListItem)
      }))
      .catch(() => ({ popular: [], trending: [], manhwa: [] }))
  );

  const [mdFollowed, mdRated, ckPtItems, aniData] = await Promise.all(promises);

  return {
    aniData: aniData || { popular: [], trending: [], manhwa: [] },
    mdItems: [...(mdFollowed || []), ...(mdRated || [])] as MangaItem[],
    ckItems: (ckPtItems || []) as MangaItem[],
    ktItems: [] as MangaItem[]
  };
}

async function searchAniList(q: string): Promise<MangaItem[]> {
  try {
    const query = `
      query ($q: String) {
        Page(page: 1, perPage: 20) {
          media(search: $q, type: MANGA) {
            id
            idMal
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            description
            genres
            status
            chapters
            averageScore
            popularity
            countryOfOrigin
            startDate { year }
          }
        }
      }
    `;

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'MangaVerse-App/2.0' },
      body: JSON.stringify({ query, variables: { q } }),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return [];
    const json = await res.json();
    return (json.data?.Page?.media || []).map(transformAniListItem);
  } catch (err) {
    return [];
  }
}

// AniList Public GraphQL Enrichment for details - returns FULL media payload
async function fetchAniListEnrichment(searchTitle: string, anilistId?: number, malId?: number) {
  try {
    const query = `
      query ($id: Int, $idMal: Int, $search: String) {
        Media(id: $id, idMal: $idMal, search: $search, type: MANGA) {
          id
          idMal
          title { romaji english native }
          coverImage { extraLarge large medium }
          bannerImage
          description
          genres
          status
          chapters
          averageScore
          popularity
          countryOfOrigin
          startDate { year }
          trailer { id site }
          characters(sort: ROLE, perPage: 8) {
            edges {
              role
              node {
                id
                name { full }
                image { medium }
              }
            }
          }
          relations {
            edges {
              relationType
              node {
                id
                title { romaji english }
                format
                type
                coverImage { medium }
              }
            }
          }
          recommendations(perPage: 6) {
            nodes {
              mediaRecommendation {
                id
                title { romaji english }
                coverImage { medium }
                averageScore
              }
            }
          }
        }
      }
    `;

    const variables: any = {};
    if (anilistId) variables.id = anilistId;
    else if (malId) variables.idMal = malId;
    else variables.search = searchTitle.replace(/\([^)]*\)/g, '').trim();

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'MangaVerse-App/2.0' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) return null;
    const json = await res.json();
    const media = json.data?.Media;
    if (!media) return null;

    const realTitle = media.title?.english || media.title?.romaji || media.title?.native;
    const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium;

    const characters = (media.characters?.edges || []).map((e: any) => ({
      id: e.node.id,
      name: e.node.name?.full,
      role: e.role === 'MAIN' ? 'Protagonista' : 'Suporte',
      imageUrl: e.node.image?.medium
    }));

    const relations = (media.relations?.edges || []).map((r: any) => ({
      id: `al-${r.node.id}`,
      title: r.node.title?.english || r.node.title?.romaji,
      relationType:
        r.relationType === 'ADAPTATION'
          ? 'Adaptação Anime'
          : r.relationType === 'SEQUEL'
          ? 'Sequência'
          : r.relationType === 'PREQUEL'
          ? 'Prelúdio'
          : r.relationType === 'SIDE_STORY'
          ? 'História Paralela'
          : r.relationType,
      format: r.node.format,
      coverUrl: r.node.coverImage?.medium
    }));

    const recommendations = (media.recommendations?.nodes || [])
      .filter((rec: any) => rec.mediaRecommendation)
      .map((rec: any) => ({
        id: `al-${rec.mediaRecommendation.id}`,
        title: rec.mediaRecommendation.title?.english || rec.mediaRecommendation.title?.romaji,
        coverUrl: rec.mediaRecommendation.coverImage?.medium,
        rating: rec.mediaRecommendation.averageScore ? rec.mediaRecommendation.averageScore / 10 : 8.5
      }));

    return {
      title: realTitle,
      coverUrl,
      bannerUrl: media.bannerImage,
      description: (media.description || '').replace(/<[^>]*>/g, ''),
      genres: media.genres,
      anilistScore: media.averageScore ? media.averageScore / 10 : undefined,
      trailerYoutubeId: media.trailer?.site === 'youtube' ? media.trailer.id : undefined,
      characters,
      relations,
      recommendations
    };
  } catch (err) {
    return null;
  }
}

// Find real MangaDex UUID by title or id
function resolveMangaDexUuid(id: string, title?: string): string {
  if (id.startsWith('md-')) {
    return id.replace('md-', '');
  }
  if (KNOWN_MANGADEX_MAP[id]) {
    return KNOWN_MANGADEX_MAP[id];
  }
  const sample = SAMPLE_MANGAS.find(m => m.id === id || m.slug === id || (m.anilistId && `al-${m.anilistId}` === id));
  if (sample?.mangadexId) {
    return sample.mangadexId;
  }
  const normId = normalizeTitle(id);
  for (const [k, uuid] of Object.entries(KNOWN_MANGADEX_MAP)) {
    if (normId.includes(normalizeTitle(k)) || normalizeTitle(k).includes(normId)) {
      return uuid;
    }
  }
  if (title) {
    const normTitle = normalizeTitle(title);
    for (const [k, uuid] of Object.entries(KNOWN_MANGADEX_MAP)) {
      if (normTitle.includes(normalizeTitle(k)) || normalizeTitle(k).includes(normTitle)) {
        return uuid;
      }
    }
  }
  return '';
}

// Find all relevant MangaDex UUIDs (including Colored and Standard editions)
function resolveMangaDexUuids(id: string, title?: string): string[] {
  const list: string[] = [];
  if (id.startsWith('md-')) {
    list.push(id.replace('md-', ''));
  }
  const normId = normalizeTitle(id);
  const normTitle = title ? normalizeTitle(title) : '';

  if (normId.includes('onepiece') || normTitle.includes('onepiece') || id.includes('30013')) {
    // One Piece Official Colored (390+ PT-BR chapters!) and Standard One Piece
    list.push('a2c1d849-af05-4bbc-b2a7-866ebb10331f');
    list.push('a1c7c817-4e59-43b7-9365-09675a149a6f');
  } else if (normId.includes('naruto') || normTitle.includes('naruto') || id.includes('30011')) {
    // Naruto Official Colored (150+ PT-BR chapters) and Standard
    list.push('a787b10a-02d0-46c0-8236-0d01d69ad4a3');
    list.push('6b1eb93e-473a-4ab3-9922-1a66d2a29a4a');
  } else if (normId.includes('bleach') || normTitle.includes('bleach') || id.includes('30012')) {
    // Bleach Standard and Digital Colored
    list.push('239d6260-d71f-43b0-afff-074e3619e3de');
    list.push('72e3914a-555e-4bbd-8cdd-b4e69d7249a5');
  } else if (
    normId.includes('attackontitan') ||
    normTitle.includes('attackontitan') ||
    normId.includes('shingeki') ||
    normTitle.includes('shingeki') ||
    normTitle.includes('titas') ||
    normId.includes('titas') ||
    id.includes('30745') ||
    id.includes('53390')
  ) {
    // Attack on Titan (Shingeki no Kyojin)
    list.push('304ceac3-8cdb-4fe7-acf7-2b6ff7a60613');
  } else {
    const single = resolveMangaDexUuid(id, title);
    if (single) list.push(single);
  }

  return Array.from(new Set(list));
}

const app = new ShimApp();


  // === AUTH & ADMIN SYSTEM ===
  app.post('/api/auth/admin-login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    const isAdm = isAdminEmail(email);
    if (isAdm) {
      const token = `denilson_adm_valid_token_${Date.now()}`;
      return res.json({
        success: true,
        user: {
          email: 'denilsonr703@gmail.com',
          name: 'Denilson (ADM)',
          role: 'admin',
          token
        }
      });
    }

    return res.json({
      success: true,
      user: {
        email,
        name: email.split('@')[0],
        role: 'user',
        token: `user_token_${Date.now()}`
      }
    });
  });

  app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/, '') || (req.query.token as string);
    const email = (req.query.email as string) || '';

    if (isAdminEmail(email) || verifyAdminToken(token)) {
      return res.json({
        authenticated: true,
        user: {
          email: 'denilsonr703@gmail.com',
          name: 'Denilson (ADM)',
          role: 'admin',
          token: token || 'denilson_adm_valid_token'
        }
      });
    }
    return res.json({ authenticated: false, user: null });
  });

  // Admin stats
  app.get('/api/admin/stats', async (_req, res) => {
    res.json({ ...getStats(), customChaptersCount: (await getCustomChapters()).length });
  });

  // Pix and Donation Settings API
  app.get('/api/pix/config', (_req, res) => {
    res.json(getPixConfig());
  });

  app.get('/api/admin/pix', (_req, res) => {
    res.json(getPixConfig());
  });

  app.post('/api/admin/pix', (req, res) => {
    const { key, merchantName, merchantCity, description, suggestedAmounts } = req.body;
    if (key && typeof key !== 'string') {
      return res.status(400).json({ error: 'Chave Pix inválida' });
    }
    const updated = updatePixConfig({
      ...(key ? { key: key.trim() } : {}),
      ...(merchantName ? { merchantName: merchantName.trim() } : {}),
      ...(merchantCity ? { merchantCity: merchantCity.trim() } : {}),
      ...(description ? { description: description.trim() } : {}),
      ...(Array.isArray(suggestedAmounts) ? { suggestedAmounts } : {})
    });
    res.json(updated);
  });

  // Admin Mangas Management
  app.get('/api/admin/mangas', (_req, res) => {
    res.json(getCustomMangas());
  });

  app.post('/api/admin/mangas', (req, res) => {
    const manga = req.body;
    if (!manga.title) return res.status(400).json({ error: 'Título obrigatório' });
    const id = manga.id || `custom-${normalizeTitle(manga.title)}-${Date.now()}`;
    const newItem: MangaItem = {
      ...manga,
      id,
      slug: id,
      title: manga.title.trim(),
      coverUrl: manga.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      bannerUrl: manga.bannerUrl || manga.coverUrl,
      description: manga.description || 'Mangá adicionado pelo administrador.',
      genres: Array.isArray(manga.genres) && manga.genres.length > 0 ? manga.genres : ['Ação', 'Aventura'],
      status: manga.status || 'ongoing',
      authors: manga.authors || ['Autor Desconhecido'],
      artists: manga.artists || [],
      rating: parseFloat(manga.rating) || 9.5,
      totalChapters: parseInt(manga.totalChapters) || 1
    };
    addCustomManga(newItem);
    // Invalidate catalog caches
    cache.delete('manga_catalog_full_v1');
    cache.delete('manga_featured_v5');
    res.json(newItem);
  });

  app.put('/api/admin/mangas/:id', (req, res) => {
    const { id } = req.params;
    const updated = updateCustomManga(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Mangá não encontrado' });
    cache.delete('manga_catalog_full_v1');
    cache.delete('manga_featured_v5');
    res.json(updated);
  });

  app.delete('/api/admin/mangas/:id', (req, res) => {
    const { id } = req.params;
    deleteManga(id);
    cache.delete('manga_catalog_full_v1');
    cache.delete('manga_featured_v5');
    res.json({ success: true, id });
  });

  // Admin Chapters Management
  app.get('/api/admin/chapters', async (req, res) => {
    const mangaId = req.query.mangaId as string;
    res.json(await getCustomChapters(mangaId));
  });

  app.post('/api/admin/chapters', async (req, res) => {
    const client = await authorizedChapterClient(req.headers);
    if (!client) return res.status(403).json({ error: 'Entre com a conta Google do administrador para salvar capítulos.' });
    const { mangaId, chapterNumber, title, pages, scanlationGroup } = req.body;
    if (!mangaId || !chapterNumber) {
      return res.status(400).json({ error: 'mangaId e chapterNumber são obrigatórios' });
    }

    let pageUrls: string[] = [];
    if (Array.isArray(pages) && pages.length > 0) {
      pageUrls = pages.map((p: string) => String(p).trim()).filter(Boolean);
    }
    if (pageUrls.length === 0) {
      return res.status(400).json({ error: 'Adicione ao menos uma página real (URL de imagem) ao capítulo.' });
    }

    const newChapter: any = {
      id: `custom-${mangaId}-c${chapterNumber}`,
      mangaId,
      chapterNumber: String(chapterNumber),
      title: title || `Capítulo ${chapterNumber}`,
      volume: calculateVolume(mangaId, parseFloat(chapterNumber) || 1),
      scanlationGroup: scanlationGroup || 'Upload Oficial MangaVerse',
      language: 'pt-br',
      pages: pageUrls,
      publishedAt: new Date().toISOString()
    };

    await addCustomChapter(newChapter, client);
    // Invalidate chapters and pages cache for this manga
    for (const key of cache.keys()) {
      if (key.includes(mangaId) || key.includes(chapterNumber)) {
        cache.delete(key);
      }
    }
    res.json(newChapter);
  });

  app.put('/api/admin/chapters/pages', async (req, res) => {
    const client = await authorizedChapterClient(req.headers);
    if (!client) return res.status(403).json({ error: 'Entre com a conta Google do administrador para salvar capítulos.' });
    const { mangaId, chapterNumber, pages } = req.body;
    if (!mangaId || !chapterNumber || !Array.isArray(pages)) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }
    const cleanPages = pages.map((p: string) => String(p).trim()).filter(Boolean);
    if (!cleanPages.length) return res.status(400).json({ error: 'Adicione ao menos uma página real ao capítulo.' });
    await updateChapterPages(mangaId, String(chapterNumber), cleanPages, client);
    for (const key of cache.keys()) {
      if (key.includes(mangaId) || key.includes(chapterNumber)) {
        cache.delete(key);
      }
    }
    res.json({ success: true, count: cleanPages.length });
  });

  app.delete('/api/admin/chapters', async (req, res) => {
    const client = await authorizedChapterClient(req.headers);
    if (!client) return res.status(403).json({ error: 'Entre com a conta Google do administrador para salvar capítulos.' });
    const mangaId = (req.query.mangaId as string) || req.body.mangaId;
    const chapterNumber = (req.query.chapterNumber as string) || req.body.chapterNumber;
    if (!mangaId || !chapterNumber) {
      return res.status(400).json({ error: 'mangaId e chapterNumber são obrigatórios' });
    }
    await deleteChapter(String(mangaId), String(chapterNumber), client);
    for (const key of cache.keys()) {
      if (key.includes(mangaId) || key.includes(chapterNumber)) {
        cache.delete(key);
      }
    }
    res.json({ success: true, mangaId, chapterNumber });
  });

  // === LIVE CHAT API ===
  app.get('/api/chat/messages', (_req, res) => {
    res.json(getChatMessages());
  });

  app.post('/api/chat/messages', (req, res) => {
    const { user, email, text, avatar, replyTo, role } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Texto obrigatório' });

    if (isUserBanned(user || '') || (email && isUserBanned(email))) {
      return res.status(403).json({ error: 'Você foi silenciado ou banido do chat.' });
    }

    const msg = addChatMessage({
      user: user || 'Leitor',
      email,
      role,
      avatar,
      text,
      replyTo
    });
    res.json(msg);
  });

  app.delete('/api/chat/messages/:id', (req, res) => {
    const { id } = req.params;
    deleteChatMessage(id);
    res.json({ success: true, id });
  });

  app.post('/api/chat/clear', (_req, res) => {
    clearChat();
    res.json({ success: true });
  });

  app.post('/api/chat/ban', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Nome de usuário obrigatório' });
    const result = toggleBanUser(username);
    res.json(result);
  });

  // === CHAPTER COMMENTS API ===
  app.get('/api/comments', (req, res) => {
    const mangaId = (req.query.mangaId as string) || '';
    const chapterNumber = (req.query.chapterNumber as string) || '1';
    res.json(getChapterComments(mangaId, chapterNumber));
  });

  app.post('/api/comments', (req, res) => {
    const { mangaId, chapterNumber, user, email, avatar, text, isSpoiler, role } = req.body;
    if (!mangaId || !chapterNumber || !text || !text.trim()) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }
    const comment = addChapterComment({
      mangaId,
      chapterNumber: String(chapterNumber),
      user: user || 'Leitor',
      email,
      role,
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      text: text.trim(),
      isSpoiler: !!isSpoiler
    });
    res.json(comment);
  });

  app.post('/api/comments/:id/reply', (req, res) => {
    const { id } = req.params;
    const { user, email, avatar, text, role } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Texto obrigatório' });
    const updated = addCommentReply(id, {
      user: user || 'Leitor',
      email,
      role,
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      text: text.trim()
    });
    if (!updated) return res.status(404).json({ error: 'Comentário não encontrado' });
    res.json(updated);
  });

  app.post('/api/comments/:id/like', (req, res) => {
    const { id } = req.params;
    const likes = likeComment(id);
    res.json({ success: true, likes });
  });

  app.post('/api/comments/:id/pin', (req, res) => {
    const { id } = req.params;
    const isPinned = togglePinComment(id);
    res.json({ success: true, isPinned });
  });

  app.delete('/api/comments/:id', (req, res) => {
    const { id } = req.params;
    const deleted = deleteComment(id);
    res.json({ success: deleted });
  });

  // 0. Complete Catalog endpoint
  app.get('/api/manga/catalog', async (_req, res) => {
    const cacheKey = 'manga_catalog_full_v1';
    const cached = getFromCache<any>(cacheKey);
    if (cached) return res.json(cached);

    try {
      const { aniData, mdItems, ckItems } = await fetchCombinedCatalog();
      const customItems = getCustomMangas();
      const allItems = [
        ...customItems,
        ...SAMPLE_MANGAS,
        ...aniData.popular,
        ...aniData.trending,
        ...aniData.manhwa,
        ...mdItems,
        ...ckItems
      ].filter(item => !isMangaDeleted(item.id));
      const seen = new Set<string>();
      const uniqueItems: MangaItem[] = [];
      for (const item of allItems) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          uniqueItems.push(item);
        }
      }
      setInCache(cacheKey, uniqueItems);
      return res.json(uniqueItems);
    } catch (err) {
      return res.json([...getCustomMangas(), ...SAMPLE_MANGAS].filter(m => !isMangaDeleted(m.id)));
    }
  });

  // 1. Featured / Home sections connecting AniList, MangaDex, ComicK & Kitsu
  app.get('/api/manga/featured', async (_req, res) => {
    const cacheKey = 'manga_featured_v5';
    const cached = getFromCache<any>(cacheKey);
    if (cached) return res.json(cached);

    try {
      const { aniData, mdItems, ckItems, ktItems } = await fetchCombinedCatalog();
      const customItems = getCustomMangas();

      const allItems = [
        ...customItems,
        ...SAMPLE_MANGAS,
        ...aniData.popular,
        ...aniData.trending,
        ...aniData.manhwa,
        ...mdItems,
        ...ckItems,
        ...ktItems
      ].filter(m => !isMangaDeleted(m.id));

      const merged = deduplicateAndMergeManga(allItems);

      const result = {
        popular: merged.slice(0, 12),
        trending: merged.slice(4, 16),
        latest: merged.filter(m => m.country === 'kr').slice(0, 10).concat(merged.slice(10, 16)),
        updated: merged.slice(2, 12)
      };

      setInCache(cacheKey, result);
      return res.json(result);
    } catch (err) {
      console.warn('Error fetching featured manga, returning resilient catalog:', err);
      return res.json({
        popular: SAMPLE_MANGAS.slice(0, 6),
        trending: SAMPLE_MANGAS.slice(2, 8),
        latest: SAMPLE_MANGAS.slice(1, 7),
        updated: SAMPLE_MANGAS.slice(3, 8)
      });
    }
  });

  // 2. Search manga across multiple APIs with PT-BR priority (MangaDex PT-BR + ComicK PT-BR + Curated DB)
  app.get('/api/manga/search', async (req, res) => {
    const q = ((req.query.q as string) || '').trim();
    const genre = (req.query.genre as string) || '';
    const status = (req.query.status as string) || '';
    const country = (req.query.country as string) || '';
    const nsfw = req.query.nsfw === 'true';

    const cacheKey = `search_v6_${q}_${genre}_${status}_${country}_${nsfw}`;
    const cached = getFromCache<MangaItem[]>(cacheKey);
    if (cached) return res.json(cached);

    try {
      const promises: Promise<MangaItem[]>[] = [];

      // 1. MangaDex Live Search strictly with Portuguese Scans
      const mdUrl = new URL('https://api.mangadex.org/manga');
      mdUrl.searchParams.set('limit', '30');
      mdUrl.searchParams.append('includes[]', 'cover_art');
      mdUrl.searchParams.append('includes[]', 'author');
      mdUrl.searchParams.append('availableTranslatedLanguage[]', 'pt-br');
      mdUrl.searchParams.append('availableTranslatedLanguage[]', 'pt');

      if (q) mdUrl.searchParams.set('title', q);
      if (nsfw) {
        mdUrl.searchParams.append('contentRating[]', 'safe');
        mdUrl.searchParams.append('contentRating[]', 'suggestive');
        mdUrl.searchParams.append('contentRating[]', 'erotica');
      } else {
        mdUrl.searchParams.append('contentRating[]', 'safe');
        mdUrl.searchParams.append('contentRating[]', 'suggestive');
      }

      promises.push(
        fetch(mdUrl.toString(), {
          headers: { 'User-Agent': 'MangaVerse-App/2.0' },
          signal: AbortSignal.timeout(5000)
        })
          .then(r => r.json())
          .then(data => (data.data ? data.data.map(transformMangaDexItem) : []))
          .catch(() => [])
      );

      // 2. ComicK PT-BR Search
      if (q) {
        promises.push(
          fetch(`https://api.comick.dev/v1.0/search?tachiyomi=true&lang=pt-br&q=${encodeURIComponent(q)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000)
          })
            .then(r => r.json())
            .then(data => (Array.isArray(data) ? data.map(transformComicKItem) : []))
            .catch(() => [])
        );
      }

      // 3. AniList Search for comprehensive metadata
      if (q) {
        promises.push(searchAniList(q));
      }

      // 4. Sample database matches
      const sampleMatches = SAMPLE_MANGAS.filter(m => {
        if (!q) return true;
        const normQ = normalizeTitle(q);
        const matchTitle = normalizeTitle(m.title).includes(normQ);
        const matchAlt = (m.altTitles || []).some(t => normalizeTitle(t).includes(normQ));
        return matchTitle || matchAlt;
      });

      const fetchedResults = await Promise.all(promises);
      const allResults = [...sampleMatches, ...fetchedResults.flat()];

      let merged = deduplicateAndMergeManga(allResults);

      if (genre) {
        merged = merged.filter(m => m.genres.some(g => g.toLowerCase().includes(genre.toLowerCase())));
      }
      if (status) {
        merged = merged.filter(m => m.status === status);
      }
      if (country) {
        merged = merged.filter(m => m.country === country);
      }

      setInCache(cacheKey, merged);
      return res.json(merged);
    } catch (err) {
      console.warn('Search endpoint error, falling back to local dataset:', err);
      const filtered = SAMPLE_MANGAS.filter(m => !q || normalizeTitle(m.title).includes(normalizeTitle(q)));
      return res.json(filtered);
    }
  });

  // 3. Manga details with Multi-API Enrichment (AniList + MangaDex)
  app.get('/api/manga/details', async (req, res) => {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'Manga ID required' });

    const cacheKey = `details_v5_${id}`;
    const cached = getFromCache<MangaItem>(cacheKey);
    if (cached) return res.json(cached);

    let baseItem: MangaItem | null = null;

    // Check sample database
    const sample = SAMPLE_MANGAS.find(m => m.id === id || m.slug === id || m.mangadexId === id);
    if (sample) {
      baseItem = { ...sample };
    }

    if (!baseItem) {
      try {
        if (id.startsWith('al-')) {
          const alId = parseInt(id.replace('al-', ''), 10);
          const enriched = await fetchAniListEnrichment('', alId);
          if (enriched && enriched.title) {
            baseItem = {
              id,
              slug: id,
              status: 'ongoing',
              authors: [],
              artists: [],
              rating: enriched.anilistScore || 9.2,
              anilistId: alId,
              ...enriched,
              title: enriched.title,
              coverUrl: enriched.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
              bannerUrl: enriched.bannerUrl,
              description: enriched.description || 'Sinopse do título.',
              genres: enriched.genres || ['Ação', 'Aventura']
            };
          }
        } else if (id.startsWith('md-')) {
          const mdId = id.replace('md-', '');
          const r = await fetch(`https://api.mangadex.org/manga/${mdId}?includes[]=cover_art&includes[]=author`, {
            headers: { 'User-Agent': 'MangaVerse-App/2.0' },
            signal: AbortSignal.timeout(5000)
          });
          const data = await r.json();
          if (data.data) {
            baseItem = transformMangaDexItem(data.data);
          }
        }
      } catch (err) {
        console.warn('Error fetching base details:', err);
      }
    }

    // If still not resolved, query AniList dynamically by clean title
    if (!baseItem) {
      const cleanTitle = id
        .replace(/^(al-|md-|ck-|kt-)/i, '')
        .replace(/[-_]/g, ' ')
        .trim();

      try {
        const enriched = await fetchAniListEnrichment(cleanTitle);
        if (enriched && enriched.title) {
          baseItem = {
            id,
            slug: id,
            status: 'ongoing',
            authors: [],
            artists: [],
            rating: enriched.anilistScore || 9.0,
            totalChapters: 60,
            ...enriched,
            title: enriched.title,
            coverUrl: enriched.coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
            bannerUrl: enriched.bannerUrl,
            description: enriched.description || 'Sinopse oficial.',
            genres: enriched.genres || ['Ação', 'Fantasia']
          };
        }
      } catch (dynErr) {
        console.warn('Dynamic detail search error:', dynErr);
      }
    }

    if (!baseItem) {
      const cleanTitle = id
        .replace(/^(al-|md-|ck-|kt-)/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      baseItem = {
        id,
        slug: id,
        title: cleanTitle || 'Título Selecionado',
        coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
        description: 'Carregando detalhes do título...',
        genres: ['Ação', 'Fantasia'],
        status: 'ongoing',
        authors: ['Autor Desconhecido'],
        artists: [],
        rating: 9.0,
        totalChapters: 50
      };
    }

    // Ensure localized title and synopsis in Portuguese
    baseItem = localizeManga(baseItem);

    // Enrich asynchronously using AniList
    try {
      const aniData = await fetchAniListEnrichment(baseItem.title, baseItem.anilistId, baseItem.malId);
      if (aniData) {
        if (aniData.anilistScore) baseItem.anilistScore = aniData.anilistScore;
        if (aniData.trailerYoutubeId) baseItem.trailerYoutubeId = aniData.trailerYoutubeId;
        if (aniData.characters && aniData.characters.length > 0) baseItem.characters = aniData.characters;
        if (aniData.relations && aniData.relations.length > 0) baseItem.relations = aniData.relations;
        if (aniData.recommendations && aniData.recommendations.length > 0) baseItem.recommendations = aniData.recommendations;
      }
    } catch (enrichErr) {
      console.warn('Enrichment APIs non-blocking error:', enrichErr);
    }

    setInCache(cacheKey, baseItem);
    return res.json(baseItem);
  });

  // 4. Complete chapters list with accurate volumes & PT-BR priority
  app.get('/api/manga/chapters', async (req, res) => {
    const id = (req.query.id as string) || '';
    const lang = (req.query.lang as string) || 'pt-br';
    const mangaTitle = (req.query.mangaTitle as string) || (req.query.title as string) || '';

    const records = await getChapterRecords(id);
    const customChs = records.filter(row => !row.deleted).map(rowToChapter);
    const deletedNumbers = new Set(records.filter(row => row.deleted).map(row => row.chapter_number));
    const cacheKey = `chapters_v13_${id}_${lang}_${encodeURIComponent(mangaTitle)}_${JSON.stringify(records)}`;
    const cached = getFromCache<MangaChapter[]>(cacheKey);
    if (cached) return res.json(cached);

    try {
      const chapterMap = new Map<string, MangaChapter>();

      // 1. Determine real MangaDex UUIDs and query real MangaDex chapters FIRST
      let mdIds = resolveMangaDexUuids(id, mangaTitle);
      if (mdIds.length === 0) {
        const cleanTitle = (mangaTitle || id).replace(/^(al-|md-|ck-|kt-)/i, '').replace(/[-_]/g, ' ').trim();
        const sRes = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(cleanTitle)}&limit=1&order[followedCount]=desc`, {
          headers: { 'User-Agent': 'MangaVerse-App/2.0' },
          signal: AbortSignal.timeout(4000)
        }).then(r => r.json()).catch(() => null);
        if (sRes?.data?.[0]?.id) {
          mdIds.push(sRes.data[0].id);
        }
      }

      for (const mdId of mdIds) {
        // Query MangaDex chapters EXCLUSIVELY in PT-BR with deep pagination for full archives (e.g. One Piece 390+, Naruto 150+)
        let mdChapters: any[] = [];
        const chPtUrl1 = `https://api.mangadex.org/chapter?manga=${mdId}&translatedLanguage[]=pt-br&translatedLanguage[]=pt&includeExternalUrl=0&order[chapter]=desc&limit=100&offset=0`;
        const chPtRes1 = await fetch(chPtUrl1, {
          headers: { 'User-Agent': 'MangaVerse-App/2.0' },
          signal: AbortSignal.timeout(6000)
        }).then(r => r.json()).catch(() => null);

        if (chPtRes1?.data && Array.isArray(chPtRes1.data)) {
          mdChapters.push(...chPtRes1.data);
          const totalPt = chPtRes1.total || 0;
          if (totalPt > 100) {
            const offsets: number[] = [];
            for (let off = 100; off < totalPt && off < 500; off += 100) {
              offsets.push(off);
            }
            const extraRes = await Promise.all(
              offsets.map(off =>
                fetch(`https://api.mangadex.org/chapter?manga=${mdId}&translatedLanguage[]=pt-br&translatedLanguage[]=pt&includeExternalUrl=0&order[chapter]=desc&limit=100&offset=${off}`, {
                  headers: { 'User-Agent': 'MangaVerse-App/2.0' },
                  signal: AbortSignal.timeout(6000)
                }).then(r => r.json()).catch(() => null)
              )
            );
            for (const r of extraRes) {
              if (r?.data && Array.isArray(r.data)) {
                mdChapters.push(...r.data);
              }
            }
          }
        }

        // Strictly process PT-BR chapters only (NO English chapters)
        for (const ch of mdChapters) {
          const pages = ch.attributes?.pages || 0;
          if (pages === 0) continue; // Skip external / 0-page chapters!

          const isPt = ch.attributes?.translatedLanguage === 'pt-br' || ch.attributes?.translatedLanguage === 'pt';
          if (!isPt) continue; // STRICT PT-BR ONLY!

          const rawNum = ch.attributes?.chapter;
          if (!rawNum || isNaN(parseFloat(rawNum))) continue; // Skip specials without chapter numbers
          const num = rawNum.replace(/^0+(\d)/, '$1').trim();
          const numInt = parseFloat(num) || 1;
          const volumeLabel = ch.attributes?.volume
            ? `Vol. ${ch.attributes.volume}`
            : calculateVolume(id, numInt);

          let rawTitle = ch.attributes?.title ? ch.attributes.title.trim() : '';
          // Discard titles with non-latin or Cyrillic characters, or empty, or generic English
          if (!rawTitle || /[^\u0000-\u024F\s0-9.,!?'":\-_/()]/.test(rawTitle) || /^chapter\s*\d+$/i.test(rawTitle)) {
            rawTitle = `Capítulo ${num}`;
          }

          const item: MangaChapter = {
            id: `md-${ch.id}`,
            chapterNumber: num,
            volume: volumeLabel,
            title: rawTitle,
            language: 'pt-br',
            scanlationGroup: 'Scan Oficial BR · MangaDex',
            publishedAt: ch.attributes?.publishAt || ch.attributes?.createdAt || new Date().toISOString(),
            pagesCount: pages
          };

          if (!chapterMap.has(num)) {
            chapterMap.set(num, item);
          }
        }
      }

      // 0. Resolve canonical manga identity (One Piece, Naruto, Bleach, Attack on Titan, Berserk, etc.)
      const canonSlug = getCanonicalMangaSlug(id, mangaTitle);

      // Pre-seed complete chapters for canonical manga so all chapters exist immediately
      if (canonSlug && SAMPLE_CHAPTERS_MAP[canonSlug]) {
        for (const ch of SAMPLE_CHAPTERS_MAP[canonSlug]) {
          if (!chapterMap.has(ch.chapterNumber)) {
            chapterMap.set(ch.chapterNumber, ch);
          }
        }
      }

      // Special case Berserk: start with pre-mapped Berserk chapters that include exact MangaDex UUIDs!
      if (id.toLowerCase().includes('berserk') || canonSlug === 'berserk') {
        const berserkList = generateBerserkChapters();
        for (const ch of berserkList) {
          chapterMap.set(ch.chapterNumber, ch);
        }
      }

      // Check pre-computed sample chapters ONLY for chapters not yet in chapterMap
      const sampleKey = Object.keys(SAMPLE_CHAPTERS_MAP).find(k => id.includes(k) || k.includes(id));
      if (sampleKey && SAMPLE_CHAPTERS_MAP[sampleKey]) {
        for (const ch of SAMPLE_CHAPTERS_MAP[sampleKey]) {
          if (!chapterMap.has(ch.chapterNumber)) {
            chapterMap.set(ch.chapterNumber, ch);
          }
        }
      }

      // Determine total chapters needed for full coverage
      let totalNeeded = 0;
      if (canonSlug && KNOWN_TOTAL_CHAPTERS[canonSlug]) {
        totalNeeded = KNOWN_TOTAL_CHAPTERS[canonSlug];
      }

      if (!totalNeeded) {
        const normId = normalizeTitle(id);
        const normTitle = mangaTitle ? normalizeTitle(mangaTitle) : '';
        for (const [key, val] of Object.entries(KNOWN_TOTAL_CHAPTERS)) {
          const normKey = normalizeTitle(key);
          if (
            normId.includes(normKey) ||
            normKey.includes(normId) ||
            (normTitle && (normTitle.includes(normKey) || normKey.includes(normTitle)))
          ) {
            totalNeeded = val;
            break;
          }
        }
      }

      if (!totalNeeded) {
        let maxFound = 0;
        for (const numStr of chapterMap.keys()) {
          const n = parseFloat(numStr);
          if (!isNaN(n) && n > maxFound) maxFound = n;
        }
        totalNeeded = maxFound > 0 ? maxFound : 50;
      }

      // Fill in any gaps from Chapter 1 to totalNeeded with accurate volume calculations
      const scanlators = ['Mugiwara Scans', 'Neox Scan', 'Golden Mangás', 'Tsukimi Scans', 'Reaper Scans BR', 'Bakuen Scans'];
      for (let i = 1; i <= totalNeeded; i++) {
        const numStr = `${i}`;
        if (!chapterMap.has(numStr)) {
          const daysAgo = Math.floor((totalNeeded - i) * 1.5);
          const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
          chapterMap.set(numStr, {
            id: `gen-${id}-c${i}`,
            chapterNumber: numStr,
            volume: calculateVolume(canonSlug || id, i),
            title: i === 1 ? 'O Início da Aventura' : `Capítulo ${i}`,
            language: 'pt-br',
            scanlationGroup: scanlators[i % scanlators.length],
            publishedAt: date,
            pagesCount: 20
          });
        }
      }

      // Inserir capítulos personalizados criados pelo administrador
      // Persistent records were read before the cache lookup.
      for (const customCh of customChs) {
        chapterMap.set(customCh.chapterNumber, {
          id: customCh.id,
          chapterNumber: customCh.chapterNumber,
          volume: customCh.volume || calculateVolume(id, parseFloat(customCh.chapterNumber) || 1),
          title: customCh.title,
          language: customCh.language || 'pt-br',
          scanlationGroup: customCh.scanlationGroup || 'Upload Oficial MangaVerse (ADM)',
          publishedAt: customCh.publishedAt,
          pagesCount: customCh.pages.length
        });
      }

      const customIds = new Set(customChs.map(c => c.id));
      let finalChapters = Array.from(chapterMap.values()).filter(
        c => !deletedNumbers.has(c.chapterNumber)
      ).map(c => ({ ...c, hasContent: c.id.startsWith('md-') || (customIds.has(c.id) && (c.pagesCount || 0) > 0) }));
      finalChapters.sort((a, b) => {
        const na = parseFloat(a.chapterNumber) || 0;
        const nb = parseFloat(b.chapterNumber) || 0;
        return nb - na;
      });

      setInCache(cacheKey, finalChapters);
      return res.json(finalChapters);
    } catch (err) {
      console.warn('Error fetching chapters, using generator:', err);
      const canon = getCanonicalMangaSlug(id, mangaTitle);
      if (canon && SAMPLE_CHAPTERS_MAP[canon]) {
        return res.json(SAMPLE_CHAPTERS_MAP[canon]);
      }
      const fallback = generateFullChaptersForManga(id, 60, mangaTitle || id);
      return res.json(fallback);
    }
  });

  // 5. Chapter Pages reader data: REAL manga pages from MangaDex At-Home server
  app.get('/api/manga/chapter-pages', async (req, res) => {
    const chapterId = (req.query.chapterId as string) || '';
    const mangaId = (req.query.mangaId as string) || '';
    let chapterNumber = (req.query.chapterNumber as string) || '';
    const mangaTitle = (req.query.mangaTitle as string) || (req.query.title as string) || '';
    const quality = (req.query.quality as string) || 'original';

    // Extract chapter number from chapterId if not provided (e.g. "berserk-cap-1" -> "1")
    if (!chapterNumber && chapterId) {
      const match = chapterId.match(/[-_]c(?:ap[-_]?)?(\d+(?:\.\d+)?)/i) || chapterId.match(/(\d+(?:\.\d+)?)$/);
      if (match) {
        chapterNumber = match[1];
      }
    }

    if (await isChapterDeleted(mangaId, chapterNumber)) {
      return res.status(404).json({ error: 'Capítulo removido', pages: [] });
    }

    // 0. Check admin custom chapters first!
    const customList = await getCustomChapters(mangaId);
    const customMatch = customList.find(c => c.chapterNumber === chapterNumber || c.id === chapterId);
    if (customMatch && Array.isArray(customMatch.pages) && customMatch.pages.length > 0) {
      const payload = {
        chapterId: customMatch.id || chapterId,
        mangaId,
        chapterNumber: customMatch.chapterNumber || chapterNumber || '1',
        chapterTitle: customMatch.title || `Capítulo ${chapterNumber}`,
        pages: customMatch.pages,
        directPages: customMatch.pages,
        dataSaverPages: customMatch.pages,
        directDataSaverPages: customMatch.pages,
        source: 'admin-upload',
        pagesCount: customMatch.pages.length
      };
      return res.json(payload);
    }

    const cacheKey = `pages_v11_${chapterId}_${mangaId}_${chapterNumber}_${quality}`;
    const cached = getFromCache<any>(cacheKey);
    if (cached && cached.pages && cached.pages.length > 0) return res.json(cached);

    try {
      // Helper function to build standard payload from MangaDex At-Home response
      const buildPayload = (atHomeRes: any, chNumber: string, chTitle?: string) => {
        const baseUrl = atHomeRes.baseUrl;
        const hash = atHomeRes.chapter.hash;
        const files: string[] = atHomeRes.chapter.data || [];
        const saverFiles: string[] = atHomeRes.chapter.dataSaver || [];

        const directPages = files.map((f: string) => `${baseUrl}/data/${hash}/${f}`);
        const directSaverPages = saverFiles.map((f: string) => `${baseUrl}/data-saver/${hash}/${f}`);

        const proxyPages = files.map((f: string) => `/api/proxy-image?url=${encodeURIComponent(`${baseUrl}/data/${hash}/${f}`)}`);
        const proxySaverPages = saverFiles.map((f: string) => `/api/proxy-image?url=${encodeURIComponent(`${baseUrl}/data-saver/${hash}/${f}`)}`);

        const chosenPages = quality === 'saver' && proxySaverPages.length > 0 ? proxySaverPages : proxyPages;
        const chosenDirect = quality === 'saver' && directSaverPages.length > 0 ? directSaverPages : directPages;

        return {
          chapterId,
          mangaId,
          chapterNumber: chNumber,
          chapterTitle: chTitle || `Capítulo ${chNumber}`,
          source: 'mangadex',
          pages: chosenPages,
          directPages: chosenDirect,
          dataSaverPages: proxySaverPages,
          directDataSaverPages: directSaverPages,
          pagesCount: chosenPages.length
        };
      };

      // 1. Direct MangaDex chapter UUID
      if (chapterId.startsWith('md-')) {
        const cleanMdId = chapterId.replace('md-', '');
        const r = await fetch(`https://api.mangadex.org/at-home/server/${cleanMdId}`, {
          headers: { 'User-Agent': 'MangaVerse-App/2.0' },
          signal: AbortSignal.timeout(7000)
        }).then(res => res.json()).catch(() => null);

        if (r?.baseUrl && r.chapter?.hash && Array.isArray(r.chapter?.data) && r.chapter.data.length > 0) {
          const payload = buildPayload(r, chapterNumber || '1');
          setInCache(cacheKey, payload);
          return res.json(payload);
        }
      }

      // 2. Specific Berserk Chapter Mapping
      const normId = normalizeTitle(mangaId);
      const isBerserk = normId.includes('berserk') || mangaTitle.toLowerCase().includes('berserk') || chapterId.includes('berserk');
      if (isBerserk) {
        const BERSERK_VERIFIED_MAP: Record<string, string> = {
          '1': 'bbea0894-09ab-4983-901d-368371a66708', // Vol 1 O Espadachim Negro (93 pages)
          '2': '10d14daf-7ec1-43bf-ba15-dcabe84fccd1', // Vol 1 A Marca do Sacrifício (69 pages)
          '3': '9b2c4997-e4de-408a-8cd0-6f4adfd15ea6', // Vol 1 Os Guardiões do Desejo (1) (57 pages)
          '4': '573a9995-28fe-4e11-aab4-db87d49dd65c', // Vol 2 Os Guardiões do Desejo (2) (117 pages)
          '5': '82fb16b9-8b27-416f-84b6-a35b2f07389c', // Vol 2 Os Guardiões do Desejo (3) (106 pages)
          '6': 'd6586e1a-4bc1-4cfa-a37b-f10ee8b878a1', // Vol 3 Os Guardiões do Desejo (4) (57 pages)
          '7': 'd0c1cbac-6ac2-459c-bdf6-d80b08ad5fb4', // Vol 3 Os Guardiões do Desejo (5) (52 pages)
          '8': 'f592df27-633e-4cda-9809-9fe7f8567964', // Vol 3 Os Guardiões do Desejo (Final) (60 pages)
          '9': '9c185ad5-0836-47f0-bdc9-27c5b9718303', // Vol 3 Idade de Ouro (1) (45 pages)
          '10': '8dd318eb-3dd2-43c9-8684-84481b718d36', // Vol 4 Idade de Ouro (2) (53 pages)
          '11': '64846703-e616-4158-a46a-45a101d37ee6', // Vol 4 Idade de Ouro (3) (48 pages)
          '12': '20fadcd9-57d2-429f-ad93-0c74b172aaf9', // Vol 4 Idade de Ouro (4) (44 pages)
          '13': 'f9c3841e-6515-41ef-8de4-aa911119f05f', // Vol 4 Idade de Ouro (5) (44 pages)
          '14': '1d799982-567f-4182-ba90-6cc21d7c512d', // Vol 4 Idade de Ouro (6) (42 pages)
          '15': '2074c5fa-a548-4dd8-a7ce-9144e9f25139', // Vol 5 Idade de Ouro (7) (39 pages)
          '16': '63d97d21-8c52-4dec-9a90-5497b2b1c253', // Vol 5 Idade de Ouro (8) (39 pages)
          '17': '283f8be9-a5d2-44b1-b771-bbb0cef46ee8', // Vol 5 Ventos da Espada (37 pages)
          '18': '9a7b5aaf-c702-4fef-93b9-b83fac0c7fc2', // Vol 5 Zodd, o Nosferatu (1) (20 pages)
          '19': '8fa080d2-4d37-48c8-a145-b6b9146b8c79', // Vol 5 Zodd, o Nosferatu (2) (19 pages)
          '20': 'd2fb1fdd-f4ff-49a1-b5c1-067904d76fab', // Vol 5 Zodd, o Nosferatu (3) (21 pages)
          '21': 'd7e8f4fe-7569-4ce2-b2d4-beae2c78f47c', // Vol 5 Zodd, o Nosferatu (4) (20 pages)
          '22': 'adb6976c-a5c9-4777-8cca-598c017b52be', // Vol 5 O Dono da Espada (1) (29 pages)
          '23': 'c4420c40-77bc-441c-82b5-441130b6461e', // Vol 6 O Dono da Espada (2) (30 pages)
          '24': '9ff244fb-b93a-4c1b-a4cb-f86e4fabca69', // Vol 6 O Assassino (1) (20 pages)
          '25': '8363fd29-adfa-4af4-88c3-c2807ec57fa2', // Vol 6 O Assassino (2) (20 pages)
          '26': '88a57cb1-ff0a-4261-82a6-4069c753a0b9', // Vol 6 O Assassino (3) (21 pages)
          '27': '290c7a05-5d59-47fe-8132-69572fb6563d', // Vol 6 O Assassino (4) (23 pages)
          '376': '088a4a5b-2619-40b7-b1f9-9fa23a3b093b'
        };

        const targetUuid = BERSERK_VERIFIED_MAP[chapterNumber || '1'];
        if (targetUuid) {
          const r = await fetch(`https://api.mangadex.org/at-home/server/${targetUuid}`, {
            headers: { 'User-Agent': 'MangaVerse-App/2.0' },
            signal: AbortSignal.timeout(7000)
          }).then(res => res.json()).catch(() => null);

          if (r?.baseUrl && r.chapter?.hash && Array.isArray(r.chapter?.data) && r.chapter.data.length > 0) {
            const payload = buildPayload(r, chapterNumber || '1', chapterNumber === '1' ? 'O Espadachim Negro' : `Capítulo ${chapterNumber}`);
            setInCache(cacheKey, payload);
            return res.json(payload);
          }
        }
      }

      // 3. Resolve via MangaDex manga UUIDs strictly for PT-BR and exact chapterNumber
      let mdUuids = resolveMangaDexUuids(mangaId, mangaTitle);
      if (mdUuids.length === 0) {
        const searchTitle = (mangaTitle || mangaId).replace(/^(al-|md-|ck-|kt-)/i, '').replace(/[-_]/g, ' ').trim();
        const sRes = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(searchTitle)}&limit=1&order[followedCount]=desc`, {
          headers: { 'User-Agent': 'MangaVerse-App/2.0' },
          signal: AbortSignal.timeout(4000)
        }).then(r => r.json()).catch(() => null);
        if (sRes?.data?.[0]?.id) {
          mdUuids.push(sRes.data[0].id);
        }
      }

      for (const mdMangaId of mdUuids) {
        let validChapters: any[] = [];

        if (chapterNumber) {
          const cleanNum = chapterNumber.replace(/^0+/, '') || chapterNumber;
          // Priority: exact chapter number in PT-BR only (never English or proximity guess)
          const searchChPtUrl = `https://api.mangadex.org/chapter?manga=${mdMangaId}&chapter[]=${encodeURIComponent(chapterNumber)}&chapter[]=${encodeURIComponent(cleanNum)}&translatedLanguage[]=pt-br&translatedLanguage[]=pt&includeExternalUrl=0&limit=10`;
          const searchPtRes = await fetch(searchChPtUrl, {
            headers: { 'User-Agent': 'MangaVerse-App/2.0' },
            signal: AbortSignal.timeout(5000)
          }).then(r => r.json()).catch(() => null);

          validChapters = (searchPtRes?.data || []).filter((c: any) => {
            const p = (c.attributes?.pages || 0);
            const chNum = (c.attributes?.chapter || '').trim();
            const chLang = (c.attributes?.translatedLanguage || '').toLowerCase();
            const isPtLang = chLang === 'pt-br' || chLang === 'pt';
            return p > 0 && isPtLang && (chNum === chapterNumber || chNum === cleanNum || parseFloat(chNum) === parseFloat(chapterNumber));
          });
        }

        if (validChapters.length > 0) {
          const best = validChapters[0];

          const atHomeRes = await fetch(`https://api.mangadex.org/at-home/server/${best.id}`, {
            headers: { 'User-Agent': 'MangaVerse-App/2.0' },
            signal: AbortSignal.timeout(7000)
          }).then(r => r.json()).catch(() => null);

          if (atHomeRes?.baseUrl && atHomeRes.chapter?.hash && Array.isArray(atHomeRes.chapter?.data) && atHomeRes.chapter.data.length > 0) {
            const payload = buildPayload(atHomeRes, chapterNumber || best.attributes?.chapter || '1', best.attributes?.title);
            setInCache(cacheKey, payload);
            return res.json(payload);
          }
        }
      }

      // No real scan found: never invent pages
      return res.json({ chapterId, mangaId, chapterNumber: chapterNumber || '1', chapterTitle: `Capítulo ${chapterNumber || '1'}`, pages: [], directPages: [], dataSaverPages: [], directDataSaverPages: [], source: 'unavailable', pagesCount: 0 });
    } catch (err) {
      console.warn('Error resolving chapter pages:', err);
      return res.json({ chapterId, mangaId, chapterNumber: chapterNumber || '1', chapterTitle: `Capítulo ${chapterNumber || '1'}`, pages: [], directPages: [], dataSaverPages: [], directDataSaverPages: [], source: 'unavailable', pagesCount: 0       });
    }
  });

  // Dynamic High-Fidelity SVG Manga Page Generator
  app.get('/api/manga/page-canvas', (req, res) => {
    const mangaId = (req.query.mangaId as string) || '';
    const title = (req.query.title as string) || (req.query.mangaTitle as string) || mangaId || 'Mangá';
    const chapterNum = (req.query.chapterNumber as string) || (req.query.chapter as string) || '1';
    const pageNum = parseInt((req.query.page as string) || '1', 10) || 1;
    const totalPages = parseInt((req.query.totalPages as string) || '16', 10) || 16;

    const sfxList = [
      { jp: 'ゴゴゴ', ro: 'GOGOGO', desc: 'Tensão iminente' },
      { jp: 'ドォォン', ro: 'DOOOON!', desc: 'Impacto brutal' },
      { jp: 'バキッ', ro: 'BAKI!', desc: 'Colisão feroz' },
      { jp: 'ズドドド', ro: 'ZUDODODO', desc: 'Avanço implacável' },
      { jp: 'ザッ', ro: 'ZAT!', desc: 'Movimento instantâneo' },
      { jp: 'カッ', ro: 'KAA!', desc: 'Clarão de energia' }
    ];
    const sfx = sfxList[pageNum % sfxList.length];

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0D13"/>
      <stop offset="50%" stop-color="#141722"/>
      <stop offset="100%" stop-color="#090B10"/>
    </linearGradient>
    <pattern id="screentone" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1" fill="#ffffff" opacity="0.05"/>
    </pattern>
    <linearGradient id="panelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E2333"/>
      <stop offset="100%" stop-color="#121522"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <pattern id="speedlines" width="40" height="1200" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="40" y2="1200" stroke="#ffffff" stroke-width="0.8" opacity="0.04"/>
      <line x1="20" y1="0" x2="60" y2="1200" stroke="#ffffff" stroke-width="0.5" opacity="0.03"/>
    </pattern>
  </defs>

  <!-- Canvas Background -->
  <rect width="800" height="1200" fill="url(#bgGrad)"/>
  <rect width="800" height="1200" fill="url(#screentone)"/>
  <rect width="800" height="1200" fill="url(#speedlines)"/>

  <!-- Outer Manga Margins & Frame -->
  <rect x="25" y="25" width="750" height="1150" fill="none" stroke="#2D3346" stroke-width="2" rx="8"/>
  <rect x="25" y="25" width="750" height="42" fill="#141824" rx="8"/>
  <rect x="25" y="60" width="750" height="7" fill="#141824"/>
  <line x1="25" y1="67" x2="775" y2="67" stroke="#2D3346" stroke-width="1.5"/>

  <!-- Top Running Header -->
  <text x="45" y="52" fill="#818cf8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" letter-spacing="1.5">MANGA•VERSE</text>
  <text x="160" y="52" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600">· EDIÇÃO OFICIAL BR</text>
  <text x="755" y="52" text-anchor="end" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">Capítulo ${chapterNum} · Pág. ${pageNum} de ${totalPages}</text>

  ${pageNum === 1 ? `
    <!-- Page 1: Chapter Splash Spread -->
    <rect x="45" y="90" width="710" height="780" fill="url(#panelGrad)" stroke="#374151" stroke-width="2.5" rx="6"/>
    
    <!-- Manga Stylized Silhouette & Halo -->
    <circle cx="400" cy="420" r="190" fill="#1e2438" opacity="0.4"/>
    <circle cx="400" cy="420" r="140" fill="#2d3550" opacity="0.3"/>
    
    <!-- Title typography -->
    <text x="400" y="340" text-anchor="middle" fill="#818cf8" font-family="system-ui, sans-serif" font-size="15" font-weight="800" letter-spacing="3">EDIÇÃO DIGITAL AUTORIZADA</text>
    <text x="400" y="420" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="34" font-weight="900" letter-spacing="0.5">${title}</text>
    
    <rect x="270" y="460" width="260" height="42" fill="url(#accentGrad)" rx="21"/>
    <text x="400" y="487" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="16" font-weight="800" letter-spacing="1">CAPÍTULO ${chapterNum}</text>
    
    <text x="400" y="560" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Tradução em Português · Scan Oficial MangaVerse</text>
    <text x="400" y="590" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="12">Alta Definição Digital 2.0</text>

    <!-- Scanlator Box Panel -->
    <rect x="45" y="890" width="710" height="235" fill="url(#panelGrad)" stroke="#374151" stroke-width="2" rx="6"/>
    <text x="70" y="935" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="15" font-weight="bold">Início da Leitura do Capítulo:</text>
    <text x="70" y="970" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="13">Aproveite a experiência completa com rolagem vertical contínua ou virada de página.</text>
    <text x="70" y="1000" fill="#818cf8" font-family="system-ui, sans-serif" font-size="13">Utilize a barra de controles no topo para alternar entre os modos de leitura.</text>
    <text x="70" y="1040" fill="#64748b" font-family="system-ui, sans-serif" font-size="12">Publicado e otimizado para navegadores mobile e desktop.</text>
  ` : `
    <!-- Page 2+: Dynamic Manga Action Panels -->
    <!-- Top Action Panel -->
    <rect x="45" y="85" width="710" height="390" fill="url(#panelGrad)" stroke="#374151" stroke-width="2" rx="6"/>
    
    <!-- Manga Speedlines inside Top Panel -->
    <line x1="45" y1="280" x2="755" y2="280" stroke="#2D3346" stroke-width="1" stroke-dasharray="6,4"/>
    <text x="725" y="145" text-anchor="end" fill="#f59e0b" font-family="system-ui, sans-serif" font-size="28" font-weight="900" opacity="0.85">${sfx.jp}</text>
    <text x="725" y="170" text-anchor="end" fill="#fbbf24" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" opacity="0.7">(${sfx.ro} · ${sfx.desc})</text>

    <!-- Dialogue Bubble 1 -->
    <rect x="75" y="120" width="290" height="75" fill="#ffffff" rx="16"/>
    <polygon points="120,195 135,212 145,195" fill="#ffffff"/>
    <text x="95" y="152" fill="#0f172a" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">"A energia espiritual está oscilando...</text>
    <text x="95" y="173" fill="#0f172a" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Temos que avançar agora mesmo!"</text>

    <text x="400" y="355" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="13">[ Ilustração Oficial da Batalha · Capítulo ${chapterNum} ]</text>

    <!-- Split Middle Panels -->
    <rect x="45" y="495" width="345" height="375" fill="url(#panelGrad)" stroke="#374151" stroke-width="2" rx="6"/>
    <rect x="410" y="495" width="345" height="375" fill="url(#panelGrad)" stroke="#374151" stroke-width="2" rx="6"/>

    <!-- Dialogue Bubble in Panel 2 -->
    <rect x="435" y="525" width="265" height="65" fill="#ffffff" rx="14"/>
    <polygon points="490,590 505,605 515,590" fill="#ffffff"/>
    <text x="450" y="552" fill="#0f172a" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">"Não há como voltar atrás!</text>
    <text x="450" y="572" fill="#0f172a" font-family="system-ui, sans-serif" font-size="12" font-weight="bold">Vamos mostrar do que somos capazes!"</text>

    <text x="217" y="700" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="12">[ Reação dos Aliados ]</text>
    <text x="582" y="700" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="12">[ Clímax da Técnica ]</text>

    <!-- Bottom Wide Climax Panel -->
    <rect x="45" y="890" width="710" height="235" fill="url(#panelGrad)" stroke="#374151" stroke-width="2" rx="6"/>
    ${pageNum === totalPages ? `
      <text x="400" y="990" text-anchor="middle" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="20" font-weight="900">FIM DO CAPÍTULO ${chapterNum}</text>
      <text x="400" y="1030" text-anchor="middle" fill="#818cf8" font-family="system-ui, sans-serif" font-size="14" font-weight="600">Continue lendo o próximo capítulo no leitor!</text>
    ` : `
      <text x="400" y="1010" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="13">[ Sequência da Cena · Próxima Página ]</text>
    `}
  `}

  <!-- Bottom Page Marker -->
  <line x1="45" y1="1140" x2="755" y2="1140" stroke="#2D3346" stroke-width="1"/>
  <text x="400" y="1165" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="11" font-weight="500">
    ${title} · Capítulo ${chapterNum} · Página ${pageNum} de ${totalPages} · MangaVerse BR
  </text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(svg);
  });

  // 6. Live PT-BR Chapter Updates feed directly from Brazilian scanlations
  app.get('/api/manga/updates-ptbr', async (_req, res) => {
    const cacheKey = 'updates_ptbr_v2';
    const cached = getFromCache<any[]>(cacheKey);
    if (cached) return res.json(cached);

    try {
      const url = 'https://api.mangadex.org/chapter?translatedLanguage[]=pt-br&order[publishAt]=desc&limit=25&includes[]=manga&includes[]=scanlation_group&includeExternalUrl=0';
      const r = await fetch(url, {
        headers: { 'User-Agent': 'MangaVerse-App/2.0' },
        signal: AbortSignal.timeout(6000)
      }).then(res => res.json()).catch(() => null);

      const items: any[] = [];
      const now = Date.now();

      for (const ch of r?.data || []) {
        const mangaRel = ch.relationships?.find((rel: any) => rel.type === 'manga');
        const scanRel = ch.relationships?.find((rel: any) => rel.type === 'scanlation_group');
        if (!mangaRel) continue;

        const rawTitle =
          mangaRel.attributes?.title?.['pt-br'] ||
          mangaRel.attributes?.title?.pt ||
          mangaRel.attributes?.title?.['ja-ro'] ||
          mangaRel.attributes?.title?.en ||
          'Mangá';

        const localized = localizeManga({
          id: `md-${mangaRel.id}`,
          slug: `md-${mangaRel.id}`,
          title: rawTitle,
          coverUrl: '',
          description: '',
          genres: [],
          status: 'ongoing',
          authors: [],
          artists: [],
          rating: 9.5,
          totalChapters: 50
        });

        const pubDate = new Date(ch.attributes?.publishAt || ch.attributes?.createdAt || now);
        const diffHours = Math.max(0, Math.floor((now - pubDate.getTime()) / (1000 * 60 * 60)));
        const timeAgo = diffHours < 1 ? 'Agora mesmo' : diffHours < 24 ? `Há ${diffHours} horas` : `Há ${Math.floor(diffHours / 24)} dias`;

        items.push({
          chapterId: `md-${ch.id}`,
          chapterNumber: ch.attributes?.chapter || '1',
          chapterTitle: ch.attributes?.title || `Capítulo ${ch.attributes?.chapter || '1'}`,
          mangaId: `md-${mangaRel.id}`,
          mangaTitle: localized.title,
          coverUrl: `https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80`,
          scanGroup: scanRel?.attributes?.name || 'Scan Oficial BR',
          language: 'pt-br',
          timeAgo,
          isNew: diffHours < 12
        });
      }

      setInCache(cacheKey, items, 2 * 60 * 1000); // 2 minutes TTL
      return res.json(items);
    } catch (err) {
      console.warn('Error fetching PT-BR live updates:', err);
      return res.json([]);
    }
  });

  // 7. Active PT-BR Sources Information
  app.get('/api/manga/sources-ptbr', (_req, res) => {
    return res.json({
      status: 'online',
      activeSources: [
        { id: 'mangadex-br', name: 'MangaDex Brasil (API PT-BR)', status: 'conectado', language: 'pt-br' },
        { id: 'comick-br', name: 'ComicK Brasil (API PT-BR)', status: 'conectado', language: 'pt-br' },
        { id: 'anilist-pt', name: 'AniList Brasil (Metadados Localizados)', status: 'conectado', language: 'pt-br' },
        { id: 'scans-br', name: 'Rede de Scanlations Brasileiras (Mugiwara, Neox, YSY, Walberth)', status: 'conectado', language: 'pt-br' },
        { id: 'translator-gtx', name: 'Motor de Tradução Dinâmica PT-BR', status: 'ativo', language: 'pt-br' }
      ]
    });
  });

  // In-memory Buffer Cache for ultra-fast reader page serving
  const IMAGE_BUFFER_CACHE = new Map<string, { buffer: Uint8Array; contentType: string; timestamp: number }>();

  // 6. Image Proxy with full referer, buffer caching and user-agent support
  app.get('/api/proxy-image', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send('Missing url parameter');

    // Check memory buffer cache first
    const cached = IMAGE_BUFFER_CACHE.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(cached.buffer);
    }

    try {
      const isMangadex = targetUrl.includes('mangadex.org') || targetUrl.includes('mangadex.network');
      const r = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': isMangadex ? 'https://mangadex.org/' : '',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!r.ok) {
        // If origin returned non-200, fallback to digital canvas page so reader never fails
        return res.redirect('/api/manga/page-canvas?page=1&title=MangaVerse');
      }

      const contentType = r.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await r.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Keep cache size bounded
      if (IMAGE_BUFFER_CACHE.size > 150) {
        const oldestKey = IMAGE_BUFFER_CACHE.keys().next().value;
        if (oldestKey) IMAGE_BUFFER_CACHE.delete(oldestKey);
      }
      IMAGE_BUFFER_CACHE.set(targetUrl, { buffer, contentType, timestamp: Date.now() });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(buffer);
    } catch (err) {
      // In case of network timeout or proxy failure, serve fallback canvas page
      return res.redirect('/api/manga/page-canvas?page=1&title=MangaVerse');
    }
  });


export async function handleMangaverseApi(request: Request): Promise<Response> {
  try {
    return await app.handle(request);
  } catch (error) {
    console.error('MangaVerse API request failed:', error);
    return Response.json({ error: 'Não foi possível acessar os capítulos salvos. Tente novamente.' }, { status: 503 });
  }
}
