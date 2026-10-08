import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Card, StatusBadge, EmptyState } from '@/components/widgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { MessageSquare, Plus, Reply } from 'lucide-react';

const CATEGORIES = [
  { value: 'billing', label: 'Billing Issue' },
  { value: 'power_outage', label: 'Power Outage' },
  { value: 'theft', label: 'Power Theft' },
  { value: 'meter', label: 'Meter Issue' },
  { value: 'voltage', label: 'Voltage Fluctuation' },
  { value: 'other', label: 'Other' },
];

export default function Complaints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'billing' });
  const [reply, setReply] = useState({ id: null, text: '' });

  const isStaff = user?.role === 'admin' || user?.role === 'staff';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = isStaff
        ? await base44.entities.Complaint.list('-created_date', 100)
        : await base44.entities.Complaint.filter({ customer_id: user.id }, '-created_date', 100);
      setComplaints(data);
    } catch (e) {
      setError(e?.message || 'Unable to load data.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const raise = async () => {
    const subject = form.subject.trim();
    const description = form.description.trim();
    if (!subject || !description) return;
    try {
      await base44.entities.Complaint.create({
        ...form, subject, description, customer_id: user.id, customer_name: user.full_name, status: 'open', priority: 'medium',
      });
      toast({ title: 'Complaint raised', description: 'Your ticket has been created.' });
      setOpen(false);
      setForm({ subject: '', description: '', category: 'billing' });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not raise complaint', description: e?.message || 'Please try again.' });
    }
  };

  const updateStatus = async (c, status) => {
    try {
      await base44.entities.Complaint.update(c.id, { status });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not update complaint', description: e?.message || 'Please try again.' });
    }
  };

  const sendReply = async (c) => {
    const message = reply.text.trim();
    if (!message) return;
    try {
      await base44.functions.invoke('respondToComplaint', { complaint_id: c.id, reply: message });
      setReply({ id: null, text: '' });
      toast({ title: 'Reply sent' });
      load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Reply failed', description: e?.message || 'Unable to send reply.' });
    }
  };

  return (
    <div>
      <PageHeader
        title={isStaff ? 'Complaint Management' : 'My Complaints'}
        description={isStaff ? 'Manage and respond to customer complaints.' : 'Raise and track your complaints.'}
        action={!isStaff && <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Raise Complaint</Button>}
      />

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>}

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      ) : complaints.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No complaints" description="Complaints raised by you will appear here." />
      ) : (
        <div className="grid gap-4">
          {complaints.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{c.subject}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>👤 {c.customer_name || 'Customer'}</span>
                    <span>🏷️ {CATEGORIES.find((x) => x.value === c.category)?.label || c.category}</span>
                    <span>🕐 {new Date(c.created_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  {c.staff_reply && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/5">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Staff Response</p>
                      <p className="mt-1 text-sm">{c.staff_reply}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:w-40">
                  {isStaff && (
                    <>
                      <Select value={c.status} onValueChange={(v) => updateStatus(c, v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      {reply.id === c.id ? (
                        <div className="space-y-2">
                          <Textarea value={reply.text} onChange={(e) => setReply({ id: c.id, text: e.target.value })} placeholder="Type a reply…" rows={2} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => sendReply(c)}>Send</Button>
                            <Button size="sm" variant="outline" onClick={() => setReply({ id: null, text: '' })}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setReply({ id: c.id, text: '' })} className="gap-1.5">
                          <Reply className="h-4 w-4" /> Reply
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Raise a Complaint</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief title" /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe your issue in detail…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={raise} disabled={!form.subject || !form.description}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}