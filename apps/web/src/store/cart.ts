import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  variantLabel?: string | null;
  unitPriceCents: number;
  quantity: number;
  imageUrl?: string | null;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  setQuantity: (key: { productId: string; variantId?: string | null }, quantity: number) => void;
  removeItem: (key: { productId: string; variantId?: string | null }) => void;
  clear: () => void;
};

function sameKey(
  a: { productId: string; variantId?: string | null },
  b: { productId: string; variantId?: string | null }
) {
  return a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const curr = get().items;
        const idx = curr.findIndex((i) => sameKey(i, item));
        if (idx >= 0) {
          const next = [...curr];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
          set({ items: next });
          return;
        }
        set({ items: [...curr, item] });
      },
      setQuantity: (key, quantity) => {
        const q = Math.max(1, Math.min(99, quantity));
        set({
          items: get().items.map((i) => (sameKey(i, key) ? { ...i, quantity: q } : i))
        });
      },
      removeItem: (key) => {
        set({ items: get().items.filter((i) => !sameKey(i, key)) });
      },
      clear: () => set({ items: [] })
    }),
    { name: "tempero_cart_v1" }
  )
);

export function cartSubtotalCents(items: CartItem[]) {
  return items.reduce((acc, i) => acc + i.unitPriceCents * i.quantity, 0);
}

