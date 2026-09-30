/* DIGILEX HR ERP — Attendance module */

(function () {
  "use strict";
  var X = window.Digilex;
  var D = window.DigilexData;
  var Store = X.Store;

  var now = new Date();
  var state = {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // 1-12
    department: "",
    status: "",
  };

  function pad2(n) { return X.pad2(n); }
  function keyFor(employeeId, date) { return employeeId + "|" + date; }

  function minutesBetween(timeIn, timeOut) {
    if (!timeIn || !timeOut) return 0;
    var a = timeIn.split(":"), b = timeOut.split(":");
    return Math.max(0, (Number(b[0]) * 60 + Number(b[1])) - (Number(a[0]) * 60 + Number(a[1])));
  }
  // Self-logged (portal) records track individual break start/end entries;
  // admin-logged records store a single break-minutes total instead.
  function totalBreakMinutes(rec) {
    if (!rec) return 0;
    if (rec.breaks && rec.breaks.length) {
      return rec.breaks.reduce(function (s, b) { return s + minutesBetween(b.start, b.end); }, 0);
    }
    return Number(rec.breakMinutes) || 0;
  }
  function fmtMinutes(m) {
    if (!m) return "0m";
    var h = Math.floor(m / 60), rem = Math.round(m % 60);
    return (h ? h + "h " : "") + rem + "m";
  }

  function attendanceIndex() {
    var idx = {};
    Store.getAttendance().forEach(function (a) { idx[keyFor(a.employeeId, a.date)] = a; });
    return idx;
  }
  function holidaySet() {
    var set = {};
    (Store.getSettings().holidays || D.PH_HOLIDAYS).forEach(function (h) { set[h.date] = h; });
    return set;
  }

  function cellClass(status) {
    switch (status) {
      case "Present": return "att-present";
      case "Late": return "att-late";
      case "Half Day": return "att-halfday";
      case "Absent": return "att-absent";
      case "On Leave": return "att-leave";
      case "Rest Day": case "Holiday": return "att-restday";
      default: return "att-future";
    }
  }
  function cellLabel(status) {
    switch (status) {
      case "Present": return "P";
      case "Late": return "L";
      case "Half Day": return "H";
      case "Absent": return "A";
      case "On Leave": return "LV";
      case "Rest Day": return "R";
      case "Holiday": return "HO";
      default: return "";
    }
  }

  function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

  function fullName(e) { return e.firstName + " " + e.lastName; }

  function populateFilters() {
    var deptSel = document.getElementById("att-filter-department");
    deptSel.innerHTML = '<option value="">All Departments</option>' + D.DEPARTMENTS.map(function (d) { return '<option value="' + d + '">' + d + "</option>"; }).join("");
    var monthSel = document.getElementById("att-month");
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    monthSel.innerHTML = months.map(function (m, i) { return '<option value="' + (i + 1) + '">' + m + "</option>"; }).join("");
    monthSel.value = state.month;
    document.getElementById("att-year").value = state.year;

    var empSel = document.getElementById("log-employee");
    empSel.innerHTML = Store.getEmployees().filter(function (e) { return e.status === "Active" || e.status === "On Leave"; })
      .map(function (e) { return '<option value="' + e.id + '">' + fullName(e) + " (" + e.id + ")</option>"; }).join("");
    document.getElementById("log-date").value = X.todayIso();
  }

  function computeWorkingDays() {
    var settings = Store.getSettings();
    return X.workingDaysInMonth(state.year, state.month, settings.holidays || D.PH_HOLIDAYS);
  }

  function renderWorkingDaysBanner() {
    var wd = computeWorkingDays();
    var holidays = (Store.getSettings().holidays || D.PH_HOLIDAYS).filter(function (h) {
      return h.date.slice(0, 4) === String(state.year) && Number(h.date.slice(5, 7)) === state.month;
    });
    var holidayText = holidays.length ? holidays.map(function (h) { return h.name + " (" + X.fmtDate(h.date) + ")"; }).join(", ") : "None this month";
    document.getElementById("att-working-days").innerHTML =
      '<i class="fa-solid fa-calendar-week"></i> <strong>' + wd + "</strong> working days this month (Sundays excluded) &middot; Holidays: " + X.escapeHtml(holidayText);
  }

  function renderMatrix() {
    var employees = Store.getEmployees().filter(function (e) {
      if (e.archived) return false;
      if (state.department && e.department !== state.department) return false;
      return true;
    });
    var idx = attendanceIndex();
    var hset = holidaySet();
    var nd = daysInMonth(state.year, state.month);
    var todayIso = X.todayIso();

    var head = '<th style="position:sticky;left:0;background:#F8FAFC;z-index:2;min-width:170px">Employee</th>';
    for (var d = 1; d <= nd; d++) head += '<th style="text-align:center;min-width:30px">' + d + "</th>";

    var rows = employees.map(function (e) {
      var cells = '<td style="position:sticky;left:0;background:#fff;font-weight:600;white-space:nowrap">' +
        '<div style="display:flex;align-items:center;gap:8px"><div class="avatar avatar-sm" style="background:' + X.avatarColor(e.id) + '">' + X.initials(e.firstName, e.lastName) + "</div>" + X.escapeHtml(fullName(e)) + "</div></td>";
      for (var day = 1; day <= nd; day++) {
        var dateStr = state.year + "-" + pad2(state.month) + "-" + pad2(day);
        var dow = new Date(state.year, state.month - 1, day).getDay();
        var rec = idx[keyFor(e.id, dateStr)];
        var status = rec ? rec.status : "";
        if (!status) {
          if (dow === 0) status = "Rest Day";
          else if (hset[dateStr]) status = "Holiday";
          else if (dateStr > todayIso) status = "";
          else status = "";
        }
        if (state.status && status !== state.status) {
          cells += '<td style="text-align:center;padding:3px"></td>';
          continue;
        }
        cells += '<td style="text-align:center;padding:3px" title="' + dateStr + ": " + (status || "No data") + '">' +
          '<span class="att-cell ' + cellClass(status) + '">' + cellLabel(status) + "</span></td>";
      }
      return "<tr>" + cells + "</tr>";
    }).join("");

    document.getElementById("att-matrix-wrap").innerHTML =
      '<table class="dlx-table" style="border-collapse:separate;border-spacing:0"><thead><tr>' + head + "</tr></thead><tbody>" + rows + "</tbody></table>";
  }

  function isoOfDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

  // Working days actually applicable to this employee within the selected month:
  // starts no earlier than their hire date, ends no later than today (so a
  // mid-month hire, or the current partial month, isn't measured against the
  // full month's working days and doesn't show a misleadingly low rate).
  function employeeApplicableWorkingDays(e) {
    var settings = Store.getSettings();
    var holidays = settings.holidays || D.PH_HOLIDAYS;
    var monthStart = state.year + "-" + pad2(state.month) + "-01";
    var monthEnd = state.year + "-" + pad2(state.month) + "-" + pad2(daysInMonth(state.year, state.month));
    var todayIso = X.todayIso();
    var rangeStart = e.dateHired && e.dateHired > monthStart ? e.dateHired : monthStart;
    var rangeEnd = monthEnd < todayIso ? monthEnd : todayIso;
    if (rangeStart > rangeEnd) return 0;
    var holidaySet = {};
    holidays.forEach(function (h) { holidaySet[h.date] = true; });
    var count = 0;
    var cur = new Date(rangeStart + "T00:00:00");
    var end = new Date(rangeEnd + "T00:00:00");
    while (cur <= end) {
      var iso = isoOfDate(cur);
      if (cur.getDay() !== 0 && !holidaySet[iso]) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  function renderSummary() {
    var employees = Store.getEmployees().filter(function (e) {
      if (e.archived) return false;
      if (state.department && e.department !== state.department) return false;
      return true;
    });
    var attendance = Store.getAttendance();
    var rows = employees.map(function (e) {
      var recs = attendance.filter(function (a) {
        return a.employeeId === e.id && a.date.slice(0, 4) === String(state.year) && Number(a.date.slice(5, 7)) === state.month;
      });
      var present = recs.filter(function (r) { return r.status === "Present"; }).length;
      var late = recs.filter(function (r) { return r.status === "Late"; }).length;
      var absent = recs.filter(function (r) { return r.status === "Absent"; }).length;
      var onLeave = recs.filter(function (r) { return r.status === "On Leave"; }).length;
      var halfDay = recs.filter(function (r) { return r.status === "Half Day"; }).length;
      var totalHours = recs.reduce(function (s, r) { return s + (Number(r.hoursWorked) || 0); }, 0);
      var totalBreakMins = recs.reduce(function (s, r) { return s + totalBreakMinutes(r); }, 0);
      var wd = employeeApplicableWorkingDays(e);
      var rate = wd > 0 ? (((present + late + halfDay) / wd) * 100) : 0;
      return (
        "<tr>" +
        '<td data-label="Employee">' + X.escapeHtml(fullName(e)) + "</td>" +
        '<td data-label="Present" style="text-align:center">' + present + "</td>" +
        '<td data-label="Late" style="text-align:center">' + late + "</td>" +
        '<td data-label="Absent" style="text-align:center">' + absent + "</td>" +
        '<td data-label="On Leave" style="text-align:center">' + onLeave + "</td>" +
        '<td data-label="Hours Worked" style="text-align:center">' + totalHours.toFixed(1) + "</td>" +
        '<td data-label="Break Time" style="text-align:center">' + fmtMinutes(totalBreakMins) + "</td>" +
        '<td data-label="Working Days" style="text-align:center" title="Working days from hire date (or month start) through today">' + wd + "</td>" +
        '<td data-label="Attendance Rate">' +
        '<div style="display:flex;align-items:center;gap:8px"><div class="progress-track" style="flex:1"><div class="progress-fill" style="width:' + Math.min(100, rate) + '%;background:' + (rate >= 90 ? "#22C55E" : rate >= 75 ? "#EAB308" : "#EF4444") + '"></div></div><span style="font-size:.75rem;font-weight:700">' + rate.toFixed(0) + "%</span></div>" +
        "</td>" +
        "</tr>"
      );
    }).join("");
    document.getElementById("att-summary-body").innerHTML = rows;
  }

  function renderAll() {
    renderWorkingDaysBanner();
    renderMatrix();
    renderSummary();
  }

  // ---------------------------------------------------------------------
  // Logging
  // ---------------------------------------------------------------------
  function autoStatus(timeIn) {
    if (!timeIn) return "Absent";
    var cutoff = Store.getSettings().workHoursStart || "09:00";
    return timeIn > cutoff ? "Late" : "Present";
  }
  function hoursBetween(timeIn, timeOut) {
    if (!timeIn || !timeOut) return 0;
    var a = timeIn.split(":"), b = timeOut.split(":");
    var minutes = (Number(b[0]) * 60 + Number(b[1])) - (Number(a[0]) * 60 + Number(a[1]));
    return Math.max(0, Math.round((minutes / 60) * 100) / 100);
  }

  function upsertAttendance(rec) {
    var all = Store.getAttendance();
    var idx = all.findIndex(function (a) { return a.employeeId === rec.employeeId && a.date === rec.date; });
    var id = "ATT-" + rec.employeeId + "-" + rec.date;
    var full = Object.assign({ id: id }, rec);
    if (idx === -1) all.push(full); else all[idx] = full;
    Store.setAttendance(all);
  }

  function bindLogForm() {
    var timeIn = document.getElementById("log-timein");
    var timeOut = document.getElementById("log-timeout");
    var statusSel = document.getElementById("log-status");
    function refreshAuto() {
      var status = autoStatus(timeIn.value);
      statusSel.value = status;
      document.getElementById("log-hours").textContent = hoursBetween(timeIn.value, timeOut.value).toFixed(1) + " hrs";
    }
    timeIn.addEventListener("change", refreshAuto);
    timeOut.addEventListener("change", refreshAuto);

    document.getElementById("log-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var employeeId = document.getElementById("log-employee").value;
      var date = document.getElementById("log-date").value;
      var tIn = timeIn.value, tOut = timeOut.value;
      var status = statusSel.value;
      var hours = status === "Absent" ? 0 : hoursBetween(tIn, tOut);
      var breakMins = Number(document.getElementById("log-breakmins").value) || 0;
      upsertAttendance({ employeeId: employeeId, date: date, status: status, timeIn: tIn, timeOut: tOut, hoursWorked: hours, breakMinutes: breakMins, notes: document.getElementById("log-notes").value.trim() });
      X.toast("Attendance logged for " + date + ".", "success");
      document.getElementById("log-form").reset();
      document.getElementById("log-date").value = X.todayIso();
      document.getElementById("log-hours").textContent = "0.0 hrs";
      state.year = Number(date.slice(0,4)); state.month = Number(date.slice(5,7));
      document.getElementById("att-year").value = state.year;
      document.getElementById("att-month").value = state.month;
      renderAll();
    });
  }

  function markAllPresent() {
    var today = X.todayIso();
    var dow = new Date(today + "T00:00:00").getDay();
    if (dow === 0) { X.toast("Today is a rest day (Sunday).", "warning"); return; }
    var employees = Store.getEmployees().filter(function (e) { return !e.archived && e.status === "Active"; });
    employees.forEach(function (e) {
      upsertAttendance({ employeeId: e.id, date: today, status: "Present", timeIn: "08:55", timeOut: "18:00", hoursWorked: 8, notes: "Bulk marked present" });
    });
    X.toast("Marked " + employees.length + " employees Present for today.", "success");
    state.year = Number(today.slice(0,4)); state.month = Number(today.slice(5,7));
    document.getElementById("att-year").value = state.year;
    document.getElementById("att-month").value = state.month;
    renderAll();
  }

  function exportCsv() {
    var attendance = Store.getAttendance().filter(function (a) {
      return a.date.slice(0, 4) === String(state.year) && Number(a.date.slice(5, 7)) === state.month;
    });
    var empIdx = {};
    Store.getEmployees().forEach(function (e) { empIdx[e.id] = fullName(e); });
    var header = ["Employee ID", "Employee Name", "Date", "Status", "Time In", "Time Out", "Hours Worked", "Notes"];
    var rows = attendance.map(function (a) { return [a.employeeId, empIdx[a.employeeId] || a.employeeId, a.date, a.status, a.timeIn, a.timeOut, a.hoursWorked, a.notes]; });
    X.downloadCsv("digilex-attendance-" + state.year + "-" + pad2(state.month) + ".csv", [header].concat(rows));
    X.toast("CSV exported.", "success");
  }

  function bindFilters() {
    document.getElementById("att-month").addEventListener("change", function (e) { state.month = Number(e.target.value); renderAll(); });
    document.getElementById("att-year").addEventListener("change", function (e) { state.year = Number(e.target.value); renderAll(); });
    document.getElementById("att-filter-department").addEventListener("change", function (e) { state.department = e.target.value; renderAll(); });
    document.getElementById("att-filter-status").addEventListener("change", function (e) { state.status = e.target.value; renderMatrix(); });
    document.getElementById("btn-mark-all-present").addEventListener("click", markAllPresent);
    document.getElementById("btn-att-export").addEventListener("click", exportCsv);
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("attendance", "Attendance");
    populateFilters();
    bindFilters();
    bindLogForm();
    renderAll();
  });
})();
