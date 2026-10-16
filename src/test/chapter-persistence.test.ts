import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ rows: [] as any[], fail: false }));
vi.mock('@tanstack/react-start', () => ({ createServerOnlyFn: (fn: unknown) => fn }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const filters: [string, unknown][] = [];
      let mutation: any;
      const query: any = {
        select: () => query, order: () => query, range: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        upsert: (row: any) => { mutation = row; return query; },
        single: () => query, maybeSingle: () => query,
        then: (resolve: any, reject: any) => {
          if (store.fail) return Promise.resolve({ data: null, error: new Error('write failed') }).then(resolve, reject);
          if (mutation) {
            const index = store.rows.findIndex(r => r.manga_id === mutation.manga_id && r.chapter_number === mutation.chapter_number);
            const row = { pages: [], title: '', language: 'pt-br', published_at: '2026-10-16T00:00:00Z', deleted: false, ...(store.rows[index] ?? {}), ...mutation };
            if (index < 0) store.rows.push(row); else store.rows[index] = row;
            return Promise.resolve({ data: row, error: null }).then(resolve, reject);
          }
          return Promise.resolve({ data: store.rows.filter(r => filters.every(([key, value]) => r[key] === value)), error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  }),
}));

const chapter = { id: 'custom-one-piece-c630', mangaId: 'one-piece', chapterNumber: '630', title: '630', pages: ['/api/pages/one-piece/630/001.png', '/api/pages/one-piece/630/002.png'], publishedAt: '2026-10-16T00:00:00Z' };

beforeEach(() => {
  store.rows = []; store.fail = false;
  vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-public-key');
});

describe('permanent admin chapters', () => {
  it('reads chapter 630 and ordered page URLs after the server module is reloaded', async () => {
    const db = await import('../server/mangaverse/chapterDb');
    await db.addCustomChapter(chapter, db.chapterClient());
    vi.resetModules();
    const fresh = await import('../server/mangaverse/chapterDb');
    expect(await fresh.getCustomChapters('one-piece')).toEqual([expect.objectContaining(chapter)]);
  });
  it('updates pages without duplicating a chapter', async () => {
    const db = await import('../server/mangaverse/chapterDb');
    await db.addCustomChapter(chapter, db.chapterClient());
    await db.updateChapterPages('one-piece', '630', ['/api/pages/new.png'], db.chapterClient());
    expect(await db.getCustomChapters('one-piece')).toEqual([expect.objectContaining({ pages: ['/api/pages/new.png'] })]);
  });
  it('persists a removal marker and excludes removed chapters from the list', async () => {
    const db = await import('../server/mangaverse/chapterDb');
    await db.addCustomChapter(chapter, db.chapterClient());
    await db.deleteChapter('one-piece', '630', db.chapterClient());
    vi.resetModules();
    const fresh = await import('../server/mangaverse/chapterDb');
    expect(await fresh.getCustomChapters('one-piece')).toEqual([]);
    expect(await fresh.getChapterRecords('one-piece')).toEqual([expect.objectContaining({ chapter_number: '630', deleted: true })]);
  });
  it('does not report successful saving when the database fails', async () => {
    const db = await import('../server/mangaverse/chapterDb');
    store.fail = true;
    await expect(db.addCustomChapter(chapter, db.chapterClient())).rejects.toThrow('write failed');
    expect(store.rows).toHaveLength(0);
  });
  it('requires at least one real page', async () => {
    const db = await import('../server/mangaverse/chapterDb');
    await expect(db.addCustomChapter({ ...chapter, pages: [] }, db.chapterClient())).rejects.toThrow('página real');
  });
  it('denies writes without a verified session', async () => {
    const db = await import('../server/mangaverse/chapterDb');
    expect(await db.authorizedChapterClient(new Headers())).toBeNull();
  });
});