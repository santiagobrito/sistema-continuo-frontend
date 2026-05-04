import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

export interface CampaignReportRow {
  campaign: string;
  orders: number;
  revenue: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversionRate: number;
  roas: number;
}

export interface CampaignGroupTotals {
  impressions: number;
  clicks: number;
  cost: number;
  orders: number;
  revenue: number;
  roas: number;
  ctr: number;
}

export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  totals: {
    ordersTotal: number;
    revenueTotal: number;
    ordersAttributed: number;
    revenueAttributed: number;
    cost: number;
    roas: number;
    impressions: number;
    clicks: number;
    ctr: number;
  };
  byCampaignMarca: CampaignReportRow[];
  byCampaignCaptacion: CampaignReportRow[];
  totalsMarca: CampaignGroupTotals;
  totalsCaptacion: CampaignGroupTotals;
  individualOrders: {
    number: string;
    date: string;
    total: number;
    campaign: string;
  }[];
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },

  brandBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "2 solid #dc2626",
    paddingBottom: 12,
    marginBottom: 18,
  },
  brandName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 9,
    color: "#666",
  },
  reportType: {
    fontSize: 10,
    textAlign: "right",
    color: "#666",
  },
  reportTypeBold: {
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    fontSize: 11,
  },

  titleBlock: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#666",
  },

  sectionLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginTop: 14,
    marginBottom: 2,
  },
  groupSubtitle: {
    fontSize: 9,
    color: "#888",
    marginBottom: 6,
  },
  emptyGroup: {
    fontSize: 9,
    color: "#999",
    fontStyle: "italic",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  kpisGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: -6,
    marginRight: -6,
    marginBottom: 8,
  },
  kpiCard: {
    width: "25%",
    paddingLeft: 6,
    paddingRight: 6,
    marginBottom: 10,
  },
  kpiCardInner: {
    backgroundColor: "#f7f7f7",
    borderRadius: 4,
    padding: 10,
    minHeight: 56,
    borderLeft: "3 solid #dc2626",
  },
  kpiLabel: {
    fontSize: 7,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
  },
  kpiSub: {
    fontSize: 8,
    color: "#888",
    marginTop: 2,
  },

  table: {
    borderTop: "1 solid #e5e5e5",
    borderBottom: "1 solid #e5e5e5",
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#fafafa",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: "1 solid #e5e5e5",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: "0.5 solid #eee",
  },
  tableRowAlt: {
    backgroundColor: "#fbfbfb",
  },
  th: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  td: {
    fontSize: 9,
  },
  tdBold: {
    fontFamily: "Helvetica-Bold",
  },
  colName: { width: "30%" },
  colRight: { textAlign: "right" },
  colCenter: { textAlign: "center" },

  totalsRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fef2f2",
    borderTop: "1 solid #fca5a5",
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#999",
    borderTop: "0.5 solid #e5e5e5",
    paddingTop: 6,
  },
});

const pesoARS = (v: number) =>
  "$" + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
const pct = (v: number, digits = 1) =>
  (v * 100).toLocaleString("es-AR", { maximumFractionDigits: digits }) + "%";
const num = (v: number) => v.toLocaleString("es-AR", { maximumFractionDigits: 0 });

