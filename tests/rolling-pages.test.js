const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readPage(appName) {
  return fs.readFileSync(path.join(__dirname, '..', appName, 'index.html'), 'utf8');
}

test('all rolling apps load the shared formula module', () => {
  const appNames = [
    'rollingForce',
    'reductionSchedule',
    'rollingPower',
    'deformResistance',
    'biteCondition',
    'rollingTempDrop',
    'forwardSlip',
    'thermalExpansion',
  ];

  for (const appName of appNames) {
    assert.match(readPage(appName), /<script src="\.\.\/shared\/rolling-formulas\.js"><\/script>/);
  }
});

test('radius based apps state roll radius consistently and call shared formulas', () => {
  const forcePage = readPage('rollingForce');
  const bitePage = readPage('biteCondition');

  assert.match(forcePage, /工作辊半径 R \(mm\)/);
  assert.doesNotMatch(forcePage, /工作辊径 R \(mm\)/);
  assert.match(forcePage, /RollingFormulas\.rollingForce/);

  assert.match(bitePage, /工作辊半径 R \(mm\)/);
  assert.doesNotMatch(bitePage, /工作辊径 R \(mm\)/);
  assert.match(bitePage, /RollingFormulas\.biteCondition/);
});

test('wrong flow stress and forward slip formulas are removed from pages', () => {
  const deformPage = readPage('deformResistance');
  const forwardSlipPage = readPage('forwardSlip');

  assert.match(deformPage, /RollingFormulas\.misakaFlowStress/);
  assert.match(deformPage, /RollingFormulas\.shidaFlowStress/);
  assert.doesNotMatch(deformPage, /var n = 0\.41 - 0\.07 \* C/);

  assert.match(forwardSlipPage, /RollingFormulas\.forwardSlipFromSpeeds/);
  assert.match(forwardSlipPage, /RollingFormulas\.exitSpeedFromForwardSlip/);
  assert.doesNotMatch(forwardSlipPage, /S_h = Δh\/\(4h\)/);
});

test('schedule and thermal pages state the reduced model honestly', () => {
  const schedulePage = readPage('reductionSchedule');
  const tempPage = readPage('rollingTempDrop');

  assert.match(schedulePage, /压下分配估算器/);
  assert.match(schedulePage, /RollingFormulas\.reductionSchedule/);
  assert.match(schedulePage, /递减真应变/);
  assert.doesNotMatch(schedulePage, /递减压下率/);

  assert.doesNotMatch(tempPage, /轧件宽度 b/);
  assert.match(tempPage, /不含轧辊接触导热/);
  assert.match(tempPage, /RollingFormulas\.temperatureBalance/);
});

test('power and expansion pages call shared formulas', () => {
  assert.match(readPage('rollingPower'), /RollingFormulas\.rollingPower/);
  assert.match(readPage('thermalExpansion'), /RollingFormulas\.thermalExpansionColdLength/);
});
