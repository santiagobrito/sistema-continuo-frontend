"use client";

import Script from "next/script";

export function MerchantWidget() {
  return (
    <Script
      src="https://www.gstatic.com/shopping/merchant/merchantwidget.js"
      strategy="lazyOnload"
      onLoad={() => {
        (window as any).merchantwidget.start({
          merchant_id: 115456767,
          position: "BOTTOM_RIGHT",
          region: "AR",
        });
      }}
    />
  );
}
