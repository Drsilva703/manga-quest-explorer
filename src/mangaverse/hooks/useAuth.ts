import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { startGoogleSignIn } from "@/mangaverse/services/googleAuth";

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
    try {
      await startGoogleSignIn();
    } catch (error) {
      console.error("Google sign-in error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (/cancel/i.test(msg)) return; // usuário fechou a janela
      if (/Popup was blocked/i.test(msg)) {
        alert(
          "O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.",
        );
      } else if (/Preview mode|timed out/i.test(msg)) {
        alert(
          "O login não foi concluído. Abra o site publicado em uma nova aba e tente novamente.",
        );
      } else if (/provider.*(disabled|not enabled)|unsupported provider/i.test(msg)) {
        alert(
          "Ative o provedor Google nas configurações de autenticação do Supabase deste projeto.",
        );
      } else {
        alert("Não foi possível entrar com o Google. Tente novamente.");
      }
    }
  };

  const signOut = () => supabase.auth.signOut();

  return { user, signInWithGoogle, signOut };
}
