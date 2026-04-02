"use client";

import { useState } from "react";
import Image from "next/image";
import type { SCImage } from "@/lib/wordpress/types";

export function ProductGallery({ images, productName }: { images: SCImage[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center">
        <svg className="w-20 h-20 text-gray-200" fill="none" stroke="currentColor" strokeWidth={0.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="aspect-square relative bg-gray-50 rounded-xl overflow-hidden">
        <Image
          src={activeImage.url}
          alt={activeImage.alt || productName}
          fill
          className="object-contain p-6"
          preload={activeIndex === 0}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((activeIndex - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full shadow flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Anterior"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setActiveIndex((activeIndex + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full shadow flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Siguiente"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}
        {/* Counter */}
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {activeIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-6 gap-2">
          {images.slice(0, 6).map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`aspect-square relative bg-gray-50 rounded-lg overflow-hidden cursor-pointer transition-all ${
                i === activeIndex
                  ? "ring-2 ring-[#013d5a] ring-offset-1"
                  : "border border-gray-100 hover:border-gray-300"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt || productName}
                fill
                className="object-contain p-1"
                sizes="80px"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
