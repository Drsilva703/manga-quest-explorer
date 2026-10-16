import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.redirected) return;
    if (result.error) {
      console.error('Google sign-in error:', result.error);
      const msg = String(result.error.message || '');
      if (/cancel/i.test(msg)) return; // usuário fechou a janela
      if (/Popup was blocked/i.test(msg)) {
        alert('O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.');
      } else if (/Preview mode|timed out/i.test(msg)) {
        alert('O login com Google não funciona dentro da pré-visualização do editor no celular. Abra o site publicado (manga-quest-explorer.lovable.app) para entrar.');
      } else {
        alert('Não foi possível entrar com o Google. Tente novamente.');
      }
    }
  };

  const signOut = () => supabase.auth.signOut();

  return { user, signInWithGoogle, signOut };
}
