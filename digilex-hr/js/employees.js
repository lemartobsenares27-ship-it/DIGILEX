/* DIGILEX HR ERP — Employee Directory module */

(function () {
  "use strict";
  var X = window.Digilex;
  var Store = X.Store;

  var state = {
    search: "",
    department: "",
    employmentType: "",
    status: "",
    showArchived: false,
    sortBy: "name",
    viewMode: localStorage.getItem("digilex_hr_emp_view") || "list",
  };

  function fullName(e) { return e.firstName + " " + e.lastName; }
  // Weekly-paid staff (e.g. a trainee on a per-week ramp) use /6 (a 6-day work
  // week), consistent with the /26 divisor used for monthly-paid staff (6 days
  // x ~4.33 weeks/month ≈ 26).
  function dailyRate(e) { return e.payFrequency === "Weekly" ? (e.weeklyRate || 0) / 6 : (e.monthlySalary || 0) / 26; }
  function hourlyRate(e) { return dailyRate(e) / 8; }
  function payRateLabel(e) { return e.payFrequency === "Weekly" ? X.peso(e.weeklyRate || 0) + "/wk" : X.peso(e.monthlySalary || 0) + "/mo"; }

  function statusBadge(status) {
    var map = { Active: "green", "On Leave": "blue", Resigned: "gray", Terminated: "red" };
    return '<span class="badge badge-' + (map[status] || "gray") + '">' + status + "</span>";
  }
  function typeBadge(type) {
    var map = { Regular: "green", Probationary: "yellow", Contractual: "orange", "Part-time": "purple" };
    return '<span class="badge badge-' + (map[type] || "gray") + '">' + type + "</span>";
  }

  function getFiltered() {
    var employees = Store.getEmployees();
    var q = state.search.trim().toLowerCase();
    return employees
      .filter(function (e) {
        if (!state.showArchived && e.archived) return false;
        if (state.department && e.department !== state.department) return false;
        if (state.employmentType && e.employmentType !== state.employmentType) return false;
        if (state.status && e.status !== state.status) return false;
        if (q) {
          var hay = (fullName(e) + " " + e.position + " " + e.department + " " + e.id).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      })
      .sort(function (a, b) {
        if (state.sortBy === "name") return fullName(a).localeCompare(fullName(b));
        if (state.sortBy === "dateHired") return (a.dateHired || "").localeCompare(b.dateHired || "");
        if (state.sortBy === "salary") return (b.monthlySalary || 0) - (a.monthlySalary || 0);
        return 0;
      });
  }

  function populateFilterOptions() {
    var deptSel = document.getElementById("filter-department");
    deptSel.innerHTML = '<option value="">All Departments</option>' + window.DigilexData.DEPARTMENTS.map(function (d) {
      return '<option value="' + d + '">' + d + "</option>";
    }).join("");
  }

  function renderListView(employees) {
    if (!employees.length) return '<div class="dlx-card" style="text-align:center;color:#94A3B8;padding:40px">No employees match your filters.</div>';
    var rows = employees.map(function (e) {
      var color = X.avatarColor(e.id);
      return (
        "<tr>" +
        '<td data-label="Employee"><div style="display:flex;align-items:center;gap:10px">' +
        '<div class="avatar avatar-sm" style="background:' + color + '">' + X.initials(e.firstName, e.lastName) + "</div>" +
        '<div><div style="font-weight:600">' + X.escapeHtml(fullName(e)) + '</div><div style="font-size:.72rem;color:#94A3B8">' + e.id + "</div></div>" +
        "</div></td>" +
        '<td data-label="Position">' + X.escapeHtml(e.position) + "</td>" +
        '<td data-label="Department">' + X.escapeHtml(e.department) + "</td>" +
        '<td data-label="Type">' + typeBadge(e.employmentType) + "</td>" +
        '<td data-label="Status">' + statusBadge(e.status) + "</td>" +
        '<td data-label="Date Hired">' + X.fmtDate(e.dateHired) + "</td>" +
        '<td data-label="Monthly Salary" style="text-align:right">' + payRateLabel(e) + "</td>" +
        '<td data-label="Actions"><div style="display:flex;gap:6px">' +
        '<button class="btn btn-secondary btn-sm" data-action="view" data-id="' + e.id + '"><i class="fa-solid fa-eye"></i></button>' +
        '<button class="btn btn-secondary btn-sm" data-action="edit" data-id="' + e.id + '"><i class="fa-solid fa-pen"></i></button>' +
        '<button class="btn btn-danger btn-sm" data-action="archive" data-id="' + e.id + '"><i class="fa-solid fa-box-archive"></i></button>' +
        "</div></td>" +
        "</tr>"
      );
    }).join("");
    return (
      '<div class="dlx-card" style="padding:0;overflow-x:auto">' +
      '<table class="dlx-table"><thead><tr>' +
      "<th>Employee</th><th>Position</th><th>Department</th><th>Type</th><th>Status</th><th>Date Hired</th><th style=\"text-align:right\">Monthly Salary</th><th>Actions</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>"
    );
  }

  function renderCardView(employees) {
    if (!employees.length) return '<div class="dlx-card" style="text-align:center;color:#94A3B8;padding:40px">No employees match your filters.</div>';
    var cards = employees.map(function (e) {
      var color = X.avatarColor(e.id);
      return (
        '<div class="emp-card">' +
        '<div class="emp-card-top">' +
        '<div class="avatar avatar-lg" style="background:' + color + '">' + X.initials(e.firstName, e.lastName) + "</div>" +
        '<div><div class="emp-card-name">' + X.escapeHtml(fullName(e)) + '</div><div class="emp-card-pos">' + X.escapeHtml(e.position) + "</div><div style=\"font-size:.72rem;color:#94A3B8\">" + e.id + "</div></div>" +
        "</div>" +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + typeBadge(e.employmentType) + statusBadge(e.status) + "</div>" +
        '<div style="font-size:.8rem;color:#475569">' +
        '<div><i class="fa-solid fa-building" style="width:16px;color:#94A3B8"></i> ' + X.escapeHtml(e.department) + "</div>" +
        '<div><i class="fa-solid fa-peso-sign" style="width:16px;color:#94A3B8"></i> ' + payRateLabel(e) + "</div>" +
        '<div><i class="fa-solid fa-calendar" style="width:16px;color:#94A3B8"></i> Hired ' + X.fmtDate(e.dateHired) + "</div>" +
        "</div>" +
        '<div style="display:flex;gap:6px;margin-top:4px">' +
        '<button class="btn btn-secondary btn-sm" data-action="view" data-id="' + e.id + '" style="flex:1"><i class="fa-solid fa-eye"></i> View</button>' +
        '<button class="btn btn-secondary btn-sm" data-action="edit" data-id="' + e.id + '"><i class="fa-solid fa-pen"></i></button>' +
        '<button class="btn btn-danger btn-sm" data-action="archive" data-id="' + e.id + '"><i class="fa-solid fa-box-archive"></i></button>' +
        "</div>" +
        "</div>"
      );
    }).join("");
    return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">' + cards + "</div>";
  }

  function renderList() {
    var employees = getFiltered();
    document.getElementById("emp-count").textContent = employees.length + " employee" + (employees.length === 1 ? "" : "s");
    document.getElementById("emp-list-container").innerHTML =
      state.viewMode === "card" ? renderCardView(employees) : renderListView(employees);
    document.getElementById("btn-view-list").classList.toggle("active", state.viewMode === "list");
    document.getElementById("btn-view-card").classList.toggle("active", state.viewMode === "card");
  }

  // ---------------------------------------------------------------------
  // Profile (full page detail)
  // ---------------------------------------------------------------------
  function renderProfile(id) {
    var e = Store.getEmployees().find(function (x) { return x.id === id; });
    if (!e) { history.replaceState({}, "", "employees.html"); renderMain(); return; }
    var color = X.avatarColor(e.id);
    var body = document.getElementById("emp-root");
    body.innerHTML =
      '<div style="margin-bottom:16px"><button class="btn btn-secondary btn-sm" id="btn-back-list"><i class="fa-solid fa-arrow-left"></i> Back to Directory</button></div>' +
      '<div class="dlx-card" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:20px">' +
      '<div class="avatar" style="background:' + color + ';width:80px;height:80px;font-size:1.6rem">' + X.initials(e.firstName, e.lastName) + "</div>" +
      "<div style=\"flex:1;min-width:200px\">" +
      '<div style="font-size:1.3rem;font-weight:800">' + X.escapeHtml(fullName(e)) + "</div>" +
      '<div style="color:#64748B">' + X.escapeHtml(e.position) + " &middot; " + X.escapeHtml(e.department) + "</div>" +
      '<div style="margin-top:8px;display:flex;gap:8px">' + typeBadge(e.employmentType) + statusBadge(e.status) + '<span class="badge badge-gray">' + e.id + "</span></div>" +
      "</div>" +
      '<div style="display:flex;gap:8px">' +
      '<button class="btn btn-secondary" id="btn-profile-edit"><i class="fa-solid fa-pen"></i> Edit</button>' +
      '<button class="btn btn-secondary" id="btn-profile-reset-password"><i class="fa-solid fa-key"></i> Reset Password</button>' +
      "</div>" +
      "</div>" +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">' +
      profileSection("Login Access", [
        ["Employee ID / Username", e.id],
        ["Password", "Hidden — use Reset Password"],
      ]) +
      profileSection("Employment", [
        ["Employee ID", e.id],
        ["Date Hired", X.fmtDate(e.dateHired)],
        ["Date Regularized", e.dateRegularized ? X.fmtDate(e.dateRegularized) : "—"],
        ["Employment Type", e.employmentType],
        ["Status", e.status],
        ["Gov't Deductions", e.noGovernmentDeductions ? "Exempt (per agreement)" : "Standard"],
      ]) +
      profileSection("Compensation", [
        ["Pay Frequency", e.payFrequency === "Weekly" ? "Weekly" : "Monthly"],
        e.payFrequency === "Weekly" ? ["Weekly Rate", X.peso(e.weeklyRate || 0)] : ["Basic Monthly Salary", X.peso(e.monthlySalary)],
        ["Daily Rate", X.peso(dailyRate(e))],
        ["Hourly Rate", X.peso(hourlyRate(e))],
        ["Bank", (e.bankName || "—") + " / " + (e.bankAccount || "—")],
      ]) +
      profileSection("Contact", [
        ["Contact Number", e.contact || "—"],
        ["Personal Email", e.email || "—"],
        ["Address", e.address || "—"],
        ["Birthday", e.birthday ? X.fmtDate(e.birthday) : "—"],
        ["Civil Status", e.civilStatus || "—"],
      ]) +
      profileSection("Emergency Contact", [
        ["Name", e.emergencyContactName || "—"],
        ["Number", e.emergencyContactNumber || "—"],
      ]) +
      profileSection("Government IDs", [
        ["SSS Number", e.sss || "—"],
        ["PhilHealth Number", e.philhealth || "—"],
        ["Pag-IBIG Number", e.pagibig || "—"],
        ["TIN", e.tin || "—"],
      ]) +
      "</div>";

    document.getElementById("btn-back-list").addEventListener("click", function () {
      history.replaceState({}, "", "employees.html");
      renderMain();
    });
    document.getElementById("btn-profile-edit").addEventListener("click", function () { openEmployeeModal(e.id); });
    document.getElementById("btn-profile-reset-password").addEventListener("click", function () {
      if (!confirm("Reset " + fullName(e) + "'s password to the default (digilex123)?")) return;
      var newPassword = window.DigilexAuth ? window.DigilexAuth.resetPassword(e.id) : null;
      X.toast(newPassword ? "Password reset to \"" + newPassword + "\"." : "Could not reset password.", newPassword ? "success" : "danger");
    });
  }

  function profileSection(title, rows) {
    return (
      '<div class="dlx-card"><div style="font-weight:700;margin-bottom:12px">' + title + "</div>" +
      rows.map(function (r) {
        return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F1F5F9;font-size:.85rem">' +
          '<span style="color:#64748B">' + r[0] + "</span><span style=\"font-weight:600;text-align:right\">" + X.escapeHtml(r[1]) + "</span></div>";
      }).join("") + "</div>"
    );
  }

  // ---------------------------------------------------------------------
  // Add / Edit modal
  // ---------------------------------------------------------------------
  function openEmployeeModal(id) {
    var e = id ? Store.getEmployees().find(function (x) { return x.id === id; }) : null;
    document.getElementById("emp-modal-title").textContent = e ? "Edit Employee" : "Add Employee";
    var f = document.getElementById("emp-form");
    f.reset();
    document.getElementById("emp-form-id").value = e ? e.id : "";
    if (e) {
      var fields = ["firstName","lastName","position","department","employmentType","status","dateHired","dateRegularized","monthlySalary","weeklyRate","contact","email","address","emergencyContactName","emergencyContactNumber","sss","philhealth","pagibig","tin","bankName","bankAccount","birthday","civilStatus"];
      fields.forEach(function (fld) {
        var el = document.getElementById("emp-f-" + fld);
        if (el) el.value = e[fld] || "";
      });
      document.getElementById("emp-f-noGovernmentDeductions").checked = !!e.noGovernmentDeductions;
      document.getElementById("emp-f-payFrequency").value = e.payFrequency === "Weekly" ? "Weekly" : "Monthly";
    } else {
      document.getElementById("emp-f-payFrequency").value = "Monthly";
    }
    togglePayFrequencyFields();
    X.openModal("emp-modal");
  }

  function togglePayFrequencyFields() {
    var weekly = document.getElementById("emp-f-payFrequency").value === "Weekly";
    document.getElementById("emp-f-monthlySalary-group").style.display = weekly ? "none" : "";
    document.getElementById("emp-f-weeklyRate-group").style.display = weekly ? "" : "none";
  }

  function saveEmployeeForm(ev) {
    ev.preventDefault();
    var employees = Store.getEmployees();
    var id = document.getElementById("emp-form-id").value;
    var data = { archived: false };
    ["firstName","lastName","position","department","employmentType","status","dateHired","dateRegularized","contact","email","address","emergencyContactName","emergencyContactNumber","sss","philhealth","pagibig","tin","bankName","bankAccount","birthday","civilStatus"].forEach(function (fld) {
      data[fld] = document.getElementById("emp-f-" + fld).value.trim();
    });
    data.payFrequency = document.getElementById("emp-f-payFrequency").value === "Weekly" ? "Weekly" : "Monthly";
    data.monthlySalary = Number(document.getElementById("emp-f-monthlySalary").value) || 0;
    data.weeklyRate = Number(document.getElementById("emp-f-weeklyRate").value) || 0;
    data.noGovernmentDeductions = document.getElementById("emp-f-noGovernmentDeductions").checked;

    if (!data.firstName || !data.lastName || !data.position || !data.department) {
      X.toast("Please fill in required fields (name, position, department).", "danger");
      return;
    }

    if (id) {
      var idx = employees.findIndex(function (x) { return x.id === id; });
      employees[idx] = Object.assign({}, employees[idx], data);
      X.toast("Employee updated.", "success");
    } else {
      data.id = X.nextEmployeeId(employees);
      data.archived = false;
      employees.push(data);
      if (window.DigilexAuth) window.DigilexAuth.ensureAccountFor(data.id, "employee");
      X.toast("Employee added. Login account created (default password).", "success");
    }
    Store.setEmployees(employees);
    X.closeModal("emp-modal");
    renderMain();
  }

  function archiveEmployee(id) {
    if (!confirm("Archive this employee? They will be hidden from the active directory.")) return;
    var employees = Store.getEmployees();
    var idx = employees.findIndex(function (x) { return x.id === id; });
    if (idx === -1) return;
    employees[idx].archived = true;
    employees[idx].status = "Resigned";
    Store.setEmployees(employees);
    X.toast("Employee archived.", "success");
    renderMain();
  }

  function exportCsv() {
    var employees = getFiltered();
    var header = ["Employee ID","Full Name","Position","Department","Employment Type","Status","Date Hired","Date Regularized","Monthly Salary","Daily Rate","Hourly Rate","Contact","Email","Address","SSS","PhilHealth","Pag-IBIG","TIN"];
    var rows = employees.map(function (e) {
      return [e.id, fullName(e), e.position, e.department, e.employmentType, e.status, e.dateHired, e.dateRegularized, e.monthlySalary, dailyRate(e).toFixed(2), hourlyRate(e).toFixed(2), e.contact, e.email, e.address, e.sss, e.philhealth, e.pagibig, e.tin];
    });
    X.downloadCsv("digilex-employees-" + X.todayIso() + ".csv", [header].concat(rows));
    X.toast("CSV exported.", "success");
  }

  function bindListEvents() {
    document.getElementById("emp-search").addEventListener("input", function (e) { state.search = e.target.value; renderList(); });
    document.getElementById("filter-department").addEventListener("change", function (e) { state.department = e.target.value; renderList(); });
    document.getElementById("filter-type").addEventListener("change", function (e) { state.employmentType = e.target.value; renderList(); });
    document.getElementById("filter-status").addEventListener("change", function (e) { state.status = e.target.value; renderList(); });
    document.getElementById("sort-by").addEventListener("change", function (e) { state.sortBy = e.target.value; renderList(); });
    document.getElementById("chk-archived").addEventListener("change", function (e) { state.showArchived = e.target.checked; renderList(); });
    document.getElementById("btn-view-list").addEventListener("click", function () { state.viewMode = "list"; localStorage.setItem("digilex_hr_emp_view", "list"); renderList(); });
    document.getElementById("btn-view-card").addEventListener("click", function () { state.viewMode = "card"; localStorage.setItem("digilex_hr_emp_view", "card"); renderList(); });
    document.getElementById("btn-add-employee").addEventListener("click", function () { openEmployeeModal(null); });
    document.getElementById("emp-f-payFrequency").addEventListener("change", togglePayFrequencyFields);
    document.getElementById("btn-export-csv").addEventListener("click", exportCsv);
    document.getElementById("emp-form").addEventListener("submit", saveEmployeeForm);
    document.getElementById("emp-list-container").addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-action]");
      if (!btn) return;
      var id = btn.getAttribute("data-id");
      var action = btn.getAttribute("data-action");
      if (action === "view") { history.replaceState({}, "", "employees.html?id=" + id); renderMain(); }
      if (action === "edit") openEmployeeModal(id);
      if (action === "archive") archiveEmployee(id);
    });
  }

  function renderMain() {
    var params = new URLSearchParams(location.search);
    var id = params.get("id");
    var listView = document.getElementById("emp-list-view");
    var profileView = document.getElementById("emp-profile-view");
    if (id) {
      listView.style.display = "none";
      profileView.style.display = "block";
      renderProfile(id);
    } else {
      listView.style.display = "block";
      profileView.style.display = "none";
      renderList();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("employees", "Employee Directory");
    populateFilterOptions();
    bindListEvents();
    var params = new URLSearchParams(location.search);
    var deptParam = params.get("department");
    if (deptParam) {
      state.department = deptParam;
      document.getElementById("filter-department").value = deptParam;
    }
    renderMain();
    if (params.get("add")) openEmployeeModal(null);
  });
})();
