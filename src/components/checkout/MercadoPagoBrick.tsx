"use client";

/**
 * Payment Brick de MercadoPago (checkout inline / embebido).
 *
 * Alternativa al redirect a Checkout Pro, detrás del flag NEXT_PUBLIC_MP_INLINE.
 * La orden WC ya viene creada (create-preference modo inline); este componente
 * solo renderiza el formulario de tarjeta, tokeniza y cobra vía
 * /api/mercadopago/process-payment, y redirige a /pedido-confirmado según el
 * resultado.
 *
 * Por qué Bricks y no el modal del SDK v2: el modal (mp.checkout autoOpen) abre
 * un popup que Chrome bloquea al perder el "user activation" gesture tras el
 * await del fetch (ver comentario en checkout/page.tsx). El Brick renderiza
 * inline en la página — no hay popup que bloquear.
 */

import { useEffect, useRef, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";

const MP_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ||
  "";

// initMercadoPago debe llamarse una sola vez en el ciclo de vida de la app.
let mpInitialized = false;

interface BrickFormData {
  token?: string;
  payment_method_id?: string;
  issuer_id?: string | number;
  installments?: number;
  payer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    identification?: { type?: string; number?: string };
  };
}

// Métodos que cobramos server-side vía /v1/payments (tarjeta con token, efectivo
// y transferencia sin token). El resto (wallet / dinero en cuenta) requiere login
// de MP y se resuelve redirigiendo a la preferencia.
const SERVER_CHARGE_METHODS = new Set([
  "credit_card",
  "debit_card",
  "prepaid_card",
  "ticket",
  "bank_transfer",
  "atm",
]);

interface Props {
  orderId: number;
  orderNumber: string;
  amount: number;
  maxInstallments: number;
  payerEmail: string;
  shippingMethod: string;
  preferenceId?: string;
  onCancel: () => void;
}

export default function MercadoPagoBrick({
  orderId,
  amount,
  maxInstallments,
  payerEmail,
  shippingMethod,
  preferenceId,
  onCancel,
}: Props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // Evita procesar dos submits del brick en paralelo.
  const processingRef = useRef(false);

  useEffect(() => {
    if (!mpInitialized && MP_PUBLIC_KEY) {
      initMercadoPago(MP_PUBLIC_KEY, { locale: "es-AR" });
      mpInitialized = true;
    }
  }, []);

  async function handleSubmit(
    { selectedPaymentMethod, formData }: { selectedPaymentMethod: string; formData: BrickFormData }
  ): Promise<void> {
    if (processingRef.current) return;
    processingRef.current = true;
    setError("");

    try {
      // Dinero en cuenta / wallet de MP: el propio Payment Brick maneja el redirect
      // a MP usando la preferenceId (login + pago con cuenta). NO redirigimos
      // nosotros — hacerlo abría una segunda ventana. Soltamos el lock por si el
      // cliente vuelve y elige otro método.
      if (!SERVER_CHARGE_METHODS.has(selectedPaymentMethod)) {
        processingRef.current = false;
        return;
      }

      const res = await fetch("/api/mercadopago/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          token: formData.token,
          payment_method_id: formData.payment_method_id,
          issuer_id: formData.issuer_id,
          installments: formData.installments,
          payer: {
            email: formData.payer?.email || payerEmail,
            first_name: formData.payer?.first_name,
            last_name: formData.payer?.last_name,
            identification: formData.payer?.identification,
          },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo procesar el pago");
      }

      // Efectivo / transferencia: MP devuelve el cupón a pagar. Lo abrimos para que
      // el cliente obtenga el código (Rapipago/Pago Fácil). La orden queda pending
      // hasta que pague; el webhook la actualiza.
      if (data.couponUrl) {
        window.location.href = data.couponUrl;
        return;
      }

      const status: string = data.status;
      const email = encodeURIComponent(payerEmail || "");
      const ship = encodeURIComponent(shippingMethod || "");

      if (status === "approved") {
        window.location.href = `/pedido-confirmado?order=${orderId}&status=approved&email=${email}&shipping=${ship}`;
        return;
      }
      if (status === "in_process" || status === "pending") {
        window.location.href = `/pedido-confirmado?order=${orderId}&status=pending&email=${email}&shipping=${ship}`;
        return;
      }

      // rejected / cancelled / otros → mostrar error y permitir reintento.
      processingRef.current = false;
      setError(
        rejectionMessage(data.statusDetail) ||
          "El pago fue rechazado. Probá con otra tarjeta o medio de pago."
      );
    } catch (err) {
      processingRef.current = false;
      setError(err instanceof Error ? err.message : "Error al procesar el pago");
    }
  }

  if (!MP_PUBLIC_KEY) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        Falta configurar la clave pública de MercadoPago. Avisanos por WhatsApp para completar tu compra.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!ready && (
        <div className="py-8 text-center text-sm text-gray-500">Cargando medios de pago…</div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <Payment
        initialization={{
          amount,
          // preferenceId habilita "Dinero en cuenta" (wallet) dentro del brick.
          ...(preferenceId ? { preferenceId } : {}),
          payer: { email: payerEmail || undefined },
        }}
        customization={{
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            ticket: "all",          // efectivo: Rapipago / Pago Fácil
            bankTransfer: "all",    // transferencia
            // Solo "Dinero en cuenta" (wallet). "all" sumaba Mercado Crédito /
            // "Cuotas sin tarjeta", que Santi pidió sacar (ya está dentro del wallet).
            mercadoPago: ["wallet_purchase"],
            maxInstallments,
          },
          visual: { hidePaymentButton: false },
        }}
        onSubmit={handleSubmit}
        onReady={() => setReady(true)}
        onError={(err: unknown) => {
          console.error("[MP Brick] error:", err);
          setError("Hubo un problema cargando el formulario de pago. Recargá la página e intentá de nuevo.");
        }}
      />

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-sm text-gray-500 hover:text-gray-700 underline py-2 cursor-pointer"
      >
        Volver y cambiar datos
      </button>
    </div>
  );
}

/**
 * Traduce los status_detail más comunes de rechazo de MP a mensajes accionables.
 */
function rejectionMessage(detail?: string): string | null {
  switch (detail) {
    case "cc_rejected_insufficient_amount":
      return "La tarjeta no tiene fondos suficientes. Probá con otra.";
    case "cc_rejected_bad_filled_card_number":
      return "Revisá el número de tarjeta.";
    case "cc_rejected_bad_filled_security_code":
      return "Revisá el código de seguridad (CVV).";
    case "cc_rejected_bad_filled_date":
      return "Revisá la fecha de vencimiento.";
    case "cc_rejected_call_for_authorize":
      return "Tenés que autorizar el pago con tu banco. Llamalos o probá otra tarjeta.";
    case "cc_rejected_high_risk":
      return "El pago fue rechazado por seguridad. Probá con otro medio de pago.";
    case "cc_rejected_max_attempts":
      return "Alcanzaste el máximo de intentos. Probá con otra tarjeta.";
    default:
      return null;
  }
}
