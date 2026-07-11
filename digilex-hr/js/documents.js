/* DIGILEX HR ERP — Company Documents module */

(function () {
  "use strict";
  var X = window.Digilex;
  var Store = X.Store;

  var CATEGORIES = ["HR Policy", "Employment Contract", "Government Forms", "Operations SOP", "Training Materials", "Announcements"];
  var state = { category: "" };

  function categoryBadge(cat) {
    var map = {
      "HR Policy": "blue", "Employment Contract": "purple", "Government Forms": "orange",
      "Operations SOP": "green", "Training Materials": "yellow", "Announcements": "gray",
    };
    return '<span class="badge badge-' + (map[cat] || "gray") + '">' + cat + "</span>";
  }

  function populateFilter() {
    var sel = document.getElementById("doc-filter-category");
    sel.innerHTML = '<option value="">All Categories</option>' + CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
    var uploadSel = document.getElementById("doc-f-category");
    uploadSel.innerHTML = CATEGORIES.map(function (c) { return "<option>" + c + "</option>"; }).join("");
  }

  function renderList() {
    var docs = Store.getDocuments().filter(function (d) { return !state.category || d.category === state.category; })
      .sort(function (a, b) { return b.dateUploaded.localeCompare(a.dateUploaded); });
    document.getElementById("doc-count").textContent = docs.length + " document" + (docs.length === 1 ? "" : "s");
    var rows = docs.map(function (d) {
      return (
        "<tr>" +
        '<td data-label="Name"><i class="fa-solid fa-file-lines" style="color:#94A3B8;margin-right:8px"></i>' + X.escapeHtml(d.name) + "</td>" +
        '<td data-label="Category">' + categoryBadge(d.category) + "</td>" +
        '<td data-label="Date Uploaded">' + X.fmtDate(d.dateUploaded) + "</td>" +
        '<td data-label="Uploaded By">' + X.escapeHtml(d.uploadedBy) + "</td>" +
        '<td data-label="Actions"><div style="display:flex;gap:6px">' +
        '<button class="btn btn-secondary btn-sm" data-download="' + d.id + '"><i class="fa-solid fa-download"></i></button>' +
        '<button class="btn btn-danger btn-sm" data-delete="' + d.id + '"><i class="fa-solid fa-trash"></i></button>' +
        "</div></td>" +
        "</tr>"
      );
    }).join("");
    document.getElementById("doc-body").innerHTML = rows || '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:24px">No documents in this category.</td></tr>';

    document.querySelectorAll("[data-download]").forEach(function (b) {
      b.addEventListener("click", function () { X.toast("Preparing download...", "info"); });
    });
    document.querySelectorAll("[data-delete]").forEach(function (b) {
      b.addEventListener("click", function () { confirmDelete(b.getAttribute("data-delete")); });
    });
  }

  var pendingDeleteId = null;
  function confirmDelete(id) {
    pendingDeleteId = id;
    var doc = Store.getDocuments().find(function (d) { return d.id === id; });
    document.getElementById("delete-doc-name").textContent = doc ? doc.name : "";
    X.openModal("delete-modal");
  }
  function performDelete() {
    var docs = Store.getDocuments().filter(function (d) { return d.id !== pendingDeleteId; });
    Store.setDocuments(docs);
    X.toast("Document deleted.", "success");
    X.closeModal("delete-modal");
    renderList();
  }

  function submitUpload(ev) {
    ev.preventDefault();
    var name = document.getElementById("doc-f-name").value.trim();
    var category = document.getElementById("doc-f-category").value;
    if (!name) return;
    var docs = Store.getDocuments();
    docs.push({ id: X.uid("DOC"), name: name, category: category, dateUploaded: X.todayIso(), uploadedBy: "Lee Obseñares" });
    Store.setDocuments(docs);
    X.toast("Document uploaded.", "success");
    document.getElementById("upload-form").reset();
    X.closeModal("upload-modal");
    renderList();
  }

  function bindEvents() {
    document.getElementById("doc-filter-category").addEventListener("change", function (e) { state.category = e.target.value; renderList(); });
    document.getElementById("btn-upload-doc").addEventListener("click", function () { X.openModal("upload-modal"); });
    document.getElementById("upload-form").addEventListener("submit", submitUpload);
    document.getElementById("btn-confirm-delete").addEventListener("click", performDelete);
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("documents", "Company Documents");
    populateFilter();
    bindEvents();
    renderList();
  });
})();
