/**
 * 连铸壳厚-拉速安全核算计算器
 *
 * 核心逻辑：
 *  - 凝固系数 K（mm/√min）
 *  - 结晶器有效长度 L（m）
 *  - 拉速 v（m/min）
 *  - 最低壳厚 δ_min（mm）
 *  - 计算：
 *    t = L / v  （停留时间，min）
 *    δ = K × √t = K × √(L / v)  （壳厚，mm）
 *    v_max = L × (K / δ_min)²  （最大拉速，m/min）
 *    L_req = v × (δ_min / K)²  （所需结晶器长度，m）
 */

// 工具函数
function qs(selector) {
  return document.querySelector(selector);
}

function num(value, defaultValue = 0) {
  const numValue = parseFloat(value);
  return isNaN(numValue) ? defaultValue : numValue;
}

function fmt(value, decimals = 2) {
  return value.toFixed(decimals);
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

// 显示警告
function renderWarnings(list) {
  const warningsBox = qs('#warnings');
  
  if (list.length === 0) {
    warningsBox.innerHTML = '<p>无明显问题</p>';
    return;
  }
  
  const ul = document.createElement('ul');
  ul.style.margin = '8px 0 0 18px';
  for (let i = 0; i < list.length; i++) {
    const li = document.createElement('li');
    li.textContent = list[i];
    ul.appendChild(li);
  }
  warningsBox.innerHTML = '';
  warningsBox.appendChild(ul);
}

// 更新壳厚对比图表（基于HTML）
function updateGauge(delta, dMin) {
  const statusBadge = qs('#statusBadge');
  const gaugeBar = qs('#gaugeBar');
  const gaugeMarker = qs('#gaugeMarker');
  const deltaLabel = qs('#deltaLabel');
  const deltaMinLabel = qs('#deltaMinLabel');
  
  // 计算比例
  const max = Math.max(dMin * 1.6, dMin + 5, 1);
  const ratio = Math.max(0, Math.min(1, delta / max));
  const ratioMin = Math.max(0, Math.min(1, dMin / max));
  
  // 更新状态标签
  const ok = delta >= dMin;
  statusBadge.textContent = ok ? '满足最低壳厚' : '壳厚不足(风险)';
  statusBadge.className = `status-badge ${ok ? 'status-good' : 'status-bad'}`;
  
  // 更新条形图
  gaugeBar.style.width = `${ratio * 100}%`;
  gaugeMarker.style.left = `${ratioMin * 100}%`;
  
  // 更新数值标签
  deltaLabel.textContent = `δ=${fmt(delta, 2)}`;
  deltaMinLabel.textContent = `δ_min=${fmt(dMin, 2)}`;
}

// 计算函数
function calc() {
  const K = num(qs('#K').value);
  const L = num(qs('#L').value);
  const v = num(qs('#v').value);
  const dMin = num(qs('#dMin').value);
  const warns = [];

  // 输入验证
  if (K <= 0) warns.push('凝固系数 K 必须 > 0。');
  if (L <= 0) warns.push('结晶器有效长度 L 必须 > 0。');
  if (v <= 0) warns.push('拉速 v 必须 > 0。');
  if (dMin <= 0) warns.push('最低壳厚 δ_min 必须 > 0。');

  // 计算
  const t = (v > 0) ? L / v : NaN; // 停留时间（min）
  const delta = (t > 0) ? K * Math.sqrt(t) : NaN; // 壳厚（mm）
  const vmax = (dMin > 0) ? L * Math.pow(K / dMin, 2) : NaN; // 最大拉速（m/min）
  const Lreq = (K > 0) ? v * Math.pow(dMin / K, 2) : NaN; // 达到 δ_min 所需结晶器长度（m）

  // 显示结果表格
  const resultTableBody = qs('#resultTableBody');
  resultTableBody.innerHTML = '';
  
  const rows = [
    ['停留时间 t（min）', fmt(t, 3)],
    ['壳厚 δ（mm）', fmt(delta, 2)],
    ['最大拉速 v_max（m/min）', fmt(vmax, 3)],
    ['达到 δ_min 所需 L_req（m）', fmt(Lreq, 3)]
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

  // 生成警告
  if (Number.isFinite(delta) && delta < dMin) {
    warns.push('壳厚 δ 低于 δ_min：存在漏钢风险（建议降低拉速或增强冷却/提高K）。');
  }
  if (Number.isFinite(vmax) && v > vmax) {
    warns.push('当前拉速高于 v_max：建议降低拉速或调整工艺参数。');
  }
  if (Number.isFinite(t) && t < 0.2) {
    warns.push('停留时间很短（<0.2 min），请确认 L、v 单位是否正确。');
  }

  // 显示结论
  const summary = qs('#summary');
  summary.innerHTML = `
    <p>当前壳厚：<b>${fmt(delta, 2)} mm</b>（δ_min=${fmt(dMin, 2)} mm）</p>
    <p>允许最大拉速：<b>${fmt(vmax, 3)} m/min</b></p>
  `;

  // 显示警告
  renderWarnings(warns);

  // 更新图表
  updateGauge(Number.isFinite(delta) ? delta : 0, dMin > 0 ? dMin : 12);

  // 提示
  toast('已计算', '右侧已生成壳厚/拉速核算与风险提示。');
}

// 填入示例
function fillExample() {
  qs('#K').value = '25';
  qs('#L').value = '0.9';
  qs('#v').value = '1.6';
  qs('#dMin').value = '12';
  toast('示例已填入', '可点击计算。');
}

// 清除数据
function clearData() {
  qs('#K').value = '';
  qs('#L').value = '';
  qs('#v').value = '';
  qs('#dMin').value = '';
  
  const summary = qs('#summary');
  summary.innerHTML = '<p>点击“计算”生成结果。</p>';
  
  const resultTableBody = qs('#resultTableBody');
  resultTableBody.innerHTML = '';
  
  renderWarnings([]);
  
  updateGauge(0, 12);
  
  toast('数据已清除', '请重新输入参数。');
}

// 绑定事件
function bindEvents() {
  qs('#btnCalc').addEventListener('click', calc);
  qs('#btnExample').addEventListener('click', fillExample);
  qs('#btnClear').addEventListener('click', clearData);
}

// 初始化
function init() {
  // 初始更新图表
  updateGauge(0, 12);
  
  // 绑定事件
  bindEvents();
}

// 页面加载完成后初始化
window.onload = init;