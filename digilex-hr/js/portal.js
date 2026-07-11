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
  }

  function renderClock() {
    var today = X.todayIso();
    var dow = new Date(today + "T00:00:00").getDay();
    var rec = todayRecord();
    var box = document.getElementById("portal-clock-status");
    var timeInBtn = document.getElementById("btn-time-in");
    var timeOutBtn = document.getElementById("btn-time-out");

    document.getElementById("portal-today-date").textContent = new Date(today + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    if (dow === 0) {
      box.innerHTML = '<span class="badge badge-gray">Rest Day</span> Enjoy your Sunday off!';
      timeInBtn.disabled = true; timeOutBtn.disabled = true;
      return;
    }
    if (!rec || !rec.timeIn) {
      box.innerHTML = '<span class="badge badge-gray">Not clocked in</span>';
      timeInBtn.disabled = false; timeOutBtn.disabled = true;
    } else if (rec.timeIn && !rec.timeOut) {
      box.innerHTML = cellBadge(rec.status) + ' Clocked in at <strong>' + rec.timeIn + '</strong>';
      timeInBtn.disabled = true; timeOutBtn.disabled = false;
    } else {
      box.innerHTML = cellBadge(rec.status) + ' ' + rec.timeIn + ' – ' + rec.timeOut + ' (' + rec.hoursWorked + ' hrs)';
      timeInBtn.disabled = true; timeOutBtn.disabled = true;
    }
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
    saveAttendance({ employeeId: employee.id, date: rec.date, status: rec.status, timeIn: rec.timeIn, timeOut: t, hoursWorked: hours, notes: rec.notes });
    X.toast("Timed out at " + t + ".", "success");
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
        "</tr>"
      );
    }).join("") || '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:16px">No attendance logged yet.</td></tr>';
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

  document.addEventListener("DOMContentLoaded", function () {
    renderHeader();
    renderClock();
    renderHistory();
    renderMonthSummary();
    document.getElementById("btn-time-in").addEventListener("click", timeIn);
    document.getElementById("btn-time-out").addEventListener("click", timeOut);
    document.getElementById("btn-portal-logout").addEventListener("click", function () { window.DigilexAuth.logout(); });
  });
})();
