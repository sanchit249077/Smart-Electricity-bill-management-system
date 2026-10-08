import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, EmptyState } from '@/components/widgets';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Receipt, Zap, AlertTriangle, MessageSquare, Sun, IndianRupee } from 'lucide-react';

const ICONS = {
  bill_due: Receipt, payment_success: IndianRupee, outage: Zap,
  theft_alert: AlertTriangle, complaint_update: MessageSquare, solar: Sun, bill: Receipt,
};

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      setItems(await base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 50));
    } catch (e) {
      setError(e?.message || 'Unable to load notifications.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read);
    try {
      await base44.entities.Notification.bulkUpdate(unread.map((n) => ({ id: n.id, read: true })));
      await load();
    } catch (e) {
      setError(e?.message || 'Unable to update notifications.');
    }
  };

  const markRead = async (n) => {
    if (n.read) return;
    try {
      await base44.entities.Notification.update(n.id, { read: true });
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch (e) {
      setError(e?.message || 'Unable to mark notification as read.');
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unread} unread notification${unread !== 1 ? 's' : ''}.`}
        action={unread > 0 && <Button variant="outline" onClick={markAllRead} className="gap-2"><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      />

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">{error}</div>}

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <div
                key={n.id}
                onClick={() => markRead(n)}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition hover:bg-muted/30 ${!n.read ? 'border-blue-300 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/5' : ''}`}
              >
                <div className={`rounded-lg p-2.5 ${!n.read ? 'bg-blue-500/15 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_date).toLocaleString('en-IN')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}