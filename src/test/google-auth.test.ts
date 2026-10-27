import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ direct: vi.fn(), broker: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOAuth: mocks.direct } },
}));
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: mocks.broker } } }));
import { startGoogleSignIn, usesLovableOAuth } from "@/mangaverse/services/googleAuth";

describe("Google login outside Lovable", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mocks.direct.mockResolvedValue({ error: null });
    mocks.broker.mockResolvedValue({});
  });
  it("uses the broker only on real Lovable hostnames", () => {
    expect(usesLovableOAuth("nipponbr.vercel.app")).toBe(false);
    expect(usesLovableOAuth("nipponbr.com")).toBe(false);
    expect(usesLovableOAuth("nipponbr.lovable.app")).toBe(true);
    expect(usesLovableOAuth("lovable.app.attacker.com")).toBe(false);
    expect(usesLovableOAuth("fake-lovable.app")).toBe(false);
    expect(usesLovableOAuth("nipponbr.lovable.app", "supabase")).toBe(false);
  });
  it("starts direct OAuth returning to the existing home route, never the missing broker", async () => {
    await startGoogleSignIn();
    expect(mocks.direct).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    expect(mocks.broker).not.toHaveBeenCalled();
  });
  it("preserves the Lovable flow when explicitly selected", async () => {
    vi.stubEnv("VITE_AUTH_MODE", "lovable");
    await startGoogleSignIn();
    expect(mocks.broker).toHaveBeenCalledWith("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    expect(mocks.direct).not.toHaveBeenCalled();
  });
  it("propagates provider configuration errors to the UI", async () => {
    const error = new Error("provider is not enabled");
    mocks.direct.mockResolvedValue({ error });
    await expect(startGoogleSignIn()).rejects.toThrow("provider is not enabled");
  });
});
