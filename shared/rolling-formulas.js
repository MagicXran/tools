(function initRollingFormulas(factory) {
  const formulas = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = formulas;
  }

  if (typeof window !== 'undefined') {
    window.RollingFormulas = formulas;
  }
})(function createRollingFormulas() {
  const STEFAN_BOLTZMANN = 5.670374419e-8;
  const GRAVITY_CONVERSION = 9.80665;
  const HOT_ROLLING_TEMP_MIN = 600;
  const HOT_ROLLING_TEMP_MAX = 1400;

  function toDegrees(radians) {
    return radians * 180 / Math.PI;
  }

  function assertFiniteNumber(name, value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new RangeError(`${name} must be a finite number`);
    }
  }

  function assertPositive(name, value) {
    assertFiniteNumber(name, value);

    if (value <= 0) {
      throw new RangeError(`${name} must be greater than zero`);
    }
  }

  function assertNonNegative(name, value) {
    assertFiniteNumber(name, value);

    if (value < 0) {
      throw new RangeError(`${name} must be zero or greater`);
    }
  }

  function assertGreater(name, leftValue, rightName, rightValue) {
    if (leftValue <= rightValue) {
      throw new RangeError(`${name} must be greater than ${rightName}`);
    }
  }

  function assertHotRollingTemp(tempC) {
    assertFiniteNumber('tempC', tempC);

    if (tempC < HOT_ROLLING_TEMP_MIN || tempC > HOT_ROLLING_TEMP_MAX) {
      throw new RangeError(`tempC must be between ${HOT_ROLLING_TEMP_MIN} and ${HOT_ROLLING_TEMP_MAX}`);
    }
  }

  function assertFraction(name, value) {
    assertFiniteNumber(name, value);

    if (value <= 0 || value > 1) {
      throw new RangeError(`${name} must be greater than zero and no more than one`);
    }
  }

  function buildPass(passNumber, initialThickness, entryThickness, exitThickness, trueStrain) {
    const draft = entryThickness - exitThickness;
    const reductionRatio = draft / entryThickness;

    return {
      passNumber,
      entryThickness,
      exitThickness,
      draft,
      reductionRatio,
      trueStrain,
      elongationRatio: entryThickness / exitThickness,
      cumulativeReductionRatio: (initialThickness - exitThickness) / initialThickness,
    };
  }

  function rollingForce({
    rollRadius,
    entryThickness,
    exitThickness,
    width,
    flowStress,
    frictionCoefficient,
  }) {
    assertPositive('rollRadius', rollRadius);
    assertPositive('entryThickness', entryThickness);
    assertPositive('exitThickness', exitThickness);
    assertGreater('entryThickness', entryThickness, 'exitThickness', exitThickness);
    assertPositive('width', width);
    assertPositive('flowStress', flowStress);
    assertNonNegative('frictionCoefficient', frictionCoefficient);

    const draft = entryThickness - exitThickness;
    const reductionRatio = draft / entryThickness;
    const contactLength = Math.sqrt(rollRadius * draft);
    const stressStateCoefficient =
      1 +
      1.6 * frictionCoefficient * contactLength / (entryThickness + exitThickness) -
      1.2 * draft / (entryThickness + exitThickness);
    if (stressStateCoefficient <= 0) {
      throw new RangeError('stressStateCoefficient must be greater than zero');
    }
    const force = flowStress * stressStateCoefficient * width * contactLength / 1000;

    return {
      draft,
      reductionRatio,
      contactLength,
      stressStateCoefficient,
      force,
    };
  }

  function rollingPower({
    force,
    leverArmCoefficient,
    contactLength,
    rollSpeedRpm,
    efficiency,
  }) {
    assertPositive('force', force);
    assertPositive('leverArmCoefficient', leverArmCoefficient);
    assertPositive('contactLength', contactLength);
    assertPositive('rollSpeedRpm', rollSpeedRpm);
    assertFraction('efficiency', efficiency);

    const torque = 2 * force * leverArmCoefficient * contactLength / 1000;
    const power = torque * rollSpeedRpm / 9.5492965855;
    const motorPower = power / efficiency;

    return {
      torque,
      power,
      motorPower,
    };
  }

  function frictionCoefficientFromHotRollingTemp(tempC) {
    assertHotRollingTemp(tempC);

    return 0.8 * (1.05 - 0.0005 * tempC);
  }

  function biteCondition({
    rollRadius,
    draft,
    frictionCoefficient,
  }) {
    assertPositive('rollRadius', rollRadius);
    assertPositive('draft', draft);
    assertNonNegative('frictionCoefficient', frictionCoefficient);

    if (draft >= 2 * rollRadius) {
      throw new RangeError('draft must stay below two times the roll radius');
    }

    const biteAngleRad = Math.acos(1 - draft / (2 * rollRadius));
    const frictionAngleRad = Math.atan(frictionCoefficient);
    const maxDraft = 2 * rollRadius * (1 - Math.cos(frictionAngleRad));

    return {
      biteAngleRad,
      biteAngleDeg: toDegrees(biteAngleRad),
      frictionAngleRad,
      frictionAngleDeg: toDegrees(frictionAngleRad),
      maxDraft,
      passes: biteAngleRad <= frictionAngleRad,
    };
  }

  function misakaFlowStress({
    carbonPct,
    tempC,
    strain,
    strainRate,
  }) {
    assertNonNegative('carbonPct', carbonPct);
    assertPositive('strain', strain);
    assertPositive('strainRate', strainRate);
    assertHotRollingTemp(tempC);

    const tempK = tempC + 273.15;
    const exponent =
      0.126 -
      1.75 * carbonPct +
      0.594 * carbonPct * carbonPct +
      (2851 + 2968 * carbonPct - 1120 * carbonPct * carbonPct) / tempK;
    const flowStress =
      Math.exp(exponent) *
      Math.pow(strain, 0.21) *
      Math.pow(strainRate, 0.13) *
      GRAVITY_CONVERSION;

    return {
      flowStress,
    };
  }

  function shidaFlowStress({
    carbonPct,
    tempC,
    strain,
    strainRate,
  }) {
    assertNonNegative('carbonPct', carbonPct);
    assertPositive('strain', strain);
    assertPositive('strainRate', strainRate);
    assertHotRollingTemp(tempC);

    const scaledTemp = (tempC + 273.15) / 1000;
    const n = 0.41 - 0.07 * carbonPct;
    const td = 0.95 * (carbonPct + 0.41) / (carbonPct + 0.32);
    const aboveTransition = scaledTemp >= td;
    const g = aboveTransition
      ? 1
      : 30 * (carbonPct + 0.9) * Math.pow(scaledTemp - 0.95 * (carbonPct + 0.49) / (carbonPct + 0.42), 2) +
        (carbonPct + 0.06) / (carbonPct + 0.09);
    const tx = aboveTransition ? scaledTemp : td;
    const m = aboveTransition
      ? (-0.019 * carbonPct + 0.126) * scaledTemp + (0.075 * carbonPct - 0.05)
      : (0.081 * carbonPct - 0.154) * scaledTemp + (-0.019 * carbonPct + 0.207) + 0.027 / (carbonPct + 0.32);
    const sigF = 0.28 * g * Math.exp(5 / tx - 0.01 / (carbonPct + 0.05));
    const kgfPerMm2 =
      2 / Math.sqrt(3) *
      sigF *
      (1.3 * Math.pow(strain / 0.2, n) - 0.3 * (strain / 0.2)) *
      Math.pow(strainRate / 10, m);

    return {
      flowStress: kgfPerMm2 * GRAVITY_CONVERSION,
    };
  }

  function reductionSchedule({
    initialThickness,
    finalThickness,
    passCount,
    mode,
  }) {
    assertPositive('initialThickness', initialThickness);
    assertPositive('finalThickness', finalThickness);
    assertGreater('initialThickness', initialThickness, 'finalThickness', finalThickness);
    assertFiniteNumber('passCount', passCount);

    if (!Number.isInteger(passCount) || passCount <= 0) {
      throw new RangeError('passCount must be a positive integer');
    }

    if (mode !== 'equal' && mode !== 'decreasing') {
      throw new RangeError('mode must be equal or decreasing');
    }

    const passes = [];
    const finalRatio = finalThickness / initialThickness;

    if (mode === 'equal') {
      const perPassReductionRatio = 1 - Math.pow(finalRatio, 1 / passCount);
      let entryThickness = initialThickness;

      for (let passNumber = 1; passNumber <= passCount; passNumber += 1) {
        const exitThickness = entryThickness * (1 - perPassReductionRatio);
        passes.push(buildPass(passNumber, initialThickness, entryThickness, exitThickness, Math.log(entryThickness / exitThickness)));

        entryThickness = exitThickness;
      }
    } else {
      const totalTrueStrain = Math.log(initialThickness / finalThickness);
      const weights = [];
      let weightSum = 0;

      for (let index = 0; index < passCount; index += 1) {
        const weight = passCount - index;
        weights.push(weight);
        weightSum += weight;
      }

      let entryThickness = initialThickness;

      for (let index = 0; index < passCount; index += 1) {
        const passTrueStrain = totalTrueStrain * weights[index] / weightSum;
        const exitThickness = entryThickness * Math.exp(-passTrueStrain);
        passes.push(buildPass(index + 1, initialThickness, entryThickness, exitThickness, passTrueStrain));

        entryThickness = exitThickness;
      }
    }

    return {
      passes,
      finalThickness: passes.at(-1).exitThickness,
      totalReductionRatio: (initialThickness - passes.at(-1).exitThickness) / initialThickness,
      totalElongationRatio: initialThickness / passes.at(-1).exitThickness,
    };
  }

  function temperatureBalance({
    initialTemp,
    thickness,
    time,
    flowStress,
    strain,
    emissivity = 0.8,
    density = 7800,
    specificHeat = 600,
    ambientTemp = 25,
    workToHeatEfficiency = 0.9,
  }) {
    assertHotRollingTemp(initialTemp);
    assertPositive('thickness', thickness);
    assertNonNegative('time', time);
    assertPositive('flowStress', flowStress);
    assertPositive('strain', strain);
    assertFraction('emissivity', emissivity);
    assertPositive('density', density);
    assertPositive('specificHeat', specificHeat);
    assertFraction('workToHeatEfficiency', workToHeatEfficiency);
    assertFiniteNumber('ambientTemp', ambientTemp);
    if (ambientTemp < -273.15) {
      throw new RangeError('ambientTemp must be above absolute zero');
    }
    assertGreater('initialTemp', initialTemp, 'ambientTemp', ambientTemp);

    const initialTempK = initialTemp + 273.15;
    const ambientTempK = ambientTemp + 273.15;
    const thicknessM = thickness / 1000;
    const radiationDrop =
      STEFAN_BOLTZMANN *
      emissivity *
      (Math.pow(initialTempK, 4) - Math.pow(ambientTempK, 4)) *
      time /
      (density * specificHeat * thicknessM / 2);
    const deformationRise = workToHeatEfficiency * flowStress * 1e6 * strain / (density * specificHeat);

    return {
      radiationDrop,
      deformationRise,
      finalTemp: initialTemp - radiationDrop + deformationRise,
    };
  }

  function thermalExpansionColdLength({
    hotLength,
    hotTemp,
    coldTemp,
    alpha = 12.5e-6,
  }) {
    assertPositive('hotLength', hotLength);
    assertPositive('alpha', alpha);
    assertFiniteNumber('hotTemp', hotTemp);
    assertFiniteNumber('coldTemp', coldTemp);
    assertGreater('hotTemp', hotTemp, 'coldTemp', coldTemp);

    const coldLength = hotLength / (1 + alpha * (hotTemp - coldTemp));
    const deltaLength = hotLength - coldLength;
    const shrinkRate = deltaLength / hotLength;

    return {
      coldLength,
      deltaLength,
      shrinkRate,
    };
  }

  function forwardSlipFromSpeeds({
    rollSpeed,
    exitSpeed,
  }) {
    assertPositive('rollSpeed', rollSpeed);
    assertPositive('exitSpeed', exitSpeed);

    if (exitSpeed <= rollSpeed) {
      throw new RangeError('exitSpeed must be greater than rollSpeed for forward slip');
    }

    return {
      forwardSlip: exitSpeed / rollSpeed - 1,
    };
  }

  function exitSpeedFromForwardSlip({
    rollSpeed,
    forwardSlip,
  }) {
    assertPositive('rollSpeed', rollSpeed);
    assertNonNegative('forwardSlip', forwardSlip);

    return {
      exitSpeed: rollSpeed * (1 + forwardSlip),
    };
  }

  return {
    rollingForce,
    rollingPower,
    frictionCoefficientFromHotRollingTemp,
    biteCondition,
    misakaFlowStress,
    shidaFlowStress,
    reductionSchedule,
    temperatureBalance,
    thermalExpansionColdLength,
    forwardSlipFromSpeeds,
    exitSpeedFromForwardSlip,
  };
});
