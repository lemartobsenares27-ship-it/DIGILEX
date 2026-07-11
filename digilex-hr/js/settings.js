/* DIGILEX HR ERP — Settings module */

(function () {
  "use strict";
  var X = window.Digilex;
  var Store = X.Store;
  var ALL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function loadForm() {
    var s = Store.getSettings();
    document.getElementById("set-company-name").value = s.companyName || "";
    document.getElementById("set-company-address").value = s.companyAddress || "";
    document.getElementById("set-cutoff-1").value = (s.payrollCutoffDays || [15, 30])[0];
    document.getElementById("set-cutoff-2").value = (s.payrollCutoffDays || [15, 30])[1];
    document.getElementById("set-hours-start").value = s.workHoursStart || "09:00";
    document.getElementById("set-hours-end").value = s.workHoursEnd || "18:00";

    var restWrap = document.getElementById("set-restdays");
    restWrap.innerHTML = ALL_DAYS.map(function (d) {
      var checked = (s.restDays || []).indexOf(d) !== -1 ? "checked" : "";
      return '<label style="display:flex;align-items:center;gap:6px;font-size:.82rem"><input type="checkbox" class="set-restday-chk" value="' + d + '" ' + checked + "> " + d + "</label>";
    }).join("");

    renderHolidays(s.holidays || []);
  }

  function renderHolidays(holidays) {
    var rows = holidays.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).map(function (h, i) {
      return (
        "<tr>" +
        '<td data-label="Date">' + X.fmtDate(h.date) + "</td>" +
        '<td data-label="Name">' + X.escapeHtml(h.name) + "</td>" +
        '<td data-label="Type"><span class="badge badge-' + (h.type === "Regular" ? "blue" : "purple") + '">' + h.type + "</span></td>" +
        '<td data-label="Actions"><button class="btn btn-danger btn-sm" data-remove-holiday="' + h.date + '"><i class="fa-solid fa-trash"></i></button></td>' +
        "</tr>"
      );
    }).join("");
    document.getElementById("set-holidays-body").innerHTML = rows;
    document.querySelectorAll("[data-remove-holiday]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = Store.getSettings();
        s.holidays = (s.holidays || []).filter(function (h) { return h.date !== b.getAttribute("data-remove-holiday"); });
        Store.setSettings(s);
        renderHolidays(s.holidays);
        X.toast("Holiday removed.", "success");
      });
    });
  }

  function saveSettings(ev) {
    ev.preventDefault();
    var s = Store.getSettings();
    s.companyName = document.getElementById("set-company-name").value.trim();
    s.companyAddress = document.getElementById("set-company-address").value.trim();
    s.payrollCutoffDays = [Number(document.getElementById("set-cutoff-1").value) || 15, Number(document.getElementById("set-cutoff-2").value) || 30];
    s.workHoursStart = document.getElementById("set-hours-start").value;
    s.workHoursEnd = document.getElementById("set-hours-end").value;
    s.restDays = Array.prototype.slice.call(document.querySelectorAll(".set-restday-chk:checked")).map(function (c) { return c.value; });
    Store.setSettings(s);
    X.toast("Settings saved.", "success");
  }

  function addHoliday(ev) {
    ev.preventDefault();
    var date = document.getElementById("hol-f-date").value;
    var name = document.getElementById("hol-f-name").value.trim();
    var type = document.getElementById("hol-f-type").value;
    if (!date || !name) return;
    var s = Store.getSettings();
    s.holidays = (s.holidays || []).filter(function (h) { return h.date !== date; }).concat([{ date: date, name: name, type: type }]);
    Store.setSettings(s);
    renderHolidays(s.holidays);
    document.getElementById("holiday-form").reset();
    X.toast("Holiday added.", "success");
  }

  function resetDemo() {
    if (!confirm("This will erase all data (employees, attendance, payroll, leave, etc.) and restore the original demo data. Continue?")) return;
    Store.resetDemoData();
    X.toast("Demo data reset.", "success");
    loadForm();
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("settings", "Settings");
    loadForm();
    document.getElementById("settings-form").addEventListener("submit", saveSettings);
    document.getElementById("holiday-form").addEventListener("submit", addHoliday);
    document.getElementById("btn-reset-demo").addEventListener("click", resetDemo);
  });
})();
