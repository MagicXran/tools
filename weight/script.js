const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeBtns = document.querySelectorAll('.close');
const densityModal = document.getElementById('density-modal');
const steelItems = document.querySelectorAll('.steel-item');

// 关闭弹窗函数
function closeModal(modalElem) {
  modalElem.style.display = 'none';
  if (modalElem === modal) {
    modalBody.innerHTML = '';
  }
}

// 绑定关闭按钮事件
closeBtns.forEach(btn => {
  btn.onclick = function () {
    if (this.parentElement.parentElement === modal) {
      closeModal(modal);
    } else {
      closeModal(densityModal);
    }
  };
});

// 点击空白处关闭弹窗
window.onclick = function (event) {
  if (event.target === modal) {
    closeModal(modal);
  } else if (event.target === densityModal) {
    closeModal(densityModal);
  }
};

// 钢材类型对应配置
const steelConfigs = {
  'round-steel': {
    title: '圆钢',
    imagePath: 'images/jiemian/round-steel.png',
    inputs: [
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (d, L) => Math.pow(d / 2, 2) * L * Math.PI,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  'square-steel': {
    title: '方钢',
    imagePath: 'images/jiemian/square-steel.png',
    inputs: [
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (a, L) => Math.pow(a, 2) * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  'equal-angle-steel': {
    title: '等边角钢',
    imagePath: 'images/jiemian/equal-angle-steel.png',
    inputs: [
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'b', label: 'b(mm)', type: 'number' },
      { name: 'R', label: 'R(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (d, b, R, L) => (d * (b - d) * 2 + Math.pow(d, 2) + (1 - Math.PI / 4) * Math.pow(R, 2)) * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  'steel-plate': {
    title: '钢板',
    imagePath: 'images/jiemian/steel-plate.png',
    inputs: [
      { name: 'b', label: 'b(mm)', type: 'number' },
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (b, d, L) => b * d * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  'flat-steel': {
    title: '扁钢',
    imagePath: 'images/jiemian/flat-steel.png',
    inputs: [
      { name: 'b', label: 'b(mm)', type: 'number' },
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (b, d, L) => b * d * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  'hexagonal-steel': {
    title: '六角钢',
    imagePath: 'images/jiemian/hexagonal-steel.png',
    inputs: [
      { name: 's', label: 's(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (s, L) => Math.pow(s, 2) * 0.866 * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  'octagonal-steel': {
    title: '八角钢',
    imagePath: 'images/jiemian/octagonal-steel.png',
    inputs: [
      { name: 's', label: 's(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (s, L) => Math.pow(s, 2) * L * 0.828,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  'patterned-plate': {
    title: '花纹板',
    imagePath: 'images/jiemian/patterned-plate.png',
    inputs: [
      { name: 'b', label: 'b(mm)', type: 'number' },
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (b, d, L) => b * d * L * 1.070318,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  'thread-steel': {
    title: '螺纹钢',
    imagePath: 'images/jiemian/thread-steel.png',
    inputs: [
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (d, L) => (Math.pow(d, 2) * L * 3.1415926) / 4,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  'channel-steel': {
    title: '槽钢',
    imagePath: 'images/jiemian/channel-steel.png',
    inputs: [
      { name: 'h', label: 'h(mm)', type: 'number' },
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'b', label: 'b(mm)', type: 'number' },
      { name: 't', label: 't(mm)', type: 'number' },
      { name: 'R', label: 'R(mm)', type: 'number' },
      { name: 'r', label: 'r(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (h, d, b, t, R, r, L) => [h * b - (h - 2 * t) * (b - d) + 2 * (1 - 3.1415926 / 4) * (Math.pow(R, 2) - Math.pow(r, 2))] * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  // 新增工字钢配置
  'i-steel': {
    title: '工字钢',
    imagePath: 'images/jiemian/i-steel.png',
    inputs: [
      { name: 'h', label: 'h(mm)', type: 'number' },
      { name: 'b', label: 'b(mm)', type: 'number' },
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 't', label: 't(mm)', type: 'number' },
      { name: 'R', label: 'R(mm)', type: 'number' },
      { name: 'r', label: 'r(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (h, b, d, t, R, r, L) => [h * b - (h - 2 * t) * (b - 2 * d) + (Math.pow(R, 2) - Math.pow(r, 2)) * (4 - 3.1415926)] * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  // 新增H型钢配置
  'h-steel': {
    title: 'H型钢',
    imagePath: 'images/jiemian/h-steel.png',
    inputs: [
      { name: 'h', label: 'h(mm)', type: 'number' },
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'b', label: 'b(mm)', type: 'number' },
      { name: 't', label: 't(mm)', type: 'number' },
      { name: 'R', label: 'R(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (h, d, b, t, R, L) => [h * b - (h - 2 * t) * (b - 2 * d) + Math.pow(R, 2) * (4 - 3.1415926)] * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  // 新增铜管配置
  'copper-pipe': {
    title: '钢管',
    imagePath: 'images/jiemian/copper-pipe.png',
    inputs: [
      { name: 'D', label: 'D(mm)', type: 'number' },
      { name: 's', label: 's(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (D, s, L) => ((Math.pow(D, 2) - Math.pow(D - s * 2, 2)) / 4) * L * 3.1415926,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  // 新增不等边角铜配置
  'unequal-angle-copper': {
    title: '不等边角钢',
    imagePath: 'images/jiemian/unequal-angle-copper.png',
    inputs: [
      { name: 'b', label: 'b(mm)', type: 'number' },
      { name: 'B', label: 'B(mm)', type: 'number' },
      { name: 'd', label: 'd(mm)', type: 'number' },
      { name: 'R', label: 'R(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (b, B, d, R, L) => (d * (b + B - d) + Math.pow(R, 2) * (1 - 3.1415926 / 4)) * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  // 新增方管配置
  'square-pipe': {
    title: '方管',
    imagePath: 'images/jiemian/square-pipe.png',
    inputs: [
      { name: 'w1', label: 'w1(mm)', type: 'number' },
      { name: 'w2', label: 'w2(mm)', type: 'number' },
      { name: 'c', label: 'c(mm)', type: 'number' },
      { name: 'L', label: 'L(mm)', type: 'number' },
    ],
    volumeFormula: (w1, w2, c, L) => (w1 * w2 - (w1 - 2 * c) * (w2 - 2 * c)) * L,
    weightInputs: [{ name: 'rho', label: '密度ρ(g/cm³)', type: 'number' }],
    weightFormula: (V, rho) => (V * rho) / 1000,
  },
  // 可继续添加其他钢材配置
};

// 绑定钢材点击事件
// 绑定钢材点击事件
steelItems.forEach(item => {
  item.onclick = function () {
    const type = this.getAttribute('data-type');
    const config = steelConfigs[type];
    if (!config) return;

    // 构建弹窗内容
    let content = `<h2 style="text-align: left; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);">${config.title}/单重计算</h2>`;

    // 虚线框长度比直线短（设置80%宽度并居中，直线保持100%）
    content +=
      '<div class="diagram-wrapper" style="position: relative; display: block; width: 80%; margin: 0 auto; border: 2px dashed #ccc; padding: 10px; border-radius: 4px; box-sizing: border-box;">';
    content += '<div class="diagram-section" style="text-align: center;">';
    content += `<div class="diagram"><img src="${config.imagePath}" alt="${config.title}截面图" style="max-width: 100%;"></div>`;
    content += '</div>';
    content += '</div>'; // 闭合外层虚线框
    content += '<div style="width: 100%; height: 2px; background-color: #ccc; margin-top: 30px;"></div>';

    // 统一输入框样式（关键调整：设置固定宽度和对齐方式）
    content += '<style>';
    content += '.input-group { margin-bottom: 15px; display: flex; align-items: center; }';
    content += '.input-group label { margin-right: 10px; min-width: 120px; text-align: right; }'; /* 标签右对齐，增加最小宽度确保对齐 */
    content += '.input-group input { width: 200px; padding: 5px; box-sizing: border-box; }'; /* 固定输入框宽度，确保所有输入框一致 */
    content += '.input-group .unit { margin-left: 10px; min-width: 60px; }'; /* 单位固定宽度，防止抖动 */
    // 添加第二步输入框居中样式
    content += '.step2-input-group { margin-bottom: 15px; display: flex; align-items: center; justify-content: center; }';
    content += '.step2-input-group label { margin-right: 10px; min-width: 120px; text-align: right; }';
    content += '.step2-input-group input { width: 200px; padding: 5px; box-sizing: border-box; }';
    content += '.step2-input-group .unit { margin-left: 10px; min-width: 60px; }';
    content += '.calculate-btn { margin-top: 15px; }';
    content += '.density-btn { margin-left: 10px; padding: 3px 8px; }';
    content += '.note { margin-top: 15px; color: #666; font-size: 0.9em; }';
    content += '</style>';

    content += '<div class="step-section">';
    content += '<h3>第一步：体积公式(整数或小数)</h3>';
    content += '<form>';

    // 体积计算输入项
    config.inputs.forEach(input => {
      content += `<div class="input-group">`;
      content += `<label for="${input.name}">${input.name} = </label>`;
      content += `<input type="${input.type}" id="${input.name}" placeholder="" required min="0">`;
      content += `<span class="unit">mm</span>`;
      content += `</div>`;
    });

    content += `<div class="input-group">`;
    content += `<label>体积V = </label>`;
    content += `<input type="text" id="volume-display" placeholder="" readonly>`;
    content += `<span class="unit">mm³</span>`;
    content += `</div>`;

    content += `<button type="button" class="calculate-btn" onclick="calculateVolume('${type}')">计算体积</button>`;
    content += '<div style="width: 100%; height: 2px; background-color: #ccc; margin-top: 30px;"></div>';
    content += '</div>';

    content += '<div class="step-section">';
    content += '<h3>第二步：输入密度</h3>';

    // 重量计算输入项（使用居中样式）
    config.weightInputs.forEach(input => {
      content += `<div class="step2-input-group">`;
      content += `<label for="${input.name}">密度(ρ) = </label>`;
      content += `<input type="${input.type}" id="${input.name}" placeholder="" required min="0">`;
      content += `<span class="unit">g/cm³</span>`;
      content += `<button type="button" class="density-btn" onclick="openDensityModal()">查看密度表</button>`;
      content += `</div>`;
    });

    content += `<div class="step2-input-group">`;
    content += `<label>单重(m=V*ρ/1000) = </label>`;
    content += `<input type="text" id="weight-display" placeholder="" readonly>`;
    content += `<span class="unit">g(克)</span>`;
    content += `</div>`;

    if (type === 'round-steel') {
      content += '<div class="note">备注：其中d为圆截面直径，L为圆钢长度，π=3.14</div>';
    }

    content += `<button type="button" class="calculate-btn" onclick="calculateWeight('${type}')">计算重量</button>`;
    content += '</div>';

    content += '</form>';

    modalBody.innerHTML = content;
    modal.style.display = 'block';
  };
});

// 计算体积函数 - 修改显示方式
window.calculateVolume = function (type) {
  console.log('type', type);
  const config = steelConfigs[type];
  const inputs = config.inputs.map(input => {
    const value = document.getElementById(input.name).value;
    const numValue = Number(value);
    if (numValue < 0) {
      alert(`${input.name}不能为负数，请重新输入！`);
      document.getElementById(input.name).focus();
      throw new Error('输入了负数');
    }
    return value;
  });
  const volume = config.volumeFormula(...inputs.map(Number));
  document.getElementById('volume-display').value = volume.toFixed(2);
};

// 计算重量函数 - 修改显示方式
window.calculateWeight = function (type) {
  const config = steelConfigs[type];
  const volumeValue = parseFloat(document.getElementById('volume-display').value);
  const rho = document.getElementById(config.weightInputs[0].name).value;
  const rhoValue = Number(rho);
  if (rhoValue < 0) {
    alert('密度不能为负数，请重新输入！');
    document.getElementById(config.weightInputs[0].name).focus();
    return;
  }
  const weight = config.weightFormula(volumeValue, rhoValue);
  document.getElementById('weight-display').value = weight.toFixed(2);
};

// 打开密度表弹窗函数
window.openDensityModal = function () {
  densityModal.style.display = 'block';
};
