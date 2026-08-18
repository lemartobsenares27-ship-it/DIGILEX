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

  // ---------------------------------------------------------------------
  // Role-based weighted KPI scorecards (Video Editor, Sales Associate, ...)
  // ---------------------------------------------------------------------
  function matchKpiTemplate(e) {
    if (!e || !e.position) return null;
    var pos = e.position.toLowerCase();
    var templates = D.KPI_TEMPLATES || {};
    var key = Object.keys(templates).find(function (k) {
      return templates[k].positionMatch.some(function (m) { return pos.indexOf(m) !== -1; });
    });
    return key ? { key: key, template: templates[key] } : null;
  }

  function computeKpiScore(template, entries) {
    entries = entries || {};
    var categories = template.categories.map(function (cat) {
      var metrics = cat.metrics.map(function (m) {
        var actual = Number(entries[m.id]);
        if (!isFinite(actual)) actual = 0;
        var ratio = m.target > 0 ? Math.min(1, actual / m.target) : 0;
        var weighted = Math.round(ratio * m.weight * 100) / 100;
        return { metric: m, actual: actual, weighted: weighted };
      });
      var subtotal = Math.round(metrics.reduce(function (s, x) { return s + x.weighted; }, 0) * 100) / 100;
      return { category: cat, metrics: metrics, subtotal: subtotal };
    });
    var total = Math.round(categories.reduce(function (s, c) { return s + c.subtotal; }, 0) * 100) / 100;
    return { categories: categories, total: total };
  }

  function scoreFor(rec) {
    if (!rec) return null;
    if (rec.kpi && rec.kpi.templateKey && D.KPI_TEMPLATES[rec.kpi.templateKey]) {
      var result = computeKpiScore(D.KPI_TEMPLATES[rec.kpi.templateKey], rec.kpi.entries);
      return Math.round((result.total / 20) * 2) / 2; // stars, nearest 0.5
    }
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

  var activeKpi = null; // { key, template } for the scorecard modal currently open, or null for the generic form

  function scoreBandColor(pct) {
    return pct >= 90 ? "#22C55E" : pct >= 75 ? "#EAB308" : "#EF4444";
  }

  function buildKpiFormHtml(template, entries, lastEntries) {
    var rows = template.categories.map(function (cat) {
      var catHead =
        '<tr><td colspan="6" style="background:#FFF7ED;font-weight:700;font-size:.78rem;padding:8px 12px;border-top:1px solid #E2E8F0">' +
        X.escapeHtml(cat.name) + ' <span style="font-weight:600;color:#94A3B8">— ' + cat.weight + '% of total</span></td></tr>';
      var metricRows = cat.metrics.map(function (m) {
        var actual = entries && entries[m.id] != null ? entries[m.id] : "";
        var lastVal = lastEntries && lastEntries[m.id] != null ? lastEntries[m.id] : null;
        return (
          '<tr data-metric-row="' + m.id + '">' +
          '<td style="min-width:220px"><div style="font-weight:600">' + X.escapeHtml(m.label) + '</div><div style="font-size:.68rem;color:#94A3B8">' + X.escapeHtml(m.benefit || "") + '</div></td>' +
          '<td style="text-align:center">' + m.weight + '%</td>' +
          '<td style="text-align:center">' + m.target + (m.unit === "%" ? "%" : " " + m.unit) + '</td>' +
          '<td style="width:100px"><input type="number" step="0.01" class="field-input kpi-input" data-metric="' + m.id + '" data-target="' + m.target + '" data-weight="' + m.weight + '" value="' + actual + '" placeholder="0"></td>' +
          '<td style="text-align:center;font-weight:700" data-metric-weighted="' + m.id + '">0.00%</td>' +
          '<td style="text-align:center;font-size:.78rem;color:#64748B">' + (lastVal != null ? lastVal + (m.unit === "%" ? "%" : " " + m.unit) : "—") + '</td>' +
          "</tr>"
        );
      }).join("");
      var subtotalRow =
        '<tr style="background:#F8FAFC"><td colspan="4" style="font-weight:700;padding:6px 12px;text-align:right">Category Subtotal</td>' +
        '<td style="text-align:center;font-weight:800" data-cat-subtotal="' + cat.id + '">0.00%</td><td></td></tr>';
      return catHead + metricRows + subtotalRow;
    }).join("");

    return (
      '<div style="overflow-x:auto;margin-bottom:14px">' +
      '<table class="dlx-table" style="font-size:.82rem">' +
      '<thead><tr><th>Metric</th><th style="text-align:center">Weight</th><th style="text-align:center">Target</th><th>My Score</th><th style="text-align:center">Weighted</th><th style="text-align:center">Last Period</th></tr></thead>' +
      "<tbody>" + rows + "</tbody>" +
      "</table></div>" +
      '<div style="display:flex;justify-content:space-between;align-items:center;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px 18px;margin-bottom:14px">' +
      '<div style="font-weight:700">Overall Weighted Score</div>' +
      '<div style="font-size:1.4rem;font-weight:800" id="perf-kpi-total">0.00%</div>' +
      "</div>"
    );
  }

  function recomputeKpiTotals() {
    if (!activeKpi) return;
    var entries = readKpiEntries();
    var result = computeKpiScore(activeKpi.template, entries);
    result.categories.forEach(function (c) {
      c.metrics.forEach(function (x) {
        var cell = document.querySelector('[data-metric-weighted="' + x.metric.id + '"]');
        if (cell) cell.textContent = x.weighted.toFixed(2) + "%";
      });
      var subtotalCell = document.querySelector('[data-cat-subtotal="' + c.category.id + '"]');
      if (subtotalCell) subtotalCell.textContent = c.subtotal.toFixed(2) + "%";
    });
    var totalEl = document.getElementById("perf-kpi-total");
    if (totalEl) { totalEl.textContent = result.total.toFixed(2) + "%"; totalEl.style.color = scoreBandColor(result.total); }
  }

  function readKpiEntries() {
    var entries = {};
    document.querySelectorAll(".kpi-input").forEach(function (input) {
      entries[input.getAttribute("data-metric")] = Number(input.value) || 0;
    });
    return entries;
  }

  function openScorecardModal(employeeId) {
    var e = Store.getEmployees().find(function (x) { return x.id === employeeId; });
    var thisMonth = monthKey(0), lastMonth = monthKey(1);
    var rec = getRecord(employeeId, thisMonth) || {};
    var lastRec = getRecord(employeeId, lastMonth);
    document.getElementById("perf-modal-title").textContent = "Scorecard — " + fullName(e) + " (" + monthLabel(thisMonth) + ")";
    document.getElementById("perf-form-employee").value = employeeId;
    document.getElementById("perf-form-month").value = thisMonth;
    document.getElementById("perf-f-notes").value = rec.notes || "";

    var match = matchKpiTemplate(e);
    var modalBox = document.getElementById("perf-modal-box");
    var kpiContainer = document.getElementById("perf-kpi-container");
    var genericFields = document.getElementById("perf-generic-fields");

    if (match) {
      activeKpi = match;
      modalBox.classList.add("modal-lg");
      genericFields.style.display = "none";
      kpiContainer.style.display = "block";
      var entries = rec.kpi && rec.kpi.templateKey === match.key ? rec.kpi.entries : {};
      var lastEntries = lastRec && lastRec.kpi && lastRec.kpi.templateKey === match.key ? lastRec.kpi.entries : null;
      kpiContainer.innerHTML = buildKpiFormHtml(match.template, entries, lastEntries);
      kpiContainer.querySelectorAll(".kpi-input").forEach(function (input) { input.addEventListener("input", recomputeKpiTotals); });
      recomputeKpiTotals();
    } else {
      activeKpi = null;
      modalBox.classList.remove("modal-lg");
      genericFields.style.display = "block";
      kpiContainer.style.display = "none";
      kpiContainer.innerHTML = "";
      document.getElementById("perf-f-tasks").value = rec.tasksCompleted != null ? rec.tasksCompleted : 0;
      document.getElementById("perf-f-quality").value = rec.qualityScore != null ? rec.qualityScore : 5;
      document.getElementById("perf-f-csat").value = rec.csat != null ? rec.csat : "";
      document.getElementById("perf-f-orders").value = rec.ordersProcessed != null ? rec.ordersProcessed : "";
      var isCsRole = e.department === "Customer Service";
      var isOpsRole = e.department === "Warehouse" || e.department === "Logistics";
      document.getElementById("perf-csat-wrap").style.display = isCsRole ? "block" : "none";
      document.getElementById("perf-orders-wrap").style.display = isOpsRole ? "block" : "none";
    }
    X.openModal("perf-modal");
  }

  function saveScorecard(ev) {
    ev.preventDefault();
    var employeeId = document.getElementById("perf-form-employee").value;
    var month = document.getElementById("perf-form-month").value;
    var records = Store.getPerformance();
    var idx = records.findIndex(function (r) { return r.employeeId === employeeId && r.month === month; });
    var data;
    if (activeKpi) {
      data = {
        id: "PERF-" + employeeId + "-" + month,
        employeeId: employeeId,
        month: month,
        kpi: { templateKey: activeKpi.key, entries: readKpiEntries() },
        notes: document.getElementById("perf-f-notes").value.trim(),
      };
    } else {
      var csatVal = document.getElementById("perf-f-csat").value;
      var ordersVal = document.getElementById("perf-f-orders").value;
      data = {
        id: "PERF-" + employeeId + "-" + month,
        employeeId: employeeId,
        month: month,
        tasksCompleted: Number(document.getElementById("perf-f-tasks").value) || 0,
        qualityScore: Number(document.getElementById("perf-f-quality").value) || 0,
        csat: csatVal === "" ? null : Number(csatVal),
        ordersProcessed: ordersVal === "" ? null : Number(ordersVal),
        notes: document.getElementById("perf-f-notes").value.trim(),
      };
    }
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

  // ---------------------------------------------------------------------
  // Department Scorecards
  // ---------------------------------------------------------------------
  function renderDepartmentScorecards() {
    var thisMonth = monthKey(0), lastMonth = monthKey(1);
    var employees = Store.getEmployees().filter(function (e) { return !e.archived && e.id !== "DLX-001"; });
    var html = D.DEPARTMENTS.map(function (dept) {
      var deptEmployees = employees.filter(function (e) { return e.department === dept; });
      if (!deptEmployees.length) return "";
      var attSum = 0, punSum = 0;
      var curRatings = [], lastRatings = [];
      deptEmployees.forEach(function (e) {
        var att = attendanceStatsForMonth(e.id, thisMonth);
        attSum += att.attendanceRate;
        punSum += att.punctuality;
        var curScore = scoreFor(getRecord(e.id, thisMonth));
        if (curScore !== null) curRatings.push(curScore);
        var lastScore = scoreFor(getRecord(e.id, lastMonth));
        if (lastScore !== null) lastRatings.push(lastScore);
      });
      var avgAtt = attSum / deptEmployees.length;
      var avgPun = punSum / deptEmployees.length;
      var avgCur = curRatings.length ? curRatings.reduce(function (a, b) { return a + b; }, 0) / curRatings.length : null;
      var avgLast = lastRatings.length ? lastRatings.reduce(function (a, b) { return a + b; }, 0) / lastRatings.length : null;
      var trendIcon = "", trendColor = "#94A3B8";
      if (avgCur !== null && avgLast !== null) {
        if (avgCur > avgLast) { trendIcon = "fa-arrow-up"; trendColor = "#22C55E"; }
        else if (avgCur < avgLast) { trendIcon = "fa-arrow-down"; trendColor = "#EF4444"; }
        else { trendIcon = "fa-minus"; trendColor = "#94A3B8"; }
      }
      return (
        '<div class="dlx-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">' +
        '<div><div style="font-weight:700">' + X.escapeHtml(dept) + '</div><div style="font-size:.75rem;color:#94A3B8">' + deptEmployees.length + " employee(s)</div></div>" +
        (trendIcon ? '<i class="fa-solid ' + trendIcon + '" style="color:' + trendColor + '" title="vs. last month"></i>' : "") +
        "</div>" +
        '<div style="margin-bottom:12px">' + (avgCur !== null ? starsHtml(Math.round(avgCur * 2) / 2) + '<div style="font-size:.68rem;color:#94A3B8">' + ratingLabel(Math.round(avgCur * 2) / 2) + "</div>" : '<span style="color:#94A3B8;font-size:.8rem">No scorecards logged yet</span>') + "</div>" +
        '<div style="font-size:.8rem;display:flex;flex-direction:column;gap:6px;border-top:1px solid #F1F5F9;padding-top:10px">' +
        '<div style="display:flex;justify-content:space-between"><span style="color:#64748B">Attendance Rate</span><strong>' + avgAtt.toFixed(0) + "%</strong></div>" +
        '<div style="display:flex;justify-content:space-between"><span style="color:#64748B">Punctuality</span><strong>' + avgPun.toFixed(0) + "%</strong></div>" +
        "</div>" +
        '<a href="employees.html?department=' + encodeURIComponent(dept) + '" class="btn btn-secondary btn-sm" style="margin-top:12px;width:100%;justify-content:center"><i class="fa-solid fa-users"></i> View Team</a>' +
        "</div>"
      );
    }).join("");
    document.getElementById("dept-scorecards").innerHTML = html || '<div style="color:#94A3B8">No active employees yet.</div>';
  }

  // ---------------------------------------------------------------------
  // Weekly Scoreboard
  // ---------------------------------------------------------------------
  function isoOf(d) { return d.getFullYear() + "-" + X.pad2(d.getMonth() + 1) + "-" + X.pad2(d.getDate()); }
  function mondayOf(d) {
    var nd = new Date(d);
    var day = nd.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    nd.setDate(nd.getDate() + diff);
    return nd;
  }
  var weekState = { monday: mondayOf(new Date()) };

  function weekDates() {
    var days = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(weekState.monday);
      d.setDate(d.getDate() + i);
      days.push(isoOf(d));
    }
    return days; // Mon..Sun
  }

  function renderWeeklyScoreboard() {
    var days = weekDates();
    document.getElementById("week-range-label").textContent = X.fmtDate(days[0]) + " – " + X.fmtDate(days[6]);

    var todayIso = X.todayIso();
    var relevantDays = days.filter(function (d) { return d <= todayIso; }).filter(function (d) { return new Date(d + "T00:00:00").getDay() !== 0; });
    var employees = Store.getEmployees().filter(function (e) { return !e.archived; });
    var attendance = Store.getAttendance();

    var perEmp = {};
    employees.forEach(function (e) { perEmp[e.id] = { present: 0, late: 0, absent: 0, slots: 0 }; });

    relevantDays.forEach(function (dateIso) {
      employees.forEach(function (e) {
        var rec = attendance.find(function (a) { return a.employeeId === e.id && a.date === dateIso; });
        perEmp[e.id].slots++;
        if (rec) {
          if (rec.status === "Present") perEmp[e.id].present++;
          else if (rec.status === "Late") perEmp[e.id].late++;
          else if (rec.status === "Absent") perEmp[e.id].absent++;
        }
      });
    });

    var totals = { present: 0, late: 0, absent: 0, slots: 0 };
    Object.keys(perEmp).forEach(function (id) {
      totals.present += perEmp[id].present;
      totals.late += perEmp[id].late;
      totals.absent += perEmp[id].absent;
      totals.slots += perEmp[id].slots;
    });
    var companyRate = totals.slots ? ((totals.present + totals.late) / totals.slots) * 100 : 0;

    var leaveThisWeek = Store.getLeaveRequests().filter(function (l) { return l.dateFiled >= days[0] && l.dateFiled <= days[6]; }).length;
    var newHiresThisWeek = Store.getEmployees().filter(function (e) { return e.dateHired && e.dateHired >= days[0] && e.dateHired <= days[6]; }).length;

    document.getElementById("weekly-kpis").innerHTML =
      weeklyTile("Company Attendance Rate", companyRate.toFixed(0) + "%", "fa-chart-simple", companyRate >= 90 ? "#22C55E" : companyRate >= 75 ? "#EAB308" : "#EF4444") +
      weeklyTile("Total Absences", totals.absent, "fa-user-xmark", "#EF4444") +
      weeklyTile("Leave Requests Filed", leaveThisWeek, "fa-plane-departure", "#0EA5E9") +
      weeklyTile("New Hires", newHiresThisWeek, "fa-user-plus", "#A855F7");

    var deptRows = D.DEPARTMENTS.map(function (dept) {
      var deptEmployees = employees.filter(function (e) { return e.department === dept; });
      if (!deptEmployees.length) return "";
      var p = 0, l = 0, a = 0, slots = 0;
      deptEmployees.forEach(function (e) {
        p += perEmp[e.id].present; l += perEmp[e.id].late; a += perEmp[e.id].absent; slots += perEmp[e.id].slots;
      });
      var rate = slots ? ((p + l) / slots) * 100 : 0;
      return (
        "<tr>" +
        '<td data-label="Department">' + X.escapeHtml(dept) + "</td>" +
        '<td data-label="Headcount" style="text-align:center">' + deptEmployees.length + "</td>" +
        '<td data-label="Present" style="text-align:center">' + p + "</td>" +
        '<td data-label="Late" style="text-align:center">' + l + "</td>" +
        '<td data-label="Absent" style="text-align:center">' + a + "</td>" +
        '<td data-label="Attendance Rate">' +
        '<div style="display:flex;align-items:center;gap:8px"><div class="progress-track" style="flex:1"><div class="progress-fill" style="width:' + Math.min(100, rate) + "%;background:" + (rate >= 90 ? "#22C55E" : rate >= 75 ? "#EAB308" : "#EF4444") + '"></div></div><span style="font-size:.75rem;font-weight:700">' + rate.toFixed(0) + "%</span></div>" +
        "</td>" +
        "</tr>"
      );
    }).join("");
    document.getElementById("weekly-dept-body").innerHTML = deptRows;

    var attentionList = employees.map(function (e) {
      var stats = perEmp[e.id];
      var rate = stats.slots ? ((stats.present + stats.late) / stats.slots) * 100 : 100;
      return { e: e, rate: rate, absent: stats.absent };
    }).filter(function (x) { return x.rate < 75 || x.absent >= 2; }).sort(function (a, b) { return a.rate - b.rate; });

    document.getElementById("weekly-attention-list").innerHTML = attentionList.length
      ? attentionList.map(function (x) {
          return (
            '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F1F5F9">' +
            '<div class="avatar avatar-sm" style="background:' + X.avatarColor(x.e.id) + '">' + X.initials(x.e.firstName, x.e.lastName) + "</div>" +
            '<div style="flex:1"><div style="font-weight:600;font-size:.85rem">' + X.escapeHtml(fullName(x.e)) + '</div><div style="font-size:.72rem;color:#94A3B8">' + X.escapeHtml(x.e.department) + "</div></div>" +
            '<span class="badge badge-red">' + x.rate.toFixed(0) + "% attendance</span>" +
            (x.absent >= 2 ? '<span class="badge badge-orange">' + x.absent + " absences</span>" : "") +
            "</div>"
          );
        }).join("")
      : '<div style="color:#94A3B8;font-size:.85rem;padding:8px 0">Nobody needs attention this week.</div>';
  }

  function weeklyTile(label, value, icon, color) {
    return (
      '<div class="dlx-card kpi-card">' +
      '<div class="kpi-icon" style="background:' + color + '22;color:' + color + '"><i class="fa-solid ' + icon + '"></i></div>' +
      '<div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + "</div></div>"
    );
  }

  // ---------------------------------------------------------------------
  // View toggle
  // ---------------------------------------------------------------------
  var viewState = { current: "employee" };
  function setView(view) {
    viewState.current = view;
    document.getElementById("perf-employee-view").style.display = view === "employee" ? "block" : "none";
    document.getElementById("perf-department-view").style.display = view === "department" ? "block" : "none";
    document.getElementById("perf-weekly-view").style.display = view === "weekly" ? "block" : "none";
    document.getElementById("btn-view-employee").classList.toggle("active", view === "employee");
    document.getElementById("btn-view-department").classList.toggle("active", view === "department");
    document.getElementById("btn-view-weekly").classList.toggle("active", view === "weekly");
    if (view === "department") renderDepartmentScorecards();
    if (view === "weekly") renderWeeklyScoreboard();
  }

  function bindEvents() {
    document.getElementById("perf-form").addEventListener("submit", saveScorecard);
    document.getElementById("btn-view-employee").addEventListener("click", function () { setView("employee"); });
    document.getElementById("btn-view-department").addEventListener("click", function () { setView("department"); });
    document.getElementById("btn-view-weekly").addEventListener("click", function () { setView("weekly"); });
    document.getElementById("btn-week-prev").addEventListener("click", function () {
      weekState.monday.setDate(weekState.monday.getDate() - 7);
      renderWeeklyScoreboard();
    });
    document.getElementById("btn-week-next").addEventListener("click", function () {
      weekState.monday.setDate(weekState.monday.getDate() + 7);
      renderWeeklyScoreboard();
    });
    document.getElementById("btn-week-thisweek").addEventListener("click", function () {
      weekState.monday = mondayOf(new Date());
      renderWeeklyScoreboard();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("performance", "Performance");
    bindEvents();
    renderTable();
  });
})();
