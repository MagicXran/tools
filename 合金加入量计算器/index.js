/**
 * 合金加入量计算器
 * 
 * 工程公式：
 * element_needed_kg = (target% - current%) / 100 * steel_mass_kg
 * alloy_kg = element_needed_kg / (recovery × alloy_element_fraction)
 * 
 * 说明：
 * - 百分比输入为质量百分比（wt%）
 * - 回收率和合金含量也以百分比形式给出，计算时转换为小数
 */

(function() {
  // 工具函数
  function qs(selector) {
    return document.querySelector(selector);
  }
  
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }
  
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var key in attrs) {
        if (attrs.hasOwnProperty(key)) {
          el.setAttribute(key, attrs[key]);
        }
      }
    }
    if (children) {
      children.forEach(function(child) {
        if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child));
        } else {
          el.appendChild(child);
        }
      });
    }
    return el;
  }
  
  function num(val, fallback) {
    var n = Number(val);
    return isNaN(n) ? (fallback !== undefined ? fallback : 0) : n;
  }
  
  function pctToFrac(pct) {
    return num(pct) / 100.0;
  }
  
  function tonToKg(ton) {
    return num(ton) * 1000.0;
  }
  
  function fmt(val, decimals) {
    return num(val).toFixed(decimals);
  }
  
  function fmtInt(val) {
    return Math.round(num(val)).toString();
  }
  
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, num(val)));
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
  
  // 元素列表
  var ELS = ["Mn", "Si", "Al", "Cr", "Ni", "Mo", "V", "Ti", "Nb", "B", "C"];
  
  var tbody = qs('#alloyTableBody');
  var tbodyRes = qs('#resultTableBody');
  var summary = qs('#summary');
  var warningsBox = qs('#warnings');
  
  // 创建合金行
  function makeRow(data) {
    if (!data) data = {};
    var row = h('tr', {}, []);
    
    var name = h('td', {}, [h('input', {type: 'text', value: data.name || 'FeMn', placeholder: '例如 FeMn75'})]);
    
    var el = h('td', {}, [(function() {
      var sel = h('select', {}, []);
      for (var i = 0; i < ELS.length; i++) {
        sel.appendChild(h('option', {value: ELS[i]}, [ELS[i]]));
      }
      sel.value = data.element || 'Mn';
      return sel;
    })()]);
    
    var content = h('td', {}, [h('input', {type: 'number', step: '0.1', value: data.contentPct != null ? data.contentPct : 75})]);
    var rec = h('td', {}, [h('input', {type: 'number', step: '0.1', value: data.recoveryPct != null ? data.recoveryPct : 85})]);
    var cur = h('td', {}, [h('input', {type: 'number', step: '0.001', value: data.currentPct != null ? data.currentPct : 0.12})]);
    var tgt = h('td', {}, [h('input', {type: 'number', step: '0.001', value: data.targetPct != null ? data.targetPct : 0.25})]);
    var price = h('td', {}, [h('input', {type: 'number', step: '1', value: data.priceYuanPerTon != null ? data.priceYuanPerTon : '', placeholder: '可选'})]);
    
    var op = h('td', {}, [(function() {
      var btn = h('span', {}, ['删除']);
      btn.addEventListener('click', function() {
        row.remove();
      });
      return btn;
    })()]);
    
    row.appendChild(name);
    row.appendChild(el);
    row.appendChild(content);
    row.appendChild(rec);
    row.appendChild(cur);
    row.appendChild(tgt);
    row.appendChild(price);
    row.appendChild(op);
    
    return row;
  }
  
  // 读取表格数据
  function readRows() {
    var rows = [];
    var trs = tbody.querySelectorAll('tr');
    
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      var tds = tr.querySelectorAll('td');
      
      var getInput = function(td) {
        return td.querySelector('input, select');
      };
      
      var name = getInput(tds[0]).value.trim() || 'Alloy';
      var element = getInput(tds[1]).value;
      var contentPct = num(getInput(tds[2]).value);
      var recoveryPct = num(getInput(tds[3]).value);
      var currentPct = num(getInput(tds[4]).value);
      var targetPct = num(getInput(tds[5]).value);
      var priceYuanPerTon = num(getInput(tds[6]).value, NaN);
      
      rows.push({
        name: name,
        element: element,
        contentPct: contentPct,
        recoveryPct: recoveryPct,
        currentPct: currentPct,
        targetPct: targetPct,
        priceYuanPerTon: priceYuanPerTon
      });
    }
    
    return rows;
  }
  
  // 渲染警告信息
  function renderWarnings(list) {
    if (list.length === 0) {
      warningsBox.innerHTML = '<p>无明显问题</p>';
      return;
    }
    
    var ul = h('ul', {}, []);
    for (var i = 0; i < list.length; i++) {
      ul.appendChild(h('li', {}, [list[i]]));
    }
    
    warningsBox.innerHTML = '';
    warningsBox.appendChild(ul);
  }
  
  // 计算函数
  function calc() {
    var steelTon = num(qs('#steelTon').value);
    var steelKg = tonToKg(steelTon);
    
    var unc = num(qs('#recUnc').value, 0);
    
    var rows = readRows();
    var warns = [];
    
    if (steelKg <= 0) {
      warns.push('钢水量必须 > 0。');
    }
    
    tbodyRes.innerHTML = '';
    
    var totalAlloyKg = 0;
    var totalCost = 0;
    var ok = true;
    
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var deltaPct = r.targetPct - r.currentPct;
      
      // 计算需要的元素质量（kg）
      var elementKg = Math.max(deltaPct, 0) / 100.0 * steelKg;
      
      // 转换为小数
      var content = pctToFrac(r.contentPct);
      var rec = pctToFrac(r.recoveryPct);
      
      var alloyKg = 0;
      var lowKg = 0;
      var highKg = 0;
      
      if (deltaPct <= 0) {
        alloyKg = 0;
      } else {
        if (content <= 0) {
          ok = false;
          warns.push(r.name + '：元素含量必须 > 0。');
        }
        if (rec <= 0) {
          ok = false;
          warns.push(r.name + '：回收率必须 > 0。');
        }
        
        alloyKg = elementKg / (content * rec);
        
        var recLow = clamp(pctToFrac(r.recoveryPct - unc), 0.0001, 1.0);
        var recHigh = clamp(pctToFrac(r.recoveryPct + unc), 0.0001, 1.0);
        
        // 回收率越低，需要的合金越多，所以是上限
        highKg = elementKg / (content * recLow);
        lowKg = elementKg / (content * recHigh);
      }
      
      var cost = Number.isFinite(r.priceYuanPerTon) ? (alloyKg / 1000.0) * r.priceYuanPerTon : NaN;
      if (Number.isFinite(cost)) {
        totalCost += cost;
      }
      
      totalAlloyKg += alloyKg;
      
      tbodyRes.appendChild(h('tr', {}, [
        h('td', {}, [r.name]),
        h('td', {}, [r.element]),
        h('td', {}, [fmt(elementKg, 2)]),
        h('td', {}, [fmt(alloyKg, 1)]),
        h('td', {}, [deltaPct > 0 ? fmt(lowKg, 1) + ' ~ ' + fmt(highKg, 1) : '0']),
        h('td', {}, [Number.isFinite(cost) ? fmtInt(cost) : '—'])
      ]));
    }
    
    // 渲染汇总信息
    summary.innerHTML = `
      <p><b>钢水量：</b>${fmt(steelTon, 2)} t（${fmtInt(steelKg)} kg）</p>
      <p><b>合金总加入量：</b>${fmt(totalAlloyKg, 1)} kg（${fmt(totalAlloyKg / steelKg * 1000, 2)} kg/t）</p>
      <p><b>估算总成本：</b>${Number.isFinite(totalCost) ? fmtInt(totalCost) : '—'} 元</p>
    `;
    
    // 渲染警告信息
    renderWarnings(warns);
    
    // 显示提示
    toast('已计算', '右侧已生成合金加入量与区间。');
  }
  
  // 填入示例数据
  function fillExample() {
    tbody.innerHTML = '';
    
    // 填充钢水量和回收率不确定度
    qs('#steelTon').value = '150';
    qs('#recUnc').value = '5';
    
    // 添加示例合金行
    tbody.appendChild(makeRow({
      name: 'FeMn75',
      element: 'Mn',
      contentPct: 75,
      recoveryPct: 85,
      currentPct: 0.12,
      targetPct: 0.25,
      priceYuanPerTon: 5200
    }));
    
    tbody.appendChild(makeRow({
      name: 'FeSi75',
      element: 'Si',
      contentPct: 75,
      recoveryPct: 75,
      currentPct: 0.01,
      targetPct: 0.20,
      priceYuanPerTon: 6800
    }));
    
    tbody.appendChild(makeRow({
      name: 'Al线',
      element: 'Al',
      contentPct: 99,
      recoveryPct: 55,
      currentPct: 0.001,
      targetPct: 0.030,
      priceYuanPerTon: 18000
    }));
    
    toast('示例已填入', '可直接点击计算。');
  }
  
  // 清除数据
  function clearData() {
    tbody.innerHTML = '';
    tbodyRes.innerHTML = '';
    summary.innerHTML = '<p>点击“计算”生成结果。</p>';
    renderWarnings([]);
    
    qs('#steelTon').value = '';
    qs('#recUnc').value = '';
    
    // 添加一行空数据
    tbody.appendChild(makeRow({}));
    
    toast('数据已清除', '请输入新的数据。');
  }
  
  // 事件绑定
  qs('#btnAddAlloy').addEventListener('click', function() {
    tbody.appendChild(makeRow({}));
  });
  
  qs('#btnExample').addEventListener('click', fillExample);
  
  qs('#btnCalculate').addEventListener('click', calc);
  
  qs('#btnClear').addEventListener('click', clearData);
  
  // 初始化时添加一行空数据
  tbody.appendChild(makeRow({}));
})();