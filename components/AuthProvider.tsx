"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthState {
  /** Вошедший пользователь или null (гость) */
  user: User | null;
  /** false, пока не выяснили, вошёл ли пользователь — чтобы не мигала надпись «Гость» */
  ready: boolean;
  /** Настроен ли Supabase (заданы ли ключи) */
  enabled: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  ready: true,
  enabled: false,
  signOut: async () => undefined,
});

/**
 * Хранит, кто сейчас вошёл, и делится этим со всеми компонентами (боковая панель, верхняя панель).
 * Подписывается на изменения: вход, выход, обновление сессии в другой вкладке.
 *
 * Это только для отображения в интерфейсе. Проверку сессии на сервере делает middleware.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(supabase === null);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user);
        setReady(true);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    router.push("/welcome");
    router.refresh();
  }, [router, supabase]);

  const value = useMemo(
    () => ({ user, ready, enabled: supabase !== null, signOut }),
    [user, ready, supabase, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
