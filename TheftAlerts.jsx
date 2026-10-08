import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PageHeader, Card, StatusBadge, EmptyState } from '@/components/widgets';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, ScanSearch, ShieldAlert } from 'lucide-react';

export default function TheftAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAlerts(await base44.entities.TheftAlert.list('-created_date', 100));
    } catch (e) {
      setError(e?.message || 'Unable to load theft alerts.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const runScan = async () => {
    setScanning(true);
    setError('');
    try {
      const result = await base44.functions.invoke('runTheftScan', {});
      const data = result?.data || {};
      toast({
        title: 'Scan complete',
        description: data.created_count
          ? `${data.created_count} potential anomal${data.created_count === 1 ? 'y' : 'ies'} detected.`
          : 'No new anomalies detected.',
      });
      await load();
    } catch (e) {
      const message = e?.message || 'Unable to run the anomaly scan.';
      setError(message);
      toast({ variant: 'destructive', title: 'Scan failed', description: message });
    } finally {
      setScanning(false);
    }
  };

  const updateStatus = async (a, status) => {
    try {
      await base44.entities.TheftAlert.update(a.id, { status });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not update alert', description: e?.message || 'Please try again.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Theft Detection System"
        description="AI-based anomaly detection for sudden consumption spikes."
        action={<Button onClick={runScan} disabled={scanning} className="gap-2"><ScanSearch className="h-4 w-4" /> {scanning ? 'Scanning…' : 'Run AI Scan'}</Button>}
      />

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>}

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      ) : alerts.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No theft alerts" description="Run an AI scan to detect consumption anomalies." />
      ) : (
        <div className="grid gap-4">
          {alerts.map((a) => (
            <Card key={a.id} className={a.status === 'open' ? 'border-rose-200 dark:border-rose-500/30' : ''}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2.5 ${a.status === 'open' ? 'bg-rose-500/15 text-rose-600' : 'bg-muted text-muted-foreground'}`}>
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{a.customer_name || 'Customer'}</p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      <span>⚡ +{a.consumption_spike_percentage}% spike</span>
                      <span>🔍 {a.detected_by === 'ai' ? 'AI Detected' : 'Manual'}</span>
                      <span>🕐 {new Date(a.created_date).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </div>
                <div className="sm:w-44">
                  <Select value={a.status} onValueChange={(v) => updateStatus(a, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="false_alarm">False Alarm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}