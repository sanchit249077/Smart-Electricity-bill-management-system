import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const actor = await base44.auth.me();
    if (!actor || !['admin', 'staff'].includes(actor.role)) {
      return Response.json({ error: 'Staff access required' }, { status: 403 });
    }

    const body = await req.json();
    const complaintId = body?.complaint_id;
    const reply = String(body?.reply || '').trim();
    if (!complaintId || !reply) {
      return Response.json({ error: 'complaint_id and reply are required' }, { status: 400 });
    }
    if (reply.length > 5000) {
      return Response.json({ error: 'Reply is too long' }, { status: 400 });
    }

    const complaint = await base44.asServiceRole.entities.Complaint.get(complaintId);
    if (!complaint) return Response.json({ error: 'Complaint not found' }, { status: 404 });

    await base44.asServiceRole.entities.Complaint.update(complaintId, {
      staff_reply: reply,
      status: 'in_progress',
    });

    if (complaint.customer_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: complaint.customer_id,
        title: 'Complaint Update',
        message: `Your complaint "${complaint.subject}" has a new response.`,
        type: 'complaint_update',
        read: false,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('respondToComplaint error:', error?.message || error);
    return Response.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
