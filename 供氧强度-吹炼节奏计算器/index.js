/**
 * 供氧强度-吹炼节奏计算器
 * 
 * 核心公式：
 * Q (Nm³/min) = V / t
 * I (Nm³/min/t) = Q / T
 * 其中：
 * V = 总耗氧量（Nm³）
 * t = 吹炼时间（min）
 * T = 炉次吨位（t，口径可按厂内规定）
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
  
  var tbodyStage = qs("#tbodyStage");
  var tbodyDetail = qs("#resultTableBody");
  var summary = qs("#summary");
  var warningsBox = qs("#warnings");
  
  function renderWarnings(list) {
    warningsBox.innerHTML = '';
    
    var h3 = document.createElement('h3');
    h3.textContent = '告警与校验：';
    warningsBox.appendChild(h3);
    
    if (list.length === 0) {
      var p = document.createElement('p');
      p.textContent = '无明显问题';
      warningsBox.appendChild(p);
      return;
    }
    
    var ul = document.createElement('ul');
    for (var i = 0; i < list.length; i++) {
      var li = document.createElement('li');
      li.textContent = list[i];
      ul.appendChild(li);
    }
    
    warningsBox.appendChild(ul);
  }

  function makeStageRow(data) {
    if (!data) data = {};
    var tr = h("tr",{},[]);
    var name = h("td",{},[h("input",{type:"text", value:data.name||"前段", placeholder:"例如 前段/中段/末段"})]);
    var dur = h("td",{},[h("input",{type:"number", step:"0.1", value:data.min!=null?data.min:5})]);
    var flow = h("td",{},[h("input",{type:"number", step:"1", value:data.q!=null?data.q:1000})]);
    var op = h("td",{},[(function() {
      var btn = h("button",{class:"btn secondary small", type:"button"},["删除"]);
      btn.addEventListener("click", function(){ tr.remove(); });
      return btn;
    })()]);
    tr.appendChild(name);
    tr.appendChild(dur);
    tr.appendChild(flow);
    tr.appendChild(op);
    return tr;
  }

  function readStages() {
    var rows = [];
    var trs = tbodyStage.querySelectorAll("tr");
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      var tds = tr.querySelectorAll("td");
      var name = tds[0].querySelector("input").value.trim() || "阶段";
      var min = num(tds[1].querySelector("input").value);
      var q = num(tds[2].querySelector("input").value);
      rows.push({name:name, min:min, q:q});
    }
    return rows;
  }

  function onModeChange() {
    var mode = qs("#mode").value;
    qs("#panelTotal").style.display = mode==="total" ? "block" : "none";
    qs("#panelSchedule").style.display = mode==="schedule" ? "block" : "none";
  }

  function calc() {
    var T = num(qs("#ton").value);
    var mode = qs("#mode").value;
    var warns = [];

    if (T<=0) warns.push("炉次吨位 T 必须 > 0。");

    var V=0, t=0;
    var stageSummary = "";

    if (mode==="total") {
      V = num(qs("#V").value);
      t = num(qs("#t").value);
      if (V<=0) warns.push("总耗氧量 V 必须 > 0。");
      if (t<=0) warns.push("吹炼时间 t 必须 > 0。");
    } else {
      var stages = readStages();
      if (stages.length===0) warns.push("请至少添加一个吹炼阶段。");
      var summaryParts = [];
      for (var i=0; i<stages.length; i++) {
        var s = stages[i];
        if (s.min<=0) warns.push("阶段" + s.name + "时长必须 > 0。");
        if (s.q<=0) warns.push("阶段" + s.name + "流量必须 > 0。");
        V += s.min * s.q;
        t += s.min;
        summaryParts.push(s.name + ":" + fmt(s.q,0) + "x" + fmt(s.min,1) + "min");
      }
      stageSummary = summaryParts.join("; ");
    }

    var Q = (t>0) ? V/t : NaN;
    var I = (T>0) ? Q/T : NaN;

    tbodyDetail.innerHTML = "";
    var rows = [
      ["总耗氧量 V（Nm³）", fmt(V,0)],
      ["总时间 t（min）", fmt(t,2)],
      ["平均流量 Q（Nm³/min）", fmt(Q,1)],
      ["供氧强度 I（Nm³/min/t）", fmt(I,3)]
    ];
    if (mode==="schedule") {
      rows.push(["分段摘要", stageSummary || "—"]);
    }
    for (var j=0; j<rows.length; j++) {
      tbodyDetail.appendChild(h("tr",{},[h("td",{},[rows[j][0]]), h("td",{},[rows[j][1]])]));
    }

    summary.innerHTML = 
      '<h3>结论：</h3>' +
      '<p>平均流量 <strong>Q=' + fmt(Q,1) + ' Nm³/min</strong></p>' +
      '<p>供氧强度 <strong>I=' + fmt(I,3) + ' Nm³/min/t</strong></p>';

    // Soft sanity checks (optional)
    if (Number.isFinite(I) && (I<3 || I>12)) {
      warns.push("供氧强度 I 超出常见经验区间（仅供提示；具体窗口以本厂为准）。");
    }

    renderWarnings(warns);
    toast("已计算", "右侧已生成 Q、I 与汇总信息。");
  }

  function fillExample() {
    qs("#ton").value = "150";
    qs("#mode").value = "total";
    qs("#V").value = "18000";
    qs("#t").value = "16";
    onModeChange();
    toast("示例已填入", "可直接点击计算。");
  }

  function fillExampleSchedule() {
    tbodyStage.innerHTML = "";
    tbodyStage.appendChild(makeStageRow({name:"前段", min:6, q:1100}));
    tbodyStage.appendChild(makeStageRow({name:"中段", min:6, q:1200}));
    tbodyStage.appendChild(makeStageRow({name:"末段", min:4, q:900}));
    toast("示例计划已填入", "可点击计算查看汇总。");
  }

  function clearData() {
    qs("#ton").value = "";
    qs("#mode").value = "total";
    qs("#V").value = "";
    qs("#t").value = "";
    tbodyStage.innerHTML = "";
    tbodyDetail.innerHTML = "";
    summary.innerHTML = '<h3>结论：</h3><p>点击“计算”生成结果。</p>';
    renderWarnings([]);
    onModeChange();
    // 添加一行空的分段计划（默认隐藏）
    tbodyStage.appendChild(makeStageRow({}));
    toast("数据已清除", "请输入新的数据。");
  }

  // 事件绑定
  qs("#mode").addEventListener("change", onModeChange);
  qs("#btnCalculate").addEventListener("click", calc);
  qs("#btnExample").addEventListener("click", fillExample);
  qs("#btnExampleSchedule").addEventListener("click", fillExampleSchedule);
  qs("#btnAddStage").addEventListener("click", function(){ tbodyStage.appendChild(makeStageRow({})); });
  qs("#btnClear").addEventListener("click", clearData);

  // 初始化
  onModeChange();
  // 初始添加一行分段计划（默认隐藏）
  tbodyStage.appendChild(makeStageRow({name:"前段", min:8, q:1100}));
  // 初始显示未计算状态
  summary.innerHTML = '<h3>结论：</h3><p>点击“计算”生成结果。</p>';
  renderWarnings([]);
})();
