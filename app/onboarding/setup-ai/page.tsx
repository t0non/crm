import Link from "next/link";
import { continueWithoutAi } from "@/app/actions/onboarding/continueWithoutAi";

export const dynamic = "force-dynamic";

export default async function SetupAiPage({
  searchParams,
}: {
  searchParams: Promise<{ advanced?: string }>;
}) {
  const params = await searchParams;
  if (params.advanced === "1") {
    const { default: AdvancedSetup } = await import("./_advanced");
    return <AdvancedSetup />;
  }
  return (
    <section className="space-y-5 rounded-lg border bg-background p-6">
      <h2 className="text-2xl font-semibold">Como você quer atender?</h2>
      <p className="text-sm text-muted-foreground">
        O FounderCRM funciona com atendimento manual pelo Inbox. Você não precisa configurar
        inteligência artificial para continuar.
      </p>
      <form action={continueWithoutAi}>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Continuar sem IA (atendimento manual)
        </button>
      </form>
      <p className="text-sm text-muted-foreground">
        Nenhum agente será criado ou ativado. Você pode configurar a inteligência artificial depois.
      </p>
      <Link
        href="/onboarding/setup-ai?advanced=1"
        prefetch={false}
        className="inline-block text-sm underline"
      >
        Configurar IA agora (opcional)
      </Link>
    </section>
  );
}
