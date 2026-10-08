import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Card, StatCard, EmptyState } from '@/components/widgets';
import { formatCurrency } from '@/lib/billing';
import { sortByYearMonth } from '@/lib/series';
import { BarChart3, TrendingUp, Zap, IndianRupee } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function Analytics() {
  const { user } = useAuth();
  const [consumption, setConsumption] = useState([]);
  const [appliances, setAppliances] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        setError('');
        const [c, a] = await Promise.all([
          base44.entities.ConsumptionData.filter({ customer_id: user.id }, '-year', 24),
          base44.entities.Appliance.filter({ customer_id: user.id }, '-monthly_units', 50),
        ]);
        if (!active) return;
        setConsumption(sortByYearMonth(c));
        setAppliances(a);
      } catch (e) {
        if (active) setError(e?.message || 'Unable to load analytics.');
      } finally {
        if (active) setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading analytics…</div>;

  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>;

  const totalUnits = consumption.reduce((s, c) => s + c.units_consumed, 0);
  const totalCost = consumption.reduce((s, c) => s + (c.cost || 0), 0);
  const avgMonthly = consumption.length ? Math.round(totalUnits / consumption.length) : 0;
  const peakMonth = consumption.reduce((max, c) => (c.units_consumed > (max?.units_consumed || 0) ? c : max), null);

  const yearlyData = {};
  consumption.forEach((c) => {
    yearlyData[c.year] = yearlyData[c.year] || { year: c.year, units: 0, cost: 0 };
    yearlyData[c.year].units += c.units_consumed;
    yearlyData[c.year].cost += c.cost || 0;
  });
  const yearlyArr = Object.values(yearlyData);

  const applianceData = appliances.map((a) => ({ name: a.name, value: Number(a.monthly_units || (a.wattage * a.hours_per_day * 30 / 1000) || 0) }));
  const totalAppliance = applianceData.reduce((s, a) => s + a.value, 0) || 1;

  return (
    <div>
      <PageHeader title="Energy Analytics" description="Deep dive into your consumption patterns and costs." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Zap} label="Total Consumption" value={`${totalUnits} kWh`} sub={`${consumption.length} months`} accent="blue" />
        <StatCard icon={IndianRupee} label="Total Spent" value={formatCurrency(totalCost)} sub="all time" accent="amber" />
        <StatCard icon={TrendingUp} label="Avg Monthly" value={`${avgMonthly} kWh`} sub="per month" accent="green" />
        <StatCard icon={BarChart3} label="Peak Month" value={peakMonth ? peakMonth.month : '—'} sub={peakMonth ? `${peakMonth.units_consumed} kWh` : ''} accent="violet" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Monthly Consumption</h3>
          {consumption.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={consumption.map((c) => ({ name: c.month, units: c.units_consumed, cost: c.cost }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="units" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart3} title="No data" />}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Yearly Trend</h3>
          {yearlyArr.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={yearlyArr}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="units" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={TrendingUp} title="No data" />}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Appliance-wise Consumption</h3>
          {applianceData.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={applianceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label>
                    {applianceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {applianceData.sort((a, b) => b.value - a.value).map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{a.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{Math.round(a.value)} kWh</span>
                      <span className="ml-2 text-xs text-muted-foreground">{Math.round((a.value / totalAppliance) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyState icon={Zap} title="No appliances added" description="Add appliances to see consumption breakdown." />}
        </Card>
      </div>
    </div>
  );
}