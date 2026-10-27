import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

// Only Lovable's own hosts provide /~oauth/initiate. Custom deployments
// authenticate with the same Supabase project directly instead.
export function usesLovableOAuth(hostname: string, mode?: string): boolean {
  if (mode === "supabase") return false;
  if (mode === "lovable") return true;
  return [
    "lovable.app",
    "lovableproject.com",
    "lovableproject-dev.com",
    "gpt-eng.com",
    "gptengineer.run",
  ].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export async function startGoogleSignIn() {
  const redirectTo = `${window.location.origin}/`;
  if (usesLovableOAuth(window.location.hostname, import.meta.env.VITE_AUTH_MODE)) {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectTo });
    if (result.error) throw result.error;
    return;
  }

  // Supabase processes Google's callback and sends the session back to our
  // existing home route. Its client detects and persists the returned session.
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}
