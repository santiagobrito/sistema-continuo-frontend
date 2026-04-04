"use client";

import { useEffect, useCallback } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface Props {
  onSuccess: (data: { user: { id: number; email: string; name: string }; isNew: boolean }) => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleLoginButton({ onSuccess, onError }: Props) {
  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();

        if (!res.ok) {
          onError?.(data.error || "Error con Google");
          return;
        }

        onSuccess({ user: data.user, isNew: data.isNew });
      } catch {
        onError?.("Error de conexion");
      }
    },
    [onSuccess, onError],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      const container = document.getElementById("google-signin-btn");
      if (container) {
        window.google?.accounts.id.renderButton(container, {
          type: "standard",
          shape: "rectangular",
          theme: "outline",
          text: "continue_with",
          size: "large",
          width: container.offsetWidth,
          locale: "es",
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [handleCredentialResponse]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div>
      <div id="google-signin-btn" className="w-full flex justify-center" />
    </div>
  );
}
