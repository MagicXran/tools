/**
 * 造渣（石灰/白云石）计算器
 *
 * 核心逻辑：
 *  - 给定SiO2负荷（kg）和渣量（kg），选择目标碱度B和MgO%。
 *  - 需要的CaO = B * SiO2
 *  - 需要的MgO = MgO% * 渣量
 *  - 解线性方程组：
 *      CaO = L*CaO_eff + D*CaO_dolo
 *      MgO = L*MgO_lime + D*MgO_dolo + MgO_other
 *    其中L是石灰用量（kg），D是白云石用量（kg）。
 */

// 工具函数
function qs(selector) {
  return document.querySelector(selector);
}

function tonToKg(ton) {
  return ton * 1000;
}

function num(value, defaultValue = 0) {
  const numValue = parseFloat(value);
  return isNaN(numValue) ? defaultValue : numValue;
}

function pctToFrac(pct) {
  return pct / 100.0;
}

function fmt(value, decimals = 2) {
  return value.toFixed(decimals);
}

function fmtInt(value) {
  return Math.round(value).toString();
}

// 提示框功能
function toast(title, message) {
  const toast = qs('#toast');
  const toastTitle = qs('#toastTitle');
  const toastMsg = qs('#toastMsg');
  
  toastTitle.textContent = title;
  toastMsg.textContent = message;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// 范围警告
function warnRange(label, value, min, max) {
  if (value < min || value > max) {
    return `${label} ${value} 超出合理范围 [${min}, ${max}]，可能影响结果。`;
  }
  return null;
}

// 解2x2线性方程组
function solve2x2(a11, a12, a21, a22, b1, b2) {
  const det = a11 * a22 - a12 * a21;
  if (Math.abs(det) < 1e-12) return null;
  const x1 = (b1 * a22 - a12 * b2) / det;
  const x2 = (a11 * b2 - b1 * a21) / det;
  return { x1, x2 };
}

// 读取输入
function readInputs() {
  const steelTon = num(qs('#steelTon').value);
  const steelKg = tonToKg(steelTon);

  const slagMode = qs('#slagMode').value;
  const slagValue = num(qs('#slagValue').value);
  const slagKg = slagMode === 'kgt' ? slagValue * steelTon : slagValue;

  const sio2Mode = qs('#sio2Mode').value;

  let sio2Kg = 0;
  let sio2Explain = '';

  if (sio2Mode === 'direct') {
    sio2Kg = num(qs('#sio2Kg').value);
    sio2Explain = '直接输入';
  } else {
    const siIn = num(qs('#siIn').value);
    const siTarget = num(qs('#siTarget').value);
    const siRemovedKg = Math.max(siIn - siTarget, 0) / 100.0 * steelKg;
    sio2Kg = siRemovedKg * (60.0 / 28.0);
    sio2Explain = `由Si推算：Si_removed=${fmt(siRemovedKg, 1)}kg -> SiO2=${fmt(sio2Kg, 1)}kg`;
  }

  const bMin = num(qs('#bMin').value);
  const bMax = num(qs('#bMax').value);
  const mgoMin = num(qs('#mgoMin').value);
  const mgoMax = num(qs('#mgoMax').value);

  const limeCaO = num(qs('#limeCaO').value);
  const limeMgO = num(qs('#limeMgO').value);
  const doloCaO = num(qs('#doloCaO').value);
  const doloMgO = num(qs('#doloMgO').value);

  const limePrice = num(qs('#limePrice').value, NaN);
  const doloPrice = num(qs('#doloPrice').value, NaN);

  const mgoOtherKg = num(qs('#mgoOtherKg').value);

  return {
    steelTon,
    steelKg,
    slagKg,
    sio2Kg,
    sio2Explain,
    bMin,
    bMax,
    mgoMin,
    mgoMax,
    limeCaO,
    limeMgO,
    doloCaO,
    doloMgO,
    limePrice,
    doloPrice,
    mgoOtherKg
  };
}

// 计算解决方案
function computeSolution(targetB, targetMgOPct, inp) {
  // 将成分转换为分数（0~1）
  const CaOeff = pctToFrac(inp.limeCaO);
  const MgO_lime = pctToFrac(inp.limeMgO);
  const CaO_dolo = pctToFrac(inp.doloCaO);
  const MgO_dolo = pctToFrac(inp.doloMgO);

  const CaO_req = targetB * inp.sio2Kg;
  const MgO_req = pctToFrac(targetMgOPct) * inp.slagKg;

  const MgO_adj = MgO_req - inp.mgoOtherKg; // 减去其他来源的贡献

  const sol = solve2x2(
    CaOeff, CaO_dolo,
    MgO_lime, MgO_dolo,
    CaO_req, MgO_adj
  );

  if (!sol) return { ok: false, reason: '材料参数导致方程不可解（行列式接近0）。' };

  let limeKg = sol.x1;
  let doloKg = sol.x2;

  if (!Number.isFinite(limeKg) || !Number.isFinite(doloKg)) {
    return { ok: false, reason: '解不稳定（NaN/Inf）。' };
  }

  if (limeKg < -1e-6 || doloKg < -1e-6) {
    return { ok: false, reason: '在该目标窗口下解为负值（意味着目标/材料组合不合理）。' };
  }

  const limeKg2 = Math.max(limeKg, 0);
  const doloKg2 = Math.max(doloKg, 0);

  const CaO = limeKg2 * CaOeff + doloKg2 * CaO_dolo;
  const MgO = limeKg2 * MgO_lime + doloKg2 * MgO_dolo + inp.mgoOtherKg;
  const B = CaO / (inp.sio2Kg > 1e-12 ? inp.sio2Kg : 1e-12);
  const MgOPct = MgO / (inp.slagKg > 1e-12 ? inp.slagKg : 1e-12) * 100.0;

  const cost = (Number.isFinite(inp.limePrice) ? limeKg2 / 1000.0 * inp.limePrice : 0) +
              (Number.isFinite(inp.doloPrice) ? doloKg2 / 1000.0 * inp.doloPrice : 0);

  return {
    ok: true,
    limeKg: limeKg2,
    doloKg: doloKg2,
    CaO_req,
    MgO_req,
    CaO,
    MgO,
    B,
    MgOPct,
    cost
  };
}

// 显示结果
function showResult(sol, inp, modeLabel) {
  const resultTableBody = qs('#resultTableBody');
  resultTableBody.innerHTML = '';

  const rows = [
    ['模式', modeLabel],
    ['渣量', `${fmt(inp.slagKg, 1)} kg（${fmt(inp.slagKg / inp.steelTon, 1)} kg/t）`],
    ['SiO2负荷', `${fmt(inp.sio2Kg, 1)} kg（${inp.sio2Explain}）`],
    ['目标碱度 B', fmt(sol.B, 3)],
    ['目标 MgO%', fmt(sol.MgOPct, 2)],
    ['石灰加入量', `${fmt(sol.limeKg, 1)} kg`],
    ['白云石加入量', `${fmt(sol.doloKg, 1)} kg`],
    ['CaO(kg)', fmt(sol.CaO, 1)],
    ['MgO(kg)', fmt(sol.MgO, 1)],
    ['成本（元/炉）', Number.isFinite(sol.cost) ? fmtInt(sol.cost) : '—']
  ];

  for (let i = 0; i < rows.length; i++) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    td1.textContent = rows[i][0];
    td2.textContent = rows[i][1];
    tr.appendChild(td1);
    tr.appendChild(td2);
    resultTableBody.appendChild(tr);
  }

  const summary = qs('#summary');
  summary.innerHTML = `
    <p><b>石灰：</b>${fmt(sol.limeKg, 1)} kg，<b>白云石：</b>${fmt(sol.doloKg, 1)} kg</p>
    <p><b>校核：</b>B=${fmt(sol.B, 3)}，MgO%=${fmt(sol.MgOPct, 2)}（渣量=${fmt(inp.slagKg / inp.steelTon, 1)} kg/t）</p>
  `;
}

