"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Printer } from "lucide-react";
import { useLookups, useScoped } from "@/hooks/use-data";
import { CASE_CATEGORY, PIPELINE } from "@/domain/constants";
import { Guard } from "@/components/layout/guard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard, PageHeader } from "@/components/ui/misc";
import { Select } from "@/components/ui/form";
import { AXIS, ChartTooltip, GRID, Legend, SERIES } from "@/components/charts/chart-kit";
import { downloadFile, money, moneyShort, toCSV } from "@/lib/utils";

export default function AnalyticsPage() {
  return <Guard perm="analytics.view"><Analytics /></Guard>;
}

const MONTHS = ["dic", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov"];
const BASE = { casos: [42, 38, 45, 51, 48, 55, 60, 58, 63, 67, 71, 74], cerrados: [36, 35, 40, 44, 45, 49, 52, 55, 57, 60, 66, 69] };

function Analytics() {
  const { users, insurers, lines } = useLookups();
  const cases = useScoped("cases");
  const policies = useScoped("policies");
  const opps = useScoped("opportunities");
  const commissions = useScoped("commissions");
  const [period, setPeriod] = useState("12");
  const [advisor, setAdvisor] = useState("all");
  const [insurer, setInsurer] = useState("all");
  const [line, setLine] = useState("all");
  const [channel, setChannel] = useState("all");

  const f = useMemo(() => ({
    cases: cases.filter((c) => (advisor === "all" || c.assigneeId === advisor) && (line === "all" || c.lineId === line) && (channel === "all" || c.channel === channel)),
    policies: policies.filter((p) => (insurer === "all" || p.insurerId === insurer) && (line === "all" || p.lineId === line)),
    opps: opps.filter((o) => (advisor === "all" || o.ownerId === advisor) && (line === "all" || o.lineId === line)),
  }), [cases, policies, opps, advisor, insurer, line, channel]);

  const n = Number(period);
  const factor = f.cases.length / Math.max(1, cases.length);
  const trend = MONTHS.slice(-n).map((m, i) => ({ mes: m, Recibidos: Math.round(BASE.casos.slice(-n)[i] * factor), Cerrados: Math.round(BASE.cerrados.slice(-n)[i] * factor) }));
  const byInsurer = [...insurers.values()].map((i) => ({ name: i.short, prima: f.policies.filter((p) => p.insurerId === i.id).reduce((s, p) => s + p.premium, 0) })).filter((x) => x.prima);
  const byLine = [...lines.values()].map((l) => ({ name: l.name, prima: f.policies.filter((p) => p.lineId === l.id).reduce((s, p) => s + p.premium, 0) })).filter((x) => x.prima).sort((a, b) => b.prima - a.prima);
  const byCat = Object.entries(CASE_CATEGORY).map(([k, v]) => ({ name: v.label, casos: f.cases.filter((c) => c.category === k).length })).filter((x) => x.casos);
  const won = f.opps.filter((o) => o.stage === "ganado").length;
  const lost = f.opps.filter((o) => o.stage === "perdido").length;

  const exportCsv = () => {
    downloadFile("informe_gerencial_gc360.csv", toCSV([
      ...byInsurer.map((x) => ({ Dimensión: "Aseguradora", Valor: x.name, Prima: x.prima })),
      ...byLine.map((x) => ({ Dimensión: "Ramo", Valor: x.name, Prima: x.prima })),
      ...byCat.map((x) => ({ Dimensión: "Tipo de caso", Valor: x.name, Prima: x.casos })),
    ]));
    toast.success("Informe exportado (CSV compatible con Excel)");
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Analítica e informes" description="Indicadores por periodo, asesor, aseguradora, ramo y canal." actions={<><Button variant="secondary" onClick={() => window.print()}><Printer /> PDF</Button><Button variant="secondary" onClick={exportCsv}><Download /> Excel</Button></>} />

      <Card className="no-print mb-5 flex flex-wrap items-center gap-2 p-3">
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-8 w-36 text-xs"><option value="3">Últimos 3 meses</option><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></Select>
        <Select value={advisor} onChange={(e) => setAdvisor(e.target.value)} className="h-8 w-44 text-xs"><option value="all">Todos los responsables</option>{[...users.values()].filter((u) => ["asesor", "operaciones", "financiero"].includes(u.role)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
        <Select value={insurer} onChange={(e) => setInsurer(e.target.value)} className="h-8 w-40 text-xs"><option value="all">Todas las aseguradoras</option>{[...insurers.values()].map((i) => <option key={i.id} value={i.id}>{i.short}</option>)}</Select>
        <Select value={line} onChange={(e) => setLine(e.target.value)} className="h-8 w-44 text-xs"><option value="all">Todos los ramos</option>{[...lines.values()].map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="h-8 w-40 text-xs"><option value="all">Todos los canales</option>{["whatsapp", "email", "outlook", "llamada", "web"].map((c) => <option key={c} value={c}>{c}</option>)}</Select>
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Casos en el filtro" value={f.cases.length} tone="blue" />
        <KpiCard label="Prima administrada" value={moneyShort(f.policies.reduce((s, p) => s + p.premium, 0))} tone="green" />
        <KpiCard label="Tasa de cierre" value={`${won + lost ? Math.round((won / (won + lost)) * 100) : 0}%`} tone="teal" hint={`${won} ganadas · ${lost} perdidas`} />
        <KpiCard label="Pipeline activo" value={moneyShort(f.opps.filter((o) => !["ganado", "perdido"].includes(o.stage)).reduce((s, o) => s + o.value, 0))} tone="amber" />
        <KpiCard label="Comisión registrada" value={moneyShort(commissions.reduce((s, c) => s + c.amount, 0))} tone="teal" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Casos recibidos vs. cerrados" description="Tendencia mensual" action={<Legend items={[{ label: "Recibidos", color: SERIES[0] }, { label: "Cerrados", color: SERIES[2] }]} />} />
          <CardContent className="h-64">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="mes" {...AXIS} />
                <YAxis {...AXIS} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#cbd5e1" }} />
                <Line type="monotone" dataKey="Recibidos" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Cerrados" stroke={SERIES[2]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Prima por aseguradora" />
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={byInsurer} margin={{ left: -6, right: 8 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="name" {...AXIS} />
                <YAxis {...AXIS} tickFormatter={(v) => moneyShort(v)} />
                <Tooltip content={<ChartTooltip format={money} />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="prima" name="Prima" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Prima por ramo" />
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={byLine} layout="vertical" margin={{ left: 20, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" {...AXIS} width={150} />
                <Tooltip content={<ChartTooltip format={money} />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="prima" name="Prima" fill={SERIES[0]} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Oportunidades por etapa" />
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={PIPELINE.map((s) => ({ name: s.label, n: f.opps.filter((o) => o.stage === s.key).length }))} margin={{ left: -20, right: 8 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="name" {...AXIS} interval={0} tick={{ fontSize: 10 }} />
                <YAxis {...AXIS} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="n" name="Oportunidades" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
