import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PageHeader, Card } from '@/components/widgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { User, Save, Mail, Phone, MapPin, Hash } from 'lucide-react';

export default function Profile() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: user?.phone || '',
    address: user?.address || '',
    area: user?.area || '',
    connection_id: user?.connection_id || '',
    category: user?.category || 'residential',
  });

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(form);
      await checkUserAuth();
      toast({ title: 'Profile updated' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update failed', description: e.message });
    } finally { setSaving(false); }
  };

  const roleLabel = { admin: 'Administrator', staff: 'Department Staff', user: 'Customer' }[user?.role];

  return (
    <div>
      <PageHeader title="Profile" description="Manage your account details and connection info." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 text-2xl font-bold text-white">
            {(user?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <h3 className="mt-4 text-lg font-bold">{user?.full_name}</h3>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="mt-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            {roleLabel}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Account Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label><Mail className="mr-1 inline h-3.5 w-3.5" /> Email</Label>
              <Input value={user?.email || ''} disabled className="mt-1.5 bg-muted/50" />
            </div>
            <div>
              <Label><Phone className="mr-1 inline h-3.5 w-3.5" /> Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Your phone number" className="mt-1.5" />
            </div>
            <div>
              <Label><Hash className="mr-1 inline h-3.5 w-3.5" /> Connection ID</Label>
              <Input value={form.connection_id} onChange={(e) => setForm({ ...form, connection_id: e.target.value })} placeholder="e.g. SC-2024-001" className="mt-1.5" />
            </div>
            <div>
              <Label>Connection Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="agricultural">Agricultural</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label><MapPin className="mr-1 inline h-3.5 w-3.5" /> Area / Locality</Label>
              <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Your area" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" className="mt-1.5" />
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="mt-5 gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Card>
      </div>
    </div>
  );
}