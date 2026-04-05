"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import type { SCImage } from "@/lib/wordpress/types";

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:embed\/|v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

type VideoKind = "youtube" | "direct";

interface GalleryItem {
  type: "image" | "video";
  image?: SCImage;
  videoUrl?: string;
  videoId?: string;
  videoKind?: VideoKind;
}

export function ProductGallery({
  images,
  productName,
  videoUrl,
}: {
  images: SCImage[];
  productName: string;
  videoUrl?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Build gallery items: images first, video last
  const items: GalleryItem[] = images.map((img) => ({ type: "image" as const, image: img }));
  if (videoUrl) {
    const videoId = getYouTubeId(videoUrl);
    if (videoId) {
      items.push({ type: "video", videoUrl, videoId, videoKind: "youtube" });
    } else if (isDirectVideo(videoUrl)) {
      items.push({ type: "video", videoUrl, videoKind: "direct" });
    }
  }

  const totalItems = items.length;

  // Check if thumbnail strip can scroll
  const updateScrollState = useCallback(() => {
    const el = thumbsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = thumbsRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    // Also check on resize
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, totalItems]);

  // Scroll active thumbnail into view
  useEffect(() => {
    const el = thumbsRef.current;
    if (!el) return;
    const thumb = el.children[activeIndex] as HTMLElement | undefined;
    if (thumb) {
      thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeIndex]);

  function scrollThumbs(dir: "left" | "right") {
    const el = thumbsRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }

  if (items.length === 0) {
    return (
      <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center">
        <svg className="w-20 h-20 text-gray-200" fill="none" stroke="currentColor" strokeWidth={0.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  const active = items[activeIndex];

  return (
    <div className="space-y-3">
      {/* Main display */}
      <div className="aspect-square relative bg-gray-50 rounded-xl overflow-hidden">
        {active.type === "image" && active.image ? (
          <Image
            src={active.image.url}
            alt={active.image.alt || productName}
            fill
            className="object-contain p-6"
            priority={activeIndex === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : active.type === "video" && active.videoKind === "youtube" ? (
          <iframe
            src={`https://www.youtube.com/embed/${active.videoId}?rel=0`}
            className="w-full h-full"
            allowFullScreen
            loading="lazy"
            title={`Video de ${productName}`}
          />
        ) : active.type === "video" && active.videoKind === "direct" ? (
          <video
            src={active.videoUrl}
            className="w-full h-full object-contain"
            controls
            playsInline
            preload="metadata"
            title={`Video de ${productName}`}
          />
        ) : null}

        {/* Nav arrows */}
        {totalItems > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((activeIndex - 1 + totalItems) % totalItems)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full shadow flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Anterior"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setActiveIndex((activeIndex + 1) % totalItems)}
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
        {totalItems > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {activeIndex + 1} / {totalItems}
          </span>
        )}
      </div>

      {/* Thumbnails — scrollable horizontal strip */}
      {totalItems > 1 && (
        <div className="relative group">
          {/* Left scroll arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scrollThumbs("left")}
              className="absolute left-0 top-0 bottom-0 z-10 w-7 bg-gradient-to-r from-white via-white/80 to-transparent flex items-center justify-start cursor-pointer"
              aria-label="Ver anteriores"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          {/* Thumbnail strip */}
          <div
            ref={thumbsRef}
            className="flex gap-2 overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {items.map((item, i) => (
              <button
                key={item.type === "image" ? item.image!.id : "video"}
                onClick={() => setActiveIndex(i)}
                className={`shrink-0 w-[60px] h-[60px] relative bg-gray-50 rounded-lg overflow-hidden cursor-pointer transition-all ${
                  i === activeIndex
                    ? "ring-2 ring-[#013d5a] ring-offset-1"
                    : "border border-gray-100 hover:border-gray-300"
                }`}
              >
                {item.type === "image" && item.image ? (
                  <Image
                    src={item.image.url}
                    alt={item.image.alt || productName}
                    fill
                    className="object-contain p-1"
                    sizes="60px"
                    loading="lazy"
                  />
                ) : item.type === "video" ? (
                  <>
                    {item.videoKind === "youtube" && item.videoId ? (
                      <Image
                        src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                        alt={`Video de ${productName}`}
                        fill
                        className="object-cover"
                        sizes="60px"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-800" />
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg className="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </>
                ) : null}
              </button>
            ))}
          </div>

          {/* Right scroll arrow */}
          {canScrollRight && (
            <button
              onClick={() => scrollThumbs("right")}
              className="absolute right-0 top-0 bottom-0 z-10 w-7 bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-end cursor-pointer"
              aria-label="Ver más"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
