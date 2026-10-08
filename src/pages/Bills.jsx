import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, StatusBadge, Card, EmptyState } from '@/components/widgets';
import { formatCurrency, formatDate } from '@/lib/billing';
import { generateBillPDF } from '@/lib/pdf';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Download, CreditCard, Search, Receipt, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export default function Bills() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [payBill, setPayBill] = useState(null);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await base44.entities.Bill.filter({ customer_id: user.id }, '-created_date', 100);
      setBills(data);
    } catch (e) {
      setError(e?.message || 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    if (status === 'success') {
      toast({ title: 'Payment successful', description: 'Your bill will update shortly.' });
      load();
    } else if (status === 'cancelled') {
      toast({ variant: 'destructive', title: 'Payment cancelled', description: 'Your payment was not completed.' });
    }
    if (status) {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url);
    }
  }, []);

  const filtered = bills.filter((b) =>
    b.bill_number?.toLowerCase().includes(search.toLowerCase()) || b.status.includes(search.toLowerCase())
  );

  const handlePay = async () => {
    if (!payBill) return;
    setPaying(true);
    const isFramed = window.self !== window.top;
    const checkoutTab = isFramed ? window.open('', '_blank') : null;
    if (isFramed && !checkoutTab) {
      toast({ variant: 'destructive', title: 'Popup blocked', description: 'Allow popups to continue to checkout.' });
      setPaying(false);
      return;
    }
    if (checkoutTab) checkoutTab.opener = null;
    try {
      const res = await base44.functions.invoke('createCheckoutSession', { bill_id: payBill.id });
      const url = res.data?.url;
      if (!url) throw new Error('No checkout URL returned');
      if (checkoutTab) {
        checkoutTab.location.replace(url);
        setPayBill(null);
      } else {
        window.location.assign(url);
      }
    } catch (e) {
      checkoutTab?.close();
      toast({ variant: 'destructive', title: 'Checkout failed', description: e.message });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div>
      <PageHeader title="Bills & Payments" description="View, download, and pay your electricity bills." />

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>}

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by bill no or status…" className="pl-9" />
      </div>

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>}

      {loading ? ( className="py-20 text-center text-muted-foreground">Loading bills…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No bills found" description="Your bills will appear here once generated." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Bill No.</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Units</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{b.bill_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(b.billing_period_start)}</td>
                    <td className="px-4 py-3">{b.units_consumed} kWh</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(b.total_amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(b.due_date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => generateBillPDF(b, user)} title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        {b.status !== 'paid' && (
                          <Button size="sm" onClick={() => setPayBill(b)} className="gap-1.5">
                            <CreditCard className="h-4 w-4" /> Pay
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!payBill} onOpenChange={(o) => !o && setPayBill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-blue-600" /> Pay Bill</DialogTitle>
          </DialogHeader>
          {payBill && (
            <div className="space-y-3">
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bill No.</span><span className="font-medium">{payBill.bill_number}</span></div>
                <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">Total Amount</span><span>{formatCurrency(payBill.total_amount)}</span></div>
                <div className="mt-1 flex justify-between text-sm"><span className="text-muted-foreground">Already Paid</span><span>{formatCurrency(payBill.amount_paid || 0)}</span></div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold"><span>Balance Due</span><span className="text-blue-600">{formatCurrency(payBill.total_amount - (payBill.amount_paid || 0))}</span></div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 shrink-0 text-green-600" />
                Secure checkout powered by Stripe. You'll be redirected to complete your payment.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayBill(null)}>Cancel</Button>
            <Button onClick={handlePay} disabled={paying}>{paying ? 'Redirecting…' : `Pay ${payBill ? formatCurrency(payBill.total_amount - (payBill.amount_paid || 0)) : ''}`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}