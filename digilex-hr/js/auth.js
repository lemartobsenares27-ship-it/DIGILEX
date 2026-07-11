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

  function login(username, password) {
    var accounts = getAccounts();
    var match = accounts.find(function (a) {
      return a.username.toLowerCase() === String(username || "").trim().toLowerCase() && a.password === password;
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
    requireRole: requireRole,
    landingPageFor: landingPageFor,
  };
})(window);
