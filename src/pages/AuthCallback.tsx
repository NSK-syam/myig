import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { EmailOtpType } from "@supabase/supabase-js";

import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { buildNativeAppUrl, clearAuthReturnTo, readAuthReturnTo } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const finishSignIn = async () => {
      try {
        const searchParams = new URL(window.location.href).searchParams;
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hasAuthPayload = Boolean(code || tokenHash || accessToken || refreshToken);

        if (!Capacitor.isNativePlatform() && hasAuthPayload) {
          const nativeUrl = buildNativeAppUrl(`/auth/callback${window.location.search}${window.location.hash}`);
          window.location.replace(nativeUrl);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          });
          if (error) throw error;
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error("No valid sign-in session was created. Please request another magic link.");
          }
        }

        const returnTo = readAuthReturnTo();
        clearAuthReturnTo();

        if (!active) return;

        toast({
          title: "Signed in",
          description: "Your SearchOutfit account is ready.",
        });
        navigate(returnTo, { replace: true });
      } catch (error) {
        if (!active) return;
        clearAuthReturnTo();
        toast({
          title: "Could not complete sign-in",
          description: error instanceof Error
            ? error.message
            : "Open the latest magic link from your email and make sure it returns to the SearchOutfit app.",
          variant: "destructive",
        });
        navigate("/", { replace: true });
      }
    };

    void finishSignIn();

    return () => {
      active = false;
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex min-h-screen items-center justify-center px-6 pt-16">
        <div className="flex max-w-sm flex-col items-center rounded-sm border border-border bg-card px-6 py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
            Finishing sign-in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hold on while we verify your magic link and bring you back to SearchOutfit.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
