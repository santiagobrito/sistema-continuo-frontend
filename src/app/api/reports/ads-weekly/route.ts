import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  AdsWeeklyReportPDF,
  type WeeklyReportData,
  type CampaignReportRow,
} from "@/lib/reports/ads-weekly-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";
const WP_URL = process.env.WP_URL || "https://api.sistemacontinuo.com.ar";
const WC_API_AUTH = process.env.WC_API_AUTH || ""; // base64 de "user:app_password"
const WP_USER = process.env.WP_USER || "scadmin";
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || "";

const GADS_DEVELOPER_TOKEN = process.env.GADS_DEVELOPER_TOKEN || "";
const GADS_CLIENT_ID = process.env.GADS_CLIENT_ID || "";
const GADS_CLIENT_SECRET = process.env.GADS_CLIENT_SECRET || "";
const GADS_REFRESH_TOKEN = process.env.GADS_REFRESH_TOKEN || "";
const GADS_LOGIN_CUSTOMER_ID = process.env.GADS_LOGIN_CUSTOMER_ID || "3295205058";
const GADS_CUSTOMER_ID = process.env.GADS_CUSTOMER_ID || "5157547021";

function wcAuth() {
  if (WC_API_AUTH) return "Basic " + WC_API_AUTH;
  return "Basic " + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");
}

interface WCOrder {
  id: number;
  number: string;
  total: string;
  status: string;
  currency?: string;
  date_created: string;
  date_completed?: string;
  date_modified: string;
  meta_data?: { key: string; value: string }[];
}

interface OrderRow {
  id: number;
  number: string;
  total: number;
  date: string;
  gclid: string | null;
}

function weekRangeUTC(weekParam?: string | null): { start: Date; end: Date } {
  // weekParam:
  //   "previous" (default) → lunes-domingo de la semana pasada (ART → UTC).
  //   "current"            → lunes de esta semana hasta ahora.
  //   "YYYY-MM-DD:YYYY-MM-DD" → rango explícito en ART.
  const now = new Date();
  const artNow = new Date(now.getTime() - 3 * 3600 * 1000);
  const dayOfWeek = artNow.getUTCDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const thisMondayArt = new Date(Date.UTC(
    artNow.getUTCFullYear(), artNow.getUTCMonth(), artNow.getUTCDate() - diffToMonday, 0, 0, 0
  ));

  if (weekParam === "current") {
    const start = new Date(thisMondayArt.getTime() + 3 * 3600 * 1000);
    return { start, end: now };
  }

  if (weekParam && /^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    const [s, e] = weekParam.split(":");
    // Interpretar en ART, convertir a UTC.
    const start = new Date(`${s}T00:00:00-03:00`);
    const end = new Date(`${e}T23:59:59-03:00`);
    return { start, end };
  }

  // Default: previous
  const prevMonday = new Date(thisMondayArt.getTime() - 7 * 86400 * 1000);
  const prevSundayEnd = new Date(thisMondayArt.getTime() - 1);
  const start = new Date(prevMonday.getTime() + 3 * 3600 * 1000);
  const end = new Date(prevSundayEnd.getTime() + 3 * 3600 * 1000);
  return { start, end };
}

