export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="font-serif text-lg">Aroma dos Temperos</div>
            <div className="mt-2 text-sm text-fg/70">
              Temperos, ervas e especiarias com curadoria premium.
            </div>
          </div>
          <div className="text-sm text-fg/70">
            <div className="font-medium text-fg">Atendimento</div>
            <div className="mt-2">Contato e suporte</div>
            <div className="mt-1">Frete calculado no checkout</div>
          </div>
          <div className="text-sm text-fg/70">
            <div className="font-medium text-fg">Institucional</div>
            <div className="mt-2">Política de troca • Privacidade</div>
            <div className="mt-1">Contato</div>
          </div>
        </div>
        <div className="mt-10 text-xs text-fg/50">
          © {new Date().getFullYear()} Aroma dos Temperos
        </div>
      </div>
    </footer>
  );
}
