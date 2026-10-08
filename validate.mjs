import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { calculateEnergyCharges, calculateBill } from '../src/lib/billing.js';

const root = process.cwd();
const entityDir = path.join(root, 'base44', 'entities');
const stripJsonComments = (value) => value
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1');

for (const file of fs.readdirSync(entityDir)) {
  if (file === 'user.jsonc') continue; // User is the built-in Base44 entity extension.
  assert.match(file, /^[a-z0-9]+(?:-[a-z0-9]+)*\.jsonc$/, `Entity file must use kebab-case: ${file}`);
  const data = JSON.parse(stripJsonComments(fs.readFileSync(path.join(entityDir, file), 'utf8')));
  assert.ok(data.name && data.type === 'object' && data.properties, `Invalid entity schema: ${file}`);
  assert.ok(data.rls, `Missing RLS configuration: ${file}`);
}

const slabs = [
  { from: 0, to: 100, rate: 3 },
  { from: 100, to: 200, rate: 5 },
  { from: 200, to: null, rate: 7 },
];
assert.equal(calculateEnergyCharges(250, slabs), 1150);
const bill = calculateBill({ unitsConsumed: 250, solarExported: 50, tariff: { slabs, fixed_charges: 100, gst_rate: 0.18 } });
assert.deepEqual(bill, { netUnits: 200, energyCharges: 800, fixedCharges: 100, gst: 162, totalAmount: 1062 });

for (const dir of ['respondToComplaint', 'runTheftScan', 'createCheckoutSession', 'stripeWebhook', 'downloadSourceCode']) {
  assert.ok(fs.existsSync(path.join(root, 'base44', 'functions', dir, 'entry.ts')), `Missing backend function: ${dir}`);
}

console.log('SmartPower validation passed.');
