"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { cloudLibrary, localLibrary, type Library } from "@/lib/library";
import { createClient } from "@/lib/supabase/client";

/**
 * Выбирает, где хранить книги: вошёл — в аккаунте, гость — в браузере.
 * Пока не выяснили, вошёл ли пользователь, возвращает null (чтобы не показать чужие книги).
 */
export function useLibrary(): Library | null {
  const { user, ready, enabled } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const userId = user?.id;

  return useMemo(() => {
    if (!ready) {
      return null;
    }
    if (enabled && supabase && userId) {
      return cloudLibrary(supabase, userId);
    }
    return localLibrary;
  }, [ready, enabled, supabase, userId]);
}
