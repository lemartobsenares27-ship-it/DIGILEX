/* DIGILEX HR ERP — Payroll + Payslip module */

(function () {
  "use strict";
  var X = window.Digilex;
  var D = window.DigilexData;
  var Store = X.Store;

  var now = new Date();
  var state = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    half: now.getDate() <= 15 ? 1 : 2,
  };

  function fullName(e) { return e.firstName + " " + e.lastName; }
  function pad2(n) { return X.pad2(n); }

  function periodId() { return "PR-" + state.year + "-" + pad2(state.month) + "-H" + state.half; }
  function periodRange() {
    var from = state.half === 1 ? 1 : 16;
    var to = state.half === 1 ? 15 : new Date(state.year, state.month, 0).getDate();
    return {
      fromIso: state.year + "-" + pad2(state.month) + "-" + pad2(from),
      toIso: state.year + "-" + pad2(state.month) + "-" + pad2(to),
      from: from, to: to,
    };
  }
  function periodLabel() {
    var r = periodRange();
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[state.month - 1] + " " + r.from + "–" + r.to + ", " + state.year;
  }

  function getRun() {
    var runs = Store.getPayrollRuns();
    var run = runs.find(function (r) { return r.id === periodId(); });
    if (!run) {
      run = { id: periodId(), year: state.year, month: state.month, half: state.half, processed: false, entries: {} };
      runs.push(run);
      Store.setPayrollRuns(runs);
    }
    return run;
  }
  function saveRun(run) {
    var runs = Store.getPayrollRuns();
    var idx = runs.findIndex(function (r) { return r.id === run.id; });
    if (idx === -1) runs.push(run); else runs[idx] = run;
    Store.setPayrollRuns(runs);
  }
  function entryFor(run, employeeId) {
    if (!run.entries[employeeId]) {
      run.entries[employeeId] = { otHours: 0, otRate: 0, holidayPay: 0, transportAllowance: 0, mealAllowance: 0, otherAllowance: 0, otherDeductions: 0, weeklyRateOverride: "" };
    }
    if (run.entries[employeeId].weeklyRateOverride === undefined) run.entries[employeeId].weeklyRateOverride = "";
    return run.entries[employeeId];
  }

  function daysWorkedInPeriod(employeeId) {
    var r = periodRange();
    var attendance = Store.getAttendance().filter(function (a) { return a.employeeId === employeeId && a.date >= r.fromIso && a.date <= r.toIso; });
    var days = 0;
    attendance.forEach(function (a) {
      if (a.status === "Present" || a.status === "Late") days += 1;
      else if (a.status === "Half Day") days += 0.5;
    });
    return days;
  }

  function currentWeeklyRate(e, entry) {
    return entry.weeklyRateOverride !== "" && entry.weeklyRateOverride !== undefined && entry.weeklyRateOverride !== null
      ? Number(entry.weeklyRateOverride) || 0
      : (e.weeklyRate || 0);
  }

  function computePayrollLine(e, run) {
    var entry = entryFor(run, e.id);
    var daysWorked = daysWorkedInPeriod(e.id);
    var isWeekly = e.payFrequency === "Weekly";
    // Weekly-paid staff (e.g. a trainee on a per-week ramp) use /6 (a 6-day
    // work week) instead of the /26 monthly divisor. The rate can be bumped
    // per payroll run via the Weekly Rate override column, so a ramp (e.g.
    // ₱350 -> ₱450 -> ₱550/week) is entered as it progresses.
    var weeklyRate = isWeekly ? currentWeeklyRate(e, entry) : 0;
    var dailyRate = isWeekly ? weeklyRate / 6 : (e.monthlySalary || 0) / 26;
    var basicPay = dailyRate * daysWorked;
    var otPay = (Number(entry.otHours) || 0) * (Number(entry.otRate) || 0);
    var holidayPay = Number(entry.holidayPay) || 0;
    var transport = Number(entry.transportAllowance) || 0;
    var meal = Number(entry.mealAllowance) || 0;
    var otherAllow = Number(entry.otherAllowance) || 0;
    var grossPay = basicPay + otPay + holidayPay + transport + meal + otherAllow;

    // Government contribution tables are keyed off a monthly salary; a
    // weekly-paid employee's equivalent monthly figure is estimated at
    // weeklyRate x (52 weeks / 12 months).
    var monthlyEquivalent = isWeekly ? weeklyRate * (52 / 12) : (e.monthlySalary || 0);

    // No statutory deductions when there's nothing earned this period
    // (e.g. an owner on ₱0 draw, or a new hire with no attendance logged yet),
    // or when the employee is explicitly marked exempt (e.g. an agreed
    // no-deductions training/trial arrangement).
    var hasEarnings = monthlyEquivalent > 0 && grossPay > 0 && !e.noGovernmentDeductions;
    var sssRow = D.computeSss(monthlyEquivalent);
    var sssDeduction = hasEarnings ? sssRow.ee / 2 : 0; // semi-monthly share
    var philhealth = D.computePhilHealth(monthlyEquivalent);
    var philhealthDeduction = hasEarnings ? philhealth.monthly / 2 : 0;
    var pagibigDeduction = hasEarnings ? D.computePagibig().perCutoff : 0;

    var taxableIncome = Math.max(0, grossPay - sssDeduction - philhealthDeduction - pagibigDeduction);
    var tax = hasEarnings ? D.computeWithholdingTax(taxableIncome) : 0;

    var otherDeductions = Number(entry.otherDeductions) || 0;
    var totalDeductions = sssDeduction + philhealthDeduction + pagibigDeduction + tax + otherDeductions;
    // Statutory minimum-floor deductions can exceed a very small partial-period
    // paycheck (e.g. a trainee's first day). A payslip should never show a
    // negative net pay, so cap deductions at what was actually earned.
    if (totalDeductions > grossPay) totalDeductions = grossPay;
    var netPay = grossPay - totalDeductions;

    return {
      employee: e, daysWorked: daysWorked, dailyRate: dailyRate, basicPay: basicPay, otPay: otPay, holidayPay: holidayPay,
      transport: transport, meal: meal, otherAllow: otherAllow, grossPay: grossPay,
      sssDeduction: sssDeduction, philhealthDeduction: philhealthDeduction, pagibigDeduction: pagibigDeduction, tax: tax,
      otherDeductions: otherDeductions, totalDeductions: totalDeductions, netPay: netPay, entry: entry,
      isWeekly: isWeekly, weeklyRate: weeklyRate,
    };
  }

  function activeEmployees() {
    return Store.getEmployees().filter(function (e) { return !e.archived && e.status !== "Terminated" && e.status !== "Resigned"; });
  }

  function renderTable() {
    var run = getRun();
    document.getElementById("payroll-period-label").textContent = periodLabel();
    document.getElementById("payroll-lock-badge").style.display = run.processed ? "inline-flex" : "none";
    document.getElementById("btn-process-payroll").disabled = run.processed;
    document.getElementById("btn-process-payroll").innerHTML = run.processed ? '<i class="fa-solid fa-lock"></i> Processed' : '<i class="fa-solid fa-lock"></i> Process Payroll';

    var employees = activeEmployees();
    var totalGross = 0, totalDed = 0, totalNet = 0;
    var rows = employees.map(function (e) {
      var line = computePayrollLine(e, run);
      totalGross += line.grossPay; totalDed += line.totalDeductions; totalNet += line.netPay;
      var disabled = run.processed ? "disabled" : "";
      return (
        "<tr>" +
        '<td data-label="Employee"><div style="font-weight:600">' + X.escapeHtml(fullName(e)) + '</div><div style="font-size:.7rem;color:#94A3B8">' + e.id + "</div></td>" +
        '<td data-label="Days" style="text-align:center">' + line.daysWorked + "</td>" +
        '<td data-label="Basic Pay" style="text-align:right">' +
        (line.isWeekly ?
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><input ' + disabled + ' type="number" min="0" step="0.01" class="field-input pr-weeklyrate" data-id="' + e.id + '" value="' + line.entry.weeklyRateOverride + '" placeholder="' + (e.weeklyRate || 0) + '" style="width:90px;text-align:right" title="Weekly rate for this pay period (e.g. training ramp)"><span style="font-size:.72rem;color:#94A3B8">' + X.peso(line.basicPay) + '</span></div>'
          : X.peso(line.basicPay)) +
        "</td>" +
        '<td data-label="OT (hrs x rate)"><div style="display:flex;gap:4px"><input ' + disabled + ' type="number" min="0" step="0.5" class="field-input pr-ot-hours" data-id="' + e.id + '" value="' + line.entry.otHours + '" style="width:60px" placeholder="hrs"><input ' + disabled + ' type="number" min="0" class="field-input pr-ot-rate" data-id="' + e.id + '" value="' + line.entry.otRate + '" style="width:70px" placeholder="₱/hr"></div></td>' +
        '<td data-label="Holiday Pay"><input ' + disabled + ' type="number" min="0" class="field-input pr-holiday" data-id="' + e.id + '" value="' + line.entry.holidayPay + '" style="width:80px"></td>' +
        '<td data-label="Transport"><input ' + disabled + ' type="number" min="0" class="field-input pr-transport" data-id="' + e.id + '" value="' + line.entry.transportAllowance + '" style="width:80px"></td>' +
        '<td data-label="Meal"><input ' + disabled + ' type="number" min="0" class="field-input pr-meal" data-id="' + e.id + '" value="' + line.entry.mealAllowance + '" style="width:80px"></td>' +
        '<td data-label="Other Allow"><input ' + disabled + ' type="number" min="0" class="field-input pr-otherallow" data-id="' + e.id + '" value="' + line.entry.otherAllowance + '" style="width:80px"></td>' +
        '<td data-label="Gross Pay" style="text-align:right;font-weight:700">' + X.peso(line.grossPay) + "</td>" +
        '<td data-label="SSS" style="text-align:right">' + X.peso(line.sssDeduction) + "</td>" +
        '<td data-label="PhilHealth" style="text-align:right">' + X.peso(line.philhealthDeduction) + "</td>" +
        '<td data-label="Pag-IBIG" style="text-align:right">' + X.peso(line.pagibigDeduction) + "</td>" +
        '<td data-label="Tax" style="text-align:right">' + X.peso(line.tax) + "</td>" +
        '<td data-label="Other Ded."><input ' + disabled + ' type="number" min="0" class="field-input pr-otherded" data-id="' + e.id + '" value="' + line.entry.otherDeductions + '" style="width:80px"></td>' +
        '<td data-label="Total Ded." style="text-align:right">' + X.peso(line.totalDeductions) + "</td>" +
        '<td data-label="Net Pay" style="text-align:right;font-weight:800;color:#166534">' + X.peso(line.netPay) + "</td>" +
        '<td data-label="Payslip"><button class="btn btn-secondary btn-sm" data-payslip="' + e.id + '"><i class="fa-solid fa-file-invoice-dollar"></i></button></td>' +
        "</tr>"
      );
    }).join("");

    document.getElementById("payroll-body").innerHTML = rows;
    document.getElementById("payroll-summary").innerHTML =
      summaryTile("Total Gross Pay", totalGross, "#0EA5E9") +
      summaryTile("Total Deductions", totalDed, "#EF4444") +
      summaryTile("Total Net Pay", totalNet, "#22C55E");

    bindEditableInputs(run);
  }

  function summaryTile(label, value, color) {
    return '<div class="dlx-card kpi-card"><div class="kpi-label">' + label + '</div><div class="kpi-value" style="color:' + color + '">' + X.peso(value) + "</div></div>";
  }

  function bindEditableInputs(run) {
    var map = {
      "pr-ot-hours": "otHours", "pr-ot-rate": "otRate", "pr-holiday": "holidayPay",
      "pr-transport": "transportAllowance", "pr-meal": "mealAllowance", "pr-otherallow": "otherAllowance", "pr-otherded": "otherDeductions",
    };
    Object.keys(map).forEach(function (cls) {
      document.querySelectorAll("." + cls).forEach(function (input) {
        input.addEventListener("change", function () {
          var id = input.getAttribute("data-id");
          var entry = entryFor(run, id);
          entry[map[cls]] = Number(input.value) || 0;
          saveRun(run);
          renderTable();
        });
      });
    });
    document.querySelectorAll(".pr-weeklyrate").forEach(function (input) {
      input.addEventListener("change", function () {
        var id = input.getAttribute("data-id");
        var entry = entryFor(run, id);
        entry.weeklyRateOverride = input.value === "" ? "" : (Number(input.value) || 0);
        saveRun(run);
        renderTable();
      });
    });
    document.querySelectorAll("[data-payslip]").forEach(function (btn) {
      btn.addEventListener("click", function () { openPayslip(btn.getAttribute("data-payslip")); });
    });
  }

  function processPayroll() {
    var run = getRun();
    if (run.processed) return;
    if (!confirm("Process payroll for " + periodLabel() + "? This will lock the period from further edits.")) return;
    run.processed = true;
    saveRun(run);
    renderTable();
    X.toast("Payroll processed and locked for " + periodLabel() + ".", "success");
  }

  // ---------------------------------------------------------------------
  // Payslip
  // ---------------------------------------------------------------------
  function openPayslip(employeeId) {
    var run = getRun();
    var e = Store.getEmployees().find(function (x) { return x.id === employeeId; });
    if (!e) return;
    var line = computePayrollLine(e, run);
    var settings = Store.getSettings();
    var html =
      '<div style="text-align:center;margin-bottom:16px">' +
      '<div style="font-size:1.3rem;font-weight:800;color:#0F172A">' + X.escapeHtml(settings.companyName || "DIGILEX") + "</div>" +
      '<div style="font-size:.8rem;color:#64748B">' + X.escapeHtml(settings.companyAddress || "") + "</div>" +
      '<div style="font-size:.9rem;font-weight:700;margin-top:8px;text-transform:uppercase;letter-spacing:.05em">Payslip</div>' +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:14px;border-top:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0;padding:10px 0">' +
      '<div><strong>' + X.escapeHtml(fullName(e)) + "</strong><br>" + X.escapeHtml(e.position) + " &middot; " + X.escapeHtml(e.department) + "<br>ID: " + e.id + "</div>" +
      '<div style="text-align:right">Period Covered:<br><strong>' + periodLabel() + "</strong></div>" +
      "</div>" +
      '<table style="width:100%;border-collapse:collapse;font-size:.85rem;margin-bottom:14px">' +
      "<tr><td colspan='2' style='font-weight:700;padding:6px 0'>Earnings</td></tr>" +
      payslipRow(line.isWeekly ? "Basic Pay (₱" + line.weeklyRate.toFixed(2) + "/wk, " + line.daysWorked + " days)" : "Basic Pay (" + line.daysWorked + " days)", line.basicPay) +
      payslipRow("Overtime Pay", line.otPay) +
      payslipRow("Holiday Pay", line.holidayPay) +
      payslipRow("Transportation Allowance", line.transport) +
      payslipRow("Meal Allowance", line.meal) +
      payslipRow("Other Allowance", line.otherAllow) +
      "<tr style='border-top:1px solid #E2E8F0'><td style='padding:6px 0;font-weight:700'>GROSS PAY</td><td style='text-align:right;font-weight:700;padding:6px 0'>" + X.peso(line.grossPay) + "</td></tr>" +
      "<tr><td colspan='2' style='font-weight:700;padding:10px 0 6px'>Deductions" +
      (e.noGovernmentDeductions ? ' <span style="font-weight:400;font-size:.72rem;color:#94A3B8">(exempt per agreement)</span>' : "") +
      "</td></tr>" +
      payslipRow("SSS Contribution", line.sssDeduction) +
      payslipRow("PhilHealth Contribution", line.philhealthDeduction) +
      payslipRow("Pag-IBIG Contribution", line.pagibigDeduction) +
      payslipRow("Withholding Tax", line.tax) +
      payslipRow("Other Deductions", line.otherDeductions) +
      "<tr style='border-top:1px solid #E2E8F0'><td style='padding:6px 0;font-weight:700'>TOTAL DEDUCTIONS</td><td style='text-align:right;font-weight:700;padding:6px 0'>" + X.peso(line.totalDeductions) + "</td></tr>" +
      "</table>" +
      '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px;text-align:center;margin-bottom:20px">' +
      '<div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#166534">Net Pay</div>' +
      '<div style="font-size:1.8rem;font-weight:800;color:#166534">' + X.peso(line.netPay) + "</div>" +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;margin-top:40px;font-size:.8rem">' +
      '<div style="text-align:center;width:45%"><div style="border-top:1px solid #1E293B;padding-top:4px">Prepared by</div></div>' +
      '<div style="text-align:center;width:45%"><div style="border-top:1px solid #1E293B;padding-top:4px">Received by</div></div>' +
      "</div>";
    document.getElementById("payslip-print-area").innerHTML = html;
    document.getElementById("payslip-modal-title").textContent = "Payslip — " + fullName(e);
    X.openModal("payslip-modal");
  }
  function payslipRow(label, value) {
    return "<tr><td style='padding:3px 0;color:#475569'>" + label + "</td><td style='text-align:right;padding:3px 0'>" + X.peso(value) + "</td></tr>";
  }

  function populatePeriodControls() {
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var monthSel = document.getElementById("pr-month");
    monthSel.innerHTML = months.map(function (m, i) { return '<option value="' + (i + 1) + '">' + m + "</option>"; }).join("");
    monthSel.value = state.month;
    document.getElementById("pr-year").value = state.year;
    document.getElementById("pr-half").value = state.half;
  }

  function bindControls() {
    document.getElementById("pr-month").addEventListener("change", function (e) { state.month = Number(e.target.value); renderTable(); });
    document.getElementById("pr-year").addEventListener("change", function (e) { state.year = Number(e.target.value); renderTable(); });
    document.getElementById("pr-half").addEventListener("change", function (e) { state.half = Number(e.target.value); renderTable(); });
    document.getElementById("btn-process-payroll").addEventListener("click", processPayroll);
    document.getElementById("btn-print-payslip").addEventListener("click", function () { window.print(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("payroll", "Payroll & Payslips");
    populatePeriodControls();
    bindControls();
    renderTable();
  });
})();