function fmtFechaCorta(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

function CampaignGroupTable({
  title,
  subtitle,
  rows,
  totals,
}: {
  title: string;
  subtitle: string;
  rows: CampaignReportRow[];
  totals: CampaignGroupTotals;
}) {
  return (
    <View>
      <Text style={styles.groupTitle}>{title}</Text>
      <Text style={styles.groupSubtitle}>{subtitle}</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colName]}>Campaña</Text>
          <Text style={[styles.th, { width: "9%" }, styles.colCenter]}>Impr.</Text>
          <Text style={[styles.th, { width: "9%" }, styles.colCenter]}>Clicks</Text>
          <Text style={[styles.th, { width: "12%" }, styles.colRight]}>Inversión</Text>
          <Text style={[styles.th, { width: "8%" }, styles.colCenter]}>Ventas</Text>
          <Text style={[styles.th, { width: "14%" }, styles.colRight]}>Revenue</Text>
          <Text style={[styles.th, { width: "8%" }, styles.colCenter]}>CVR</Text>
          <Text style={[styles.th, { width: "10%" }, styles.colRight]}>ROAS</Text>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.emptyGroup}>Sin campañas activas en esta categoría durante la semana.</Text>
        ) : (
          rows.map((row, i) => (
            <View
              key={row.campaign}
              style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.td, styles.colName, styles.tdBold]}>
                {row.campaign.slice(0, 40)}
              </Text>
              <Text style={[styles.td, { width: "9%" }, styles.colCenter]}>
                {num(row.impressions)}
              </Text>
              <Text style={[styles.td, { width: "9%" }, styles.colCenter]}>
                {num(row.clicks)}
              </Text>
              <Text style={[styles.td, { width: "12%" }, styles.colRight]}>
                {pesoARS(row.cost)}
              </Text>
              <Text style={[styles.td, { width: "8%" }, styles.colCenter]}>
                {row.orders}
              </Text>
              <Text style={[styles.td, { width: "14%" }, styles.colRight, styles.tdBold]}>
                {pesoARS(row.revenue)}
              </Text>
              <Text style={[styles.td, { width: "8%" }, styles.colCenter]}>
                {row.conversionRate > 0 ? pct(row.conversionRate) : "—"}
              </Text>
              <Text
                style={[
                  styles.td,
                  { width: "10%" },
                  styles.colRight,
                  styles.tdBold,
                  { color: row.roas >= 5 ? "#16a34a" : row.roas >= 1 ? "#ca8a04" : "#dc2626" },
                ]}
              >
                {row.roas > 0 ? row.roas.toFixed(1) + "x" : "—"}
              </Text>
            </View>
          ))
        )}

        {rows.length > 0 && (
          <View style={styles.totalsRow}>
            <Text style={[styles.td, styles.colName, styles.tdBold]}>SUBTOTAL</Text>
            <Text style={[styles.td, { width: "9%" }, styles.colCenter, styles.tdBold]}>
              {num(totals.impressions)}
            </Text>
            <Text style={[styles.td, { width: "9%" }, styles.colCenter, styles.tdBold]}>
              {num(totals.clicks)}
            </Text>
            <Text style={[styles.td, { width: "12%" }, styles.colRight, styles.tdBold]}>
              {pesoARS(totals.cost)}
            </Text>
            <Text style={[styles.td, { width: "8%" }, styles.colCenter, styles.tdBold]}>
              {totals.orders}
            </Text>
            <Text style={[styles.td, { width: "14%" }, styles.colRight, styles.tdBold]}>
              {pesoARS(totals.revenue)}
            </Text>
            <Text style={[styles.td, { width: "8%" }, styles.colCenter, styles.tdBold]}>
              —
            </Text>
            <Text style={[styles.td, { width: "10%" }, styles.colRight, styles.tdBold]}>
              {totals.roas > 0 ? totals.roas.toFixed(1) + "x" : "—"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function AdsWeeklyReportPDF({ data }: { data: WeeklyReportData }) {
  const periodo = `${fmtFechaCorta(data.weekStart)} – ${fmtFechaCorta(data.weekEnd)}`;
  const attributionRate =
    data.totals.ordersTotal > 0
      ? data.totals.ordersAttributed / data.totals.ordersTotal
      : 0;

  return (
    <Document
      title={`Sistema Continuo – Reporte Ads ${periodo}`}
      author="Sistema Continuo"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar}>
          <View>
            <Text style={styles.brandName}>SISTEMA CONTINUO</Text>
            <Text style={styles.brandSub}>
              sistemacontinuo.com.ar · Google Ads performance
            </Text>
          </View>
          <View>
            <Text style={styles.reportType}>Reporte semanal</Text>
            <Text style={styles.reportTypeBold}>{periodo}</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Ventas por campaña</Text>
          <Text style={styles.subtitle}>
            Cruce WooCommerce + Google Ads por gclid. Fuente de verdad:
            revenue real de pedidos atribuidos a clicks de Ads.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Resumen de la semana</Text>

        <View style={styles.kpisGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardInner}>
              <Text style={styles.kpiLabel}>Ventas atribuidas a Ads</Text>
              <Text style={styles.kpiValue}>
                {pesoARS(data.totals.revenueAttributed)}
              </Text>
              <Text style={styles.kpiSub}>
                {num(data.totals.ordersAttributed)} pedidos
              </Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiCardInner}>
              <Text style={styles.kpiLabel}>Inversión Ads</Text>
              <Text style={styles.kpiValue}>{pesoARS(data.totals.cost)}</Text>
              <Text style={styles.kpiSub}>
                {num(data.totals.clicks)} clicks · {num(data.totals.impressions)} impr.
              </Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiCardInner}>
              <Text style={styles.kpiLabel}>ROAS real</Text>
              <Text style={styles.kpiValue}>
                {data.totals.roas.toFixed(1)}x
              </Text>
              <Text style={styles.kpiSub}>
                {data.totals.roas > 5
                  ? "por cada $1 invertido, $" + data.totals.roas.toFixed(1) + " de venta"
                  : "revisar campañas con CPA alto"}
              </Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiCardInner}>
              <Text style={styles.kpiLabel}>CTR</Text>
              <Text style={styles.kpiValue}>{pct(data.totals.ctr, 2)}</Text>
              <Text style={styles.kpiSub}>
                {num(data.totals.ordersTotal)} ventas totales en WC
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Detalle por campaña</Text>

        <CampaignGroupTable
          title="Captación — tráfico nuevo"
          subtitle="Shopping, Search genéricas, competidores. ROAS real de adquisición."
          rows={data.byCampaignCaptacion}
          totals={data.totalsCaptacion}
        />

        <CampaignGroupTable
          title="Marca — tráfico que ya te conocía"
          subtitle="ROAS infla por audiencia caliente. Mide retención + asistencia, no adquisición."
          rows={data.byCampaignMarca}
          totals={data.totalsMarca}
        />

        {data.individualOrders.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              Pedidos atribuidos ({data.individualOrders.length})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: "15%" }]}>Pedido</Text>
                <Text style={[styles.th, { width: "20%" }]}>Fecha</Text>
                <Text style={[styles.th, { width: "45%" }]}>Campaña</Text>
                <Text style={[styles.th, { width: "20%" }, styles.colRight]}>Total</Text>
              </View>
              {data.individualOrders.slice(0, 20).map((o, i) => (
                <View
                  key={o.number}
                  style={[
                    styles.tableRow,
                    i % 2 === 1 ? styles.tableRowAlt : {},
                  ]}
                >
                  <Text style={[styles.td, { width: "15%" }, styles.tdBold]}>
                    #{o.number}
                  </Text>
                  <Text style={[styles.td, { width: "20%" }]}>
                    {fmtFechaCorta(o.date)}
                  </Text>
                  <Text style={[styles.td, { width: "45%" }]}>
                    {o.campaign.slice(0, 44)}
                  </Text>
                  <Text style={[styles.td, { width: "20%" }, styles.colRight, styles.tdBold]}>
                    {pesoARS(o.total)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.footer} fixed>
          <Text>
            Atribución: {pct(attributionRate, 0)} de pedidos tienen gclid
            · {num(data.totals.ordersTotal - data.totals.ordersAttributed)} sin atribución Ads
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
