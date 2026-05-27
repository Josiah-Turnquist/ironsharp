import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Demo mode disabled — real auth required
const DEMO_MODE = false;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  displayName: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true, isDemo: false, displayName: "", signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(DEMO_MODE ? DEMO_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(DEMO_MODE ? false : true);

  useEffect(() => {
    if (DEMO_MODE) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (!DEMO_MODE) await supabase.auth.signOut();
  };

  const displayName = user?.user_metadata?.full_name || user?.email || "User";

  return <AuthContext.Provider value={{ user, session, loading, isDemo: DEMO_MODE, displayName, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);