async function fetchOrdersInRange(startIso: string, endIso: string): Promise<OrderRow[]> {
  const rows: OrderRow[] = [];
  let page = 1;
  while (true) {
    const url = `${WP_URL}/wp-json/wc/v3/orders?status=processing,completed&after=${encodeURIComponent(
      startIso
    )}&before=${encodeURIComponent(endIso)}&per_page=50&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: wcAuth() },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`WC ${res.status}`);
    const batch: WCOrder[] = await res.json();
    if (batch.length === 0) break;
    for (const o of batch) {
      const meta = o.meta_data || [];
      // Las órdenes migradas de Kinsta tienen date_created = día de import (~2026-04-21)
      // pero no pasan por el frontend y por eso no tienen _wc_order_attribution_source_type.
      // Filtramos a órdenes reales del nuevo checkout.
      const hasAttribution = meta.some((m) => m.key === "_wc_order_attribution_source_type");
      if (!hasAttribution) continue;
      const gclid = meta.find((m) => m.key === "_gclid")?.value || null;
      rows.push({
        id: o.id,
        number: o.number,
        total: parseFloat(o.total),
        date: o.date_completed || o.date_modified || o.date_created,
        gclid,
      });
    }
    if (batch.length < 50) break;
    page++;
  }
  return rows;
}

async function getAdsAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GADS_CLIENT_ID,
      client_secret: GADS_CLIENT_SECRET,
      refresh_token: GADS_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`OAuth ${res.status}`);
  return (await res.json()).access_token as string;
}

interface AdsCampaignRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
}

async function adsSearch(accessToken: string, gaql: string) {
  const url = `https://googleads.googleapis.com/v23/customers/${GADS_CUSTOMER_ID}/googleAds:search`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": GADS_DEVELOPER_TOKEN,
      "login-customer-id": GADS_LOGIN_CUSTOMER_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: gaql }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Ads search ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return (data.results || []) as any[];
}

