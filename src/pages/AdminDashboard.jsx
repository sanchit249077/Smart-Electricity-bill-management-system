import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PageHeader, Card, StatCard, StatusBadge, EmptyState } from '@/components/widgets';
import { formatCurrency, formatDate } from '@/lib/billing';
import { Users, IndianRupee, AlertTriangle, MessageSquare, TrendingUp, FileText, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b'];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [theft, setTheft] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setError('');
        const [b, p, c, t, u] = await Promise.all([
          base44.entities.Bill.list('-created_date', 200),
          base44.entities.Payment.list('-created_date', 200),
          base44.entities.Complaint.list('-created_date', 100),
          base44.entities.TheftAlert.list('-created_date', 100),
          base44.entities.User.list('-created_date', 200),
        ]);
        if (!active) return;
        setBills(b); setPayments(p); setComplaints(c); setTheft(t); setUsers(u);
      } catch (e) {
        if (active) setError(e?.message || 'Unable to load admin data.');
      } finally { if (active) setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading admin dashboard…</div>;
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>;

  const revenue = payments.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0);
  const outstanding = bills.filter((b) => b.status !== 'paid').reduce((s, b) => s + (b.total_amount - (b.amount_paid || 0)), 0);
  const openComplaints = complaints.filter((c) => c.status === 'open' || c.status === 'in_progress').length;
  const openTheft = theft.filter((t) => t.status === 'open' || t.status === 'investigating').length;
  const customers = users.filter((u) => u.role === 'user');

  // Monthly revenue
  const monthly = {};
  payments.forEach((p) => {
    if (p.status !== 'success') return;
    const d = new Date(p.payment_date || p.created_date);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0) + Number(p.amount || 0);
  });
  const revData = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([key, amount]) => ({ name: new Date(`${key}-01T00:00:00`).toLocaleString('en-IN', { month: 'short', year: '2-digit' }), amount }));

  // Category split
  const catCount = { residential: 0, agricultural: 0, industrial: 0 };
  customers.forEach((u) => { catCount[u.category || 'residential']++; });
  const catData = Object.entries(catCount).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader title="Admin Panel" description="Overview of revenue, customers, complaints, and theft alerts." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={IndianRupee} label="Total Revenue" value={formatCurrency(revenue)} sub="collected" accent="green" />
        <StatCard icon={FileText} label="Outstanding" value={formatCurrency(outstanding)} sub="unpaid bills" accent="red" />
        <StatCard icon={Users} label="Customers" value={customers.length} sub={`${users.length} total users`} accent="blue" />
        <StatCard icon={AlertTriangle} label="Open Theft Alerts" value={openTheft} accent="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Revenue Collection</h3>
          {revData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={TrendingUp} title="No revenue data yet" />}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Customer Categories</h3>
          {catData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={Users} title="No customers yet" />}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Recent Complaints</h3>
          {complaints.length === 0 ? <EmptyState icon={MessageSquare} title="No complaints" /> : (
            <div className="space-y-2">
              {complaints.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{c.subject}</p>
                    <p className="text-xs text-muted-foreground">{c.customer_name} · {formatDate(c.created_date)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Theft Alerts</h3>
          {theft.length === 0 ? <EmptyState icon={Zap} title="No theft alerts" /> : (
            <div className="space-y-2">
              {theft.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{t.customer_name || 'Customer'}</p>
                    <p className="text-xs text-muted-foreground">+{t.consumption_spike_percentage}% spike · {t.detected_by}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}