import { prisma } from "../db/prisma.js";
import { decryptString, encryptString } from "../utils/crypto.js";

export type SensitiveSettings = {
  melhorEnvioToken?: string | null;
  melhorEnvioFromZip?: string | null;
  mercadoPagoAccessToken?: string | null;
  mercadoPagoPublicKey?: string | null;
};

export async function getSettings() {
  return prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 }
  });
}

export async function getPublicSettings() {
  const s = await getSettings();
  return {
    storeName: s.storeName,
    logoUrl: s.logoUrl,
    colors: {
      primary: s.primaryColor,
      background: s.backgroundColor,
      accent: s.accentColor
    },
    whatsapp: s.whatsapp,
    contactEmail: s.contactEmail,
    offers: {
      pixDiscountPercent: s.pixDiscountPercent,
      freeShippingEnabled: s.freeShippingEnabled,
      freeShippingMinSubtotalCents: s.freeShippingMinSubtotalCents
    },
    home: s.home ?? null,
  };
}

export async function getSensitiveSettings(): Promise<SensitiveSettings> {
  const s = await getSettings();
  return {
    melhorEnvioToken: s.melhorEnvioTokenEnc
      ? decryptString(s.melhorEnvioTokenEnc)
      : null,
    melhorEnvioFromZip: s.melhorEnvioFromZip ?? null,
    mercadoPagoAccessToken: s.mercadoPagoAccessTokenEnc
      ? decryptString(s.mercadoPagoAccessTokenEnc)
      : null,
    mercadoPagoPublicKey: s.mercadoPagoPublicKeyEnc
      ? decryptString(s.mercadoPagoPublicKeyEnc)
      : null
  };
}

export async function updateSettings(input: {
  storeName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  whatsapp?: string | null;
  contactEmail?: string | null;
  pixDiscountPercent?: number;
  freeShippingEnabled?: boolean;
  freeShippingMinSubtotalCents?: number;
  shippingMarginPercent?: number;
  home?: unknown;
  melhorEnvioToken?: string | null;
  melhorEnvioFromZip?: string | null;
  mercadoPagoAccessToken?: string | null;
  mercadoPagoPublicKey?: string | null;
}) {
  const data: any = { ...input };

  if ("melhorEnvioToken" in input) {
    data.melhorEnvioTokenEnc = input.melhorEnvioToken
      ? encryptString(input.melhorEnvioToken)
      : null;
    delete data.melhorEnvioToken;
  }

  if ("mercadoPagoAccessToken" in input) {
    data.mercadoPagoAccessTokenEnc = input.mercadoPagoAccessToken
      ? encryptString(input.mercadoPagoAccessToken)
      : null;
    delete data.mercadoPagoAccessToken;
  }

  if ("mercadoPagoPublicKey" in input) {
    data.mercadoPagoPublicKeyEnc = input.mercadoPagoPublicKey
      ? encryptString(input.mercadoPagoPublicKey)
      : null;
    delete data.mercadoPagoPublicKey;
  }

  return prisma.siteSettings.update({
    where: { id: 1 },
    data
  });
}

