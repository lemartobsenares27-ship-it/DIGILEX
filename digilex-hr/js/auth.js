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

  // -------------------------------------------------------------------
  // Cloud sign-in (Supabase). Falls back to the local login above when
  // the project isn't configured or the network is down, so the app is
  // never completely unusable.
  //
  // Resolves to { ok: true, role } or { ok: false, error, code }.
  // -------------------------------------------------------------------
  function cloudEnabled() {
    var S = global.DigilexSupabase;
    return !!(S && S.available && S.client);
  }

  // Turn what the person typed ("Maria Santos" / "maria" / "DLX-002")
  // into the email their Supabase account was created against. Reads the
  // login_directory view, which deliberately exposes only names and login
  // emails — never salaries or government IDs.
  function lookupLoginEmail(typedName) {
    var S = global.DigilexSupabase;
    var typed = norm(typedName);
    if (!typed) return Promise.resolve(null);

    return S.client
      .from("login_directory")
      .select("employee_id, full_name, first_name, last_name, email")
      .then(function (res) {
        if (res.error || !res.data) return null;
        var rows = res.data.filter(function (r) { return r.email; });

        // Exact employee ID first, then full name, then first/last name —
        // but only when a single person matches, so two people sharing a
        // first name can never sign into each other's account.
        var byId = rows.filter(function (r) { return norm(r.employee_id) === typed; });
        if (byId.length === 1) return byId[0];

        var candidates = [
          function (r) { return norm(r.full_name); },
          function (r) { return norm(r.first_name); },
          function (r) { return norm(r.last_name); },
        ];
        for (var i = 0; i < candidates.length; i++) {
          var hits = rows.filter(function (r) { return candidates[i](r) === typed; });
          if (hits.length === 1) return hits[0];
          if (hits.length > 1) return { ambiguous: true };
        }
        return null;
      })
      .catch(function () { return null; });
  }

  function cloudLogin(username, password) {
    if (!cloudEnabled()) {
      var local = login(username, password);
      return Promise.resolve(
        local
          ? { ok: true, role: local.role, offline: true }
          : { ok: false, code: "bad_credentials", error: "That name or password doesn't match." }
      );
    }

    var S = global.DigilexSupabase;
    var typed = String(username || "").trim();

    return lookupLoginEmail(typed).then(function (found) {
      if (found && found.ambiguous) {
        return { ok: false, code: "ambiguous", error: "More than one person matches that name. Please use your full name or Employee ID." };
      }
      // Allow signing in with a real email address directly too.
      var email = found ? found.email : (typed.indexOf("@") !== -1 ? typed : null);
      if (!email) {
        return { ok: false, code: "unknown_user", error: "We couldn't find an account under that name. Check the spelling, or ask HR to set up your login." };
      }

      return S.client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        if (res.error) {
          return { ok: false, code: "bad_credentials", error: "That password doesn't match. Try again, or ask HR to reset it." };
        }
        // Load role + employee id, and mirror them into the local session
        // so every existing page guard keeps working synchronously.
        return S.client
          .from("profiles")
          .select("employee_id, role")
          .eq("id", res.data.user.id)
          .maybeSingle()
          .then(function (p) {
            if (p.error || !p.data) {
              return S.client.auth.signOut().then(function () {
                return { ok: false, code: "no_profile", error: "This login exists but isn't linked to an employee record yet. Ask HR to finish setting it up." };
              });
            }
            setSession({ employeeId: p.data.employee_id, role: p.data.role, cloud: true });
            return { ok: true, role: p.data.role };
          });
      });
    }).catch(function (err) {
      return { ok: false, code: "network", error: "Couldn't reach the server. Check your internet connection and try again." };
    });
  }

  function logout() {
    var S = global.DigilexSupabase;
    clearSession();
    if (cloudEnabled()) {
      S.client.auth.signOut().finally(function () { location.href = rootPath("login.html"); });
      return;
    }
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
    cloudLogin: cloudLogin,
    cloudEnabled: cloudEnabled,
    logout: logout,
    ensureAccountFor: ensureAccountFor,
    resetPassword: resetPassword,
    changePassword: changePassword,
    openChangePasswordModal: openChangePasswordModal,
    requireRole: requireRole,
    landingPageFor: landingPageFor,
  };
})(window);
