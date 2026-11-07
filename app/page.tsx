import { redirect } from "next/navigation";
import { marcaDaSaida } from "@/lib/branding/saida";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "./landing-page";
export const dynamic = "force-dynamic";
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const { preview } = await searchParams;
  if (preview !== "landing") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/app");
  }
  const marca = await marcaDaSaida(null);
  return <LandingPage nome={marca.nome} />;
}
