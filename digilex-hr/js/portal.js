/* DIGILEX HR ERP — employee self-service portal (time in/out + own attendance) */

(function () {
  "use strict";
  var X = window.Digilex;
  var D = window.DigilexData;
  var Store = X.Store;
  var session = window.DigilexAuth.requireRole();
  if (!session) return;

  var employee = Store.getEmployees().find(function (e) { return e.id === session.employeeId; });
  if (!employee) { window.DigilexAuth.logout(); return; }

  function fullName(e) { return e.firstName + " " + e.lastName; }

  function cellBadge(status) {
    var map = { Present: "green", Late: "yellow", "Half Day": "orange", Absent: "red", "On Leave": "blue", "Rest Day": "gray", Holiday: "purple" };
    return status ? '<span class="badge badge-' + (map[status] || "gray") + '">' + status + "</span>" : '<span style="color:#94A3B8">—</span>';
  }

  function autoStatus(timeIn) {
    var cutoff = Store.getSettings().workHoursStart || "09:00";
    return timeIn > cutoff ? "Late" : "Present";
  }
  function hoursBetween(timeIn, timeOut) {
    if (!timeIn || !timeOut) return 0;
    var a = timeIn.split(":"), b = timeOut.split(":");
    var minutes = (Number(b[0]) * 60 + Number(b[1])) - (Number(a[0]) * 60 + Number(a[1]));
    return Math.max(0, Math.round((minutes / 60) * 100) / 100);
  }
  function nowHm() {
    var d = new Date();
    return X.pad2(d.getHours()) + ":" + X.pad2(d.getMinutes());
  }

  function minutesBetween(timeIn, timeOut) {
    if (!timeIn || !timeOut) return 0;
    var a = timeIn.split(":"), b = timeOut.split(":");
    return Math.max(0, (Number(b[0]) * 60 + Number(b[1])) - (Number(a[0]) * 60 + Number(a[1])));
  }
  function totalBreakMinutes(rec) {
    if (!rec || !rec.breaks) return 0;
    return rec.breaks.reduce(function (s, b) { return s + minutesBetween(b.start, b.end || nowHm()); }, 0);
  }
  function openBreak(rec) {
    if (!rec || !rec.breaks) return null;
    return rec.breaks.find(function (b) { return b.start && !b.end; }) || null;
  }
  function fmtMinutes(m) {
    if (!m) return "0m";
    var h = Math.floor(m / 60), rem = Math.round(m % 60);
    return (h ? h + "h " : "") + rem + "m";
  }

  function todayRecord() {
    var todayIso = X.todayIso();
    return Store.getAttendance().find(function (a) { return a.employeeId === employee.id && a.date === todayIso; });
  }

  function saveAttendance(rec) {
    var all = Store.getAttendance();
    var idx = all.findIndex(function (a) { return a.employeeId === rec.employeeId && a.date === rec.date; });
    var full = Object.assign({ id: "ATT-" + rec.employeeId + "-" + rec.date }, rec);
    if (idx === -1) all.push(full); else all[idx] = full;
    Store.setAttendance(all);
  }

  function renderHeader() {
    document.getElementById("portal-avatar").textContent = X.initials(employee.firstName, employee.lastName);
    document.getElementById("portal-avatar").style.background = X.avatarColor(employee.id);
    document.getElementById("portal-name").textContent = fullName(employee);
    document.getElementById("portal-role").textContent = employee.position + " · " + employee.department;
    document.getElementById("portal-greeting").textContent = X.greeting() + ", " + employee.firstName + ".";
  }

  var elapsedTimer = null;

  function fmtHms(totalSeconds) {
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = Math.floor(totalSeconds % 60);
    return X.pad2(h) + ":" + X.pad2(m) + ":" + X.pad2(s);
  }
  function tickElapsed(timeIn) {
    var box = document.getElementById("portal-time-elapsed");
    function tick() {
      var parts = timeIn.split(":");
      var start = new Date();
      start.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
      var secs = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
      box.textContent = fmtHms(secs);
    }
    tick();
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = setInterval(tick, 1000);
  }
  function stopElapsed(text) {
    if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
    document.getElementById("portal-time-elapsed").textContent = text;
  }

  function renderClock() {
    var today = X.todayIso();
    var dow = new Date(today + "T00:00:00").getDay();
    var rec = todayRecord();
    var box = document.getElementById("portal-clock-status");
    var timeInBtn = document.getElementById("btn-time-in");
    var timeOutBtn = document.getElementById("btn-time-out");
    var breakStartBtn = document.getElementById("btn-break-start");
    var breakEndBtn = document.getElementById("btn-break-end");
    var breakTypeSel = document.getElementById("portal-break-type");
    var breakBox = document.getElementById("portal-break-status");
    var checkinIcon = document.querySelector("#portal-step-checkin .portal-step-icon");
    var checkoutIcon = document.querySelector("#portal-step-checkout .portal-step-icon");

    document.getElementById("portal-today-date").textContent = X.fmtFullDate(new Date(today + "T00:00:00"));

    checkinIcon.className = "portal-step-icon" + (rec && rec.timeIn ? " done" : "");
    checkoutIcon.className = "portal-step-icon" + (rec && rec.timeOut ? " done" : "");
    document.getElementById("portal-step-checkin-time").textContent = (rec && rec.timeIn) || "—";
    document.getElementById("portal-step-checkout-time").textContent = (rec && rec.timeOut) || "—";

    if (dow === 0) {
      box.innerHTML = '<span class="badge badge-gray">Rest Day</span> Enjoy your Sunday off!';
      timeInBtn.disabled = true; timeOutBtn.disabled = true;
      breakStartBtn.disabled = true; breakEndBtn.disabled = true; breakTypeSel.disabled = true;
      breakBox.innerHTML = "";
      stopElapsed("00:00:00");
      renderBreaksList(rec);
      return;
    }
    if (!rec || !rec.timeIn) {
      box.innerHTML = '<span class="badge badge-gray">Not clocked in</span>';
      timeInBtn.disabled = false; timeOutBtn.disabled = true;
      stopElapsed("00:00:00");
    } else if (rec.timeIn && !rec.timeOut) {
      box.innerHTML = cellBadge(rec.status) + ' Clocked in at <strong>' + rec.timeIn + '</strong>';
      timeInBtn.disabled = true; timeOutBtn.disabled = false;
      tickElapsed(rec.timeIn);
    } else {
      box.innerHTML = cellBadge(rec.status) + ' ' + rec.timeIn + ' – ' + rec.timeOut + ' (' + rec.hoursWorked + ' hrs)';
      timeInBtn.disabled = true; timeOutBtn.disabled = true;
      stopElapsed(fmtHms(hoursBetween(rec.timeIn, rec.timeOut) * 3600));
    }

    var canBreak = !!(rec && rec.timeIn && !rec.timeOut);
    var ob = openBreak(rec);
    breakTypeSel.disabled = !canBreak || !!ob;
    breakStartBtn.disabled = !canBreak || !!ob;
    breakEndBtn.disabled = !canBreak || !ob;
    if (!canBreak) {
      breakBox.innerHTML = '<span style="color:#94A3B8">Clock in to start tracking breaks.</span>';
    } else if (ob) {
      breakBox.innerHTML = '<span class="badge badge-orange">On ' + X.escapeHtml(ob.type) + '</span> since <strong>' + ob.start + '</strong>';
    } else {
      var mins = totalBreakMinutes(rec);
      breakBox.innerHTML = mins ? 'Total break time today: <strong>' + fmtMinutes(mins) + '</strong>' : 'No breaks taken yet today.';
    }
    renderBreaksList(rec);
  }

  function renderBreaksList(rec) {
    var list = document.getElementById("portal-breaks-list");
    var breaks = (rec && rec.breaks) || [];
    if (!breaks.length) { list.innerHTML = ""; return; }
    list.innerHTML = breaks.map(function (b) {
      var timeText = b.end ? (b.start + " – " + b.end + " (" + fmtMinutes(minutesBetween(b.start, b.end)) + ")") : ("since " + b.start + " (ongoing)");
      return '<div style="font-size:.78rem;color:#64748B;padding:3px 0"><i class="fa-solid fa-mug-saucer" style="color:#F97316;margin-right:6px"></i>' + X.escapeHtml(b.type) + ": " + timeText + "</div>";
    }).join("");
  }

  function timeIn() {
    var today = X.todayIso();
    var t = nowHm();
    var status = autoStatus(t);
    saveAttendance({ employeeId: employee.id, date: today, status: status, timeIn: t, timeOut: "", hoursWorked: 0, notes: "Self-logged" });
    X.toast("Timed in at " + t + ".", "success");
    renderClock();
    renderHistory();
  }
  function timeOut() {
    var rec = todayRecord();
    if (!rec || !rec.timeIn) return;
    var t = nowHm();
    var hours = hoursBetween(rec.timeIn, t);
    var breaks = rec.breaks || [];
    var ob = openBreak(rec);
    if (ob) ob.end = t; // auto-close a break left running at time-out
    saveAttendance({ employeeId: employee.id, date: rec.date, status: rec.status, timeIn: rec.timeIn, timeOut: t, hoursWorked: hours, notes: rec.notes, breaks: breaks });
    X.toast("Timed out at " + t + ".", "success");
    renderClock();
    renderHistory();
  }

  function breakStart() {
    var rec = todayRecord();
    if (!rec || !rec.timeIn || rec.timeOut || openBreak(rec)) return;
    var type = document.getElementById("portal-break-type").value;
    var breaks = rec.breaks || [];
    breaks.push({ type: type, start: nowHm(), end: "" });
    saveAttendance(Object.assign({}, rec, { breaks: breaks }));
    X.toast(type + " started.", "success");
    renderClock();
    renderHistory();
  }
  function breakEnd() {
    var rec = todayRecord();
    var ob = rec && openBreak(rec);
    if (!ob) return;
    ob.end = nowHm();
    saveAttendance(Object.assign({}, rec, { breaks: rec.breaks }));
    X.toast(ob.type + " ended (" + fmtMinutes(minutesBetween(ob.start, ob.end)) + ").", "success");
    renderClock();
    renderHistory();
  }

  function renderHistory() {
    var all = Store.getAttendance()
      .filter(function (a) { return a.employeeId === employee.id && a.status; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); })
      .slice(0, 30);
    document.getElementById("portal-history-body").innerHTML = all.map(function (a) {
      return (
        "<tr>" +
        '<td data-label="Date">' + X.fmtDate(a.date) + "</td>" +
        '<td data-label="Status">' + cellBadge(a.status) + "</td>" +
        '<td data-label="Time In">' + (a.timeIn || "—") + "</td>" +
        '<td data-label="Time Out">' + (a.timeOut || "—") + "</td>" +
        '<td data-label="Hours">' + (a.hoursWorked || 0) + "</td>" +
        '<td data-label="Break Time">' + fmtMinutes(totalBreakMinutes(a)) + "</td>" +
        "</tr>"
      );
    }).join("") || '<tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:16px">No attendance logged yet.</td></tr>';
  }

  function renderMonthSummary() {
    var now = new Date();
    var year = now.getFullYear(), month = now.getMonth() + 1;
    var recs = Store.getAttendance().filter(function (a) {
      return a.employeeId === employee.id && a.date.slice(0, 4) === String(year) && Number(a.date.slice(5, 7)) === month;
    });
    var present = recs.filter(function (a) { return a.status === "Present"; }).length;
    var late = recs.filter(function (a) { return a.status === "Late"; }).length;
    var absent = recs.filter(function (a) { return a.status === "Absent"; }).length;
    var wd = X.workingDaysInMonth(year, month, Store.getSettings().holidays);
    var rate = wd > 0 ? (((present + late) / wd) * 100) : 0;
    document.getElementById("portal-summary").innerHTML =
      summaryTile("Present", present, "#22C55E") +
      summaryTile("Late", late, "#EAB308") +
      summaryTile("Absent", absent, "#EF4444") +
      summaryTile("Attendance Rate", rate.toFixed(0) + "%", "#0EA5E9");
  }
  function summaryTile(label, value, color) {
    return '<div class="dlx-card kpi-card"><div class="kpi-label">' + label + '</div><div class="kpi-value" style="color:' + color + '">' + value + "</div></div>";
  }

  function exportMyAttendance() {
    var all = Store.getAttendance().filter(function (a) { return a.employeeId === employee.id && a.status; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    var header = ["Date", "Status", "Time In", "Time Out", "Hours", "Break Time"];
    var rows = all.map(function (a) { return [a.date, a.status, a.timeIn, a.timeOut, a.hoursWorked, fmtMinutes(totalBreakMinutes(a))]; });
    X.downloadCsv("my-attendance-" + employee.id + ".csv", [header].concat(rows));
    X.toast("Attendance exported.", "success");
  }

  // ---------------------------------------------------------------------
  // Leave requests (employee self-service — files a Pending request that
  // HR approves on the admin Leave page; the employee only ever sees and
  // files their own).
  // ---------------------------------------------------------------------
  function leaveTypeName(code) {
    var t = D.LEAVE_TYPES.find(function (x) { return x.code === code; });
    return t ? t.name : code;
  }

  function populateLeaveForm() {
    document.getElementById("portal-lv-type").innerHTML = D.LEAVE_TYPES.map(function (t) {
      return '<option value="' + t.code + '">' + X.escapeHtml(t.name) + "</option>";
    }).join("");
    document.getElementById("portal-lv-from").value = X.todayIso();
    document.getElementById("portal-lv-to").value = X.todayIso();
    recalcLeaveDays();
  }

  function recalcLeaveDays() {
    var from = document.getElementById("portal-lv-from").value;
    var to = document.getElementById("portal-lv-to").value;
    var out = document.getElementById("portal-lv-days");
    if (!from || !to || to < from) { out.textContent = "0 day(s)"; return 0; }
    var days = X.daysBetweenInclusive(from, to, [0]); // Sundays excluded
    out.textContent = days + " day(s) (Sundays excluded)";
    return days;
  }

  function submitLeaveRequest(ev) {
    ev.preventDefault();
    var from = document.getElementById("portal-lv-from").value;
    var to = document.getElementById("portal-lv-to").value;
    if (!from || !to) { X.toast("Please choose both dates.", "danger"); return; }
    if (to < from) { X.toast("The end date can't be before the start date.", "danger"); return; }
    var days = recalcLeaveDays();
    if (days <= 0) { X.toast("That range has no working days in it.", "warning"); return; }

    var requests = Store.getLeaveRequests();
    requests.push({
      id: X.uid("LV"),
      employeeId: employee.id, // always the signed-in employee, never a picker
      leaveType: document.getElementById("portal-lv-type").value,
      dateFrom: from,
      dateTo: to,
      days: days,
      reason: document.getElementById("portal-lv-reason").value.trim(),
      status: "Pending",
      dateFiled: X.todayIso(),
    });
    Store.setLeaveRequests(requests);
    X.toast("Leave request submitted for approval.", "success");
    document.getElementById("portal-leave-form").reset();
    populateLeaveForm();
    renderMyLeave();
  }

  function renderMyLeave() {
    var mine = Store.getLeaveRequests()
      .filter(function (r) { return r.employeeId === employee.id; })
      .sort(function (a, b) { return (b.dateFiled || "").localeCompare(a.dateFiled || ""); });
    var colors = { Pending: "yellow", Approved: "green", Denied: "red" };
    document.getElementById("portal-leave-list").innerHTML = mine.map(function (r) {
      return (
        '<div style="padding:10px 0;border-bottom:1px solid #F1F5F9">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
        '<div style="font-weight:600;font-size:.85rem">' + X.escapeHtml(leaveTypeName(r.leaveType)) + "</div>" +
        '<span class="badge badge-' + (colors[r.status] || "gray") + '">' + X.escapeHtml(r.status) + "</span>" +
        "</div>" +
        '<div style="font-size:.75rem;color:#64748B;margin-top:3px">' + X.fmtDate(r.dateFrom) + " – " + X.fmtDate(r.dateTo) + " &middot; " + r.days + " day(s)</div>" +
        (r.reason ? '<div style="font-size:.75rem;color:#94A3B8;margin-top:2px">' + X.escapeHtml(r.reason) + "</div>" : "") +
        "</div>"
      );
    }).join("") || '<div style="color:#94A3B8;font-size:.82rem">No leave requests yet.</div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderHeader();
    renderClock();
    renderHistory();
    renderMonthSummary();
    populateLeaveForm();
    renderMyLeave();
    document.getElementById("portal-leave-form").addEventListener("submit", submitLeaveRequest);
    document.getElementById("portal-lv-from").addEventListener("change", recalcLeaveDays);
    document.getElementById("portal-lv-to").addEventListener("change", recalcLeaveDays);
    document.getElementById("btn-time-in").addEventListener("click", timeIn);
    document.getElementById("btn-time-out").addEventListener("click", timeOut);
    document.getElementById("btn-break-start").addEventListener("click", breakStart);
    document.getElementById("btn-break-end").addEventListener("click", breakEnd);
    document.getElementById("btn-portal-logout-tile").addEventListener("click", function () { window.DigilexAuth.logout(); });
    document.getElementById("btn-portal-change-password-tile").addEventListener("click", function () { window.DigilexAuth.openChangePasswordModal(); });
    document.getElementById("btn-portal-export").addEventListener("click", exportMyAttendance);
    document.getElementById("btn-portal-history-tile").addEventListener("click", function () { document.getElementById("portal-history-card").scrollIntoView({ behavior: "smooth" }); });
  });
})();
