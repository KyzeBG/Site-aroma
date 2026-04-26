"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductGallery(props: { name: string; images: Array<{ url: string; alt: string | null }> }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const img = props.images[active];

  return (
    <div>
      <button
        type="button"
        className="w-full rounded-3xl border border-border overflow-hidden bg-muted relative aspect-square shadow-soft transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        onClick={() => setZoom(true)}
      >
        {img ? (
          <Image
            src={img.url}
            alt={img.alt ?? props.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : null}
      </button>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {props.images.slice(0, 8).map((it, idx) => (
          <button
            key={idx}
            type="button"
            className={`rounded-2xl border overflow-hidden bg-muted relative aspect-square shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card ${
              idx === active ? "border-ring/60" : "border-border"
            } active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60`}
            onClick={() => setActive(idx)}
          >
            <Image src={it.url} alt={it.alt ?? props.name} fill sizes="25vw" className="object-cover" />
          </button>
        ))}
      </div>

      {zoom && img ? (
        <div
          className="fixed inset-0 z-[100] bg-black/80 p-4 flex items-center justify-center"
          onClick={() => setZoom(false)}
        >
          <div className="relative w-full max-w-3xl aspect-square rounded-2xl overflow-hidden bg-black">
            <Image src={img.url} alt={img.alt ?? props.name} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
