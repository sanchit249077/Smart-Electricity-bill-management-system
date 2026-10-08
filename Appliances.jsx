import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Card, EmptyState } from '@/components/widgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Plug, Trash2, Zap, Crown } from 'lucide-react';

const TYPES = [
  { value: 'ac', label: 'Air Conditioner', icon: '❄️' },
  { value: 'fan', label: 'Fan', icon: '🌀' },
  { value: 'tv', label: 'Television', icon: '📺' },
  { value: 'refrigerator', label: 'Refrigerator', icon: '🧊' },
  { value: 'washing_machine', label: 'Washing Machine', icon: '🫧' },
  { value: 'heater', label: 'Water Heater', icon: '♨️' },
  { value: 'other', label: 'Other', icon: '🔌' },
];

export default function Appliances() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'ac', wattage: 1000, hours_per_day: 6 });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      setAppliances(await base44.entities.Appliance.filter({ customer_id: user.id }, '-monthly_units', 50));
    } catch (e) {
      setError(e?.message || 'Unable to load data.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const add = async () => {
    const wattage = Number(form.wattage);
    const hoursPerDay = Number(form.hours_per_day);
    if (!form.name.trim() || !Number.isFinite(wattage) || wattage <= 0 || !Number.isFinite(hoursPerDay) || hoursPerDay <= 0 || hoursPerDay > 24) {
      toast({ variant: 'destructive', title: 'Invalid appliance details', description: 'Enter a name, positive wattage, and 0–24 hours/day.' });
      return;
    }
    try {
      const monthly = Math.round((wattage * hoursPerDay * 30 / 1000) * 100) / 100;
      await base44.entities.Appliance.create({ ...form, customer_id: user.id, monthly_units: monthly });
      toast({ title: 'Appliance added' });
      setOpen(false);
      setForm({ name: '', type: 'ac', wattage: 1000, hours_per_day: 6 });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not add appliance', description: e?.message || 'Please try again.' });
    }
  };

  const remove = async (id) => {
    try {
      await base44.entities.Appliance.delete(id);
      setAppliances((p) => p.filter((a) => a.id !== id));
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not remove appliance', description: e?.message || 'Please try again.' });
    }
  };

  const sorted = [...appliances].sort((a, b) => (b.monthly_units || 0) - (a.monthly_units || 0));
  const top = sorted[0];

  return (
    <div>
      <PageHeader
        title="Appliance Monitoring"
        description="Track energy usage of your household appliances."
        action={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Appliance</Button>}
      />

      {top && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Highest Energy Consumer</p>
              <p className="text-xs text-amber-700 dark:text-amber-400/80">{top.name} uses {top.monthly_units} kWh/month — consider replacing or optimizing it.</p>
            </div>
          </div>
        </Card>
      )}

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>}

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      ) : appliances.length === 0 ? (
        <EmptyState icon={Plug} title="No appliances yet" description="Add your appliances to monitor their energy consumption." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a) => {
            const t = TYPES.find((x) => x.value === a.type) || TYPES[6];
            return (
              <Card key={a.id} className="group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-xl">{t.icon}</div>
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{t.label}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)} className="opacity-0 transition group-hover:opacity-100">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-xs text-muted-foreground">Wattage</p>
                    <p className="text-sm font-semibold">{a.wattage}W</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-xs text-muted-foreground">Hrs/day</p>
                    <p className="text-sm font-semibold">{a.hours_per_day}</p>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="text-sm font-semibold text-blue-600">{a.monthly_units} kWh</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plug className="h-5 w-5 text-blue-600" /> Add Appliance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Living Room AC" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Wattage (W)</Label><Input type="number" value={form.wattage} onChange={(e) => setForm({ ...form, wattage: +e.target.value })} /></div>
              <div><Label>Hours/day</Label><Input type="number" value={form.hours_per_day} onChange={(e) => setForm({ ...form, hours_per_day: +e.target.value })} /></div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-500/10">
              <Zap className="mr-1 inline h-4 w-4 text-blue-600" />
              Estimated monthly usage: <span className="font-semibold">{Math.round(form.wattage * form.hours_per_day * 30 / 1000)} kWh</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={!form.name}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}