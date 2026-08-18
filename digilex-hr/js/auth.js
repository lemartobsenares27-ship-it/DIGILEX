/* DIGILEX HR ERP — authentication (client-side demo auth, not production security) */

(function (global) {
  "use strict";

  var ACCOUNTS_KEY = "digilex_hr_accounts";
  var SESSION_KEY = "digilex_hr_session";
  var IN_PAGES_DIR = /\/pages\//.test(location.pathname);
  function rootPath(file) { return IN_PAGES_DIR ? "../" + file : file; }
  function pagesPath(file) { return IN_PAGES_DIR ? file : "pages/" + file; }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureAccountsSeeded(force) {
    if (!force && localStorage.getItem(ACCOUNTS_KEY)) return;
    var D = global.DigilexData;
    writeJson(ACCOUNTS_KEY, D ? D.generateSeedAccounts() : []);
  }
  ensureAccountsSeeded();

  function getAccounts() { return readJson(ACCOUNTS_KEY, []); }
  function setAccounts(v) { writeJson(ACCOUNTS_KEY, v); }

  function getSession() { return readJson(SESSION_KEY, null); }
  function setSession(s) { writeJson(SESSION_KEY, s); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function landingPageFor(role) {
    return role === "admin" ? rootPath("index.html") : pagesPath("portal.html");
  }

  function norm(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }

  // Employees live under app.js's store key, but auth.js also runs on
  // login.html where app.js is not loaded — so read the key directly here
  // rather than through Digilex.Store, falling back to seed data on a
  // browser that hasn't opened an app page yet.
  function allEmployees() {
    var stored = readJson("digilex_hr_employees", null);
    if (stored && stored.length) return stored;
    var D = global.DigilexData;
    return (D && D.SEED_EMPLOYEES) || [];
  }

  // Accepts an employee ID ("DLX-002") or the person's name ("Maria Santos",
  // or just "Maria" when that name is unambiguous). Forcing staff to recall
  // an ID code was a real barrier to them signing in at all.
  function resolveUsername(input) {
    var typed = norm(input);
    if (!typed) return null;

    var byId = getAccounts().find(function (a) { return norm(a.username) === typed; });
    if (byId) return byId.username;

    var employees = allEmployees();
    var matchers = [
      function (e) { return norm(e.firstName + " " + e.lastName); },
      function (e) { return norm(e.firstName); },
      function (e) { return norm(e.lastName); },
    ];
    for (var i = 0; i < matchers.length; i++) {
      var hits = employees.filter(function (e) { return matchers[i](e) === typed; });
      if (hits.length === 1) return hits[0].id;
      if (hits.length > 1) return null; // ambiguous — make them use their ID
    }
    return null;
  }

  function login(username, password) {
    var resolved = resolveUsername(username);
    if (!resolved) return null;
    var accounts = getAccounts();
    var match = accounts.find(function (a) {
      return norm(a.username) === norm(resolved) && a.password === password;
    });
    if (!match) return null;
    setSession({ employeeId: match.employeeId, role: match.role });
    return match;
  }

  function logout() {
    clearSession();
    location.href = rootPath("login.html");
  }

  function ensureAccountFor(employeeId, role) {
    var accounts = getAccounts();
    if (accounts.some(function (a) { return a.employeeId === employeeId; })) return;
    var D = global.DigilexData;
    accounts.push({ employeeId: employeeId, username: employeeId, password: D ? D.DEFAULT_PASSWORD : "digilex123", role: role || "employee" });
    setAccounts(accounts);
  }

  function resetPassword(employeeId) {
    var accounts = getAccounts();
    var idx = accounts.findIndex(function (a) { return a.employeeId === employeeId; });
    if (idx === -1) return null;
    var D = global.DigilexData;
    accounts[idx].password = D ? D.DEFAULT_PASSWORD : "digilex123";
    setAccounts(accounts);
    return accounts[idx].password;
  }

  function changePassword(employeeId, currentPassword, newPassword) {
    var accounts = getAccounts();
    var idx = accounts.findIndex(function (a) { return a.employeeId === employeeId; });
    if (idx === -1 || accounts[idx].password !== currentPassword) return false;
    accounts[idx].password = newPassword;
    setAccounts(accounts);
    return true;
  }

  // requiredRole: "admin" -> only admins allowed, others redirected to their portal.
  //               "any" or omitted -> any logged-in account allowed.
  // Returns the active session, or null after issuing a redirect.
  function requireRole(requiredRole) {
    var session = getSession();
    if (!session) {
      location.href = rootPath("login.html");
      return null;
    }
    if (requiredRole === "admin" && session.role !== "admin") {
      location.href = landingPageFor(session.role);
      return null;
    }
    return session;
  }

  // ---------------------------------------------------------------------
  // Self-service "Change Password" modal (injected on first use so any
  // page that loads auth.js + app.js can offer it without extra markup)
  // ---------------------------------------------------------------------
  function injectChangePasswordModal() {
    if (document.getElementById("dlx-cp-modal")) return;
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="modal-backdrop" id="dlx-cp-modal" data-modal-id="dlx-cp-modal">' +
      '<div class="modal-box" style="max-width:400px">' +
      '<div class="modal-head"><div class="modal-title">Change Password</div>' +
      '<button type="button" class="modal-close" data-modal-close="dlx-cp-modal"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<form id="dlx-cp-form">' +
      '<div class="modal-body">' +
      '<div id="dlx-cp-error" style="display:none;color:var(--dlx-danger);font-size:.8rem;margin-bottom:12px"></div>' +
      '<div class="field-group"><label class="field-label">Current Password</label><input type="password" class="field-input" id="dlx-cp-current" autocomplete="current-password" required></div>' +
      '<div class="field-group"><label class="field-label">New Password</label><input type="password" class="field-input" id="dlx-cp-new" autocomplete="new-password" required></div>' +
      '<div class="field-group"><label class="field-label">Confirm New Password</label><input type="password" class="field-input" id="dlx-cp-confirm" autocomplete="new-password" required></div>' +
      "</div>" +
      '<div class="modal-foot">' +
      '<button type="button" class="btn btn-secondary" data-modal-close="dlx-cp-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary"><i class="fa-solid fa-key"></i> Update Password</button>' +
      "</div>" +
      "</form></div></div>";
    document.body.appendChild(wrap.firstElementChild);

    document.getElementById("dlx-cp-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var session = getSession();
      var errEl = document.getElementById("dlx-cp-error");
      errEl.style.display = "none";
      var current = document.getElementById("dlx-cp-current").value;
      var next = document.getElementById("dlx-cp-new").value;
      var confirmVal = document.getElementById("dlx-cp-confirm").value;
      if (next.length < 4) {
        errEl.textContent = "New password must be at least 4 characters.";
        errEl.style.display = "block";
        return;
      }
      if (next !== confirmVal) {
        errEl.textContent = "New passwords do not match.";
        errEl.style.display = "block";
        return;
      }
      var ok = session && changePassword(session.employeeId, current, next);
      if (!ok) {
        errEl.textContent = "Current password is incorrect.";
        errEl.style.display = "block";
        return;
      }
      document.getElementById("dlx-cp-form").reset();
      if (global.Digilex) {
        global.Digilex.closeModal("dlx-cp-modal");
        global.Digilex.toast("Password changed successfully.", "success");
      } else {
        document.getElementById("dlx-cp-modal").classList.remove("open");
      }
    });
  }

  function openChangePasswordModal() {
    injectChangePasswordModal();
    document.getElementById("dlx-cp-form").reset();
    document.getElementById("dlx-cp-error").style.display = "none";
    if (global.Digilex) global.Digilex.openModal("dlx-cp-modal");
    else document.getElementById("dlx-cp-modal").classList.add("open");
  }

  global.DigilexAuth = {
    ensureAccountsSeeded: ensureAccountsSeeded,
    getAccounts: getAccounts,
    setAccounts: setAccounts,
    getSession: getSession,
    login: login,
    logout: logout,
    ensureAccountFor: ensureAccountFor,
    resetPassword: resetPassword,
    changePassword: changePassword,
    openChangePasswordModal: openChangePasswordModal,
    requireRole: requireRole,
    landingPageFor: landingPageFor,
  };
})(window);
