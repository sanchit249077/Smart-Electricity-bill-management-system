import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from './billing';

export function generateBillPDF(bill, user) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SmartPower — Electricity Bill', 14, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Smart Electricity Bill Management System', 14, 24);

  // Bill meta
  let y = 40;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Bill No: ${bill.bill_number}`, 14, y);
  doc.text(`Status: ${bill.status.toUpperCase()}`, W - 14, y, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Customer: ${user?.full_name || '—'}`, 14, y);
  doc.text(`Category: ${bill.category}`, W - 14, y, { align: 'right' });
  y += 6;
  doc.text(`Billing Period: ${formatDate(bill.billing_period_start)} — ${formatDate(bill.billing_period_end)}`, 14, y);
  doc.text(`Due Date: ${formatDate(bill.due_date)}`, W - 14, y, { align: 'right' });
  y += 10;

  // Charges table
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, W - 14, y);
  y += 7;
  const rows = [
    ['Units Consumed', `${bill.units_consumed} kWh`],
    ['Solar Units Exported', `${bill.solar_units_exported || 0} kWh`],
    ['Net Units Billed', `${bill.net_units} kWh`],
    ['Fixed Charges', formatCurrency(bill.fixed_charges)],
    ['Energy Charges', formatCurrency(bill.energy_charges)],
    ['GST', formatCurrency(bill.gst)],
  ];
  doc.setFontSize(10);
  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(k, 14, y);
    doc.text(v, W - 14, y, { align: 'right' });
    y += 6;
  });

  y += 2;
  doc.setFillColor(240, 245, 255);
  doc.rect(14, y - 5, W - 28, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Amount', 14, y + 1);
  doc.text(formatCurrency(bill.total_amount), W - 14, y + 1, { align: 'right' });

  if (bill.amount_paid > 0) {
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Amount Paid', 14, y);
    doc.text(formatCurrency(bill.amount_paid), W - 14, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due', 14, y);
    doc.text(formatCurrency(bill.total_amount - bill.amount_paid), W - 14, y, { align: 'right' });
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('This is a system-generated bill. Please pay before the due date to avoid late fees.', 14, 285);
  doc.text('Thank you for choosing SmartPower.', 14, 290);

  doc.save(`bill-${bill.bill_number}.pdf`);
}