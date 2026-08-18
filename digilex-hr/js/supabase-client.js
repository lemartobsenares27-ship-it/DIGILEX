/* DIGILEX HR ERP — Supabase client bootstrap

   Loads the Supabase library and exposes a single shared client as
   window.DigilexSupabase.client, plus helpers the auth layer needs.

   If the library or the config is missing (offline, CDN blocked, or the
   project not set up yet) the app keeps working against localStorage,
   so a bad network never locks anyone out of the local copy. */

(function (global) {
  "use strict";

  var cfg = global.DigilexSupabaseConfig;
  var lib = global.supabase; // UMD build sets window.supabase
  var client = null;

  var configured = !!(cfg && cfg.url && cfg.anonKey);
  var available = !!(configured && lib && typeof lib.createClient === "function");

  if (available) {
    client = lib.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "digilex_hr_sb_auth",
      },
    });
  }

  // Employees rarely have a company email, so each login is provisioned
  // against a synthetic address derived from the employee ID. The person
  // never types or sees it — they sign in with their name, and the app
  // looks the address up for them.
  function syntheticEmail(employeeId) {
    return String(employeeId || "").trim().toLowerCase() + "@staff.digilex.ph";
  }

  global.DigilexSupabase = {
    client: client,
    configured: configured,
    available: available,
    syntheticEmail: syntheticEmail,
    // Why the cloud isn't in use, for surfacing in the UI rather than
    // failing silently and leaving people confused about which copy of
    // the data they are looking at.
    unavailableReason: function () {
      if (!configured) return "No Supabase project is configured yet.";
      if (!lib) return "Could not load the Supabase library (check your internet connection).";
      return null;
    },
  };
})(window);
