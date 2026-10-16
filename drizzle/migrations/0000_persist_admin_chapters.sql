CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.manga_custom_chapters (
  id text PRIMARY KEY,
  manga_id text NOT NULL,
  chapter_number text NOT NULL,
  title text NOT NULL DEFAULT '',
  volume text,
  scanlation_group text,
  language text NOT NULL DEFAULT 'pt-br',
  pages text[] NOT NULL DEFAULT '{}',
  published_at timestamptz NOT NULL DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false,
  UNIQUE (manga_id, chapter_number)
);
GRANT SELECT ON public.manga_custom_chapters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.manga_custom_chapters TO authenticated;
GRANT ALL ON public.manga_custom_chapters TO service_role;
ALTER TABLE public.manga_custom_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read chapter catalog" ON public.manga_custom_chapters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Administrators manage chapters" ON public.manga_custom_chapters FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE INDEX manga_custom_chapters_manga_idx ON public.manga_custom_chapters (manga_id);