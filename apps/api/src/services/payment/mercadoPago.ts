import axios from "axios";

export type MpPixResponse = {
  providerPaymentId: string;
  qrCodeBase64: string;
  qrCode: string;
  copyPaste: string;
  raw: unknown;
};

export async function mercadoPagoCreatePix(params: {
  accessToken: string;
  amountCents: number;
  description: string;
  payer: { email: string; firstName?: string; lastName?: string; cpf?: string };
}) {
  const amount = Number((params.amountCents / 100).toFixed(2));

  const { data } = await axios.post(
    "https://api.mercadopago.com/v1/payments",
    {
      transaction_amount: amount,
      description: params.description,
      payment_method_id: "pix",
      payer: {
        email: params.payer.email,
        first_name: params.payer.firstName,
        last_name: params.payer.lastName,
        identification: params.payer.cpf
          ? { type: "CPF", number: params.payer.cpf }
          : undefined
      }
    },
    {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json"
      },
      timeout: 15_000
    }
  );

  const id = data?.id != null ? String(data.id) : null;
  const tx = data?.point_of_interaction?.transaction_data;
  const qrCodeBase64 = typeof tx?.qr_code_base64 === "string" ? tx.qr_code_base64 : null;
  const qrCode = typeof tx?.qr_code === "string" ? tx.qr_code : null;
  const copyPaste = typeof tx?.qr_code === "string" ? tx.qr_code : null;

  if (!id || !qrCodeBase64 || !qrCode || !copyPaste) {
    throw new Error("mercadopago_invalid_response");
  }

  const res: MpPixResponse = {
    providerPaymentId: id,
    qrCodeBase64,
    qrCode,
    copyPaste,
    raw: data
  };
  return res;
}

export async function mercadoPagoGetPaymentStatus(params: {
  accessToken: string;
  providerPaymentId: string;
}) {
  const { data } = await axios.get(
    `https://api.mercadopago.com/v1/payments/${params.providerPaymentId}`,
    {
      headers: { Authorization: `Bearer ${params.accessToken}` },
      timeout: 15_000
    }
  );

  const status = typeof data?.status === "string" ? data.status : "unknown";
  return { status, raw: data };
}

