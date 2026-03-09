// 密度影响系数表 (g/cm³ per 1%)
const kiValues = {
    cr: 0.03,
    ni: 0.012,
    mo: 0.015,
    mn: 0.005,
    w: 0.1,
    al: -0.05,
    si: -0.008,
    c: -0.06
};

// 基础密度 (g/cm³)
const baseDensity = 7.85;

// 热膨胀系数 (1/°C)
const thermalExpansionCoeff = 1.2e-5;

function calculate() {
    // 获取所有元素含量
    const elements = {
        cr: parseFloat(document.getElementById('cr').value) || 0,
        ni: parseFloat(document.getElementById('ni').value) || 0,
        mo: parseFloat(document.getElementById('mo').value) || 0,
        mn: parseFloat(document.getElementById('mn').value) || 0,
        w: parseFloat(document.getElementById('w').value) || 0,
        al: parseFloat(document.getElementById('al').value) || 0,
        si: parseFloat(document.getElementById('si').value) || 0,
        c: parseFloat(document.getElementById('c').value) || 0
    };
    
    const temperature = parseFloat(document.getElementById('temperature').value) || 20;
    
    // 计算合金修正值
    let densityCorrection = 0;
    for (const element in elements) {
        densityCorrection += kiValues[element] * elements[element];
    }
    
    // 计算常温密度 (20°C时的密度)
    const density20 = baseDensity + densityCorrection;
    
    // 计算高温下的密度
    const density = density20 / (1 + 3 * thermalExpansionCoeff * (temperature - 20));
    
    // 显示结果，保留4位小数
    document.getElementById('result').textContent = density.toFixed(4) + ' g/cm³';
}

// 显示KI推荐表弹窗
function showKiTable() {
    document.getElementById('kiModal').style.display = 'block';
}

// 关闭KI推荐表弹窗
function closeKiTable() {
    document.getElementById('kiModal').style.display = 'none';
}

// 点击弹窗外部关闭弹窗
window.onclick = function(event) {
    const modal = document.getElementById('kiModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}