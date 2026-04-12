"use client";

import Script from "next/script";

const MERCHANT_ID = 115456767;

function getEstimatedDeliveryDate(shippingMethod?: string): string {
  const now = new Date();
  let businessDays = 5; // default

  if (shippingMethod) {
    const m = shippingMethod.toLowerCase();
    if (m.includes("retiro")) businessDays = 2;
    else if (m.includes("moto")) businessDays = 3;
    else if (m.includes("correo")) businessDays = 7;
    else if (m.includes("transporte")) businessDays = 10;
  }

  // Add business days (skip weekends)
  let added = 0;
  const date = new Date(now);
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }

  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

export function GoogleCustomerReviews({
  orderId,
  email,
  shippingMethod,
}: {
  orderId: string;
  email: string;
  shippingMethod?: string;
}) {
  const deliveryDate = getEstimatedDeliveryDate(shippingMethod);

  return (
    <Script
      src="https://apis.google.com/js/platform.js?onload=renderOptIn"
      strategy="afterInteractive"
      onLoad={() => {
        (window as any).renderOptIn = function () {
          (window as any).gapi.load("surveyoptin", function () {
            (window as any).gapi.surveyoptin.render({
              merchant_id: MERCHANT_ID,
              order_id: orderId,
              email: email,
              delivery_country: "AR",
              estimated_delivery_date: deliveryDate,
            });
          });
        };
        // If gapi already loaded, trigger immediately
        if ((window as any).gapi) {
          (window as any).renderOptIn();
        }
      }}
    />
  );
}
