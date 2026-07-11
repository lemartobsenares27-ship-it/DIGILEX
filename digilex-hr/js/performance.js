/* DIGILEX HR ERP — Performance module */

(function () {
  "use strict";
  var X = window.Digilex;
  var D = window.DigilexData;
  var Store = X.Store;
  var historyChart = null;

  function fullName(e) { return e.firstName + " " + e.lastName; }
  function monthKey(offset) {
    var d = new Date();
    d.setMonth(d.getMonth() - offset);
    return d.getFullYear() + "-" + X.pad2(d.getMonth() + 1);
  }
  function monthLabel(key) {
    var parts = key.split("-");
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[Number(parts[1]) - 1] + " " + parts[0];
  }

  function getRecord(employeeId, month) {
    return Store.getPerformance().find(function (p) { return p.employeeId === employeeId && p.month === month; });
  }

  function scoreFor(rec) {
    if (!rec) return null;
    var parts = [rec.tasksCompleted || 0, (rec.qualityScore || 0) * 10];
    if (rec.csat !== null && rec.csat !== undefined) parts.push(rec.csat * 20);
    if (rec.ordersProcessed !== null && rec.ordersProcessed !== undefined) parts.push(Math.min(100, (rec.ordersProcessed / 200) * 100));
    var avg = parts.reduce(function (s, v) { return s + v; }, 0) / parts.length;
    return Math.round((avg / 20) * 2) / 2; // stars, nearest 0.5
  }

  function starsHtml(stars) {
    stars = stars || 0;
    var html = '<span class="stars">';
    for (var i = 1; i <= 5; i++) {
      html += '<i class="fa-solid fa-star' + (i <= stars ? " filled" : "") + '"></i>';
    }
    html += "</span>";
    return html;
  }

  function attendanceStatsForMonth(employeeId, monthKeyStr) {
    var parts = monthKeyStr.split("-");
    var year = Number(parts[0]), month = Number(parts[1]);
    var attendance = Store.getAttendance().filter(function (a) {
      return a.employeeId === employeeId && a.date.slice(0, 4) === parts[0] && Number(a.date.slice(5, 7)) === month;
    });
    var wd = X.workingDaysInMonth(year, month, Store.getSettings().holidays || D.PH_HOLIDAYS);
    var present = attendance.filter(function (a) { return a.status === "Present" || a.status === "Late"; }).length;
    var onTime = attendance.filter(function (a) { return a.status === "Present"; }).length;
    var attendanceRate = wd > 0 ? (present / wd) * 100 : 0;
    var punctuality = present > 0 ? (onTime / present) * 100 : 0;
    return { attendanceRate: attendanceRate, punctuality: punctuality };
  }

  function ratingLabel(stars) {
    if (stars >= 4.5) return "Outstanding";
    if (stars >= 3.5) return "Very Satisfactory";
    if (stars >= 2.5) return "Satisfactory";
    if (stars >= 1.5) return "Needs Improvement";
    return "Unsatisfactory";
  }

  function renderTable() {
    var employees = Store.getEmployees().filter(function (e) { return !e.archived && e.id !== "DLX-001"; });
    var thisMonth = monthKey(0), lastMonth = monthKey(1);
    var rows = employees.map(function (e) {
      var curRec = getRecord(e.id, thisMonth);
      var prevRec = getRecord(e.id, lastMonth);
      var curScore = scoreFor(curRec);
      var prevScore = scoreFor(prevRec);
      var att = attendanceStatsForMonth(e.id, thisMonth);
      var trendIcon = "", trendColor = "#94A3B8";
      if (curScore !== null && prevScore !== null) {
        if (curScore > prevScore) { trendIcon = "fa-arrow-up"; trendColor = "#22C55E"; }
        else if (curScore < prevScore) { trendIcon = "fa-arrow-down"; trendColor = "#EF4444"; }
        else { trendIcon = "fa-minus"; trendColor = "#94A3B8"; }
      }
      return (
        "<tr>" +
        '<td data-label="Employee"><div style="display:flex;align-items:center;gap:8px"><div class="avatar avatar-sm" style="background:' + X.avatarColor(e.id) + '">' + X.initials(e.firstName, e.lastName) + "</div><div><div style=\"font-weight:600\">" + X.escapeHtml(fullName(e)) + '</div><div style="font-size:.7rem;color:#94A3B8">' + X.escapeHtml(e.department) + "</div></div></div></td>" +
        '<td data-label="Attendance Rate">' + att.attendanceRate.toFixed(0) + "%</td>" +
        '<td data-label="Punctuality">' + att.punctuality.toFixed(0) + "%</td>" +
        '<td data-label="This Month">' + (curScore !== null ? starsHtml(curScore) + '<div style="font-size:.68rem;color:#94A3B8">' + ratingLabel(curScore) + "</div>" : '<span style="color:#94A3B8;font-size:.75rem">No data</span>') + "</td>" +
        '<td data-label="Last Month">' + (prevScore !== null ? starsHtml(prevScore) : '<span style="color:#94A3B8;font-size:.75rem">—</span>') + "</td>" +
        '<td data-label="Trend">' + (trendIcon ? '<i class="fa-solid ' + trendIcon + '" style="color:' + trendColor + '"></i>' : "—") + "</td>" +
        '<td data-label="Actions"><div style="display:flex;gap:6px">' +
        '<button class="btn btn-secondary btn-sm" data-edit="' + e.id + '"><i class="fa-solid fa-pen"></i> Scorecard</button>' +
        '<button class="btn btn-secondary btn-sm" data-history="' + e.id + '"><i class="fa-solid fa-chart-line"></i></button>' +
        "</div></td>" +
        "</tr>"
      );
    }).join("");
    document.getElementById("perf-body").innerHTML = rows;

    document.querySelectorAll("[data-edit]").forEach(function (b) { b.addEventListener("click", function () { openScorecardModal(b.getAttribute("data-edit")); }); });
    document.querySelectorAll("[data-history]").forEach(function (b) { b.addEventListener("click", function () { openHistoryModal(b.getAttribute("data-history")); }); });
  }

  function openScorecardModal(employeeId) {
    var e = Store.getEmployees().find(function (x) { return x.id === employeeId; });
    var thisMonth = monthKey(0);
    var rec = getRecord(employeeId, thisMonth) || {};
    document.getElementById("perf-modal-title").textContent = "Scorecard — " + fullName(e) + " (" + monthLabel(thisMonth) + ")";
    document.getElementById("perf-form-employee").value = employeeId;
    document.getElementById("perf-form-month").value = thisMonth;
    document.getElementById("perf-f-tasks").value = rec.tasksCompleted != null ? rec.tasksCompleted : 0;
    document.getElementById("perf-f-quality").value = rec.qualityScore != null ? rec.qualityScore : 5;
    document.getElementById("perf-f-csat").value = rec.csat != null ? rec.csat : "";
    document.getElementById("perf-f-orders").value = rec.ordersProcessed != null ? rec.ordersProcessed : "";
    document.getElementById("perf-f-notes").value = rec.notes || "";
    var isCsRole = e.department === "Customer Service";
    var isOpsRole = e.department === "Warehouse" || e.department === "Logistics";
    document.getElementById("perf-csat-wrap").style.display = isCsRole ? "block" : "none";
    document.getElementById("perf-orders-wrap").style.display = isOpsRole ? "block" : "none";
    X.openModal("perf-modal");
  }

  function saveScorecard(ev) {
    ev.preventDefault();
    var employeeId = document.getElementById("perf-form-employee").value;
    var month = document.getElementById("perf-form-month").value;
    var records = Store.getPerformance();
    var idx = records.findIndex(function (r) { return r.employeeId === employeeId && r.month === month; });
    var csatVal = document.getElementById("perf-f-csat").value;
    var ordersVal = document.getElementById("perf-f-orders").value;
    var data = {
      id: "PERF-" + employeeId + "-" + month,
      employeeId: employeeId,
      month: month,
      tasksCompleted: Number(document.getElementById("perf-f-tasks").value) || 0,
      qualityScore: Number(document.getElementById("perf-f-quality").value) || 0,
      csat: csatVal === "" ? null : Number(csatVal),
      ordersProcessed: ordersVal === "" ? null : Number(ordersVal),
      notes: document.getElementById("perf-f-notes").value.trim(),
    };
    if (idx === -1) records.push(data); else records[idx] = data;
    Store.setPerformance(records);
    X.toast("Scorecard saved.", "success");
    X.closeModal("perf-modal");
    renderTable();
  }

  function openHistoryModal(employeeId) {
    var e = Store.getEmployees().find(function (x) { return x.id === employeeId; });
    document.getElementById("history-modal-title").textContent = "Performance History — " + fullName(e);
    var records = Store.getPerformance().filter(function (r) { return r.employeeId === employeeId; }).sort(function (a, b) { return a.month.localeCompare(b.month); });
    var labels = records.map(function (r) { return monthLabel(r.month); });
    var data = records.map(function (r) { return scoreFor(r); });

    X.openModal("history-modal");
    if (typeof Chart === "undefined") {
      document.getElementById("history-chart").replaceWith(Object.assign(document.createElement("div"), { id: "history-chart", style: "color:#94A3B8;font-size:.8rem;padding:20px 0", textContent: "Chart library unavailable (offline)." }));
    } else {
      var ctx = document.getElementById("history-chart").getContext("2d");
      if (historyChart) historyChart.destroy();
      historyChart = new Chart(ctx, {
        type: "line",
        data: { labels: labels, datasets: [{ label: "Overall Rating (stars)", data: data, borderColor: "#F97316", backgroundColor: "rgba(249,115,22,0.15)", fill: true, tension: 0.3, pointBackgroundColor: "#F97316" }] },
        options: { responsive: true, scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } },
      });
    }

    document.getElementById("history-notes").innerHTML = records.slice().reverse().map(function (r) {
      return '<div style="border-bottom:1px solid #F1F5F9;padding:8px 0"><div style="font-weight:600;font-size:.8rem">' + monthLabel(r.month) + "</div><div style=\"font-size:.8rem;color:#475569\">" + (X.escapeHtml(r.notes) || "<span style='color:#94A3B8'>No manager notes.</span>") + "</div></div>";
    }).join("") || '<div style="color:#94A3B8;font-size:.8rem">No history yet.</div>';
  }

  function bindEvents() {
    document.getElementById("perf-form").addEventListener("submit", saveScorecard);
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("performance", "Performance");
    bindEvents();
    renderTable();
  });
})();
