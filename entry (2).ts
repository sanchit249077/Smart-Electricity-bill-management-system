import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const actor = await base44.auth.me();
    if (!actor || !['admin', 'staff'].includes(actor.role)) {
      return Response.json({ error: 'Staff access required' }, { status: 403 });
    }

    const [consumption, users, existingAlerts] = await Promise.all([
      base44.asServiceRole.entities.ConsumptionData.list('-created_date', 1000),
      base44.asServiceRole.entities.User.list('-created_date', 500),
      base44.asServiceRole.entities.TheftAlert.list('-created_date', 500),
    ]);

    const byCustomer: Record<string, any[]> = {};
    for (const record of consumption || []) {
      if (!record.customer_id || !Number.isFinite(Number(record.units_consumed))) continue;
      (byCustomer[record.customer_id] ||= []).push(record);
    }

    const userById = new Map((users || []).map((u) => [u.id, u]));
    const openCustomers = new Set(
      (existingAlerts || [])
        .filter((a) => a.status === 'open' || a.status === 'investigating')
        .map((a) => a.customer_id)
    );

    const newAlerts: any[] = [];
    for (const [customerId, records] of Object.entries(byCustomer)) {
      if (records.length < 2 || openCustomers.has(customerId)) continue;
      records.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

      const latest = Number(records[0].units_consumed);
      const baseline = records.slice(1).reduce((sum, r) => sum + Number(r.units_consumed || 0), 0) / (records.length - 1);
      const spike = baseline > 0 ? Math.round(((latest - baseline) / baseline) * 100) : 0;
      if (spike <= 50) continue;

      const user = userById.get(customerId);
      newAlerts.push({
        customer_id: customerId,
        customer_name: user?.full_name || 'Customer',
        detected_by: 'ai',
        consumption_spike_percentage: spike,
        status: 'open',
        description: `Consumption jumped ${spike}% above the customer's average (${Math.round(baseline)} → ${latest} kWh).`,
      });
    }

    if (newAlerts.length) {
      await base44.asServiceRole.entities.TheftAlert.bulkCreate(newAlerts);
    }

    return Response.json({
      success: true,
      scanned_customers: Object.keys(byCustomer).length,
      created_count: newAlerts.length,
    });
  } catch (error) {
    console.error('runTheftScan error:', error?.message || error);
    return Response.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
