"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";
import type { HeroSlide } from "@/lib/wordpress/types";

interface Props {
  slides: HeroSlide[];
}

export default function HeroCarousel({ slides }: Props) {
  const autoplay = Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true });
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [autoplay]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (slides.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#013d5a]" aria-label="Banner principal">
      <div className="embla" ref={emblaRef}>
        <div className="flex">
          {slides.map((s) => (
            <div key={s.id} className="flex-[0_0_100%] min-w-0 relative">
              <HeroSlideContent slide={s} />
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          {/* Flechas (solo desktop) */}
          <button
            type="button"
            onClick={scrollPrev}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 backdrop-blur text-white transition z-10"
            aria-label="Slide anterior"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 backdrop-blur text-white transition z-10"
            aria-label="Slide siguiente"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {scrollSnaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                className={`h-2 rounded-full transition-all ${i === selectedIndex ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75"}`}
                aria-label={`Ir al slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function HeroSlideContent({ slide }: { slide: HeroSlide }) {
  const desktop = slide.image_desktop;
  const mobile = slide.image_mobile;
  const href = slide.cta_url || "#";
  const isExternal = href.startsWith("http") && !href.includes("sistemacontinuo.com.ar");

  // Overlay según estilo
  const overlayClass =
    slide.overlay_style === "dark"
      ? "bg-gradient-to-r from-black/60 via-black/30 to-transparent"
      : slide.overlay_style === "light"
      ? "bg-gradient-to-r from-white/60 via-white/30 to-transparent"
      : "";
  const textColor = slide.overlay_style === "light" ? "text-gray-900" : "text-white";
  const textShadow = slide.overlay_style === "none" ? "drop-shadow(0 2px 8px rgba(0,0,0,0.6))" : undefined;

  const Wrapper: React.ElementType = slide.cta_url && !slide.cta_label ? Link : "div";
  const wrapperProps = slide.cta_url && !slide.cta_label
    ? { href, ...(isExternal && { target: "_blank", rel: "noopener noreferrer" }) }
    : {};

  return (
    <Wrapper {...wrapperProps} className="block relative w-full">
      {/* Imagen desktop (ratio 12:5) */}
      {desktop && (
        <div className="hidden md:block relative w-full" style={{ aspectRatio: "12/5" }}>
          <Image
            src={desktop.url}
            alt={desktop.alt}
            fill
            sizes="100vw"
            className="object-cover"
            priority={slide.order <= 1}
          />
        </div>
      )}
      {/* Imagen mobile (ratio 4:5) */}
      {mobile && (
        <div className="block md:hidden relative w-full" style={{ aspectRatio: "4/5" }}>
          <Image
            src={mobile.url}
            alt={mobile.alt}
            fill
            sizes="100vw"
            className="object-cover"
            priority={slide.order <= 1}
          />
        </div>
      )}

      {/* Overlay + texto (solo si la imagen NO tiene texto embebido) */}
      {!slide.text_in_image && (
        <>
          {overlayClass && <div className={`absolute inset-0 ${overlayClass}`} />}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 md:px-8 w-full">
              <div className={`max-w-2xl ${textColor}`} style={{ filter: textShadow }}>
                {slide.title && (
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-3 tracking-tight">
                    {slide.title}
                  </h1>
                )}
                {slide.subtitle && (
                  <p className="text-base md:text-xl mb-5 leading-relaxed opacity-95">
                    {slide.subtitle}
                  </p>
                )}
                {slide.cta_label && slide.cta_url && (
                  <Link
                    href={href}
                    {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all shadow-lg ${
                      slide.overlay_style === "light"
                        ? "bg-[#013d5a] text-white hover:bg-[#01567a]"
                        : "bg-white text-[#013d5a] hover:bg-blue-50"
                    }`}
                  >
                    {slide.cta_label}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Si la imagen tiene texto embebido pero hay CTA, lo ponemos abajo */}
      {slide.text_in_image && slide.cta_label && slide.cta_url && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <Link
            href={href}
            {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
            className="inline-flex items-center gap-2 bg-white text-[#013d5a] px-6 py-3 rounded-full font-semibold hover:bg-blue-50 transition-all shadow-lg"
          >
            {slide.cta_label}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}
    </Wrapper>
  );
}
