import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { StatCard, PageHeader, StatusBadge, Card, EmptyState } from '@/components/widgets';
import { formatCurrency, formatDate } from '@/lib/billing';
import { sortByYearMonth } from '@/lib/series';
import { Button } from '@/components/ui/button';
import { Receipt, IndianRupee, TrendingUp, Sun, Bell, FileText, ArrowRight, Zap, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [solar, setSolar] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const [b, c, s, n] = await Promise.all([
          base44.entities.Bill.filter({ customer_id: user.id }, '-created_date', 12),
          base44.entities.ConsumptionData.filter({ customer_id: user.id }, '-year', 12),
          base44.entities.SolarData.filter({ customer_id: user.id }, '-year', 12),
          base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 5),
        ]);
        if (!active) return;
        setBills(b);
        setConsumption(sortByYearMonth(c).slice(-8));
        setSolar(s);
        setNotifications(n);
      } finally {
        if (active) setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading your dashboard…</div>;

  const unpaidBills = bills.filter((b) => b.status !== 'paid');
  const totalDue = unpaidBills.reduce((s, b) => s + (b.total_amount - (b.amount_paid || 0)), 0);
  const currentBill = unpaidBills[0];
  const lastBill = bills[0];
  const prevBill = bills[1];
  const usageDelta = lastBill && prevBill && Number(prevBill.units_consumed) > 0
    ? Math.round(((Number(lastBill.units_consumed) - Number(prevBill.units_consumed)) / Number(prevBill.units_consumed)) * 100)
    : 0;
  const solarSavings = solar.reduce((s, x) => s + (x.savings || 0), 0);

  const chartData = consumption.map((c) => ({ name: c.month, units: c.units_consumed, cost: c.cost }));

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.full_name || 'Customer'}`}
        description="Here's your electricity account at a glance."
        action={
          <Button onClick={() => navigate('/bills')} className="gap-2">
            <FileText className="h-4 w-4" /> View Bills
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={IndianRupee} label="Total Outstanding" value={formatCurrency(totalDue)} sub={`${unpaidBills.length} unpaid bill(s)`} accent="red" />
        <StatCard icon={Receipt} label="Latest Bill" value={formatCurrency(lastBill?.total_amount || 0)} sub={lastBill ? formatDate(lastBill.created_date) : '—'} accent="blue" />
        <StatCard icon={TrendingUp} label="Usage Change" value={`${usageDelta > 0 ? '+' : ''}${usageDelta}%`} sub="vs previous month" accent={usageDelta > 0 ? 'amber' : 'green'} />
        <StatCard icon={Sun} label="Solar Savings" value={formatCurrency(solarSavings)} sub="all time" accent="green" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Consumption Trend</h3>
              <p className="text-xs text-muted-foreground">Monthly units consumed vs cost</p>
            </div>
          </div>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="u" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="units" stroke="#2563eb" fill="url(#u)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart} title="No consumption data yet" description="Your usage will appear here once bills are generated." />
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Current Bill Due</h3>
          {currentBill ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
                <p className="text-xs opacity-80">Bill #{currentBill.bill_number}</p>
                <p className="mt-1 text-3xl font-bold">{formatCurrency(currentBill.total_amount - (currentBill.amount_paid || 0))}</p>
                <p className="mt-1 text-xs opacity-80">Due {formatDate(currentBill.due_date)}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={currentBill.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Units consumed</span>
                <span className="font-medium">{currentBill.units_consumed} kWh</span>
              </div>
              <Button className="w-full" onClick={() => navigate('/bills')}>Pay Now <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          ) : (
            <EmptyState icon={Receipt} title="No due bills" description="You're all caught up!" />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent Notifications</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>View all</Button>
          </div>
          {notifications.length ? (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <div className="mt-0.5 rounded-lg bg-blue-500/10 p-2 text-blue-600"><Bell className="h-4 w-4" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Bell} title="No notifications" />
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Energy Saving Tip</h3>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Shift heavy loads to off-peak hours</p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400/80">
                  Running your AC, washing machine, and water heater between 10 PM and 6 AM can reduce your bill by up to 15% under time-of-use tariffs.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><AlertCircle className="h-4 w-4 text-amber-500" /> Report an issue</div>
            <p className="mt-1 text-xs text-muted-foreground">Facing a power cut or billing issue? Raise a complaint and our team will assist you.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/complaints')}>Raise Complaint</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}