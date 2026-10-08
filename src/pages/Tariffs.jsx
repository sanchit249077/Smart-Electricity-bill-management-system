import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PageHeader, Card, EmptyState } from '@/components/widgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/billing';
import { Plus, Settings, Trash2, CheckCircle2 } from 'lucide-react';

export default function Tariffs() {
  const { toast } = useToast();
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'residential', name: '', fixed_charges: 100, gst_rate: 0.18,
    slabs: [{ from: 0, to: 100, rate: 3 }, { from: 100, to: 200, rate: 5 }, { from: 200, to: null, rate: 7 }],
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setTariffs(await base44.entities.Tariff.list('-created_date', 50));
    } catch (e) {
      setError(e?.message || 'Unable to load tariff plans.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const slabs = form.slabs
      .map((s) => ({ from: Number(s.from), to: s.to == null ? null : Number(s.to), rate: Number(s.rate) }))
      .sort((a, b) => a.from - b.from);
    const invalidSlabs = slabs.length === 0 || slabs.some((s, i) => {
      const previous = slabs[i - 1];
      const missingFrom = !Number.isFinite(s.from) || s.from < 0;
      const invalidRate = !Number.isFinite(s.rate) || s.rate < 0;
      const invalidTo = s.to != null && (!Number.isFinite(s.to) || s.to <= s.from);
      const invalidGapOrOverlap = previous && previous.to != null && s.from !== previous.to;
      const openEndedBeforeLast = s.to == null && i !== slabs.length - 1;
      return missingFrom || invalidRate || invalidTo || invalidGapOrOverlap || openEndedBeforeLast;
    }) || slabs[0]?.from !== 0;
    if (!form.name.trim() || !Number.isFinite(Number(form.fixed_charges)) || Number(form.fixed_charges) < 0 || !Number.isFinite(Number(form.gst_rate)) || Number(form.gst_rate) < 0 || invalidSlabs) {
      toast({ variant: 'destructive', title: 'Invalid tariff details', description: 'Check plan name, charges, GST, and slab ranges.' });
      return;
    }
    try {
      await base44.entities.Tariff.create({ ...form, name: form.name.trim(), fixed_charges: Number(form.fixed_charges), gst_rate: Number(form.gst_rate), slabs, active: true });
      toast({ title: 'Tariff plan created' });
      setOpen(false);
      setForm({ category: 'residential', name: '', fixed_charges: 100, gst_rate: 0.18, slabs: [{ from: 0, to: 100, rate: 3 }, { from: 100, to: 200, rate: 5 }, { from: 200, to: null, rate: 7 }] });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not create tariff', description: e?.message || 'Please try again.' });
    }
  };

  const remove = async (id) => {
    try {
      await base44.entities.Tariff.delete(id);
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not delete tariff', description: e?.message || 'Please try again.' });
    }
  };

  const updateSlab = (i, field, value) => {
    const slabs = [...form.slabs];
    slabs[i] = { ...slabs[i], [field]: value === '' ? null : +value };
    setForm({ ...form, slabs });
  };

  return (
    <div>
      <PageHeader
        title="Tariff Plans"
        description="Manage slab-based tariff plans for each consumer category."
        action={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Tariff</Button>}
      />

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>}

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      ) : tariffs.length === 0 ? (
        <EmptyState icon={Settings} title="No tariff plans" description="Create tariff plans to enable automatic billing." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tariffs.map((t) => (
            <Card key={t.id} className="group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                    {t.category}
                  </span>
                  <h3 className="mt-2 font-bold">{t.name}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)} className="opacity-0 transition group-hover:opacity-100">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
              <div className="mt-4 space-y-1.5">
                {t.slabs?.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground">{s.from}–{s.to ?? '∞'} kWh</span>
                    <span className="font-medium">{formatCurrency(s.rate)}/unit</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Fixed: {formatCurrency(t.fixed_charges)}</span>
                <span className="text-muted-foreground">GST: {Math.round((t.gst_rate || 0) * 100)}%</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-blue-600" /> Create Tariff Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="agricultural">Agricultural</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Plan Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Domestic Slab" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fixed Charges (₹)</Label><Input type="number" value={form.fixed_charges} onChange={(e) => setForm({ ...form, fixed_charges: +e.target.value })} /></div>
              <div><Label>GST Rate</Label><Input type="number" step="0.01" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: +e.target.value })} /></div>
            </div>
            <div>
              <Label>Slabs (₹/unit)</Label>
              <div className="space-y-2">
                {form.slabs.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <Input type="number" placeholder="From" value={s.from} onChange={(e) => updateSlab(i, 'from', e.target.value)} />
                    <Input type="number" placeholder="To (blank=∞)" value={s.to ?? ''} onChange={(e) => updateSlab(i, 'to', e.target.value)} />
                    <Input type="number" step="0.1" placeholder="Rate" value={s.rate} onChange={(e) => updateSlab(i, 'rate', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.name}><CheckCircle2 className="mr-2 h-4 w-4" /> Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}