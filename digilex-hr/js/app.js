/* DIGILEX HR ERP — core app: store, chrome (sidebar/header), utilities */

(function (global) {
  "use strict";

  var D = global.DigilexData;

  var STORE_KEYS = {
    employees: "digilex_hr_employees",
    attendance: "digilex_hr_attendance",
    leaveRequests: "digilex_hr_leave_requests",
    performance: "digilex_hr_performance",
    positions: "digilex_hr_positions",
    applicants: "digilex_hr_applicants",
    documents: "digilex_hr_documents",
    announcements: "digilex_hr_announcements",
    settings: "digilex_hr_settings",
    payrollRuns: "digilex_hr_payroll_runs",
    seeded: "digilex_hr_seeded_v1",
  };

  function readKey(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function writeKey(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureSeeded() {
    if (localStorage.getItem(STORE_KEYS.seeded)) return;
    writeKey(STORE_KEYS.employees, D.SEED_EMPLOYEES);
    writeKey(STORE_KEYS.attendance, D.generateSeedAttendance());
    writeKey(STORE_KEYS.leaveRequests, D.SEED_LEAVE_REQUESTS);
    writeKey(STORE_KEYS.performance, D.generateSeedPerformance());
    writeKey(STORE_KEYS.positions, D.SEED_POSITIONS);
    writeKey(STORE_KEYS.applicants, D.SEED_APPLICANTS);
    writeKey(STORE_KEYS.documents, D.SEED_DOCUMENTS);
    writeKey(STORE_KEYS.announcements, D.SEED_ANNOUNCEMENTS);
    writeKey(STORE_KEYS.settings, D.SEED_SETTINGS);
    writeKey(STORE_KEYS.payrollRuns, []);
    localStorage.setItem(STORE_KEYS.seeded, "1");
  }

  function resetDemoData() {
    Object.keys(STORE_KEYS).forEach(function (k) { localStorage.removeItem(STORE_KEYS[k]); });
    ensureSeeded();
  }

  var Store = {
    keys: STORE_KEYS,
    getEmployees: function () { return readKey(STORE_KEYS.employees, []); },
    setEmployees: function (v) { writeKey(STORE_KEYS.employees, v); },
    getAttendance: function () { return readKey(STORE_KEYS.attendance, []); },
    setAttendance: function (v) { writeKey(STORE_KEYS.attendance, v); },
    getLeaveRequests: function () { return readKey(STORE_KEYS.leaveRequests, []); },
    setLeaveRequests: function (v) { writeKey(STORE_KEYS.leaveRequests, v); },
    getPerformance: function () { return readKey(STORE_KEYS.performance, []); },
    setPerformance: function (v) { writeKey(STORE_KEYS.performance, v); },
    getPositions: function () { return readKey(STORE_KEYS.positions, []); },
    setPositions: function (v) { writeKey(STORE_KEYS.positions, v); },
    getApplicants: function () { return readKey(STORE_KEYS.applicants, []); },
    setApplicants: function (v) { writeKey(STORE_KEYS.applicants, v); },
    getDocuments: function () { return readKey(STORE_KEYS.documents, []); },
    setDocuments: function (v) { writeKey(STORE_KEYS.documents, v); },
    getAnnouncements: function () { return readKey(STORE_KEYS.announcements, []); },
    setAnnouncements: function (v) { writeKey(STORE_KEYS.announcements, v); },
    getSettings: function () { return readKey(STORE_KEYS.settings, D.SEED_SETTINGS); },
    setSettings: function (v) { writeKey(STORE_KEYS.settings, v); },
    getPayrollRuns: function () { return readKey(STORE_KEYS.payrollRuns, []); },
    setPayrollRuns: function (v) { writeKey(STORE_KEYS.payrollRuns, v); },
    resetDemoData: resetDemoData,
  };

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------
  function peso(n) {
    n = Number(n) || 0;
    return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var parts = iso.split("-");
    if (parts.length < 3) return iso;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function initials(first, last) {
    return ((first || "").charAt(0) + (last || "").charAt(0)).toUpperCase();
  }
  var AVATAR_COLORS = ["#F97316", "#0EA5E9", "#22C55E", "#A855F7", "#EAB308", "#EC4899", "#14B8A6", "#6366F1"];
  function avatarColor(seedStr) {
    var sum = 0;
    for (var i = 0; i < (seedStr || "").length; i++) sum += seedStr.charCodeAt(i);
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
  }
  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000);
  }
  function nextEmployeeId(employees) {
    var max = 0;
    employees.forEach(function (e) {
      var m = /DLX-(\d+)/.exec(e.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return "DLX-" + String(max + 1).padStart(3, "0");
  }
  function downloadCsv(filename, rows) {
    var csv = rows
      .map(function (row) {
        return row
          .map(function (cell) {
            var s = cell === null || cell === undefined ? "" : String(cell);
            if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
            return s;
          })
          .join(",");
      })
      .join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function daysBetweenInclusive(fromIso, toIso, excludeDow) {
    excludeDow = excludeDow || [0];
    var from = new Date(fromIso + "T00:00:00");
    var to = new Date(toIso + "T00:00:00");
    var count = 0;
    var cur = new Date(from);
    while (cur <= to) {
      if (excludeDow.indexOf(cur.getDay()) === -1) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }
  function workingDaysInMonth(year, month, holidays) {
    var holidaySet = {};
    (holidays || []).forEach(function (h) { holidaySet[h.date] = true; });
    var daysInMonth = new Date(year, month, 0).getDate();
    var count = 0;
    for (var d = 1; d <= daysInMonth; d++) {
      var date = new Date(year, month - 1, d);
      var iso = year + "-" + pad2(month) + "-" + pad2(d);
      if (date.getDay() !== 0 && !holidaySet[iso]) count++;
    }
    return count;
  }

  function toast(message, type) {
    type = type || "info";
    var wrap = document.getElementById("toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toast-wrap";
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    var colors = { info: "#0F172A", success: "#22C55E", warning: "#EAB308", danger: "#EF4444" };
    var el = document.createElement("div");
    el.className = "toast-item";
    el.style.borderLeftColor = colors[type] || colors.info;
    el.innerHTML =
      '<span>' + escapeHtml(message) + '</span>';
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.remove(); }, 250);
    }, 3000);
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("open");
    document.body.classList.add("modal-open");
  }
  function closeModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("open");
    document.body.classList.remove("modal-open");
  }

  // ---------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------
  function buildNotifications() {
    var notes = [];
    var employees = Store.getEmployees().filter(function (e) { return e.status === "Active"; });
    var leaveReqs = Store.getLeaveRequests();
    var pendingLeave = leaveReqs.filter(function (l) { return l.status === "Pending"; });
    if (pendingLeave.length) {
      notes.push({ icon: "fa-plane-departure", text: pendingLeave.length + " leave request(s) awaiting approval", type: "warning" });
    }
    var settings = Store.getSettings();
    var today = new Date();
    var day = today.getDate();
    var cutoffs = (settings.payrollCutoffDays || [15, 30]).slice().sort(function (a, b) { return a - b; });
    var nextCutoff = cutoffs.find(function (c) { return c >= day; }) || cutoffs[0];
    var daysAway = nextCutoff >= day ? nextCutoff - day : (30 - day) + nextCutoff;
    notes.push({ icon: "fa-money-check-dollar", text: "Payroll due in " + daysAway + " day(s) (cutoff " + nextCutoff + ")", type: "info" });

    var thisMonth = today.getMonth();
    var birthdays = employees.filter(function (e) {
      if (!e.birthday) return false;
      return new Date(e.birthday + "T00:00:00").getMonth() === thisMonth;
    });
    if (birthdays.length) {
      notes.push({ icon: "fa-cake-candles", text: birthdays.length + " birthday(s) this month", type: "success" });
    }

    var todayIsoStr = todayIso();
    var attendance = Store.getAttendance();
    var loggedToday = {};
    attendance.forEach(function (a) { if (a.date === todayIsoStr && a.status) loggedToday[a.employeeId] = true; });
    var notLogged = employees.filter(function (e) { return !loggedToday[e.id]; });
    if (notLogged.length && today.getDay() !== 0) {
      notes.push({ icon: "fa-clock", text: notLogged.length + " employee(s) without attendance logged today", type: "danger" });
    }
    return notes;
  }

  // ---------------------------------------------------------------------
  // Chrome: sidebar + header
  // ---------------------------------------------------------------------
  var IN_PAGES_DIR = /\/pages\//.test(location.pathname);
  function navHref(key, filename) {
    if (key === "dashboard") return IN_PAGES_DIR ? "../index.html" : "index.html";
    return IN_PAGES_DIR ? filename : "pages/" + filename;
  }
  var NAV_ITEMS = [
    { key: "dashboard", label: "Dashboard", icon: "fa-gauge-high", href: navHref("dashboard") },
    { key: "employees", label: "Employees", icon: "fa-users", href: navHref("employees", "employees.html") },
    { key: "attendance", label: "Attendance", icon: "fa-calendar-check", href: navHref("attendance", "attendance.html") },
    { key: "payroll", label: "Payroll", icon: "fa-money-check-dollar", href: navHref("payroll", "payroll.html") },
    { key: "leave", label: "Leave", icon: "fa-plane-departure", href: navHref("leave", "leave.html") },
    { key: "performance", label: "Performance", icon: "fa-chart-line", href: navHref("performance", "performance.html") },
    { key: "recruitment", label: "Recruitment", icon: "fa-user-plus", href: navHref("recruitment", "recruitment.html") },
    { key: "documents", label: "Documents", icon: "fa-folder-open", href: navHref("documents", "documents.html") },
    { key: "settings", label: "Settings", icon: "fa-gear", href: navHref("settings", "settings.html") },
  ];

  function renderChrome(activeKey, pageTitle) {
    var sidebarRoot = document.getElementById("sidebar-root");
    var collapsed = localStorage.getItem("digilex_hr_sidebar_collapsed") === "1";

    if (sidebarRoot) {
      var navHtml = NAV_ITEMS.map(function (item) {
        var active = item.key === activeKey;
        return (
          '<a href="' + item.href + '" class="nav-item' + (active ? " active" : "") + '">' +
          '<i class="fa-solid ' + item.icon + '"></i>' +
          '<span class="nav-label">' + item.label + "</span>" +
          "</a>"
        );
      }).join("");

      sidebarRoot.innerHTML =
        '<aside class="sidebar' + (collapsed ? " collapsed" : "") + '" id="sidebar">' +
        '<div class="sidebar-top">' +
        '<div class="brand"><span class="brand-mark">D</span><span class="brand-word">DIGILEX</span></div>' +
        '<button class="sidebar-toggle" id="sidebar-toggle" title="Collapse sidebar"><i class="fa-solid fa-angles-left"></i></button>' +
        "</div>" +
        '<nav class="sidebar-nav">' + navHtml + "</nav>" +
        '<div class="sidebar-user">' +
        '<div class="avatar" style="background:#F97316">LO</div>' +
        '<div class="sidebar-user-info"><div class="sidebar-user-name">Lee Obseñares</div><div class="sidebar-user-role">Admin</div></div>' +
        "</div>" +
        "</aside>" +
        '<div class="mobile-nav">' +
        NAV_ITEMS.slice(0, 5).map(function (item) {
          var active = item.key === activeKey;
          return '<a href="' + item.href + '" class="mobile-nav-item' + (active ? " active" : "") + '"><i class="fa-solid ' + item.icon + '"></i></a>';
        }).join("") +
        "</div>";

      var toggleBtn = document.getElementById("sidebar-toggle");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {
          var sidebar = document.getElementById("sidebar");
          var isCollapsed = sidebar.classList.toggle("collapsed");
          localStorage.setItem("digilex_hr_sidebar_collapsed", isCollapsed ? "1" : "0");
        });
      }
    }

    var headerRoot = document.getElementById("header-root");
    if (headerRoot) {
      var notes = buildNotifications();
      headerRoot.innerHTML =
        '<header class="topbar">' +
        '<div class="topbar-left">' +
        '<div class="page-title">' + escapeHtml(pageTitle || "") + "</div>" +
        '<div class="breadcrumb">DIGILEX HR &rsaquo; ' + escapeHtml(pageTitle || "") + "</div>" +
        "</div>" +
        '<div class="topbar-right">' +
        '<div class="notif-bell" id="notif-bell">' +
        '<i class="fa-solid fa-bell"></i>' +
        (notes.length ? '<span class="notif-badge">' + notes.length + "</span>" : "") +
        '<div class="notif-dropdown" id="notif-dropdown">' +
        '<div class="notif-dropdown-title">Notifications</div>' +
        (notes.length
          ? notes.map(function (n) {
              return '<div class="notif-row"><i class="fa-solid ' + n.icon + ' notif-icon notif-' + n.type + '"></i><span>' + escapeHtml(n.text) + "</span></div>";
            }).join("")
          : '<div class="notif-row notif-empty">You\'re all caught up.</div>') +
        "</div>" +
        "</div>" +
        '<div class="avatar avatar-sm" style="background:#F97316">LO</div>' +
        "</div>" +
        "</header>";

      var bell = document.getElementById("notif-bell");
      if (bell) {
        bell.addEventListener("click", function (e) {
          e.stopPropagation();
          document.getElementById("notif-dropdown").classList.toggle("open");
        });
        document.addEventListener("click", function () {
          var dd = document.getElementById("notif-dropdown");
          if (dd) dd.classList.remove("open");
        });
      }
    }
  }

  document.addEventListener("click", function (e) {
    var target = e.target.closest("[data-modal-close]");
    if (target) {
      var modalId = target.getAttribute("data-modal-close");
      closeModal(modalId);
    }
    if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
      closeModal(e.target.getAttribute("data-modal-id"));
    }
  });

  global.Digilex = {
    Store: Store,
    ensureSeeded: ensureSeeded,
    resetDemoData: resetDemoData,
    peso: peso,
    pad2: pad2,
    todayIso: todayIso,
    fmtDate: fmtDate,
    escapeHtml: escapeHtml,
    initials: initials,
    avatarColor: avatarColor,
    uid: uid,
    nextEmployeeId: nextEmployeeId,
    downloadCsv: downloadCsv,
    daysBetweenInclusive: daysBetweenInclusive,
    workingDaysInMonth: workingDaysInMonth,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    renderChrome: renderChrome,
    buildNotifications: buildNotifications,
  };

  ensureSeeded();
})(window);
