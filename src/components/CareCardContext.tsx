import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { ComponentProps } from "react";
import type { CareCard } from "./CareCard";
import { supabase } from "@/integrations/supabase/client";

type CardData = ComponentProps<typeof CareCard>;
const CareCardContext = createContext<{
  card: CardData | null;
  setCard: (card: CardData) => void;
}>({ card: null, setCard: () => {} });

export function CareCardProvider({ children }: { children: ReactNode }) {
  const [card, setCard] = useState<CardData | null>(null);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setCard(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <CareCardContext.Provider value={{ card, setCard }}>{children}</CareCardContext.Provider>;
}

export const useCareCard = () => useContext(CareCardContext);