/* DIGILEX HR ERP — Dashboard module */

(function () {
  "use strict";
  var X = window.Digilex;
  var D = window.DigilexData;
  var Store = X.Store;
  var charts = {};

  function fullName(e) { return e.firstName + " " + e.lastName; }

  function renderKpis() {
    var employees = Store.getEmployees().filter(function (e) { return !e.archived; });
    var active = employees.filter(function (e) { return e.status === "Active"; });
    var today = X.todayIso();
    var attendanceToday = Store.getAttendance().filter(function (a) { return a.date === today; });
    var present = attendanceToday.filter(function (a) { return a.status === "Present" || a.status === "Late"; }).length;
    var onLeave = attendanceToday.filter(function (a) { return a.status === "On Leave"; }).length;
    var absent = attendanceToday.filter(function (a) { return a.status === "Absent"; }).length;
    var openPositions = Store.getPositions().filter(function (p) { return p.status === "Open"; }).length;

    var tiles = [
      { label: "Total Active Employees", value: active.length, icon: "fa-users", color: "#0EA5E9" },
      { label: "Present Today", value: present, icon: "fa-user-check", color: "#22C55E" },
      { label: "On Leave Today", value: onLeave, icon: "fa-plane-departure", color: "#F97316" },
      { label: "Absent Today", value: absent, icon: "fa-user-xmark", color: "#EF4444" },
      { label: "Open Job Positions", value: openPositions, icon: "fa-briefcase", color: "#A855F7" },
    ];
    document.getElementById("dash-kpis").innerHTML = tiles.map(function (t) {
      return (
        '<div class="dlx-card kpi-card">' +
        '<div class="kpi-icon" style="background:' + t.color + '22;color:' + t.color + '"><i class="fa-solid ' + t.icon + '"></i></div>' +
        '<div class="kpi-label">' + t.label + '</div><div class="kpi-value">' + t.value + "</div></div>"
      );
    }).join("");
  }

  function renderDeptChart() {
    var employees = Store.getEmployees().filter(function (e) { return !e.archived && e.status === "Active"; });
    var counts = {};
    D.DEPARTMENTS.forEach(function (d) { counts[d] = 0; });
    employees.forEach(function (e) { counts[e.department] = (counts[e.department] || 0) + 1; });
    var ctx = document.getElementById("chart-department").getContext("2d");
    if (charts.dept) charts.dept.destroy();
    charts.dept = new Chart(ctx, {
      type: "bar",
      data: {
        labels: D.DEPARTMENTS,
        datasets: [{ label: "Headcount", data: D.DEPARTMENTS.map(function (d) { return counts[d]; }), backgroundColor: "#F97316", borderRadius: 6 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
    });
  }

  function renderAttendanceTrendChart() {
    var months = [];
    var rates = [];
    var labels = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var employees = Store.getEmployees().filter(function (e) { return !e.archived; });
    for (var i = 5; i >= 0; i--) {
      var d = new Date();
      d.setMonth(d.getMonth() - i);
      var year = d.getFullYear(), month = d.getMonth() + 1;
      months.push(labels[month - 1].slice(0, 3) + " " + year);
      var wd = X.workingDaysInMonth(year, month, Store.getSettings().holidays || D.PH_HOLIDAYS);
      var attendance = Store.getAttendance().filter(function (a) { return a.date.slice(0, 4) === String(year) && Number(a.date.slice(5, 7)) === month; });
      var totalRate = 0, count = 0;
      employees.forEach(function (e) {
        var recs = attendance.filter(function (a) { return a.employeeId === e.id; });
        var present = recs.filter(function (a) { return a.status === "Present" || a.status === "Late" || a.status === "Half Day"; }).length;
        if (wd > 0) { totalRate += Math.min(100, (present / wd) * 100); count++; }
      });
      rates.push(count ? Math.round(totalRate / count) : 0);
    }
    var ctx = document.getElementById("chart-attendance-trend").getContext("2d");
    if (charts.trend) charts.trend.destroy();
    charts.trend = new Chart(ctx, {
      type: "line",
      data: { labels: months, datasets: [{ label: "Attendance Rate %", data: rates, borderColor: "#22C55E", backgroundColor: "rgba(34,197,94,0.15)", fill: true, tension: 0.35 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } },
    });
  }

  function renderLeaveDonut() {
    var requests = Store.getLeaveRequests();
    var counts = {};
    D.LEAVE_TYPES.forEach(function (t) { counts[t.code] = 0; });
    requests.forEach(function (r) { counts[r.leaveType] = (counts[r.leaveType] || 0) + 1; });
    var labels = D.LEAVE_TYPES.map(function (t) { return t.name; });
    var data = D.LEAVE_TYPES.map(function (t) { return counts[t.code]; });
    var colors = ["#F97316", "#0EA5E9", "#22C55E", "#A855F7", "#EAB308", "#EC4899", "#94A3B8"];
    var ctx = document.getElementById("chart-leave-donut").getContext("2d");
    if (charts.leave) charts.leave.destroy();
    charts.leave = new Chart(ctx, {
      type: "doughnut",
      data: { labels: labels, datasets: [{ data: data, backgroundColor: colors }] },
      options: { responsive: true, plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } } } },
    });
  }

  function renderActivityFeed() {
    var attendance = Store.getAttendance().filter(function (a) { return a.status; }).sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 5);
    var empIdx = {};
    Store.getEmployees().forEach(function (e) { empIdx[e.id] = e; });
    document.getElementById("dash-activity-feed").innerHTML = attendance.map(function (a) {
      var e = empIdx[a.employeeId];
      var color = { Present: "#22C55E", Late: "#EAB308", "Half Day": "#FB923C", Absent: "#EF4444", "On Leave": "#0EA5E9", "Rest Day": "#94A3B8" }[a.status] || "#94A3B8";
      return (
        '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F1F5F9">' +
        '<div style="width:8px;height:8px;border-radius:50%;background:' + color + '"></div>' +
        '<div style="flex:1"><div style="font-size:.82rem;font-weight:600">' + X.escapeHtml(e ? fullName(e) : a.employeeId) + "</div>" +
        '<div style="font-size:.72rem;color:#94A3B8">' + a.status + " &middot; " + X.fmtDate(a.date) + "</div></div>" +
        "</div>"
      );
    }).join("") || '<div style="color:#94A3B8;font-size:.82rem">No attendance logs yet.</div>';

    var pendingLeave = Store.getLeaveRequests().filter(function (l) { return l.status === "Pending"; }).length;
    document.getElementById("dash-pending-leave").textContent = pendingLeave;

    var settings = Store.getSettings();
    var today = new Date();
    var day = today.getDate();
    var cutoffs = (settings.payrollCutoffDays || [15, 30]).slice().sort(function (a, b) { return a - b; });
    var nextCutoff = cutoffs.find(function (c) { return c >= day; }) || cutoffs[0];
    var daysAway = nextCutoff >= day ? nextCutoff - day : (30 - day) + nextCutoff;
    document.getElementById("dash-payroll-countdown").textContent = daysAway === 0 ? "Today" : daysAway + " day(s)";

    var thisMonth = today.getMonth(), thisYear = today.getFullYear();
    var newHires = Store.getEmployees().filter(function (e) {
      if (!e.dateHired) return false;
      var d = new Date(e.dateHired + "T00:00:00");
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    document.getElementById("dash-new-hires").textContent = newHires;
  }

  function renderAnnouncements() {
    var announcements = Store.getAnnouncements().slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    document.getElementById("dash-announcements").innerHTML = announcements.map(function (a) {
      return '<div class="announcement-item"><div>' + X.escapeHtml(a.body) + '</div><div class="announcement-date">' + X.fmtDate(a.date) + "</div></div>";
    }).join("") || '<div style="color:#94A3B8;font-size:.85rem">No announcements yet.</div>';
  }

  function bindAnnouncementForm() {
    document.getElementById("btn-save-announcement").addEventListener("click", function () {
      var editor = document.getElementById("announcement-editor");
      var text = editor.innerText.trim();
      if (!text) { X.toast("Write something before posting.", "warning"); return; }
      var announcements = Store.getAnnouncements();
      announcements.push({ id: X.uid("ANN"), body: text, date: X.todayIso() });
      Store.setAnnouncements(announcements);
      editor.innerText = "";
      renderAnnouncements();
      X.toast("Announcement posted.", "success");
    });
  }

  function safe(fn) {
    try { fn(); } catch (err) { console.error(err); }
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("dashboard", "Dashboard");
    safe(renderKpis);
    if (typeof Chart === "undefined") {
      ["chart-department", "chart-attendance-trend", "chart-leave-donut"].forEach(function (id) {
        var canvas = document.getElementById(id);
        if (canvas) canvas.replaceWith(Object.assign(document.createElement("div"), { style: "color:#94A3B8;font-size:.8rem;padding:20px 0", textContent: "Chart library unavailable (offline)." }));
      });
    } else {
      safe(renderDeptChart);
      safe(renderAttendanceTrendChart);
      safe(renderLeaveDonut);
    }
    safe(renderActivityFeed);
    safe(renderAnnouncements);
    safe(bindAnnouncementForm);
  });
})();
