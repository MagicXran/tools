const test = require('node:test');
const assert = require('node:assert/strict');
const formulas = require('../shared/rolling-formulas.js');

function approxEqual(actual, expected, tolerance = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('exports the rolling calculator API', () => {
  const requiredFunctions = [
    'rollingForce',
    'rollingPower',
    'frictionCoefficientFromHotRollingTemp',
    'biteCondition',
    'misakaFlowStress',
    'shidaFlowStress',
    'reductionSchedule',
    'temperatureBalance',
    'thermalExpansionColdLength',
    'forwardSlipFromSpeeds',
    'exitSpeedFromForwardSlip',
  ];

  for (const functionName of requiredFunctions) {
    assert.equal(typeof formulas[functionName], 'function', `${functionName} should be exported`);
  }
});

test('rollingForce returns the expected default hot rolling values', () => {
  const result = formulas.rollingForce({
    rollRadius: 450,
    entryThickness: 30,
    exitThickness: 22,
    width: 1200,
    flowStress: 150,
    frictionCoefficient: 0.35,
  });

  approxEqual(result.draft, 8);
  approxEqual(result.contactLength, 60);
  approxEqual(result.stressStateCoefficient, 1.4615384615384615, 1e-12);
  approxEqual(result.force, 15784.615384615385, 1e-9);
});

test('rollingPower converts force to torque and power', () => {
  const result = formulas.rollingPower({
    force: 15784.615384615385,
    leverArmCoefficient: 0.45,
    contactLength: 60,
    rollSpeedRpm: 45,
    efficiency: 0.85,
  });

  approxEqual(result.torque, 852.3692307692307, 1e-9);
  approxEqual(result.power, 4016.6953703016684, 1e-9);
  approxEqual(result.motorPower, 4725.523965060786, 1e-9);
});

test('biteCondition computes bite geometry from roll radius', () => {
  const result = formulas.biteCondition({
    rollRadius: 450,
    draft: 8,
    frictionCoefficient: 0.35,
  });

  approxEqual(result.biteAngleDeg, 7.645107458548665, 1e-12);
  approxEqual(result.frictionAngleDeg, 19.290046219188735, 1e-12);
  approxEqual(result.maxDraft, 50.527479270584294, 1e-9);
  assert.equal(result.passes, true);
});

test('misakaFlowStress uses literature exponents instead of the old temperature-dependent mistake', () => {
  const result = formulas.misakaFlowStress({
    carbonPct: 0.15,
    tempC: 1000,
    strain: 0.3,
    strainRate: 10,
  });

  approxEqual(result.flowStress, 118.58684736482537, 1e-9);
  assert.ok(Math.abs(result.flowStress - 85.071) > 20);
});

test('shidaFlowStress returns the expected default estimate', () => {
  const result = formulas.shidaFlowStress({
    carbonPct: 0.15,
    tempC: 1000,
    strain: 0.3,
    strainRate: 10,
  });

  approxEqual(result.flowStress, 165.15102082705798, 1e-9);
});

test('reductionSchedule preserves the target gauge and geometric trend', () => {
  const equal = formulas.reductionSchedule({
    initialThickness: 230,
    finalThickness: 12,
    passCount: 7,
    mode: 'equal',
  });

  approxEqual(equal.finalThickness, 12, 1e-9);
  assert.equal(equal.passes.length, 7);

  const decreasing = formulas.reductionSchedule({
    initialThickness: 230,
    finalThickness: 12,
    passCount: 7,
    mode: 'decreasing',
  });

  assert.ok(decreasing.passes[0].reductionRatio > decreasing.passes.at(-1).reductionRatio);
  approxEqual(decreasing.finalThickness, 12, 1e-9);
});

test('temperatureBalance returns the expected radiation loss and deformation rise', () => {
  const result = formulas.temperatureBalance({
    initialTemp: 1050,
    thickness: 25,
    time: 8,
    flowStress: 150,
    strain: 0.3,
  });

  approxEqual(result.radiationDrop, 18.9649219838979, 1e-9);
  approxEqual(result.deformationRise, 8.653846153846153, 1e-12);
  approxEqual(result.finalTemp, 1039.6889241699482, 1e-9);
});

test('thermalExpansionColdLength returns the cold gauge and shrinkage', () => {
  const result = formulas.thermalExpansionColdLength({
    hotLength: 1000,
    hotTemp: 900,
    coldTemp: 20,
  });

  approxEqual(result.coldLength, 989.1196834817014, 1e-9);
  approxEqual(result.deltaLength, 10.880316518298628, 1e-9);
  approxEqual(result.shrinkRate, 0.010880316518298629, 1e-12);
});

test('forward slip is defined by roll speed and exit speed', () => {
  const slip = formulas.forwardSlipFromSpeeds({
    rollSpeed: 3.5,
    exitSpeed: 3.675,
  });
  const exit = formulas.exitSpeedFromForwardSlip({
    rollSpeed: 3.5,
    forwardSlip: 0.05,
  });

  approxEqual(slip.forwardSlip, 0.05, 1e-12);
  approxEqual(exit.exitSpeed, 3.675, 1e-12);
});

test('rejects physically invalid rolling inputs instead of returning NaN or Infinity', () => {
  assert.throws(() => formulas.rollingForce({
    rollRadius: 450,
    entryThickness: 20,
    exitThickness: 22,
    width: 1200,
    flowStress: 150,
    frictionCoefficient: 0.35,
  }), RangeError);
  assert.throws(() => formulas.rollingForce({
    rollRadius: 450,
    entryThickness: 100,
    exitThickness: 1,
    width: 1200,
    flowStress: 150,
    frictionCoefficient: 0.01,
  }), RangeError);

  assert.throws(() => formulas.rollingPower({
    force: 1000,
    leverArmCoefficient: 0.45,
    contactLength: 60,
    rollSpeedRpm: 45,
    efficiency: 0,
  }), RangeError);
  assert.throws(() => formulas.rollingPower({
    force: 1000,
    leverArmCoefficient: 0.45,
    contactLength: 60,
    rollSpeedRpm: 45,
    efficiency: 1.2,
  }), RangeError);
  assert.throws(() => formulas.rollingPower({
    force: 1000,
    leverArmCoefficient: 0.45,
    contactLength: 60,
    rollSpeedRpm: 45,
    efficiency: Number.POSITIVE_INFINITY,
  }), RangeError);

  assert.throws(() => formulas.biteCondition({
    rollRadius: 450,
    draft: -2,
    frictionCoefficient: 0.35,
  }), RangeError);

  assert.throws(() => formulas.biteCondition({
    rollRadius: 10,
    draft: 25,
    frictionCoefficient: 0.35,
  }), RangeError);

  assert.throws(() => formulas.forwardSlipFromSpeeds({
    rollSpeed: 0,
    exitSpeed: 3.5,
  }), RangeError);
  assert.throws(() => formulas.forwardSlipFromSpeeds({
    rollSpeed: 3.5,
    exitSpeed: 3.4,
  }), RangeError);
  assert.throws(() => formulas.forwardSlipFromSpeeds({
    rollSpeed: Number.POSITIVE_INFINITY,
    exitSpeed: 3.5,
  }), RangeError);
});

test('rejects unsupported hot rolling friction temperatures and invalid schedule contracts', () => {
  assert.throws(() => formulas.frictionCoefficientFromHotRollingTemp(2200), RangeError);
  assert.throws(() => formulas.temperatureBalance({
    initialTemp: 1050,
    thickness: 25,
    time: 8,
    flowStress: 150,
    strain: 0.3,
    ambientTemp: Number.NaN,
  }), RangeError);
  assert.throws(() => formulas.temperatureBalance({
    initialTemp: 1050,
    thickness: 25,
    time: 8,
    flowStress: 150,
    strain: 0.3,
    ambientTemp: 5000,
  }), RangeError);
  assert.throws(() => formulas.temperatureBalance({
    initialTemp: 1050,
    thickness: 25,
    time: 8,
    flowStress: 150,
    strain: 0.3,
    ambientTemp: -300,
  }), RangeError);
  assert.throws(() => formulas.temperatureBalance({
    initialTemp: 1050,
    thickness: 25,
    time: 8,
    flowStress: 150,
    strain: 0.3,
    emissivity: 1.1,
  }), RangeError);
  assert.throws(() => formulas.temperatureBalance({
    initialTemp: 1050,
    thickness: 25,
    time: 8,
    flowStress: 150,
    strain: 0.3,
    emissivity: Number.NaN,
  }), RangeError);
  assert.throws(() => formulas.temperatureBalance({
    initialTemp: 1050,
    thickness: 25,
    time: 8,
    flowStress: 150,
    strain: 0.3,
    workToHeatEfficiency: 1.05,
  }), RangeError);
  assert.throws(() => formulas.temperatureBalance({
    initialTemp: 1050,
    thickness: 25,
    time: 8,
    flowStress: 150,
    strain: 0.3,
    workToHeatEfficiency: Number.POSITIVE_INFINITY,
  }), RangeError);
  assert.throws(() => formulas.reductionSchedule({
    initialThickness: 230,
    finalThickness: 12,
    passCount: 0,
    mode: 'equal',
  }), RangeError);
  assert.throws(() => formulas.reductionSchedule({
    initialThickness: 230,
    finalThickness: 12,
    passCount: 7,
    mode: 'typo',
  }), RangeError);
});
