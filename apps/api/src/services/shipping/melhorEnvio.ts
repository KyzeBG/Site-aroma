import axios from "axios";

export type ShippingItemInput = {
  id: string;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  weightKg: number;
  insuranceValueBrl: number;
  quantity: number;
};

export type ShippingOption = {
  serviceCode: string;
  name: string;
  priceCents: number;
  deadlineDays: number;
};

function toCents(brl: number) {
  return Math.round(brl * 100);
}

export async function melhorEnvioCalculate(params: {
  token: string;
  fromZip: string;
  toZip: string;
  items: ShippingItemInput[];
  sandbox?: boolean;
}) {
  const baseUrl = params.sandbox
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";

  const url = `${baseUrl}/api/v2/me/shipment/calculate`;

  const { data } = await axios.post(
    url,
    {
      from: { postal_code: params.fromZip.replace(/\D/g, "") },
      to: { postal_code: params.toZip.replace(/\D/g, "") },
      products: params.items.map((p) => ({
        id: p.id,
        width: p.widthCm,
        height: p.heightCm,
        length: p.lengthCm,
        weight: p.weightKg,
        insurance_value: Number(p.insuranceValueBrl.toFixed(2)),
        quantity: p.quantity
      })),
      options: { receipt: false, own_hand: false },
      services: "1,2"
    },
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
        "User-Agent": "tempero-store/1.0"
      },
      timeout: 15_000
    }
  );

  const options: ShippingOption[] = (Array.isArray(data) ? data : []).flatMap(
    (s: any) => {
      const customPrice = typeof s?.custom_price === "string" ? s.custom_price : null;
      const customDeliveryTime =
        typeof s?.custom_delivery_time === "number" ? s.custom_delivery_time : null;
      const name = typeof s?.name === "string" ? s.name : null;
      const id = s?.id != null ? String(s.id) : null;
      if (!customPrice || !customDeliveryTime || !name || !id) return [];
      const brl = Number(customPrice);
      if (!Number.isFinite(brl)) return [];

      return [
        {
          serviceCode: id,
          name,
          priceCents: toCents(brl),
          deadlineDays: customDeliveryTime
        }
      ];
    }
  );

  return options;
}

