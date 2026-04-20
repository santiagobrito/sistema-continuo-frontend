/**
 * GET /api/paqar/agencies?state=<ProvinceCode>&q=<search>&cp=<destCp>
 *
 * Lista las sucursales de Correo Argentino habilitadas para recibir paquetes,
 * filtradas por provincia (obligatorio) y opcionalmente por texto.
 *
 * Si se pasa `cp`, el resultado viene ordenado ascendente por proximidad
 * numérica: |CP(sucursal) - CP(destino)|. Así el cliente ve primero las
 * más cercanas a su domicilio.
 *
 * Proxy directo a /v1/agencies con cache 1h (las sucursales rara vez cambian).
 * Devuelve una forma simplificada para el selector del checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { paqarClient } from "@/lib/paqar/client";
import { isValidProvinceCode } from "@/lib/paqar/provinces";
import type { PaqarAgency } from "@/lib/paqar/types";

export const revalidate = 3600;

function extractCpDigits(cp: string | null | undefined): number | null {
  if (!cp || typeof cp !== "string") return null;
  const m = cp.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") || "";
  const q = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const cp = request.nextUrl.searchParams.get("cp") || "";
  const destCpDigits = extractCpDigits(cp);

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

    let filtered = q
      ? simplified.filter((a) => {
          const hay = `${a.name} ${a.address} ${a.city} ${a.zip}`.toLowerCase();
          return hay.includes(q);
        })
      : simplified;

    if (destCpDigits !== null) {
      filtered = [...filtered].sort((a, b) => {
        const ax = extractCpDigits(a.zip);
        const bx = extractCpDigits(b.zip);
        if (ax === null && bx === null) return 0;
        if (ax === null) return 1;
        if (bx === null) return -1;
        return Math.abs(ax - destCpDigits) - Math.abs(bx - destCpDigits);
      });
    }

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
