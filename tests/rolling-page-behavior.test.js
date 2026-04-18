const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RollingFormulas = require('../shared/rolling-formulas.js');

function extractInlineScript(appName) {
  const html = fs.readFileSync(path.join(__dirname, '..', appName, 'index.html'), 'utf8');
  const matches = [...html.matchAll(/<script(?: src="[^"]+")?>([\s\S]*?)<\/script>/g)];
  return matches.at(-1)[1];
}

function createElement(initialValue = '') {
  return {
    value: initialValue,
    textContent: '',
    innerHTML: '',
    style: { display: 'block', color: '' },
  };
}

function runPage(appName, elements) {
  const alerts = [];
  const sandbox = {
    RollingFormulas,
    alert(message) {
      alerts.push(message);
    },
    document: {
      getElementById(id) {
        if (!elements[id]) {
          elements[id] = createElement();
        }
        return elements[id];
      },
      querySelectorAll(selector) {
        if (selector === 'input[type="number"]') {
          return Object.values(elements).filter((element) => Object.prototype.hasOwnProperty.call(element, 'value'));
        }
        return [];
      },
      createElement() {
        return createElement();
      },
    },
  };

  vm.runInNewContext(extractInlineScript(appName), sandbox);
  return {
    alerts,
    sandbox,
    elements,
  };
}

test('rollingForce calculate writes shared-formula results into the DOM', () => {
  const elements = {
    R: createElement('450'),
    H: createElement('30'),
    h: createElement('22'),
    b: createElement('1200'),
    Kf: createElement('150'),
    mu: createElement('0.35'),
    'output-placeholder': createElement(),
    'result-content': createElement(),
    deltaH: createElement(),
    epsilon: createElement(),
    ld: createElement(),
    Qp: createElement(),
    P: createElement(),
  };
  const page = runPage('rollingForce', elements);

  page.sandbox.calculate();

  assert.deepEqual(page.alerts, []);
  assert.match(elements.P.textContent, /15784\.62 kN/);
  assert.match(elements.ld.textContent, /60\.000 mm/);
  assert.equal(elements['result-content'].style.display, 'block');
});

test('forwardSlip blocks mutually exclusive inputs and computes speed from slip when measured speed is blank', () => {
  const conflictingElements = {
    vR: createElement('3.5'),
    vOutMeasured: createElement('3.675'),
    ShInput: createElement('5'),
    'output-placeholder': createElement(),
    'result-content': createElement(),
    Sh: createElement(),
    vOut: createElement(),
  };
  const conflictingPage = runPage('forwardSlip', conflictingElements);

  conflictingPage.sandbox.calculate();

  assert.match(conflictingPage.alerts[0], /二选一/);

  const calculatedElements = {
    vR: createElement('3.5'),
    vOutMeasured: createElement(''),
    ShInput: createElement('5'),
    'output-placeholder': createElement(),
    'result-content': createElement(),
    Sh: createElement(),
    vOut: createElement(),
  };
  const calculatedPage = runPage('forwardSlip', calculatedElements);

  calculatedPage.sandbox.calculate();

  assert.deepEqual(calculatedPage.alerts, []);
  assert.match(calculatedElements.Sh.textContent, /5\.00 %/);
  assert.match(calculatedElements.vOut.textContent, /3\.6750 m\/s/);
});

test('reductionSchedule rejects fractional pass counts instead of silently truncating them', () => {
  const rows = [];
  const tableBody = createElement();
  tableBody.appendChild = (row) => rows.push(row);
  const elements = {
    H0: createElement('230'),
    hf: createElement('12'),
    n: createElement('7.9'),
    mode: createElement('equal'),
    tableBody,
    totalLambda: createElement(),
    totalReduction: createElement(),
    'output-placeholder': createElement(),
    'result-content': createElement(),
  };
  const page = runPage('reductionSchedule', elements);

  page.sandbox.calculate();

  assert.match(page.alerts[0], /整数/);
  assert.equal(rows.length, 0);
});
