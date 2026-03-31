import {
  createClient,
  type SupabaseClient,
  type User,
} from "https://esm.sh/@supabase/supabase-js@2";

type AuthenticatedContext = {
  supabase: SupabaseClient;
  user: User;
};

type AuthFailure = {
  error: string;
  status: number;
};

export async function requireAuthenticatedUser(
  req: Request,
): Promise<AuthenticatedContext | AuthFailure> {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");

  if (!url || !anonKey) {
    return {
      error: "Supabase auth environment is not configured.",
      status: 500,
    };
  }

  if (!authorization) {
    return {
      error: "Authentication required.",
      status: 401,
    };
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: "Authentication required.",
      status: 401,
    };
  }

  return { supabase, user };
}

export async function getAuthenticatedUser(
  req: Request,
): Promise<AuthenticatedContext | null> {
  const result = await requireAuthenticatedUser(req);
  return "error" in result ? null : result;
}