// 验证输入
function validateCommon(inp) {
  const warns = [];
  if (inp.steelTon <= 0) warns.push('钢水量必须 > 0。');
  if (inp.slagKg <= 0) warns.push('渣量必须 > 0。');
  if (inp.sio2Kg < 0) warns.push('SiO2 负荷不能为负。');
  if (inp.sio2Kg === 0) warns.push('SiO2=0 会导致碱度计算失真（B=CaO/SiO2）。请确认输入。');

  const w1 = warnRange('石灰有效CaO(%)', inp.limeCaO, 50, 98); if (w1) warns.push(w1);
  const w2 = warnRange('石灰MgO(%)', inp.limeMgO, 0, 10); if (w2) warns.push(w2);
  const w3 = warnRange('白云石MgO(%)', inp.doloMgO, 5, 35); if (w3) warns.push(w3);

  if (inp.bMin <= 0 || inp.bMax <= 0 || inp.bMax < inp.bMin) warns.push('碱度窗口不合理（需 Bmax >= Bmin 且 >0）。');
  if (inp.mgoMax < inp.mgoMin) warns.push('MgO窗口不合理（需 MgOmax >= MgOmin）。');

  return warns;
}

// 显示警告
function renderWarnings(warns) {
  const warnings = qs('#warnings');
  
  if (warns.length === 0) {
    warnings.innerHTML = '<p>无明显问题</p>';
    return;
  }

  const ul = document.createElement('ul');
  for (let i = 0; i < warns.length; i++) {
    const li = document.createElement('li');
    li.textContent = warns[i];
    ul.appendChild(li);
  }
  warnings.innerHTML = '';
  warnings.appendChild(ul);
}

