/* DIGILEX HR ERP — Recruitment Pipeline module */

(function () {
  "use strict";
  var X = window.Digilex;
  var D = window.DigilexData;
  var Store = X.Store;

  var STAGES = ["Applied", "Screening", "Interview Scheduled", "Interview Done", "Job Offer", "Hired", "Rejected"];
  var draggedId = null;

  function statusBadge(status) {
    var map = { Open: "green", Closed: "gray", "On Hold": "yellow" };
    return '<span class="badge badge-' + (map[status] || "gray") + '">' + status + "</span>";
  }

  function renderPositions() {
    var positions = Store.getPositions();
    var applicants = Store.getApplicants();
    var html = positions.map(function (p) {
      var count = applicants.filter(function (a) { return a.position === p.title; }).length;
      return (
        '<div class="dlx-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-weight:700">' + X.escapeHtml(p.title) + "</div>" + statusBadge(p.status) + "</div>" +
        '<div style="font-size:.8rem;color:#64748B;margin:6px 0">' + X.escapeHtml(p.department) + "</div>" +
        '<div style="font-size:.85rem;font-weight:600;color:#166534">' + X.peso(p.salaryMin) + " – " + X.peso(p.salaryMax) + "</div>" +
        '<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:.75rem;color:#94A3B8">' +
        "<span>Posted " + X.fmtDate(p.datePosted) + "</span><span>" + count + " applicant(s)</span></div>" +
        "</div>"
      );
    }).join("");
    document.getElementById("recruit-positions").innerHTML = html;
  }

  function renderStats() {
    var applicants = Store.getApplicants();
    var positions = Store.getPositions();
    var now = new Date();
    var thisMonthApplicants = applicants.filter(function (a) {
      var d = new Date(a.dateApplied + "T00:00:00");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    var reachedInterview = applicants.filter(function (a) { return ["Interview Scheduled", "Interview Done", "Job Offer", "Hired", "Rejected"].indexOf(a.stage) !== -1 && a.stage !== "Applied" && a.stage !== "Screening"; });
    var successCount = applicants.filter(function (a) { return a.stage === "Job Offer" || a.stage === "Hired"; }).length;
    var successRate = reachedInterview.length ? (successCount / reachedInterview.length) * 100 : 0;

    var hired = applicants.filter(function (a) { return a.stage === "Hired"; });
    var avgDays = hired.length
      ? hired.reduce(function (s, a) { return s + X.daysBetweenInclusive(a.dateApplied, X.todayIso(), []); }, 0) / hired.length
      : 0;

    var closed = positions.filter(function (p) { return p.status === "Closed"; }).length;

    document.getElementById("recruit-stats").innerHTML =
      statTile("Applicants This Month", thisMonthApplicants, "fa-users", "#0EA5E9") +
      statTile("Interview Success Rate", successRate.toFixed(0) + "%", "fa-chart-simple", "#22C55E") +
      statTile("Avg. Time to Hire", avgDays.toFixed(0) + " days", "fa-hourglass-half", "#F97316") +
      statTile("Positions Filled / Open", closed + " / " + positions.length, "fa-briefcase", "#A855F7");
  }
  function statTile(label, value, icon, color) {
    return (
      '<div class="dlx-card kpi-card">' +
      '<div class="kpi-icon" style="background:' + color + '22;color:' + color + '"><i class="fa-solid ' + icon + '"></i></div>' +
      '<div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + "</div></div>"
    );
  }

  function sourceBadge(source) {
    var map = { Facebook: "blue", JobStreet: "purple", Referral: "green", "Walk-in": "gray" };
    return '<span class="badge badge-' + (map[source] || "gray") + '">' + source + "</span>";
  }

  function renderKanban() {
    var applicants = Store.getApplicants();
    var html = STAGES.map(function (stage) {
      var cards = applicants.filter(function (a) { return a.stage === stage; }).map(function (a) {
        var nextIdx = STAGES.indexOf(a.stage) + 1;
        var canAdvance = stage !== "Hired" && stage !== "Rejected";
        var isHired = stage === "Hired";
        return (
          '<div class="kanban-card" draggable="true" data-app-id="' + a.id + '">' +
          '<div class="kanban-card-name">' + X.escapeHtml(a.name) + "</div>" +
          '<div class="kanban-card-meta">' + X.escapeHtml(a.position) + "</div>" +
          '<div class="kanban-card-meta">' + sourceBadge(a.source) + " &middot; Applied " + X.fmtDate(a.dateApplied) + "</div>" +
          (a.interviewDate ? '<div class="kanban-card-meta"><i class="fa-solid fa-calendar-day"></i> ' + a.interviewDate.replace("T", " ") + "</div>" : "") +
          (a.notes ? '<div class="kanban-card-meta" style="font-style:italic">' + X.escapeHtml(a.notes) + "</div>" : "") +
          '<div class="kanban-card-actions">' +
          (canAdvance ? '<button class="btn btn-secondary btn-sm" data-advance="' + a.id + '">' + (nextIdx < STAGES.length - 1 ? STAGES[nextIdx] + " →" : "Advance") + "</button>" : "") +
          (stage !== "Rejected" && stage !== "Hired" ? '<button class="btn btn-danger btn-sm" data-reject="' + a.id + '"><i class="fa-solid fa-xmark"></i></button>' : "") +
          (isHired ? '<button class="btn btn-primary btn-sm" data-convert="' + a.id + '"><i class="fa-solid fa-user-plus"></i> Convert</button>' : "") +
          "</div></div>"
        );
      }).join("");
      return (
        '<div class="kanban-col" data-stage="' + stage + '">' +
        '<div class="kanban-col-title"><span>' + stage + "</span><span>" + applicants.filter(function (a) { return a.stage === stage; }).length + "</span></div>" +
        '<div class="kanban-dropzone" data-stage="' + stage + '" style="min-height:40px">' + cards + "</div>" +
        "</div>"
      );
    }).join("");
    document.getElementById("recruit-kanban").innerHTML = html;
    bindKanbanEvents();
  }

  function advanceStage(id) {
    var applicants = Store.getApplicants();
    var idx = applicants.findIndex(function (a) { return a.id === id; });
    if (idx === -1) return;
    var curIdx = STAGES.indexOf(applicants[idx].stage);
    if (curIdx < STAGES.length - 3) { // don't auto-advance into Hired/Rejected via generic button
      applicants[idx].stage = STAGES[curIdx + 1];
      Store.setApplicants(applicants);
      X.toast(applicants[idx].name + " moved to " + applicants[idx].stage + ".", "success");
      renderAll();
    } else if (applicants[idx].stage === "Job Offer") {
      applicants[idx].stage = "Hired";
      Store.setApplicants(applicants);
      X.toast(applicants[idx].name + " marked as Hired!", "success");
      renderAll();
    }
  }
  function rejectApplicant(id) {
    if (!confirm("Reject this applicant?")) return;
    var applicants = Store.getApplicants();
    var idx = applicants.findIndex(function (a) { return a.id === id; });
    if (idx === -1) return;
    applicants[idx].stage = "Rejected";
    Store.setApplicants(applicants);
    X.toast("Applicant rejected.", "warning");
    renderAll();
  }
  function moveApplicantToStage(id, stage) {
    var applicants = Store.getApplicants();
    var idx = applicants.findIndex(function (a) { return a.id === id; });
    if (idx === -1) return;
    applicants[idx].stage = stage;
    Store.setApplicants(applicants);
    renderAll();
  }

  function bindKanbanEvents() {
    document.querySelectorAll("[data-advance]").forEach(function (b) { b.addEventListener("click", function () { advanceStage(b.getAttribute("data-advance")); }); });
    document.querySelectorAll("[data-reject]").forEach(function (b) { b.addEventListener("click", function () { rejectApplicant(b.getAttribute("data-reject")); }); });
    document.querySelectorAll("[data-convert]").forEach(function (b) { b.addEventListener("click", function () { openConvertModal(b.getAttribute("data-convert")); }); });

    document.querySelectorAll(".kanban-card").forEach(function (card) {
      card.addEventListener("dragstart", function () { draggedId = card.getAttribute("data-app-id"); card.style.opacity = "0.5"; });
      card.addEventListener("dragend", function () { card.style.opacity = "1"; });
    });
    document.querySelectorAll(".kanban-dropzone").forEach(function (zone) {
      zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.style.background = "#E2E8F0"; });
      zone.addEventListener("dragleave", function () { zone.style.background = ""; });
      zone.addEventListener("drop", function (e) {
        e.preventDefault();
        zone.style.background = "";
        if (draggedId) { moveApplicantToStage(draggedId, zone.getAttribute("data-stage")); draggedId = null; }
      });
    });
  }

  function openConvertModal(applicantId) {
    var a = Store.getApplicants().find(function (x) { return x.id === applicantId; });
    if (!a) return;
    var nameParts = a.name.trim().split(" ");
    document.getElementById("cvt-form-applicant").value = a.id;
    document.getElementById("cvt-f-firstName").value = nameParts[0] || "";
    document.getElementById("cvt-f-lastName").value = nameParts.slice(1).join(" ") || "";
    document.getElementById("cvt-f-position").value = a.position;
    var pos = Store.getPositions().find(function (p) { return p.title === a.position; });
    document.getElementById("cvt-f-department").value = pos ? pos.department : "Customer Service";
    document.getElementById("cvt-f-salary").value = pos ? pos.salaryMin : "";
    document.getElementById("cvt-f-contact").value = a.contact || "";
    document.getElementById("cvt-f-email").value = a.email || "";
    document.getElementById("cvt-f-dateHired").value = X.todayIso();
    X.openModal("convert-modal");
  }

  function submitConvert(ev) {
    ev.preventDefault();
    var employees = Store.getEmployees();
    var newEmp = {
      id: X.nextEmployeeId(employees),
      firstName: document.getElementById("cvt-f-firstName").value.trim(),
      lastName: document.getElementById("cvt-f-lastName").value.trim(),
      position: document.getElementById("cvt-f-position").value.trim(),
      department: document.getElementById("cvt-f-department").value,
      employmentType: "Probationary",
      status: "Active",
      dateHired: document.getElementById("cvt-f-dateHired").value,
      dateRegularized: "",
      monthlySalary: Number(document.getElementById("cvt-f-salary").value) || 0,
      contact: document.getElementById("cvt-f-contact").value.trim(),
      email: document.getElementById("cvt-f-email").value.trim(),
      address: "", emergencyContactName: "", emergencyContactNumber: "",
      sss: "", philhealth: "", pagibig: "", tin: "", bankName: "", bankAccount: "",
      birthday: "", civilStatus: "Single", archived: false,
    };
    employees.push(newEmp);
    Store.setEmployees(employees);
    if (window.DigilexAuth) window.DigilexAuth.ensureAccountFor(newEmp.id, "employee");
    X.toast(newEmp.firstName + " " + newEmp.lastName + " added as employee " + newEmp.id + " with a login account.", "success");
    X.closeModal("convert-modal");
  }

  function renderAll() {
    renderPositions();
    renderStats();
    renderKanban();
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("recruitment", "Recruitment Pipeline");
    document.getElementById("convert-form").addEventListener("submit", submitConvert);
    renderAll();
  });
})();
