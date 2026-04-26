"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { DraggableList } from "@/components/admin/DraggableList";
import { useToast } from "@/components/ui/Toast";

type Settings = any;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  function withIds<T extends object>(items: T[]) {
    return items.map((it, idx) => ({ id: String((it as any).id ?? idx), ...it }));
  }

  async function load() {
    const s = await apiFetch<Settings>("/api/admin/settings");
    setSettings(s);
  }

  useEffect(() => {
    load().catch(() => setSettings(null));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const normalizedHome = (() => {
        const h = settings.home ?? {};
        const benefits = Array.isArray(h.benefits) ? h.benefits.map((b: any) => ({ title: b.title, description: b.description })) : h.benefits;
        return { ...h, benefits };
      })();

      await apiFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          storeName: settings.storeName,
          logoUrl: settings.logoUrl,
          primaryColor: settings.primaryColor,
          backgroundColor: settings.backgroundColor,
          accentColor: settings.accentColor,
          whatsapp: settings.whatsapp,
          contactEmail: settings.contactEmail,
          pixDiscountPercent: settings.pixDiscountPercent,
          freeShippingEnabled: settings.freeShippingEnabled,
          freeShippingMinSubtotalCents: settings.freeShippingMinSubtotalCents,
          shippingMarginPercent: settings.shippingMarginPercent,
          melhorEnvioFromZip: settings.melhorEnvioFromZip,
          melhorEnvioToken: settings.melhorEnvioToken,
          mercadoPagoAccessToken: settings.mercadoPagoAccessToken,
          mercadoPagoPublicKey: settings.mercadoPagoPublicKey,
          home: normalizedHome
        })
      });
      await load();
      toast.push({ title: "Configurações salvas", description: "As mudanças já estão ativas no site." });
    } catch (e: any) {
      setError(e?.message ?? "Erro ao salvar");
      toast.push({ title: "Erro ao salvar", description: e?.message ?? "", variant: "danger" });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div>
        <h1 className="font-serif text-3xl">Configurações</h1>
        <div className="mt-6 text-sm text-fg/60">Carregando...</div>
      </div>
    );
  }

  const home = settings.home ?? {};
  const banner = home.banner ?? {};
  const benefits = withIds<Array<{ title: string; description: string }>>(Array.isArray(home.benefits) ? home.benefits : []);

  return (
    <div>
      <h1 className="font-serif text-3xl">Configurações</h1>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <div className="font-medium">Loja</div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Nome da loja"
              value={settings.storeName ?? ""}
              onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
            />
            <Input
              placeholder="Logo URL"
              value={settings.logoUrl ?? ""}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
            />
            <Input
              placeholder="WhatsApp"
              value={settings.whatsapp ?? ""}
              onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
            />
            <Input
              placeholder="Email contato"
              value={settings.contactEmail ?? ""}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <div className="font-medium">Ofertas e frete</div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Desconto Pix (%)"
              value={settings.pixDiscountPercent ?? 5}
              onChange={(e) => setSettings({ ...settings, pixDiscountPercent: Number(e.target.value) })}
            />
            <Input
              placeholder="Frete grátis acima (centavos)"
              value={settings.freeShippingMinSubtotalCents ?? 0}
              onChange={(e) => setSettings({ ...settings, freeShippingMinSubtotalCents: Number(e.target.value) })}
            />
            <label className="flex items-center gap-2 text-sm text-fg/80">
              <input
                type="checkbox"
                checked={Boolean(settings.freeShippingEnabled)}
                onChange={(e) => setSettings({ ...settings, freeShippingEnabled: e.target.checked })}
              />
              Frete grátis ativo
            </label>
            <Input
              placeholder="Margem no frete (%)"
              value={settings.shippingMarginPercent ?? 0}
              onChange={(e) => setSettings({ ...settings, shippingMarginPercent: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <div className="font-medium">Integrações</div>
          <div className="mt-2 text-sm text-fg/70">Tokens ficam armazenados no backend.</div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Melhor Envio - CEP de origem"
              value={settings.melhorEnvioFromZip ?? ""}
              onChange={(e) => setSettings({ ...settings, melhorEnvioFromZip: e.target.value })}
            />
            <Input
              placeholder="Melhor Envio - Token"
              value={settings.melhorEnvioToken ?? ""}
              onChange={(e) => setSettings({ ...settings, melhorEnvioToken: e.target.value })}
            />
            <Input
              placeholder="Mercado Pago - Access Token"
              value={settings.mercadoPagoAccessToken ?? ""}
              onChange={(e) => setSettings({ ...settings, mercadoPagoAccessToken: e.target.value })}
            />
            <Input
              placeholder="Mercado Pago - Public Key"
              value={settings.mercadoPagoPublicKey ?? ""}
              onChange={(e) => setSettings({ ...settings, mercadoPagoPublicKey: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <div className="font-medium">Home</div>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Banner • Título"
                value={banner.title ?? ""}
                onChange={(e) => setSettings({ ...settings, home: { ...home, banner: { ...banner, title: e.target.value } } })}
              />
              <Input
                placeholder="Banner • Imagem URL"
                value={banner.imageUrl ?? ""}
                onChange={(e) => setSettings({ ...settings, home: { ...home, banner: { ...banner, imageUrl: e.target.value } } })}
              />
              <Input
                placeholder="Banner • Texto do botão"
                value={banner.ctaText ?? ""}
                onChange={(e) => setSettings({ ...settings, home: { ...home, banner: { ...banner, ctaText: e.target.value } } })}
              />
              <Input
                placeholder="Banner • Link do botão"
                value={banner.ctaHref ?? ""}
                onChange={(e) => setSettings({ ...settings, home: { ...home, banner: { ...banner, ctaHref: e.target.value } } })}
              />
            </div>
            <Textarea
              placeholder="Banner • Subtítulo"
              value={banner.subtitle ?? ""}
              onChange={(e) => setSettings({ ...settings, home: { ...home, banner: { ...banner, subtitle: e.target.value } } })}
            />

            <div>
              <div className="font-medium">Benefícios (arraste para reordenar)</div>
              <div className="mt-3">
                <DraggableList
                  items={benefits as any}
                  onChange={(next) =>
                    setSettings({
                      ...settings,
                      home: { ...home, benefits: next.map((b: any) => ({ title: b.title, description: b.description })) }
                    })
                  }
                  renderItem={(b: any) => (
                    <div>
                      <div className="font-medium">{b.title}</div>
                      <div className="mt-1 text-sm text-fg/70">{b.description}</div>
                    </div>
                  )}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Novo benefício • título"
                  value={settings.__newBenefitTitle ?? ""}
                  onChange={(e) => setSettings({ ...settings, __newBenefitTitle: e.target.value })}
                />
                <Input
                  placeholder="Novo benefício • descrição"
                  value={settings.__newBenefitDesc ?? ""}
                  onChange={(e) => setSettings({ ...settings, __newBenefitDesc: e.target.value })}
                />
              </div>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const title = String(settings.__newBenefitTitle ?? "").trim();
                    const description = String(settings.__newBenefitDesc ?? "").trim();
                    if (!title || !description) return;
                    setSettings({
                      ...settings,
                      __newBenefitTitle: "",
                      __newBenefitDesc: "",
                      home: { ...home, benefits: [...(Array.isArray(home.benefits) ? home.benefits : []), { title, description }] }
                    });
                  }}
                >
                  Adicionar benefício
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <div className="font-medium">JSON avançado</div>
          <div className="mt-2 text-sm text-fg/70">Use se precisar ajustar algo fora dos formulários.</div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <Textarea
              value={JSON.stringify(settings.home ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  setSettings({ ...settings, home: JSON.parse(e.target.value) });
                } catch {
                }
              }}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {error ? <div className="mt-4 text-sm text-danger">{error}</div> : null}

      <div className="mt-6">
        <Button type="button" onClick={save} isLoading={saving} size="lg">
          Salvar
        </Button>
      </div>
    </div>
  );
}

