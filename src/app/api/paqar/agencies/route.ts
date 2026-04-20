/**
 * GET /api/paqar/agencies?state=<ProvinceCode>&q=<search>
 *
 * Lista las sucursales de Correo Argentino habilitadas para recibir paquetes,
 * filtradas por provincia (obligatorio) y opcionalmente por texto.
 *
 * Proxy directo a /v1/agencies con cache 1h (las sucursales rara vez cambian).
 * Devuelve una forma simplificada para el selector del checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { paqarClient } from "@/lib/paqar/client";
import { isValidProvinceCode } from "@/lib/paqar/provinces";
import type { PaqarAgency } from "@/lib/paqar/types";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") || "";
  const q = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase();

  if (!isValidProvinceCode(state)) {
    return NextResponse.json(
      { error: `state inválido: ${state}` },
      { status: 400 }
    );
  }

  try {
    const agencies = await paqarClient.getAgencies({
      stateId: state,
      package_reception: true,
    });

    const simplified = agencies.map((a: PaqarAgency) => ({
      id: a.agency_id,
      name: a.agency_name,
      address: `${a.location.street_name} ${a.location.street_number}`.trim(),
      city: a.location.city_name,
      zip: a.location.zip_code,
      schedule: a.schedule,
    }));

    const filtered = q
      ? simplified.filter((a) => {
          const hay = `${a.name} ${a.address} ${a.city} ${a.zip}`.toLowerCase();
          return hay.includes(q);
        })
      : simplified;

    return NextResponse.json({
      ok: true,
      count: filtered.length,
      agencies: filtered,
    });
  } catch (err) {
    console.error("[paqar/agencies]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}
