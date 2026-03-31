import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { buildAuthRedirectUrl, storeAuthReturnTo } from "@/lib/auth";

type AuthContextValue = {
  deleteAccount: () => Promise<void>;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signInWithMagicLink: (email: string, returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithMagicLink = async (email: string, returnTo = "/") => {
    storeAuthReturnTo(returnTo);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildAuthRedirectUrl(),
      },
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const deleteAccount = async () => {
    const { data, error } = await supabase.functions.invoke("delete-account", {
      body: {},
    });

    if (error) {
      throw error;
    }

    if (data && typeof data === "object" && "success" in data && data.success === false) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not delete account");
    }

    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        deleteAccount,
        loading,
        session,
        signInWithMagicLink,
        signOut,
        user: session?.user ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
