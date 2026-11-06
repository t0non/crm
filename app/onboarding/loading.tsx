export default function OnboardingLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3 rounded-lg border bg-background p-6">
      <p className="text-sm font-medium">Carregando sua configuração…</p>
      <p className="text-sm text-muted-foreground">
        Aguarde enquanto consultamos os dados da organização.
      </p>
    </div>
  );
}
