"use client";

// Deferred load of Google Customer Reviews badge — 2026-04-22 perf pass.
import Script from "next/script";
import { useEffect, useState } from "react";

export function MerchantWidget() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      if (mounted) setShouldLoad(true);
    };

    const events: (keyof WindowEventMap)[] = ["pointerdown", "scroll", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, load, { once: true, passive: true }));
    const timer = window.setTimeout(load, 4000);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, load));
    };
  }, []);

  if (!shouldLoad) return null;

  return (
    <Script
      src="https://www.gstatic.com/shopping/merchant/merchantwidget.js"
      strategy="afterInteractive"
      onLoad={() => {
        (window as unknown as { merchantwidget?: { start: (cfg: unknown) => void } }).merchantwidget?.start({
          merchant_id: 115456767,
          position: "BOTTOM_RIGHT",
          region: "AR",
        });
      }}
    />
  );
}