function fmtDateYMD(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

async function fetchAdsCampaignPerf(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Map<string, AdsCampaignRow>> {
  const q = `
    SELECT campaign.id, campaign.name, campaign.advertising_channel_type,
           metrics.impressions, metrics.clicks, metrics.cost_micros,
           metrics.conversions, metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.impressions > 0
  `;
  const rows = await adsSearch(accessToken, q);
  const map = new Map<string, AdsCampaignRow>();
  for (const r of rows) {
    const cid = String(r.campaign.id);
    map.set(cid, {
      campaignId: cid,
      campaignName: r.campaign.name,
      impressions: Number(r.metrics?.impressions || 0),
      clicks: Number(r.metrics?.clicks || 0),
      cost: Number(r.metrics?.costMicros || 0) / 1_000_000,
      conversions: Number(r.metrics?.conversions || 0),
      conversionsValue: Number(r.metrics?.conversionsValue || 0),
    });
  }
  return map;
}

async function resolveGclidsToCampaign(
  accessToken: string,
  gclids: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, { campaignId: string; campaignName: string; date: string }>> {
  const result = new Map<string, { campaignId: string; campaignName: string; date: string }>();
  if (gclids.length === 0) return result;

  // click_view requires single-day filter. Iteramos día por día en un rango ampliado
  // (90 días atrás) para captar clicks previos a la semana del reporte.
  const end = new Date(endDate + "T23:59:59Z");
  const lookbackStart = new Date(end.getTime() - 90 * 86400 * 1000);
  const days: string[] = [];
  for (let d = new Date(lookbackStart); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(fmtDateYMD(d));
  }

  const gclidList = gclids.map((g) => `'${g.replace(/'/g, "")}'`).join(",");

  for (const day of days) {
    if (result.size === gclids.length) break;
    try {
      const q = `
        SELECT click_view.gclid, campaign.id, campaign.name, segments.date
        FROM click_view
        WHERE segments.date = '${day}' AND click_view.gclid IN (${gclidList})
      `;
      const rows = await adsSearch(accessToken, q);
      for (const r of rows) {
        result.set(r.clickView.gclid, {
          campaignId: String(r.campaign.id),
          campaignName: r.campaign.name,
          date: r.segments.date,
        });
      }
    } catch {
      // día sin clicks para esos gclids → OK, seguir
    }
  }
  return result;
}

async function buildReport(week?: string | null): Promise<WeeklyReportData> {
  const { start, end } = weekRangeUTC(week);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const startYmd = fmtDateYMD(start);
  const endYmd = fmtDateYMD(end);

  const [orders, accessToken] = await Promise.all([
    fetchOrdersInRange(startIso, endIso),
    getAdsAccessToken(),
  ]);

  const withGclid = orders.filter((o) => !!o.gclid);
  const gclids = Array.from(new Set(withGclid.map((o) => o.gclid!).filter(Boolean)));

  const [campaignPerf, gclidResolved] = await Promise.all([
    fetchAdsCampaignPerf(accessToken, startYmd, endYmd),
    resolveGclidsToCampaign(accessToken, gclids, startYmd, endYmd),
  ]);

  // Agrupar revenue por campaign name
  const byCampaignMap = new Map<
    string,
    { campaignName: string; orders: number; revenue: number }
  >();
  for (const o of withGclid) {
    const res = gclidResolved.get(o.gclid!);
    if (!res) continue;
    const key = res.campaignName;
    const cur = byCampaignMap.get(key) || {
      campaignName: res.campaignName,
      orders: 0,
      revenue: 0,
    };
    cur.orders += 1;
    cur.revenue += o.total;
    byCampaignMap.set(key, cur);
  }

  // Merge con performance de Ads de la misma semana
  const byCampaignName = new Map<string, CampaignReportRow>();
  for (const perf of campaignPerf.values()) {
    byCampaignName.set(perf.campaignName, {
      campaign: perf.campaignName,
      impressions: perf.impressions,
      clicks: perf.clicks,
      cost: perf.cost,
      orders: 0,
      revenue: 0,
      conversionRate: 0,
      roas: 0,
    });
  }
  for (const [name, agg] of byCampaignMap.entries()) {
    const row = byCampaignName.get(name) || {
      campaign: name,
      impressions: 0,
      clicks: 0,
      cost: 0,
      orders: 0,
      revenue: 0,
      conversionRate: 0,
      roas: 0,
    };
    row.orders = agg.orders;
    row.revenue = agg.revenue;
    row.conversionRate = row.clicks > 0 ? row.orders / row.clicks : 0;
    row.roas = row.cost > 0 ? row.revenue / row.cost : 0;
    byCampaignName.set(name, row);
  }

  const byCampaign = Array.from(byCampaignName.values())
    .filter((r) => r.impressions > 0 || r.orders > 0)
    .sort((a, b) => b.revenue - a.revenue || b.cost - a.cost);

  const totals = byCampaign.reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      acc.cost += r.cost;
      acc.ordersAttributed += r.orders;
      acc.revenueAttributed += r.revenue;
      return acc;
    },
    {
      impressions: 0,
      clicks: 0,
      cost: 0,
      ordersAttributed: 0,
      revenueAttributed: 0,
    }
  );

  const revenueTotal = orders.reduce((s, o) => s + o.total, 0);

  const individualOrders = withGclid
    .map((o) => {
      const res = gclidResolved.get(o.gclid!);
      return {
        number: o.number,
        date: o.date,
        total: o.total,
        campaign: res?.campaignName || "(sin resolver)",
      };
    })
    .filter((r) => r.campaign !== "(sin resolver)")
    .sort((a, b) => b.total - a.total);

  return {
    weekStart: startIso,
    weekEnd: endIso,
    totals: {
      ordersTotal: orders.length,
      revenueTotal,
      ordersAttributed: totals.ordersAttributed,
      revenueAttributed: totals.revenueAttributed,
      cost: totals.cost,
      roas: totals.cost > 0 ? totals.revenueAttributed / totals.cost : 0,
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
    },
    byCampaign,
    individualOrders,
  };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer /, "");
  if (!INTERNAL_SECRET || token !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const week = req.nextUrl.searchParams.get("week");
    const format = req.nextUrl.searchParams.get("format") || "pdf";

    const data = await buildReport(week);

    if (format === "json") {
      return NextResponse.json(data);
    }

    const buffer = await renderToBuffer(AdsWeeklyReportPDF({ data }));
    const dateLabel = data.weekStart.slice(0, 10);
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sistema-continuo-ads-${dateLabel}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
