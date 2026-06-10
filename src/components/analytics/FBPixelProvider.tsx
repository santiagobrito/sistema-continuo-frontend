"use client";

/**
 * Meta (Facebook) Pixel loader.
 *
 * Inyecta el snippet de fbq + dispara PageView en cada navegación client-side.
 * Los eventos custom (ViewContent, AddToCart, InitiateCheckout, Purchase) se
 * disparan desde los componentes via `fbPixelTrack()` en lib/fbpixel/client.ts.
 *
 * Cada evento browser incluye un event_id que también mandamos server-side por
 * Conversions API para que Meta los deduplique.
 */

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!PIXEL_ID || typeof window === "undefined" || !window.fbq) return;
    window.fbq("track", "PageView");
  }, [pathname, searchParams]);

  return null;
}

export function FBPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      <Script
        id="fb-pixel"
        // lazyOnload (igual que GTM): no bloquea TBT/TTI. El PageView client-side
        // sigue funcionando porque el useEffect espera a que window.fbq exista.
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
