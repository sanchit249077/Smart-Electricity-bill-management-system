import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Card, StatusBadge, EmptyState, StatCard } from '@/components/widgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Zap, Plus, MapPin, Clock, Activity } from 'lucide-react';

export default function Outages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [outages, setOutages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ area: user?.area || '', reason: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try { setOutages(await base44.entities.Outage.list('-created_date', 50)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const report = async () => {
    if (!form.area.trim()) return;
    try {
      await base44.entities.Outage.create({
        area: form.area.trim(),
        reason: form.reason.trim(),
        reported_by: user.id,
        reported_by_name: user.full_name,
        start_time: new Date().toISOString(),
        status: 'active',
      });
      toast({ title: 'Power cut reported', description: 'Our team has been notified.' });
      setOpen(false);
      setForm({ area: user?.area || '', reason: '' });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not report outage', description: e?.message || 'Please try again.' });
    }
  };

  const resolve = async (o) => {
    try {
      await base44.entities.Outage.update(o.id, { status: 'resolved', end_time: new Date().toISOString() });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not resolve outage', description: e?.message || 'Please try again.' });
    }
  };

  const active = outages.filter((o) => o.status === 'active');
  const resolved = outages.filter((o) => o.status === 'resolved');
  const totalDowntimeMin = resolved.reduce((s, o) => {
    if (!o.end_time) return s;
    return s + (new Date(o.end_time) - new Date(o.start_time)) / 60000;
  }, 0);
  const reliability = outages.length ? Math.max(0, Math.round(100 - (totalDowntimeMin / (outages.length * 60)) * 100)) : 100;

  const byArea = {};
  outages.forEach((o) => { byArea[o.area] = (byArea[o.area] || 0) + 1; });

  return (
    <div>
      <PageHeader
        title="Power Outage Monitoring"
        description="Report power cuts and track outage statistics in your area."
        action={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Report Outage</Button>}
      />

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Zap} label="Active Outages" value={active.length} accent="red" />
        <StatCard icon={Clock} label="Total Downtime" value={`${Math.round(totalDowntimeMin)} min`} sub={`${resolved.length} resolved`} accent="amber" />
        <StatCard icon={Activity} label="Reliability Score" value={`${reliability}%`} accent="green" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Recent Outages</h3>
          {outages.length === 0 ? (
            <EmptyState icon={Zap} title="No outages reported" />
          ) : (
            <div className="space-y-3">
              {outages.slice(0, 10).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2"><MapPin className="h-4 w-4 text-blue-600" /></div>
                    <div>
                      <p className="text-sm font-medium">{o.area}</p>
                      <p className="text-xs text-muted-foreground">{o.reason || 'No reason specified'} · {new Date(o.start_time).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    {o.status === 'active' && user?.role !== 'user' && (
                      <Button variant="outline" size="sm" onClick={() => resolve(o)}>Resolve</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Area-wise Statistics</h3>
          {Object.keys(byArea).length === 0 ? (
            <EmptyState icon={MapPin} title="No data" />
          ) : (
            <div className="space-y-3">
              {Object.entries(byArea).sort((a, b) => b[1] - a[1]).map(([area, count]) => (
                <div key={area}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{area}</span><span className="text-muted-foreground">{count}</span></div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(count / Math.max(...Object.values(byArea))) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report a Power Outage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Your Area</Label><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Sector 14" /></div>
            <div><Label>Reason (optional)</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Describe what happened…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={report} disabled={!form.area}>Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}