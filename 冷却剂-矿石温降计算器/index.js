/**
 * 冷却剂-矿石温降计算器
 * 
 * 工程公式：
 * Q_need (kJ) = m_steel(kg) × Cp_steel(kJ/kg·K) × (T_current - T_target)
 * q (kJ/kg) = Cp_s × (T_final - T0) + H_reaction
 * 或 q = Cp_s × (Tm - T0) + L + Cp_l × (T_final - Tm) + H_reaction
 * m_coolant (kg) = Q_need / q
 */

(function() {
  // 工具函数
  function qs(selector) {
    return document.querySelector(selector);
  }
  
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }
  
  function num(val, fallback) {
    var n = Number(val);
    return isNaN(n) ? (fallback !== undefined ? fallback : 0) : n;
  }
  
  function fmt(val, decimals) {
    return num(val).toFixed(decimals);
  }
  
  function fmtInt(val) {
    return Math.round(num(val)).toString();
  }
  
  function tonToKg(ton) {
    return num(ton) * 1000.0;
  }
  
  function toast(title, message) {
    var toastEl = qs('#toast');
    var titleEl = qs('#toastTitle');
    var msgEl = qs('#toastMsg');
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    
    toastEl.style.display = 'block';
    
    setTimeout(function() {
      toastEl.style.display = 'none';
    }, 3000);
  }
  
  var tbodyRes = qs('#resultTableBody');
  var summary = qs('#summary');
  var warningsBox = qs('#warnings');
  
  // 渲染警告信息
  function renderWarnings(list) {
    if (list.length === 0) {
      warningsBox.innerHTML = '<p>无明显问题</p>';
      return;
    }
    
    var ul = document.createElement('ul');
    for (var i = 0; i < list.length; i++) {
      var li = document.createElement('li');
      li.textContent = list[i];
      ul.appendChild(li);
    }
    
    warningsBox.innerHTML = '';
    warningsBox.appendChild(ul);
  }
  
  // 处理热模型变化
  function onThermalModelChange() {
    var m = qs('#thermalModel').value;
    var show = (m === 'melt');
    // 切换熔化相关输入的禁用状态
    qs('#cpL').disabled = !show;
    qs('#tm').disabled = !show;
    qs('#latent').disabled = !show;
  }
  
  // 应用模板
  function applyTemplate(name) {
    if (name === 'scrap') {
      qs('#thermalModel').value = 'melt';
      qs('#cpS').value = '0.70';
      qs('#cpL').value = '0.82';
      qs('#tm').value = '1538';
      qs('#latent').value = '247';
      qs('#rxn').value = '0';
    } else if (name === 'ore') {
      qs('#thermalModel').value = 'solidOnly';
      qs('#cpS').value = '1.00';
      qs('#cpL').value = '1.00';
      qs('#tm').value = '9999'; // 在 solidOnly 模式下不使用
      qs('#latent').value = '0';
      qs('#rxn').value = '0'; // 默认值
    }
    onThermalModelChange();
  }
  
  // 读取输入
  function readInputs() {
    var steelTon = num(qs('#steelTon').value);
    var steelKg = tonToKg(steelTon);
    
    var cpSteel = num(qs('#cpSteel').value);
    var tCur = num(qs('#tCur').value);
    var tTgt = num(qs('#tTgt').value);
    
    var mode = qs('#mode').value;
    var coolantKg = num(qs('#coolantKg').value);
    
    var t0 = num(qs('#t0').value);
    var thermalModel = qs('#thermalModel').value;
    var cpS = num(qs('#cpS').value);
    var cpL = num(qs('#cpL').value);
    var tm = num(qs('#tm').value);
    var latent = num(qs('#latent').value);
    var rxn = num(qs('#rxn').value);
    
    // 校验
    var warns = [];
    if (steelTon <= 0) warns.push('钢水量必须 > 0');
    if (cpSteel <= 0) warns.push('钢水比热 Cp 必须 > 0');
    if (tCur <= 0) warns.push('当前温度必须 > 0');
    if (tTgt <= 0) warns.push('目标温度必须 > 0');
    if (coolantKg < 0) warns.push('冷却剂质量必须 ≥ 0');
    if (t0 < 0) warns.push('冷却剂初始温度 T0 必须 ≥ 0');
    if (cpS <= 0) warns.push('固相比热 Cp_s 必须 > 0');
    if (cpL <= 0) warns.push('液相比热 Cp_l 必须 > 0');
    if (tm <= 0) warns.push('熔点 Tm 必须 > 0');
    if (latent < 0) warns.push('熔化潜热 L 必须 ≥ 0');
    
    return {
      steelTon: steelTon,
      steelKg: steelKg,
      cpSteel: cpSteel,
      tCur: tCur,
      tTgt: tTgt,
      mode: mode,
      coolantKg: coolantKg,
      t0: t0,
      thermalModel: thermalModel,
      cpS: cpS,
      cpL: cpL,
      tm: tm,
      latent: latent,
      rxn: rxn,
      warns: warns
    };
  }
  
  // 计算冷却剂吸收的热量 (kJ/kg)
  function calcCoolantHeatPerKg(tFinal, params) {
    var t0 = params.t0;
    var thermalModel = params.thermalModel;
    var cpS = params.cpS;
    var cpL = params.cpL;
    var tm = params.tm;
    var latent = params.latent;
    var rxn = params.rxn;
    
    if (thermalModel === 'solidOnly') {
      return cpS * (tFinal - t0) + rxn;
    } else {
      if (tFinal <= tm) {
        return cpS * (tFinal - t0) + rxn;
      } else {
        return cpS * (tm - t0) + latent + cpL * (tFinal - tm) + rxn;
      }
    }
  }
  
  // 计算：给定冷却剂质量，算温度变化
  function calcTempAfter(mSteelKg, cpSteel, tCur, coolantKg, params) {
    var tAfter = tCur;
    var q = calcCoolantHeatPerKg(tAfter, params);
    var QCoolant = coolantKg * q;
    var QSteel = mSteelKg * cpSteel * (tCur - tAfter);
    
    // 简单迭代一次（假设 tAfter 接近 tCur）
    tAfter = tCur - (coolantKg * q) / (mSteelKg * cpSteel);
    return tAfter;
  }
  
  // 计算：给定目标温度，反算需要的冷却剂质量
  function calcNeedCoolantMass(mSteelKg, cpSteel, tCur, tTgt, params) {
    if (tTgt >= tCur) {
      return 0;
    }
    var QNeed = mSteelKg * cpSteel * (tCur - tTgt);
    var q = calcCoolantHeatPerKg(tTgt, params);
    if (q <= 0) {
      toast('计算错误', '冷却剂吸热量计算结果 ≤0，无法反算。请检查热参数。');
      return null;
    }
    return QNeed / q;
  }
  
  // 计算函数
  function calc() {
    var inputs = readInputs();
    
    var steelTon = inputs.steelTon;
    var steelKg = inputs.steelKg;
    var cpSteel = inputs.cpSteel;
    var tCur = inputs.tCur;
    var tTgt = inputs.tTgt;
    var mode = inputs.mode;
    var coolantKg = inputs.coolantKg;
    var t0 = inputs.t0;
    var thermalModel = inputs.thermalModel;
    var cpS = inputs.cpS;
    var cpL = inputs.cpL;
    var tm = inputs.tm;
    var latent = inputs.latent;
    var rxn = inputs.rxn;
    var warns = inputs.warns;
    
    var dTneed = tCur - tTgt;
    
    if (mode === 'needMass') {
      if (dTneed <= 0) {
        warns.push('当前温度 <= 目标温度：无需冷却（或需要加热）。');
      }
    }
    
    // 选择冷却剂加热的最终温度：假设它达到接近目标的钢水温度
    var Tfinal = (mode === 'needMass') ? tTgt : tCur; // 在 tempAfter 模式下，假设冷却剂加热到当前熔池温度
    var params = { t0: t0, thermalModel: thermalModel, cpS: cpS, cpL: cpL, tm: tm, latent: latent, rxn: rxn };
    var q = calcCoolantHeatPerKg(Tfinal, params);
    
    if (!Number.isFinite(q) || q <= 0) {
      warns.push('冷却剂单位吸热 q <= 0：请检查冷却剂热参数（Cp/潜热/反应热）。');
    }
    
    tbodyRes.innerHTML = '';
    
    var resultSummary = '';
    
    // 只有当没有输入错误时才进行计算
    if (warns.length === 0) {
      var Qneed = steelKg * cpSteel * Math.max(dTneed, 0); // 需要移除的热量（如果 dTneed>0）
      
      if (mode === 'needMass') {
        var mc = (q > 0) ? Qneed / q : NaN;
        
        // 每摄氏度需要的冷却剂质量
        var kgPerC = (q > 0) ? (steelKg * cpSteel) / q : NaN;
        
        resultSummary = 
          '<p><b>需要降温：</b>' + fmt(Math.max(dTneed, 0), 1) + ' C</p>' +
          '<p><b>估算冷却剂用量：</b>' + fmt(mc, 0) + ' kg（约 ' + fmt(mc / steelTon, 1) + ' kg/t）</p>' +
          '<p><b>每降 1℃ 约需：</b>' + fmt(kgPerC, 2) + ' kg/C</p>';
        
        var rows = [
          ['钢水热容（kJ/C）', fmt(steelKg * cpSteel, 1)],
          ['冷却需求 Q_need（kJ）', fmt(Qneed, 0)],
          ['冷却剂单位吸热 q（kJ/kg）', fmt(q, 1)],
          ['反算冷却剂质量（kg）', fmt(mc, 0)],
          ['每摄氏度冷却剂用量（kg/C）', fmt(kgPerC, 2)]
        ];
        for (var i = 0; i < rows.length; i++) {
          var row = document.createElement('tr');
          row.innerHTML = `
            <td>${rows[i][0]}</td>
            <td>${rows[i][1]}</td>
          `;
          tbodyRes.appendChild(row);
        }
        
        if (mc < 0 || !Number.isFinite(mc)) warns.push('结果不可靠：冷却剂质量计算结果异常。');
        if (mc > 20000) warns.push('反算冷却剂质量很大（>20t）。请确认温差、Cp 或冷却剂参数是否合理。');
      } else {
        // tempAfter 模式：计算给定冷却剂质量下的温度变化
        var Qcool = coolantKg * q; // 吸收的热量
        var dT = Qcool / (steelKg * cpSteel);
        var tNew = tCur - dT;
        
        resultSummary = 
          '<p>冷却剂质量：<b>' + fmt(coolantKg, 0) + ' kg</b></p>' +
          '<p>预计降温：<b>' + fmt(dT, 1) + ' C</b> => 新温度约 <b>' + fmt(tNew, 1) + ' C</b></p>';
        
        var rows2 = [
          ['钢水热容（kJ/C）', fmt(steelKg * cpSteel, 1)],
          ['冷却剂单位吸热 q（kJ/kg）', fmt(q, 1)],
          ['冷却总吸热 Q_cool（kJ）', fmt(Qcool, 0)],
          ['预计降温 dT（C）', fmt(dT, 1)],
          ['新温度（C）', fmt(tNew, 1)]
        ];
        for (var j = 0; j < rows2.length; j++) {
          var row = document.createElement('tr');
          row.innerHTML = `
            <td>${rows2[j][0]}</td>
            <td>${rows2[j][1]}</td>
          `;
          tbodyRes.appendChild(row);
        }
        
        if (tNew < tTgt) warns.push('计算后温度低于目标温度：存在过冷风险。');
      }
    } else {
      // 有输入错误，显示错误信息
      resultSummary = '<p>请修正输入错误后重新计算。</p>';
    }
    
    summary.innerHTML = resultSummary;
    renderWarnings(warns);
    toast('已计算', '右侧已生成温降/用量估算与校验。');
  }
  
  // 填入示例数据
  function fillExample() {
    qs('#steelTon').value = '150';
    qs('#cpSteel').value = '0.84';
    qs('#tCur').value = '1700';
    qs('#tTgt').value = '1650';
    qs('#mode').value = 'needMass';
    qs('#coolantKg').value = '2000';
    qs('#template').value = 'scrap';
    applyTemplate('scrap');
    qs('#t0').value = '25';
    
    toast('示例已填入', '可直接点击计算。');
  }
  
  // 清除数据
  function clearData() {
    qs('#steelTon').value = '';
    qs('#cpSteel').value = '';
    qs('#tCur').value = '';
    qs('#tTgt').value = '';
    qs('#mode').value = 'needMass';
    qs('#coolantKg').value = '';
    qs('#template').value = 'scrap';
    qs('#t0').value = '';
    qs('#thermalModel').value = 'melt';
    qs('#cpS').value = '';
    qs('#cpL').value = '';
    qs('#tm').value = '';
    qs('#latent').value = '';
    qs('#rxn').value = '';
    
    tbodyRes.innerHTML = '';
    summary.innerHTML = '<p>点击“计算”生成结果。</p>';
    renderWarnings([]);
    
    toast('数据已清除', '请输入新的数据。');
  }
  
  // 处理模板选择
  function onTemplateChange() {
    var template = qs('#template').value;
    if (template === 'custom') return;
    applyTemplate(template);
  }
  
  // 事件绑定
  qs('#btnExample').addEventListener('click', fillExample);
  qs('#btnCalculate').addEventListener('click', calc);
  qs('#btnClear').addEventListener('click', clearData);
  qs('#template').addEventListener('change', onTemplateChange);
  qs('#thermalModel').addEventListener('change', onThermalModelChange);
  
  // 初始化
  onThermalModelChange();
  // 初始显示未计算状态
  summary.innerHTML = '<p>点击“计算”生成结果。</p>';
  renderWarnings([]);
})();