import { createServerOnlyFn } from '@tanstack/react-start';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../integrations/supabase/types';
import type { CustomChapterData } from '../../mangaverse/types/manga';

type Client = SupabaseClient<Database>;
type Row = Database['public']['Tables']['manga_custom_chapters']['Row'];

export const chapterClient = createServerOnlyFn((token?: string): Client => {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Configuração de armazenamento indisponível.');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
  });
});

export async function authorizedChapterClient(headers: Headers): Promise<Client | null> {
  const token = headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const client = chapterClient(token);
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  const { data: role, error: roleError } = await client.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  return !roleError && role ? client : null;
}

export function rowToChapter(row: Row): CustomChapterData {
  return {
    id: row.id, mangaId: row.manga_id, chapterNumber: row.chapter_number,
    title: row.title, volume: row.volume ?? undefined,
    scanlationGroup: row.scanlation_group ?? undefined, language: row.language,
    pages: row.pages, publishedAt: row.published_at,
  };
}

export async function getChapterRecords(mangaId?: string): Promise<Row[]> {
  const client = chapterClient();
  const rows: Row[] = [];
  // Explicit paging avoids the Data API's default 1,000-row limit.
  for (let offset = 0; ; offset += 500) {
    let query = client.from('manga_custom_chapters').select('*').order('id').range(offset, offset + 499);
    if (mangaId) query = query.eq('manga_id', mangaId);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

export async function getCustomChapters(mangaId?: string): Promise<CustomChapterData[]> {
  return (await getChapterRecords(mangaId)).filter(row => !row.deleted).map(rowToChapter);
}

export async function addCustomChapter(chapter: CustomChapterData, client: Client): Promise<CustomChapterData> {
  if (!chapter.pages.length) throw new Error('Adicione ao menos uma página real ao capítulo.');
  const { data, error } = await client.from('manga_custom_chapters').upsert({
    id: chapter.id, manga_id: chapter.mangaId, chapter_number: chapter.chapterNumber,
    title: chapter.title, volume: chapter.volume ?? null,
    scanlation_group: chapter.scanlationGroup ?? null, language: chapter.language || 'pt-br',
    pages: chapter.pages, published_at: chapter.publishedAt, deleted: false,
  }, { onConflict: 'manga_id,chapter_number' }).select().single();
  if (error) throw error;
  return rowToChapter(data);
}

export async function updateChapterPages(mangaId: string, chapterNumber: string, pages: string[], client: Client): Promise<boolean> {
  const existing = (await getCustomChapters(mangaId)).find(ch => ch.chapterNumber === chapterNumber);
  await addCustomChapter(existing ? { ...existing, pages } : {
    id: `custom-${mangaId}-c${chapterNumber}`, mangaId, chapterNumber,
    title: `Capítulo ${chapterNumber}`, scanlationGroup: 'Upload do Administrador',
    language: 'pt-br', pages, publishedAt: new Date().toISOString(),
  }, client);
  return true;
}

export async function deleteChapter(mangaId: string, chapterNumber: string, client: Client): Promise<boolean> {
  const { error } = await client.from('manga_custom_chapters').upsert({
    id: `custom-${mangaId}-c${chapterNumber}`, manga_id: mangaId,
    chapter_number: chapterNumber, deleted: true,
  }, { onConflict: 'manga_id,chapter_number' });
  if (error) throw error;
  return true;
}

export async function isChapterDeleted(mangaId: string, chapterNumber: string): Promise<boolean> {
  const { data, error } = await chapterClient().from('manga_custom_chapters').select('deleted').eq('manga_id', mangaId).eq('chapter_number', chapterNumber).maybeSingle();
  if (error) throw error;
  return data?.deleted ?? false;
}