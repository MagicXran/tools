/**
 * 渣氧化性口径换算与判级计算器
 *
 * 核心逻辑：
 *  - FeO/Fe₂O₃/ΣFeO/TFe 互转
 *  - 根据配置的阈值进行判级
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
  const warnings = qs('#warnings');
  
  if (list.length === 0) {
    warnings.innerHTML = '<p>无明显问题</p>';
    return;
  }
  
  const ul = document.createElement('ul');
  ul.style.margin = '8px 0 0 18px';
  for (let i = 0; i < list.length; i++) {
    const li = document.createElement('li');
    li.textContent = list[i];
    ul.appendChild(li);
  }
  warnings.innerHTML = '';
  warnings.appendChild(ul);
}

// 模式切换
function onModeChange() {
  const m = qs('#mode').value;
  // 这里可以根据需要添加不同输入模式的显示/隐藏逻辑
}

// 计算逻辑
function calc() {
  const mode = qs('#mode').value;
  const gradeBasis = qs('#gradeBasis').value;
  const th1 = num(qs('#th1').value);
  const th2 = num(qs('#th2').value);
  const warns = [];

  if (!(th2 > th1)) warns.push('阈值设置不合理：需要 中/高阈值 > 低/中阈值。');

  let feo = NaN, fe2o3 = NaN, sigma = NaN, tfe = NaN;

  if (mode === 'feo_fe2o3') {
    feo = num(qs('#feo').value);
    fe2o3 = num(qs('#fe2o3').value);

    sigma = feo + 0.9 * fe2o3;
    // TFe as Fe element mass%:
    tfe = feo * (56/72) + fe2o3 * (112/160);

    if (feo < 0 || fe2o3 < 0) warns.push('FeO 或 Fe2O3 不应为负。');
    if (feo + fe2o3 > 100.0) warns.push('FeO% + Fe2O3% > 100%，请检查化验输入。');
  } else if (mode === 'sigma') {
    sigma = num(qs('#sigma').value);
    if (sigma < 0) warns.push('SigmaFeO 不应为负。');
    // Approximate conversion: assume FeO-equivalent
    tfe = sigma * (56/72);
  } else {
    tfe = num(qs('#tfe').value);
    if (tfe < 0) warns.push('TFe 不应为负。');
    sigma = tfe * (72/56); // FeO-equivalent
  }

  // Determine grade
  const gradeValue = gradeBasis === 'sigma' ? sigma : tfe;
  const gradeName = gradeBasis === 'sigma' ? 'SigmaFeO' : 'TFe';

  let level = "—";
  let kind = "warn";
  if (Number.isFinite(gradeValue)) {
    if (gradeValue < th1) { level = "低"; kind = "ok"; }
    else if (gradeValue <= th2) { level = "中"; kind = "warn"; }
    else { level = "高"; kind = "err"; }
  } else {
    warns.push('无法计算判级值（输入不完整或非数字）。');
  }

  // 显示判级结果
  const summaryBox = qs('#summary');
  const badgeClass = kind === "ok" ? "badge ok" : (kind === "err" ? "badge err" : "badge warn");
  summaryBox.innerHTML = '<span class="' + badgeClass + '">' + gradeName + ' 判级：' + level + '</span>（判级值=' + fmt(gradeValue, 2) + '）';

  // 显示详细结果
  const resultTableBody = qs('#resultTableBody');
  resultTableBody.innerHTML = '';
  
  const rows = [
    ['SigmaFeO（%）', fmt(sigma, 2)],
    ['TFe（%）', fmt(tfe, 2)],
  ];
  
  if (mode === 'feo_fe2o3') {
    rows.unshift(['Fe2O3（%）', fmt(fe2o3, 2)]);
    rows.unshift(['FeO（%）', fmt(feo, 2)]);
  }
  
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

  // 显示告警
  renderWarnings(warns);
  toast('已计算', '右侧展示了换算结果与判级。');
}

// 填入示例
function fillExample() {
  qs('#mode').value = 'feo_fe2o3';
  qs('#gradeBasis').value = 'sigma';
  qs('#feo').value = '18';
  qs('#fe2o3').value = '4';
  qs('#th1').value = '15';
  qs('#th2').value = '25';
  toast('示例已填入', '点击开始计算进行换算与判级。');
}

// 清除数据
function clearData() {
  qs('#mode').value = 'feo_fe2o3';
  qs('#gradeBasis').value = 'sigma';
  qs('#feo').value = '';
  qs('#fe2o3').value = '';
  qs('#th1').value = '';
  qs('#th2').value = '';
  
  const summaryBox = qs('#summary');
  summaryBox.innerHTML = '<p>点击“计算”生成结果。</p>';
  
  const resultTableBody = qs('#resultTableBody');
  resultTableBody.innerHTML = '';
  
  renderWarnings([]);
  
  toast('数据已清除', '请重新输入参数。');
}

// 绑定事件
function bindEvents() {
  qs('#mode').addEventListener('change', onModeChange);
  qs('#btnCalc').addEventListener('click', calc); 
  qs('#btnExample').addEventListener('click', fillExample);
  qs('#btnClear').addEventListener('click', clearData);
}

// 初始化
function init() {
  onModeChange();
  bindEvents();
  renderWarnings([]);
}

// 页面加载完成后初始化
window.onload = init;