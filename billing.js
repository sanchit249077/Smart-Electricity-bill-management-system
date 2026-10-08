// Smart billing engine: slab-based tariff calculation with GST, fixed charges, net metering.

export function calculateEnergyCharges(units, slabs) {
  if (!slabs || !slabs.length) return 0;
  const sorted = [...slabs].sort((a, b) => (a.from ?? 0) - (b.from ?? 0));
  let charge = 0;
  let remaining = Math.max(0, units);
  let covered = 0;
  for (const slab of sorted) {
    if (remaining <= 0) break;
    const from = slab.from ?? covered;
    const to = slab.to ?? Infinity;
    const slabWidth = Math.max(0, to - from);
    const used = Math.min(remaining, slabWidth);
    charge += used * (slab.rate || 0);
    remaining -= used;
    covered = to;
  }
  return Math.round(charge * 100) / 100;
}

export function calculateBill({ unitsConsumed, solarExported = 0, tariff }) {
  if (!tariff) return null;
  const netUnits = Math.max(0, unitsConsumed - solarExported);
  const energyCharges = calculateEnergyCharges(netUnits, tariff.slabs);
  const fixedCharges = tariff.fixed_charges || 0;
  const subtotal = energyCharges + fixedCharges;
  const gst = Math.round(subtotal * (tariff.gst_rate || 0) * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;
  return { netUnits, energyCharges, fixedCharges, gst, totalAmount: total };
}

export function formatCurrency(n) {
  if (n == null || isNaN(n)) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}