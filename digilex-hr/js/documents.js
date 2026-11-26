/* DIGILEX HR ERP — Company Documents module */

(function () {
  "use strict";
  var X = window.Digilex;
  var Store = X.Store;

  var CATEGORIES = ["HR Policy", "Employment Contract", "Government Forms", "Operations SOP", "Training Materials", "Announcements"];
  var state = { category: "" };

  // Chrome blocks top-level navigation straight to a data: URL (even via a
  // clicked <a target="_blank">), so view/download convert to a blob: URL first.
  function dataUrlToObjectUrl(dataUrl) {
    var match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (!match) return dataUrl;
    var mime = match[1];
    var byteChars = atob(match[2]);
    var byteNumbers = new Array(byteChars.length);
    for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    var blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
    return URL.createObjectURL(blob);
  }

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
        (d.fileData
          ? '<button class="btn btn-secondary btn-sm" data-view="' + d.id + '" title="View"><i class="fa-solid fa-eye"></i></button>' +
            '<button class="btn btn-secondary btn-sm" data-download="' + d.id + '" title="Download"><i class="fa-solid fa-download"></i></button>'
          : '<button class="btn btn-secondary btn-sm" data-download="' + d.id + '" title="Download"><i class="fa-solid fa-download"></i></button>') +
        '<button class="btn btn-danger btn-sm" data-delete="' + d.id + '"><i class="fa-solid fa-trash"></i></button>' +
        "</div></td>" +
        "</tr>"
      );
    }).join("");
    document.getElementById("doc-body").innerHTML = rows || '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:24px">No documents in this category.</td></tr>';

    document.querySelectorAll("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () {
        var doc = Store.getDocuments().find(function (d) { return d.id === b.getAttribute("data-view"); });
        if (!doc || !doc.fileData) return;
        var objectUrl = dataUrlToObjectUrl(doc.fileData);
        var a = document.createElement("a");
        a.href = objectUrl;
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 60000);
      });
    });
    document.querySelectorAll("[data-download]").forEach(function (b) {
      b.addEventListener("click", function () {
        var doc = Store.getDocuments().find(function (d) { return d.id === b.getAttribute("data-download"); });
        if (doc && doc.fileData) {
          var objectUrl = dataUrlToObjectUrl(doc.fileData);
          var a = document.createElement("a");
          a.href = objectUrl;
          a.download = doc.fileName || doc.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 60000);
        } else {
          X.toast("No file attached to this record yet — it's a metadata-only placeholder.", "warning");
        }
      });
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

  function currentUploaderName() {
    var session = window.DigilexAuth ? window.DigilexAuth.getSession() : null;
    var employee = session ? Store.getEmployees().find(function (e) { return e.id === session.employeeId; }) : null;
    return employee ? employee.firstName + " " + employee.lastName : "Lee Obseñares";
  }

  var MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB — comfortably within localStorage limits

  function submitUpload(ev) {
    ev.preventDefault();
    var name = document.getElementById("doc-f-name").value.trim();
    var category = document.getElementById("doc-f-category").value;
    var fileInput = document.getElementById("doc-f-file");
    var file = fileInput.files && fileInput.files[0];
    if (!name) return;

    function finish(fileData, fileName, fileType) {
      var docs = Store.getDocuments();
      docs.push({
        id: X.uid("DOC"), name: name, category: category, dateUploaded: X.todayIso(), uploadedBy: currentUploaderName(),
        fileData: fileData || null, fileName: fileName || null, fileType: fileType || null,
      });
      Store.setDocuments(docs);
      X.toast(fileData ? "Document uploaded." : "Document record added (no file attached).", "success");
      document.getElementById("upload-form").reset();
      X.closeModal("upload-modal");
      renderList();
    }

    if (!file) { finish(null); return; }
    if (file.size > MAX_FILE_BYTES) {
      X.toast("File is too large (max 4MB). Record not saved.", "danger");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () { finish(reader.result, file.name, file.type); };
    reader.onerror = function () { X.toast("Could not read that file.", "danger"); };
    reader.readAsDataURL(file);
  }

  function bindEvents() {
    document.getElementById("doc-filter-category").addEventListener("change", function (e) { state.category = e.target.value; renderList(); });
    document.getElementById("btn-upload-doc").addEventListener("click", function () { X.openModal("upload-modal"); });
    document.getElementById("upload-form").addEventListener("submit", submitUpload);
    document.getElementById("doc-f-file").addEventListener("change", function (e) {
      var nameField = document.getElementById("doc-f-name");
      var file = e.target.files && e.target.files[0];
      if (file && !nameField.value.trim()) {
        nameField.value = file.name.replace(/\.[^.]+$/, "");
      }
    });
    document.getElementById("btn-confirm-delete").addEventListener("click", performDelete);
  }

  document.addEventListener("DOMContentLoaded", function () {
    X.renderChrome("documents", "Company Documents");
    populateFilter();
    bindEvents();
    renderList();
  });
})();