// 按中值计算
function runMid() {
  const inp = readInputs();
  const warns = validateCommon(inp);

  const targetB = (inp.bMin + inp.bMax) / 2.0;
  const targetMgO = (inp.mgoMin + inp.mgoMax) / 2.0;

  const sol = computeSolution(targetB, targetMgO, inp);
  if (!sol.ok) {
      warns.push(sol.reason);
      renderWarnings(warns);
      const summary = qs('#summary');
      summary.innerHTML = '<p>该组合不可解，请调整目标或材料参数。</p>';
      const resultTableBody = qs('#resultTableBody');
      resultTableBody.innerHTML = '';
      return;
    }

  // 检查是否在窗口内（应该接近；数值可能略有偏差）
  if (sol.B < inp.bMin - 1e-6 || sol.B > inp.bMax + 1e-6) warns.push('计算结果碱度不在窗口内（请检查SiO2与材料参数）。');
  if (sol.MgOPct < inp.mgoMin - 1e-6 || sol.MgOPct > inp.mgoMax + 1e-6) warns.push('计算结果MgO%不在窗口内（请检查渣量与材料参数）。');

  showResult(sol, inp, '按窗口中值');
  renderWarnings(warns);
  toast('已计算', '右侧已生成推荐加料与校核结果。');
}

// 模式切换
function onModeChange() {
  const m = qs('#sio2Mode').value;
  qs('#sio2Direct').style.display = m === 'direct' ? 'flex' : 'none';
  qs('#sio2FromSi').style.display = m === 'fromSi' ? 'flex' : 'none';
}

// 填入示例
function fillExample() {
  qs('#steelTon').value = '150';
  qs('#slagMode').value = 'kgt';
  qs('#slagValue').value = '120';
  qs('#sio2Mode').value = 'direct';
  onModeChange();
  qs('#sio2Kg').value = '3500';
  qs('#bMin').value = '2.8';
  qs('#bMax').value = '3.2';
  qs('#mgoMin').value = '8.0';
  qs('#mgoMax').value = '10.0';
  qs('#limeCaO').value = '85';
  qs('#limeMgO').value = '2.0';
  qs('#limePrice').value = '350';
  qs('#doloCaO').value = '30';
  qs('#doloMgO').value = '20';
  qs('#doloPrice').value = '300';
  qs('#mgoOtherKg').value = '0';
  toast('示例已填入', '可点击按中值计算或最低成本。');
}

// 清除数据
function clearData() {
  qs('#steelTon').value = '';
  qs('#slagMode').value = 'kgt';
  qs('#slagValue').value = '';
  qs('#sio2Mode').value = 'direct';
  onModeChange();
  qs('#sio2Kg').value = '';
  qs('#siIn').value = '';
  qs('#siTarget').value = '';
  qs('#bMin').value = '';
  qs('#bMax').value = '';
  qs('#mgoMin').value = '';
  qs('#mgoMax').value = '';
  qs('#limeCaO').value = '';
  qs('#limeMgO').value = '';
  qs('#limePrice').value = '';
  qs('#doloCaO').value = '';
  qs('#doloMgO').value = '';
  qs('#doloPrice').value = '';
  qs('#mgoOtherKg').value = '';
  
  const summary = qs('#summary');
  summary.innerHTML = '<p>点击“计算”生成结果。</p>';
  const resultTableBody = qs('#resultTableBody');
  resultTableBody.innerHTML = '';
  renderWarnings([]);
  
  toast('数据已清除', '请重新输入参数。');
}

// 绑定事件
function bindEvents() {
  qs('#sio2Mode').addEventListener('change', onModeChange);
  qs('#btnCalcMid').addEventListener('click', runMid); 
  qs('#btnExample').addEventListener('click', fillExample);
  qs('#btnClear').addEventListener('click', clearData);
}

// 初始化
function init() {
  onModeChange();
  bindEvents();
}

// 页面加载完成后初始化
window.onload = init;