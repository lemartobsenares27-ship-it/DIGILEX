/* DIGILEX HR ERP — Leave Management module */

(function () {
  "use strict";
  var X = window.Digilex;
  var D = window.DigilexData;
  var Store = X.Store;

  var calState = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

  function fullName(e) { return e.firstName + " " + e.lastName; }
  function leaveTypeName(code) {
    var t = D.LEAVE_TYPES.find(function (x) { return x.code === code; });
    return t ? t.name : code;
  }
  function statusBadge(status) {
    var map = { Pending: "yellow", Approved: "green", Denied: "red" };
    return '<span class="badge badge-' + (map[status] || "gray") + '">' + status + "</span>";
  }

  function populateSelects() {
    var empSel = document.getElementById("lv-employee");
    var employees = Store.getEmployees().filter(function (e) { return !e.archived; });
    empSel.innerHTML = employees.map(function (e) { return '<option value="' + e.id + '">' + fullName(e) + "</option>"; }).join("");
    var typeSel = document.getElementById("lv-type");
    typeSel.innerHTML = D.LEAVE_TYPES.map(function (t) { return '<option value="' + t.code + '">' + t.name + "</option>"; }).join("");
    document.getElementById("lv-date-from").value = X.todayIso();
    document.getElementById("lv-date-to").value = X.todayIso();
    recalcDays();
  }

  function recalcDays() {
    var from = document.getElementById("lv-date-from").value;
    var to = document.getElementById("lv-date-to").value;
    if (!from || !to || to < from) { document.getElementById("lv-days-display").textContent = "0 day(s)"; return 0; }
    var days = X.daysBetweenInclusive(from, to, [0]);
    document.getElementById("lv-days-display").textContent = days + " day(s) (Sundays excluded)";
    return days;
  }

  function submitRequest(ev) {
    ev.preventDefault();
    var employeeId = document.getElementById("lv-employee").value;
    var leaveType = document.getElementById("lv-type").value;
    var from = document.getElementById("lv-date-from").value;
    var to = document.getElementById("lv-date-to").value;
    var reason = document.getElementById("lv-reason").value.trim();
    if (to < from) { X.toast("End date must be after start date.", "danger"); return; }
    var days = recalcDays();
    var requests = Store.getLeaveRequests();
    requests.push({
      id: X.uid("LV"), employeeId: employeeId, leaveType: leaveType, dateFrom: from, dateTo: to,
      days: days, reason: reason, status: "Pending", dateFiled: X.todayIso(),
    });
    Store.setLeaveRequests(requests);
    X.toast("Leave request submitted.", "success");
    document.getElementById("lv-form").reset();
    document.getElementById("lv-date-from").value = X.todayIso();
    document.getElementById("lv-date-to").value = X.todayIso();
    recalcDays();
    renderAll();
  }

  function setStatus(id, status) {
    var requests = Store.getLeaveRequests();
    var idx = requests.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return;
    requests[idx].status = status;
    Store.setLeaveRequests(requests);
    // If approved, mark attendance records within the range as "On Leave"
    if (status === "Approved") {
      var req = requests[idx];
      var attendance = Store.getAttendance();
      var cur = new Date(req.dateFrom + "T00:00:00");
      var end = new Date(req.dateTo + "T00:00:00");
      while (cur <= end) {
        if (cur.getDay() !== 0) {
          var dateStr = cur.getFullYear() + "-" + X.pad2(cur.getMonth() + 1) + "-" + X.pad2(cur.getDate());
          var aIdx = attendance.findIndex(function (a) { return a.employeeId === req.employeeId && a.date === dateStr; });
          var rec = { id: "ATT-" + req.employeeId + "-" + dateStr, employeeId: req.employeeId, date: dateStr, status: "On Leave", timeIn: "", timeOut: "", hoursWorked: 0, notes: "Leave: " + leaveTypeName(req.leaveType) };
          if (aIdx === -1) attendance.push(rec); else attendance[aIdx] = rec;
        }
        cur.setDate(cur.getDate() + 1);
      }
      Store.setAttendance(attendance);
    }
    X.toast("Leave request " + status.toLowerCase() + ".", status === "Approved" ? "success" : "warning");
    renderAll();
  }

  function renderRequestsTable() {
    var requests = Store.getLeaveRequests().slice().sort(function (a, b) { return b.dateFiled.localeCompare(a.dateFiled); });
    var empIdx = {};
    Store.getEmployees().forEach(function (e) { empIdx[e.id] = e; });
    var pending = requests.filter(function (r) { return r.status === "Pending"; }).length;
    document.getElementById("lv-pending-badge").textContent = pending + " pending";

    var rows = requests.map(function (r) {
      var e = empIdx[r.employeeId];
      var name = e ? fullName(e) : r.employeeId;
      var actions = r.status === "Pending"
        ? '<button class="btn btn-secondary btn-sm" data-approve="' + r.id + '" style="color:#166534;border-color:#BBF7D0"><i class="fa-solid fa-check"></i></button> <button class="btn btn-secondary btn-sm" data-deny="' + r.id + '" style="color:#991B1B;border-color:#FCA5A5"><i class="fa-solid fa-xmark"></i></button>'
        : '<span style="color:#94A3B8;font-size:.75rem">—</span>';
      return (
        "<tr>" +
        '<td data-label="Employee">' + X.escapeHtml(name) + "</td>" +
        '<td data-label="Leave Type">' + leaveTypeName(r.leaveType) + "</td>" +
        '<td data-label="Dates">' + X.fmtDate(r.dateFrom) + " – " + X.fmtDate(r.dateTo) + "</td>" +
        '<td data-label="Days" style="text-align:center">' + r.days + "</td>" +
        '<td data-label="Reason" style="max-width:180px;overflow:hidden;text-overflow:ellipsis">' + X.escapeHtml(r.reason || "—") + "</td>" +
        '<td data-label="Status">' + statusBadge(r.status) + "</td>" +
        '<td data-label="Actions">' + actions + "</td>" +
        "</tr>"
      );
    }).join("");
    document.getElementById("lv-requests-body").innerHTML = rows || '<tr><td colspan="7" style="text-align:center;color:#94A3B8;padding:20px">No leave requests yet.</td></tr>';

    document.querySelectorAll("[data-approve]").forEach(function (b) { b.addEventListener("click", function () { setStatus(b.getAttribute("data-approve"), "Approved"); }); });
    document.querySelectorAll("[data-deny]").forEach(function (b) { b.addEventListener("click", function () { setStatus(b.getAttribute("data-deny"), "Denied"); }); });
  }

  function renderBalances() {
    var employees = Store.getEmployees().filter(function (e) { return !e.archived && e.status === "Active"; });
    var requests = Store.getLeaveRequests().filter(function (r) { return r.status === "Approved"; });
    var year = new Date().getFullYear();
    var trackedTypes = D.LEAVE_TYPES.filter(function (t) { return t.annualDays > 0 && t.code !== "ML"; });

    var html = employees.map(function (e) {
      var bars = trackedTypes.map(function (t) {
        var used = requests.filter(function (r) { return r.employeeId === e.id && r.leaveType === t.code && r.dateFrom.slice(0, 4) === String(year); })
          .reduce(function (s, r) { return s + r.days; }, 0);
        var remaining = Math.max(0, t.annualDays - used);
        var pct = t.annualDays ? Math.min(100, (used / t.annualDays) * 100) : 0;
        var low = remaining < 1;
        return (
          '<div style="margin-bottom:8px">' +
          '<div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:3px">' +
          '<span>' + t.code + (low ? ' <i class="fa-solid fa-triangle-exclamation" style="color:#EF4444" title="Low balance"></i>' : "") + "</span>" +
          "<span>" + remaining + " of " + t.annualDays + " days</span></div>" +
          '<div class="progress-track"><div class="progress-fill" style="width:' + pct + "%;background:" + (low ? "#EF4444" : "#F97316") + '"></div></div>' +
          "</div>"
        );
      }).join("");
      return (
        '<div class="dlx-card">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
        '<div class="avatar avatar-sm" style="background:' + X.avatarColor(e.id) + '">' + X.initials(e.firstName, e.lastName) + "</div>" +
        '<div style="font-weight:700;font-size:.88rem">' + X.escapeHtml(fullName(e)) + "</div>" +
        "</div>" + bars + "</div>"
      );
    }).join("");
    document.getElementById("lv-balances").innerHTML = html;
  }

  function renderCalendar() {
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    document.getElementById("lv-cal-label").textContent = months[calState.month - 1] + " " + calState.year;
    var requests = Store.getLeaveRequests().filter(function (r) { return r.status === "Approved"; });
    var empIdx = {};
    Store.getEmployees().forEach(function (e) { empIdx[e.id] = e; });

    var nd = new Date(calState.year, calState.month, 0).getDate();
    var firstDow = new Date(calState.year, calState.month - 1, 1).getDay();
    var cells = "";
    for (var i = 0; i < firstDow; i++) cells += '<div class="cal-cell cal-empty"></div>';
    for (var d = 1; d <= nd; d++) {
      var dateStr = calState.year + "-" + X.pad2(calState.month) + "-" + X.pad2(d);
      var onLeave = requests.filter(function (r) { return dateStr >= r.dateFrom && dateStr <= r.dateTo; });
      var chips = onLeave.slice(0, 3).map(function (r) {
        var e = empIdx[r.employeeId];
        var name = e ? e.firstName : r.employeeId;
        return '<div style="background:#DBEAFE;color:#1E40AF;border-radius:4px;padding:1px 4px;font-size:.62rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + X.escapeHtml(name) + "</div>";
      }).join("");
      var more = onLeave.length > 3 ? '<div style="font-size:.6rem;color:#94A3B8">+' + (onLeave.length - 3) + " more</div>" : "";
      cells += '<div class="cal-cell" style="border:1px solid #E2E8F0;border-radius:6px;padding:4px;min-height:70px"><div style="font-size:.72rem;font-weight:700;color:#64748B">' + d + "</div>" + chips + more + "</div>";
    }
    document.getElementById("lv-calendar-grid").innerHTML = cells;
  }

  function renderAll() {
    renderRequestsTable();
    renderBalances();
    renderCalendar();
  }

  function bindEvents() {
    document.getElementById("lv-form").addEventListener("submit", submitRequest);
    document.getElementById("lv-date-from").addEventListener("change", recalcDays);
    document.getElementById("lv-date-to").addEventListener("change", recalcDays);
    document.getElementById("lv-cal-prev").addEventListener("click", function () {
      calState.month--; if (calState.month < 1) { calState.month = 12; calState.year--; }
      renderCalendar();
    });
    document.getElementById("lv-cal-next").addEventListener("click", function () {
      calState.month++; if (calState.month > 12) { calState.month = 1; calState.year++; }
      renderCalendar();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("leave", "Leave Management");
    populateSelects();
    bindEvents();
    renderAll();
  });
})();
