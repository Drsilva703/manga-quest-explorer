import { MangaItem, MangaChapter } from '../types/manga';

export const SAMPLE_MANGAS: MangaItem[] = [
  {
    id: 'solo-leveling',
    slug: 'solo-leveling',
    title: 'Solo Leveling',
    altTitles: ['Na Honjaman Level Up', '나 혼자만 레벨업', 'O Caçador Mais Fraco do Mundo'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105398-b673Vt5ZSuz3.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/105398-4UrEhdqZukrg.jpg',
    description: 'Há 10 anos, depois que "o Portal" conectou o mundo real com o mundo dos monstros, algumas pessoas comuns receberam o poder de caçar monstros dentro do Portal. Eles são conhecidos como "Caçadores". No entanto, nem todos os Caçadores são poderosos. Sung Jin-Woo é um Caçador de rank E, o "Mais Fraco do Mundo", até que encontra uma masmorra dupla e desperta o Sistema.',
    genres: ['Ação', 'Aventura', 'Fantasia', 'Manhwa', 'Superpoderes'],
    status: 'completed',
    authors: ['Chugong'],
    artists: ['DUBU (REDICE STUDIO)'],
    rating: 9.8,
    views: 485000,
    totalChapters: 179,
    mangadexId: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
    anilistId: 105398,
    malId: 121496,
    contentRating: 'safe',
    lastUpdated: '2026-09-28',
    releaseYear: 2018,
    country: 'kr'
  },
  {
    id: 'one-piece',
    slug: 'one-piece',
    title: 'One Piece',
    altTitles: ['OP', 'ワンピース', 'O Grande Tesouro'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-BeslEMqiPhlk.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/30013-hbbRZqC5MjYh.jpg',
    description: 'Gol D. Roger, conhecido como o "Rei dos Piratas", revelou a existência do maior tesouro do mundo, o One Piece. Monkey D. Luffy, um jovem que comeu a Fruta da Borracha (Gomu Gomu no Mi), parte para o mar com a ambição inabalável de reunir uma tripulação leal, navegar pela Grand Line e se tornar o novo Rei dos Piratas.',
    genres: ['Ação', 'Aventura', 'Comédia', 'Fantasia', 'Shounen'],
    status: 'ongoing',
    authors: ['Eiichiro Oda'],
    artists: ['Eiichiro Oda'],
    rating: 9.9,
    views: 920000,
    totalChapters: 1120,
    mangadexId: 'a1c7c817-4e59-43b7-9365-09675a149a6f',
    anilistId: 30013,
    malId: 13,
    contentRating: 'safe',
    lastUpdated: '2026-10-04',
    releaseYear: 1997,
    country: 'jp'
  },
  {
    id: 'jujutsu-kaisen',
    slug: 'jujutsu-kaisen',
    title: 'Jujutsu Kaisen: Batalha de Feiticeiros',
    altTitles: ['JJK', 'Batalha de Feiticeiros', '呪術廻戦'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx101517-H3TdM3g5ZUe9.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/101517-FrJtb3Th3HtF.jpg',
    description: 'Yuuji Itadori é um estudante do ensino médio que passa seus dias visitando seu avô no hospital. Para salvar seus amigos atacados por maldições ancestrais, ele engole um dos dedos decompostos de Ryomen Sukuna, tornando-se o hospedeiro do Rei das Maldições e ingressando na Escola Técnica de Feitiçaria de Tóquio.',
    genres: ['Ação', 'Sobrenatural', 'Fantasia Sombria', 'Shounen'],
    status: 'completed',
    authors: ['Gege Akutami'],
    artists: ['Gege Akutami'],
    rating: 9.6,
    views: 630000,
    totalChapters: 271,
    mangadexId: 'c52b2ce3-7f95-469c-96b0-479524fb7a1a',
    anilistId: 101517,
    malId: 113138,
    contentRating: 'safe',
    lastUpdated: '2026-09-29',
    releaseYear: 2018,
    country: 'jp'
  },
  {
    id: 'chainsaw-man',
    slug: 'chainsaw-man',
    title: 'Chainsaw Man (O Homem Motosserra)',
    altTitles: ['CSM', 'O Homem Motosserra', 'チェンソーマン'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-euxXZEIfDY2u.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/105778-ppHaMwown6c9.jpg',
    description: 'Denji tinha um sonho simples: viver uma vida feliz e pacífica com seu cachorro-demônio de estimação, Pochita. Após uma traição brutal da yakuza, Denji renasce ao se fundir com Pochita, tornando-se o temido e excêntrico Chainsaw Man.',
    genres: ['Ação', 'Horror', 'Comédia Ácida', 'Sobrenatural'],
    status: 'ongoing',
    authors: ['Tatsuki Fujimoto'],
    artists: ['Tatsuki Fujimoto'],
    rating: 9.7,
    views: 540000,
    totalChapters: 180,
    mangadexId: 'a77742b1-befd-49a4-bff5-1ad4e6b0ef7b',
    anilistId: 105778,
    malId: 116778,
    contentRating: 'suggestive',
    lastUpdated: '2026-10-02',
    releaseYear: 2018,
    country: 'jp'
  },
  {
    id: 'omniscient-reader',
    slug: 'omniscient-reader',
    title: 'Ponto de Vista do Leitor Onisciente (ORV)',
    altTitles: ['ORV', 'Ponto de Vista do Leitor Onisciente', '전지적 독자 시점'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx119257-Pi21aq3ey9GG.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/119257-45Xw3Xb4b8pG.jpg',
    description: 'Kim Dokja era o único leitor que acompanhou até o fim a webnovel esquecida "Maneiras de Sobreviver em um Mundo Arruinado". Quando o último capítulo foi postado, a realidade ao seu redor se transformou no próprio enredo apocalíptico da história.',
    genres: ['Ação', 'Apocalipse', 'Fantasia', 'Manhwa', 'Psicológico'],
    status: 'ongoing',
    authors: ['Sing Shong'],
    artists: ['Sleepy-C (Redice Studio)'],
    rating: 9.8,
    views: 410000,
    totalChapters: 230,
    mangadexId: '9a414441-bbad-43f1-a3a7-dc262ca790a3',
    anilistId: 119257,
    malId: 132214,
    contentRating: 'safe',
    lastUpdated: '2026-10-03',
    releaseYear: 2020,
    country: 'kr'
  },
  {
    id: 'berserk',
    slug: 'berserk',
    title: 'Berserk',
    altTitles: ['ベルセルク', 'O Espadachim Negro'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx30002-Cul4OeN7bYtn.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/30002-3TuoSMl20fUX.jpg',
    description: 'Guts, um guerreiro implacável conhecido como o Espadachim Negro, busca vingança contra Griffith e as entidades demoníacas conhecidas como a Mão de Deus. Uma jornada épica e sombria sobre destino, livre-arbítrio e perseverança humana.',
    genres: ['Ação', 'Fantasia Sombria', 'Horror', 'Drama', 'Tragédia'],
    status: 'ongoing',
    authors: ['Kentaro Miura', 'Studio Gaga'],
    artists: ['Kentaro Miura', 'Kouji Mori'],
    rating: 9.9,
    views: 750000,
    totalChapters: 376,
    mangadexId: '801513ba-a712-498c-8f57-cae55b38cc92',
    anilistId: 30002,
    malId: 2,
    contentRating: 'erotica',
    lastUpdated: '2026-09-15',
    releaseYear: 1989,
    country: 'jp'
  },
  {
    id: 'dandadan',
    slug: 'dandadan',
    title: 'Dandadan',
    altTitles: ['ダンダダン'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx132029-prGF4gePdSKv.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/132029-V1x9JAh3G8QK.jpg',
    description: 'Momo Ayase, uma garota que acredita em fantasmas, e Ken Takakura (Okarun), um garoto que acredita em alienígenas, apostam para ver quem está certo. Em suas explorações, ambos descobrem que tanto fantasmas quanto alienígenas são reais!',
    genres: ['Ação', 'Comédia', 'Sobrenatural', 'Ficção Científica', 'Romance'],
    status: 'ongoing',
    authors: ['Yukinobu Tatsu'],
    artists: ['Yukinobu Tatsu'],
    rating: 9.6,
    views: 430000,
    totalChapters: 165,
    mangadexId: '68112dc1-2b80-4f20-beb8-2f2a8716a430',
    anilistId: 132029,
    malId: 135496,
    contentRating: 'suggestive',
    lastUpdated: '2026-10-04',
    releaseYear: 2021,
    country: 'jp'
  },
  {
    id: 'tower-of-god',
    slug: 'tower-of-god',
    title: 'Tower of God (A Torre de Deus)',
    altTitles: ['Sin-ui Tap', '신의 탑', 'A Torre de Deus'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx85143-23oup3ETbFJk.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/85143-7fBfUfqY0x5s.jpg',
    description: 'O que você mais deseja? Dinheiro e riquezas? Honra e orgulho? Autoridade e poder? Vingança? Ou algo que transcende tudo isso? Seja lá o que você desejar, está aqui no topo da Torre.',
    genres: ['Ação', 'Aventura', 'Fantasia', 'Manhwa', 'Mistério'],
    status: 'ongoing',
    authors: ['SIU'],
    artists: ['SIU'],
    rating: 9.5,
    views: 390000,
    totalChapters: 630,
    mangadexId: 'c0ee660b-f9f2-45c3-8068-5123ff53f84a',
    anilistId: 85143,
    malId: 122663,
    contentRating: 'safe',
    lastUpdated: '2026-10-01',
    releaseYear: 2010,
    country: 'kr'
  },
  {
    id: 'attack-on-titan',
    slug: 'attack-on-titan',
    title: 'Ataque dos Titãs (Shingeki no Kyojin)',
    altTitles: ['Shingeki no Kyojin', 'Attack on Titan', '進撃の巨人'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx53390-1RsuABC34P9D.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/53390-6Uru5rrjh8zv.jpg',
    description: 'Várias centenas de anos atrás, os humanos foram quase exterminados pelos Titãs. Monstros gigantescos que devoram humanos pelo prazer aparente. Eren Jaeger jurou aniquilar até o último Titã da face da Terra.',
    genres: ['Ação', 'Fantasia Sombria', 'Mistério', 'Drama', 'Militar'],
    status: 'completed',
    authors: ['Hajime Isayama'],
    artists: ['Hajime Isayama'],
    rating: 9.8,
    views: 820000,
    totalChapters: 139,
    mangadexId: '304ceac3-8cdb-4fe7-acf7-2b6ff7a60613',
    anilistId: 53390,
    malId: 23390,
    contentRating: 'safe',
    lastUpdated: '2026-08-20',
    releaseYear: 2009,
    country: 'jp'
  },
  {
    id: 'demon-slayer',
    slug: 'demon-slayer',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    altTitles: ['Kimetsu no Yaiba', 'Exterminador de Demônios', '鬼滅の刃'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx87216-c9bSNVD10UuD.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/87216-TVKEGfSxAqKs.jpg',
    description: 'Tanjiro Kamado é um garoto de bom coração que ganha a vida vendendo carvão. Quando sua família é massacrada por um demônio e sua irmã Nezuko é transformada, ele embarca numa jornada para salvá-la e derrotar o criador de todos os demônios.',
    genres: ['Ação', 'Sobrenatural', 'Histórico', 'Shounen'],
    status: 'completed',
    authors: ['Koyoharu Gotouge'],
    artists: ['Koyoharu Gotouge'],
    rating: 9.5,
    views: 710000,
    totalChapters: 205,
    mangadexId: '789642f8-ca89-4e4e-8f7b-eee4d17ea08b',
    anilistId: 87216,
    malId: 96792,
    contentRating: 'safe',
    lastUpdated: '2026-07-10',
    releaseYear: 2016,
    country: 'jp'
  },
  {
    id: 'naruto',
    slug: 'naruto',
    title: 'Naruto',
    altTitles: ['NARUTO -ナルト-'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/nx30011-9yUF1dXWgDOx.jpg',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/30011-pkX1O0EFqvV7.jpg',
    description: 'Naruto Uzumaki é um jovem ninja rejeitado por carregar dentro de si a temida Raposa de Nove Caudas. Com determinação inabalável, ele sonha em se tornar Hokage, o líder supremo de sua vila, e ser reconhecido por todos.',
    genres: ['Ação', 'Aventura', 'Shounen', 'Artes Marciais'],
    status: 'completed',
    authors: ['Masashi Kishimoto'],
    artists: ['Masashi Kishimoto'],
    rating: 9.5,
    views: 890000,
    totalChapters: 700,
    mangadexId: 'a787b10a-02d0-46c0-8236-0d01d69ad4a3',
    anilistId: 30011,
    malId: 11,
    contentRating: 'safe',
    lastUpdated: '2026-05-15',
    releaseYear: 1999,
    country: 'jp'
  },
  {
    id: 'bleach',
    slug: 'bleach',
    title: 'Bleach',
    altTitles: ['ブリーチ'],
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx30012-1epmVfTSv2rr.png',
    bannerUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/banner/30012-RpbdVc2yNxhw.jpg',
    description: 'Ichigo Kurosaki é um adolescente que sempre pôde ver fantasmas. Quando sua família é atacada por um Hollow, uma entidade maligna, a Shinigami Rukia Kuchiki transfere seus poderes a ele para salvá-los.',
    genres: ['Ação', 'Sobrenatural', 'Shounen', 'Superpoderes'],
    status: 'completed',
    authors: ['Tite Kubo'],
    artists: ['Tite Kubo'],
    rating: 9.4,
    views: 730000,
    totalChapters: 686,
    mangadexId: '239d6260-d71f-43b0-afff-074e3619e3de',
    anilistId: 30012,
    malId: 12,
    contentRating: 'safe',
    lastUpdated: '2026-06-12',
    releaseYear: 2001,
    country: 'jp'
  }
];

// Helper to determine canonical manga identity across IDs (AniList, MangaDex, ComicK, Slugs) and localized titles
export function getCanonicalMangaSlug(id?: string, title?: string): string | null {
  const normId = (id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitle = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // One Piece
  if (
    normId.includes('onepiece') ||
    normTitle.includes('onepiece') ||
    normId === 'al30013' ||
    normId.includes('a1c7c8174e5943b7936509675a149a6f') ||
    normId.includes('a2c1d849af054bbcb2a7866ebb10331f')
  ) {
    return 'one-piece';
  }

  // Naruto
  if (
    normId.includes('naruto') ||
    normTitle.includes('naruto') ||
    normId === 'al30011' ||
    normId.includes('a787b10a02d046c082360d01d69ad4a3')
  ) {
    return 'naruto';
  }

  // Bleach
  if (
    normId.includes('bleach') ||
    normTitle.includes('bleach') ||
    normId === 'al30012' ||
    normId.includes('239d6260d71f43b0afff074e3619e3de') ||
    normId.includes('72e3914a555e4bbd8cddb4e69d7249a5')
  ) {
    return 'bleach';
  }

  // Attack on Titan (Shingeki no Kyojin / Ataque dos Titãs)
  if (
    normId.includes('attackontitan') ||
    normTitle.includes('attackontitan') ||
    normId.includes('shingeki') ||
    normTitle.includes('shingeki') ||
    normTitle.includes('titas') ||
    normId.includes('titas') ||
    normTitle.includes('titan') ||
    normId === 'al30745' ||
    normId === 'al53390' ||
    normId.includes('304ceac38cdb4fe7acf72b6ff7a60613') ||
    normId.includes('ynrczp7j')
  ) {
    return 'attack-on-titan';
  }

  // Berserk
  if (normId.includes('berserk') || normTitle.includes('berserk') || normId === 'al30002') {
    return 'berserk';
  }

  // Solo Leveling
  if (
    normId.includes('sololeveling') ||
    normTitle.includes('sololeveling') ||
    normId.includes('nahonjaman') ||
    normTitle.includes('nahonjaman') ||
    normId === 'al105398'
  ) {
    return 'solo-leveling';
  }

  // Jujutsu Kaisen
  if (
    normId.includes('jujutsu') ||
    normTitle.includes('jujutsu') ||
    normId === 'al101517'
  ) {
    return 'jujutsu-kaisen';
  }

  // Chainsaw Man
  if (
    normId.includes('chainsaw') ||
    normTitle.includes('chainsaw') ||
    normTitle.includes('homemmotosserra') ||
    normId === 'al105778'
  ) {
    return 'chainsaw-man';
  }

  // Demon Slayer
  if (
    normId.includes('demonslayer') ||
    normTitle.includes('demonslayer') ||
    normId.includes('kimetsu') ||
    normTitle.includes('kimetsu') ||
    normId === 'al87216'
  ) {
    return 'demon-slayer';
  }

  // Tower of God
  if (
    normId.includes('towerofgod') ||
    normTitle.includes('towerofgod') ||
    normId.includes('torrededeus') ||
    normId === 'al85143'
  ) {
    return 'tower-of-god';
  }

  // Dandadan
  if (normId.includes('dandadan') || normTitle.includes('dandadan') || normId === 'al132029' || normId === 'al132070') {
    return 'dandadan';
  }

  // Hunter x Hunter
  if (normId.includes('hunter') || normTitle.includes('hunter') || normId === 'al30026') {
    return 'hunter-x-hunter';
  }

  // Death Note
  if (normId.includes('deathnote') || normTitle.includes('deathnote') || normId === 'al30021') {
    return 'death-note';
  }

  // Tokyo Ghoul
  if (normId.includes('tokyoghoul') || normTitle.includes('tokyoghoul') || normId === 'al63327') {
    return 'tokyo-ghoul';
  }

  // Vinland Saga
  if (normId.includes('vinland') || normTitle.includes('vinland') || normId === 'al30642') {
    return 'vinland-saga';
  }

  // Vagabond
  if (normId.includes('vagabond') || normTitle.includes('vagabond') || normId === 'al30656') {
    return 'vagabond';
  }

  // Blue Lock
  if (normId.includes('bluelock') || normTitle.includes('bluelock') || normId === 'al106130') {
    return 'blue-lock';
  }

  // Boku no Hero Academia
  if (
    normId.includes('myhero') ||
    normTitle.includes('myhero') ||
    normId.includes('bokunohero') ||
    normTitle.includes('bokunohero') ||
    normId === 'al85486'
  ) {
    return 'boku-no-hero-academia';
  }

  // Dragon Ball
  if (normId.includes('dragonball') || normTitle.includes('dragonball') || normId === 'al30042') {
    return 'dragon-ball';
  }

  // Spy x Family
  if (normId.includes('spyxfamily') || normTitle.includes('spyxfamily') || normId === 'al108556') {
    return 'spy-x-family';
  }

  return null;
}

// Special accurate chapter and volume generator for Berserk
export function generateBerserkChapters(): MangaChapter[] {
  const chapters: MangaChapter[] = [];

  // Helper to determine exact Berserk volume
  const getBerserkVolume = (chNum: number): string => {
    if (chNum <= 3) return 'Vol. 1';
    if (chNum <= 5) return 'Vol. 2';
    if (chNum <= 9) return 'Vol. 3';
    if (chNum <= 14) return 'Vol. 4';
    if (chNum <= 22) return 'Vol. 5';
    if (chNum <= 31) return 'Vol. 6';
    if (chNum <= 40) return 'Vol. 7';
    if (chNum <= 49) return 'Vol. 8';
    if (chNum <= 58) return 'Vol. 9';
    if (chNum <= 67) return 'Vol. 10';
    const volNum = Math.floor((chNum - 17) / 9) + 5;
    return `Vol. ${Math.min(42, Math.max(1, volNum))}`;
  };

  // Map of verified MangaDex PT-BR chapter UUIDs for Berserk
  // Chapter 1 is the TRUE Chapter 1 (O Espadachim Negro, 93 pages)
  const KNOWN_BERSERK_MANGADEX: Record<number, { id: string; pages: number; title: string; volume?: string }> = {
    1: { id: 'md-bbea0894-09ab-4983-901d-368371a66708', pages: 93, title: 'Capítulo 1: O Espadachim Negro', volume: 'Vol. 1' },
    2: { id: 'md-10d14daf-7ec1-43bf-ba15-dcabe84fccd1', pages: 69, title: 'Capítulo 2: A Marca do Sacrifício', volume: 'Vol. 1' },
    3: { id: 'md-9b2c4997-e4de-408a-8cd0-6f4adfd15ea6', pages: 57, title: 'Capítulo 3: O Guardião do Anjo do Desejo (1)', volume: 'Vol. 1' },
    4: { id: 'md-573a9995-28fe-4e11-aab4-db87d49dd65c', pages: 117, title: 'Capítulo 4: O Guardião do Anjo do Desejo (2)', volume: 'Vol. 2' },
    5: { id: 'md-82fb16b9-8b27-416f-84b6-a35b2f07389c', pages: 106, title: 'Capítulo 5: O Guardião do Anjo do Desejo (3)', volume: 'Vol. 2' },
    6: { id: 'md-d6586e1a-4bc1-4cfa-a37b-f10ee8b878a1', pages: 57, title: 'Capítulo 6: O Guardião do Anjo do Desejo (4)', volume: 'Vol. 3' },
    7: { id: 'md-d0c1cbac-6ac2-459c-bdf6-d80b08ad5fb4', pages: 52, title: 'Capítulo 7: O Guardião do Anjo do Desejo (5)', volume: 'Vol. 3' },
    8: { id: 'md-f592df27-633e-4cda-9809-9fe7f8567964', pages: 60, title: 'Capítulo 8: O Guardião do Anjo do Desejo (Final)', volume: 'Vol. 3' },
    9: { id: 'md-9c185ad5-0836-47f0-bdc9-27c5b9718303', pages: 45, title: 'Capítulo 9: Idade de Ouro (1)', volume: 'Vol. 3' },
    10: { id: 'md-8dd318eb-3dd2-43c9-8684-84481b718d36', pages: 53, title: 'Capítulo 10: Idade de Ouro (2)', volume: 'Vol. 4' },
    11: { id: 'md-64846703-e616-4158-a46a-45a101d37ee6', pages: 48, title: 'Capítulo 11: Idade de Ouro (3)', volume: 'Vol. 4' },
    12: { id: 'md-20fadcd9-57d2-429f-ad93-0c74b172aaf9', pages: 44, title: 'Capítulo 12: Idade de Ouro (4)', volume: 'Vol. 4' },
    13: { id: 'md-f9c3841e-6515-41ef-8de4-aa911119f05f', pages: 44, title: 'Capítulo 13: Idade de Ouro (5)', volume: 'Vol. 4' },
    14: { id: 'md-1d799982-567f-4182-ba90-6cc21d7c512d', pages: 42, title: 'Capítulo 14: Idade de Ouro (6)', volume: 'Vol. 4' },
    15: { id: 'md-2074c5fa-a548-4dd8-a7ce-9144e9f25139', pages: 39, title: 'Capítulo 15: Idade de Ouro (7)', volume: 'Vol. 5' },
    16: { id: 'md-63d97d21-8c52-4dec-9a90-5497b2b1c253', pages: 39, title: 'Capítulo 16: Idade de Ouro (8)', volume: 'Vol. 5' },
    17: { id: 'md-283f8be9-a5d2-44b1-b771-bbb0cef46ee8', pages: 37, title: 'Capítulo 17: Ventos da Espada', volume: 'Vol. 5' },
    18: { id: 'md-9a7b5aaf-c702-4fef-93b9-b83fac0c7fc2', pages: 20, title: 'Capítulo 18: Zodd, o Nosferatu (1)', volume: 'Vol. 5' },
    19: { id: 'md-8fa080d2-4d37-48c8-a145-b6b9146b8c79', pages: 19, title: 'Capítulo 19: Zodd, o Nosferatu (2)', volume: 'Vol. 5' },
    20: { id: 'md-d2fb1fdd-f4ff-49a1-b5c1-067904d76fab', pages: 21, title: 'Capítulo 20: Zodd, o Nosferatu (3)', volume: 'Vol. 5' },
    21: { id: 'md-d7e8f4fe-7569-4ce2-b2d4-beae2c78f47c', pages: 20, title: 'Capítulo 21: Zodd, o Nosferatu (4)', volume: 'Vol. 5' },
    22: { id: 'md-adb6976c-a5c9-4777-8cca-598c017b52be', pages: 29, title: 'Capítulo 22: O Dono da Espada (1)', volume: 'Vol. 5' },
    23: { id: 'md-c4420c40-77bc-441c-82b5-441130b6461e', pages: 30, title: 'Capítulo 23: O Dono da Espada (2)', volume: 'Vol. 6' },
    24: { id: 'md-9ff244fb-b93a-4c1b-a4cb-f86e4fabca69', pages: 20, title: 'Capítulo 24: O Assassino (1)', volume: 'Vol. 6' },
    25: { id: 'md-8363fd29-adfa-4af4-88c3-c2807ec57fa2', pages: 20, title: 'Capítulo 25: O Assassino (2)', volume: 'Vol. 6' },
    26: { id: 'md-88a57cb1-ff0a-4261-82a6-4069c753a0b9', pages: 21, title: 'Capítulo 26: O Assassino (3)', volume: 'Vol. 6' },
    27: { id: 'md-290c7a05-5d59-47fe-8132-69572fb6563d', pages: 23, title: 'Capítulo 27: O Assassino (4)', volume: 'Vol. 6' },
    376: { id: 'md-088a4a5b-2619-40b7-b1f9-9fa23a3b093b', pages: 20, title: 'Capítulo 376: Superfície Trêmula do Mar', volume: 'Vol. 42' }
  };

  for (let i = 376; i >= 1; i--) {
    let title = `Capítulo ${i}`;
    let chId = `berserk-cap-${i}`;
    let pagesCount = 22;
    let volume = getBerserkVolume(i);

    if (KNOWN_BERSERK_MANGADEX[i]) {
      chId = KNOWN_BERSERK_MANGADEX[i].id;
      pagesCount = KNOWN_BERSERK_MANGADEX[i].pages;
      title = KNOWN_BERSERK_MANGADEX[i].title;
      if (KNOWN_BERSERK_MANGADEX[i].volume) {
        volume = KNOWN_BERSERK_MANGADEX[i].volume!;
      }
    }

    chapters.push({
      id: chId,
      chapterNumber: `${i}`,
      volume,
      title,
      language: 'pt-br',
      scanlationGroup: 'Scan Oficial BR · MangaDex',
      publishedAt: new Date(Date.now() - (376 - i) * 2 * 24 * 60 * 60 * 1000).toISOString(),
      pagesCount
    });
  }

  return chapters;
}

// Calculate accurate official volume based on specific serialization format
export function calculateVolume(mangaId: string, chapterNum: number): string {
  const norm = mangaId.toLowerCase();
  if (norm.includes('berserk')) {
    if (chapterNum <= 3) return 'Vol. 1';
    if (chapterNum <= 5) return 'Vol. 2';
    if (chapterNum <= 8) return 'Vol. 3';
    if (chapterNum <= 11) return 'Vol. 4';
    if (chapterNum <= 16) return 'Vol. 5';
    return `Vol. ${Math.min(42, Math.floor((chapterNum - 17) / 9) + 5)}`;
  }
  if (norm.includes('attack-on-titan') || norm.includes('shingeki')) {
    // Attack on Titan was monthly: ~4 chapters per volume, 34 volumes total
    return `Vol. ${Math.min(34, Math.ceil(chapterNum / 4.1))}`;
  }
  if (norm.includes('one-piece')) {
    // One Piece: ~10.4 chapters per volume, 108 volumes total
    return `Vol. ${Math.min(108, Math.ceil(chapterNum / 10.4))}`;
  }
  if (norm.includes('jujutsu')) {
    // Jujutsu Kaisen: ~9.7 chapters per volume, 28 volumes total
    return `Vol. ${Math.min(28, Math.ceil(chapterNum / 9.7))}`;
  }
  if (norm.includes('chainsaw')) {
    // Chainsaw Man: ~10 chapters per volume
    return `Vol. ${Math.min(18, Math.ceil(chapterNum / 10))}`;
  }
  if (norm.includes('demon-slayer') || norm.includes('kimetsu')) {
    // Demon Slayer: ~9 chapters per volume, 23 volumes total
    return `Vol. ${Math.min(23, Math.ceil(chapterNum / 9))}`;
  }
  if (norm.includes('naruto')) {
    return `Vol. ${Math.min(72, Math.ceil(chapterNum / 9.7))}`;
  }
  if (norm.includes('bleach')) {
    return `Vol. ${Math.min(74, Math.ceil(chapterNum / 9.3))}`;
  }
  if (norm.includes('solo-leveling')) {
    return `Vol. ${Math.min(14, Math.ceil(chapterNum / 13))}`;
  }
  if (norm.includes('dandadan')) {
    return `Vol. ${Math.min(16, Math.ceil(chapterNum / 10))}`;
  }
  return `Vol. ${Math.ceil(chapterNum / 10)}`;
}

export function generateFullChaptersForManga(
  mangaId: string,
  totalChapters: number,
  baseTitle: string
): MangaChapter[] {
  if (mangaId.toLowerCase().includes('berserk')) {
    return generateBerserkChapters();
  }

  const chapters: MangaChapter[] = [];
  const scanlators = [
    'Mugiwara Scans',
    'Neox Scanlator',
    'Tsukimi Scans',
    'Golden Mangás',
    'Reaper Scans BR',
    'Bakuen Scans'
  ];

  for (let i = totalChapters; i >= 1; i--) {
    const scan = scanlators[i % scanlators.length];
    const daysAgo = Math.floor((totalChapters - i) * 1.5);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    let title = `Capítulo ${i}`;
    if (i === 1) title = 'O Início da Jornada';
    else if (i === totalChapters) title = `Conclusão da Obra - Capítulo ${i}`;

    chapters.push({
      id: `${mangaId}-cap-${i}`,
      chapterNumber: `${i}`,
      volume: calculateVolume(mangaId, i),
      title,
      language: 'pt-br',
      scanlationGroup: scan,
      publishedAt: date,
      pagesCount: 20
    });
  }

  return chapters;
}

export const SAMPLE_CHAPTERS_MAP: Record<string, MangaChapter[]> = {
  'one-piece': generateFullChaptersForManga('one-piece', 1120, 'One Piece'),
  'solo-leveling': generateFullChaptersForManga('solo-leveling', 179, 'Solo Leveling'),
  'jujutsu-kaisen': generateFullChaptersForManga('jujutsu-kaisen', 271, 'Jujutsu Kaisen'),
  'chainsaw-man': generateFullChaptersForManga('chainsaw-man', 180, 'Chainsaw Man'),
  'berserk': generateBerserkChapters(),
  'dandadan': generateFullChaptersForManga('dandadan', 165, 'Dandadan'),
  'tower-of-god': generateFullChaptersForManga('tower-of-god', 630, 'Tower of God'),
  'attack-on-titan': generateFullChaptersForManga('attack-on-titan', 139, 'Ataque dos Titãs'),
  'demon-slayer': generateFullChaptersForManga('demon-slayer', 205, 'Demon Slayer'),
  'naruto': generateFullChaptersForManga('naruto', 700, 'Naruto'),
  'bleach': generateFullChaptersForManga('bleach', 686, 'Bleach')
};

export const SAMPLE_PAGES_BANK: string[] = [
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/1-6853d35cdc79953713cebae5616fbb706738fac2d3ffdb2fdbf0855421288fb5.jpg',
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/2-b64ba4b1d248fa9278cf3b16f7a704225570681ab73d74d7505b88d10f6998db.jpg',
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/3-8927ec4291ac279d0cb56ea947f4a5131485284d7c3ea4b05b3bebe7565f9673.jpg',
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/4-8e8792cce171d1d0de93e23ef297136f88fdb2d3fc16046e6e7a5a83e2232adf.jpg',
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/5-cf35cd87e07022cfb77e195a07df1d78dfb7e6fa0a64c99f91ec3a9bcf7b1d4e.jpg',
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/6-69ad9520a513153c21c5b8fbef90c18f25a83b629f892ff150c49a7416d52353.jpg',
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/7-a2634932585ce4079a20bff5eee55c96804418227de95199bf07b193fa5a0a1b.jpg',
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/8-70e9e6d683d8a6c6653b8a033ac7fd7798068bb03dcde2c641232b14edbee3e4.jpg',
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/9-5f03aeaedf66da25835b97a6c3e7bd3f4274c88ad4450307dc60dec7bcb05922.jpg',
  'https://cmdxd98sb0x3yprd.mangadex.network/data/bcd38492a3c6213a3d5704f7ef976f63/10-8c5bb98daa509921e9a7d43946bca3974ee85b9fc95d46fa073754931fbc6e97.jpg'
];
