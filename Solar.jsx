import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Card, StatCard, EmptyState } from '@/components/widgets';
import { formatCurrency } from '@/lib/billing';
import { sortByYearMonth } from '@/lib/series';
import { Sun, Zap, TrendingUp, Leaf } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function Solar() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    base44.entities.SolarData.filter({ customer_id: user.id }, '-year', 24)
      .then((r) => { if (active) setData(sortByYearMonth(r)); })
      .catch((e) => { if (active) setError(e?.message || 'Unable to load solar data.'); })
      .finally(() => { if (active) setLoading(false); });
  }, [user]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading solar data…</div>;

  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>;

  const totalGen = data.reduce((s, d) => s + d.units_generated, 0);
  const totalExp = data.reduce((s, d) => s + (d.units_exported || 0), 0);
  const totalImp = data.reduce((s, d) => s + (d.units_imported || 0), 0);
  const totalSavings = data.reduce((s, d) => s + (d.savings || 0), 0);
  const netConsumption = totalImp - totalExp;
  const greenScore = totalGen > 0 ? Math.min(100, Math.round((totalExp / (totalImp || 1)) * 100)) : 0;

  const chartData = data.map((d) => ({
    name: d.month,
    Generated: d.units_generated,
    Exported: d.units_exported || 0,
    Imported: d.units_imported || 0,
  }));

  return (
    <div>
      <PageHeader title="Solar Net Metering" description="Track your solar generation, exports, and green energy impact." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Sun} label="Total Generated" value={`${totalGen} kWh`} sub="all time" accent="amber" />
        <StatCard icon={Zap} label="Units Exported" value={`${totalExp} kWh`} sub="to grid" accent="green" />
        <StatCard icon={TrendingUp} label="Net Consumption" value={`${netConsumption} kWh`} sub="imported - exported" accent="blue" />
        <StatCard icon={Leaf} label="Total Savings" value={formatCurrency(totalSavings)} sub="from solar" accent="green" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Solar Generation vs Grid Interaction</h3>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Generated" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Exported" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Imported" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={Sun} title="No solar data yet" description="Solar generation data will appear here." />}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Green Energy Score</h3>
          <div className="flex flex-col items-center">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="#10b981" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(greenScore / 100) * 327} 327`} />
              </svg>
              <div className="absolute text-center">
                <p className="text-3xl font-bold text-emerald-600">{greenScore}</p>
                <p className="text-xs text-muted-foreground">/ 100</p>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {greenScore >= 70 ? 'Excellent! You\'re a green energy champion.' : greenScore >= 40 ? 'Good progress — keep exporting more to the grid.' : 'Add more solar capacity to improve your score.'}
            </p>
            <div className="mt-4 w-full rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-500/5">
              <Leaf className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">You saved {formatCurrency(totalSavings)} and reduced your carbon footprint.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}