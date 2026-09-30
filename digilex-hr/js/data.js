/* DIGILEX HR ERP — seed data & Philippine government contribution tables
   All values are demo/reference data for an internal tool, not filed BIR/SSS documents. */

(function (global) {
  "use strict";

  var DEPARTMENTS = [
    "Executives",
    "Admin",
    "Sales & Marketing",
    "Customer Service",
    "Warehouse",
    "Logistics",
    "Business Development",
  ];

  // ---------------------------------------------------------------------
  // Role-based weighted KPI scorecard templates
  // Each metric carries its own weight (metric weights sum to the category
  // weight; category weights sum to 100). Weighted score per metric =
  // min(1, actualValue / target) x metricWeight, so exceeding target caps
  // credit at the full metric weight (matches standard weighted-scorecard
  // practice, e.g. the Gencys-style KPI sheet this was modeled on).
  var KPI_TEMPLATES = {
    "video-editor": {
      label: "Video Editor",
      positionMatch: ["video editor", "video edit", "content editor"],
      categories: [
        {
          id: "output", name: "Output & Productivity", weight: 30,
          metrics: [
            { id: "videosEdited", label: "Ad Creatives / Videos Edited (weekly avg)", target: 10, unit: "videos", weight: 15, benefit: "Keeps the ad account fed with fresh creatives so testing volume doesn't stall." },
            { id: "onTimeDelivery", label: "On-Time Delivery Rate", target: 95, unit: "%", weight: 15, benefit: "Late creatives delay ad testing cycles and cost testing days." },
          ],
        },
        {
          id: "quality", name: "Creative Quality & Ad Performance", weight: 45,
          metrics: [
            { id: "avgCtr", label: "Average CTR of Ads Using Your Edits", target: 3, unit: "%", weight: 15, benefit: "Directly tied to lower CPM and cheaper traffic." },
            { id: "firstPassApproval", label: "First-Pass Approval Rate (no revisions)", target: 80, unit: "%", weight: 15, benefit: "Fewer revision loops = faster time-to-launch." },
            { id: "winningAdRate", label: "Winning Creative Rate (above-avg ROAS)", target: 20, unit: "%", weight: 15, benefit: "The real business outcome: creatives that actually sell." },
          ],
        },
        {
          id: "process", name: "Process & Reliability", weight: 25,
          metrics: [
            { id: "huddleAttendance", label: "Daily Huddle / Report Attendance", target: 100, unit: "%", weight: 12.5, benefit: "Keeps the team aligned on what's working and what to cut." },
            { id: "assetCompliance", label: "File Naming & Asset Org Compliance", target: 100, unit: "%", weight: 12.5, benefit: "Saves everyone's time finding and reusing past creatives." },
          ],
        },
      ],
    },
    "sales-associate": {
      label: "Sales Associate",
      positionMatch: ["sales associate", "sales rep", "sales agent"],
      categories: [
        {
          id: "sales", name: "Sales Performance", weight: 40,
          metrics: [
            { id: "salesTarget", label: "Sales Target Achievement", target: 100, unit: "%", weight: 15, benefit: "The core number: are we hitting revenue goals." },
            { id: "conversionRate", label: "Lead-to-Sale Conversion Rate", target: 10, unit: "%", weight: 15, benefit: "Shows how effectively inquiries are being closed." },
            { id: "avgOrderValue", label: "Average Order Value vs Target", target: 100, unit: "%", weight: 10, benefit: "Rewards upselling, not just closing more small orders." },
          ],
        },
        {
          id: "engagement", name: "Customer Engagement", weight: 30,
          metrics: [
            { id: "responseTime", label: "Inquiry Response Within SLA", target: 90, unit: "%", weight: 10, benefit: "Slow replies lose sales to faster competitors." },
            { id: "csat", label: "Customer Satisfaction (CSAT)", target: 90, unit: "%", weight: 10, benefit: "Happy customers buy again and refer others." },
            { id: "upsellRate", label: "Upsell / Cross-sell Rate", target: 15, unit: "%", weight: 10, benefit: "Grows revenue per customer without new leads." },
          ],
        },
        {
          id: "reliability", name: "Attendance & Reporting", weight: 30,
          metrics: [
            { id: "attendanceRate", label: "Attendance Rate", target: 95, unit: "%", weight: 15, benefit: "Sales lost every day a seat is empty during peak hours." },
            { id: "reportCompliance", label: "Daily Sales Report Submitted On-Time", target: 100, unit: "%", weight: 15, benefit: "Keeps leadership able to react same-day, not next week." },
          ],
        },
      ],
    },
  };

  var LEAVE_TYPES = [
    { code: "VL", name: "Vacation Leave", annualDays: 5 },
    { code: "SL", name: "Sick Leave", annualDays: 5 },
    { code: "SPL", name: "Solo Parent Leave", annualDays: 7 },
    { code: "ML", name: "Maternity Leave", annualDays: 105 },
    { code: "PL", name: "Paternity Leave", annualDays: 7 },
    { code: "EL", name: "Emergency Leave", annualDays: 3 },
    { code: "UL", name: "Unpaid Leave", annualDays: 0 },
  ];

  // Philippine public holidays 2026 (regular + special non-working) used for
  // attendance/working-day calculations.
  var PH_HOLIDAYS_2026 = [
    { date: "2026-01-01", name: "New Year's Day", type: "Regular" },
    { date: "2026-02-25", name: "EDSA People Power Anniversary", type: "Special" },
    { date: "2026-04-02", name: "Maundy Thursday", type: "Regular" },
    { date: "2026-04-03", name: "Good Friday", type: "Regular" },
    { date: "2026-04-04", name: "Black Saturday", type: "Special" },
    { date: "2026-04-09", name: "Araw ng Kagitingan", type: "Regular" },
    { date: "2026-05-01", name: "Labor Day", type: "Regular" },
    { date: "2026-06-12", name: "Independence Day", type: "Regular" },
    { date: "2026-08-21", name: "Ninoy Aquino Day", type: "Special" },
    { date: "2026-08-31", name: "National Heroes Day", type: "Regular" },
    { date: "2026-11-01", name: "All Saints' Day", type: "Special" },
    { date: "2026-11-30", name: "Bonifacio Day", type: "Regular" },
    { date: "2026-12-08", name: "Immaculate Conception", type: "Special" },
    { date: "2026-12-25", name: "Christmas Day", type: "Regular" },
    { date: "2026-12-30", name: "Rizal Day", type: "Regular" },
    { date: "2026-12-31", name: "Last Day of the Year", type: "Special" },
  ];

  // ---- SSS 2025 contribution table (Employee Compensation Range -> MSC) ----
  // EE = 4.5% of Monthly Salary Credit, ER = 9.5% of MSC (informational only).
  function buildSssTable() {
    var table = [];
    var msc = 3000;
    var rangeFloor = 0;
    while (msc <= 30000) {
      var rangeCeil = msc === 30000 ? Infinity : msc + 250; // 500-wide comp ranges centered on MSC steps
      var ee = Math.round(msc * 0.045);
      var er = Math.round(msc * 0.095);
      table.push({
        min: rangeFloor,
        max: rangeCeil,
        msc: msc,
        ee: ee,
        er: er,
        total: ee + er,
      });
      rangeFloor = rangeCeil;
      msc += 500;
    }
    return table;
  }
  var SSS_TABLE = buildSssTable();

  function computeSss(monthlySalary) {
    for (var i = 0; i < SSS_TABLE.length; i++) {
      var row = SSS_TABLE[i];
      if (monthlySalary < row.max) return row;
    }
    return SSS_TABLE[SSS_TABLE.length - 1];
  }

  // ---- PhilHealth 2025: 5% of monthly basic, split 2.5% EE / 2.5% ER ----
  // Floor 10,000 / Ceiling 100,000, EE cap 2,500/month.
  function computePhilHealth(monthlySalary) {
    var base = Math.min(Math.max(monthlySalary, 10000), 100000);
    var total = base * 0.05;
    var ee = Math.min(total / 2, 2500);
    return { monthly: ee, total: total };
  }

  // ---- Pag-IBIG: flat ₱100/month employee share (₱50 per cut-off) ----
  function computePagibig() {
    return { monthly: 100, perCutoff: 50 };
  }

  // ---- BIR TRAIN Law withholding tax table (semi-monthly), effective 2023 ----
  var TRAIN_SEMI_MONTHLY = [
    { min: 0, max: 10417, base: 0, rate: 0, excessOver: 0 },
    { min: 10417, max: 16666, base: 0, rate: 0.15, excessOver: 10417 },
    { min: 16666, max: 33332, base: 937.5, rate: 0.2, excessOver: 16666 },
    { min: 33332, max: 83332, base: 4270.7, rate: 0.25, excessOver: 33332 },
    { min: 83332, max: 333332, base: 16770.7, rate: 0.3, excessOver: 83332 },
    { min: 333332, max: 666666, base: 91770.7, rate: 0.32, excessOver: 333332 },
    { min: 666666, max: Infinity, base: 213177.04, rate: 0.35, excessOver: 666666 },
  ];

  function computeWithholdingTax(taxableSemiMonthlyIncome) {
    var row = TRAIN_SEMI_MONTHLY[0];
    for (var i = 0; i < TRAIN_SEMI_MONTHLY.length; i++) {
      if (taxableSemiMonthlyIncome >= TRAIN_SEMI_MONTHLY[i].min && taxableSemiMonthlyIncome < TRAIN_SEMI_MONTHLY[i].max) {
        row = TRAIN_SEMI_MONTHLY[i];
        break;
      }
    }
    if (taxableSemiMonthlyIncome >= 666666) row = TRAIN_SEMI_MONTHLY[6];
    var tax = row.base + (taxableSemiMonthlyIncome - row.excessOver) * row.rate;
    return Math.max(0, Math.round(tax * 100) / 100);
  }

  // ---------------------------------------------------------------------
  // Seed: Employees
  // ---------------------------------------------------------------------
  var SEED_EMPLOYEES = [
    {
      id: "DLX-001",
      firstName: "Lee",
      lastName: "Obseñares",
      position: "CEO / Owner",
      department: "Executives",
      employmentType: "Regular",
      status: "Active",
      dateHired: "2022-01-03",
      dateRegularized: "2022-04-03",
      monthlySalary: 0,
      contact: "0917-100-0001",
      email: "lee@digilex.ph",
      address: "Quezon City, Metro Manila",
      emergencyContactName: "Rosa Obseñares",
      emergencyContactNumber: "0917-100-0099",
      sss: "01-2345678-9",
      philhealth: "01-234567890-1",
      pagibig: "1234-5678-9012",
      tin: "123-456-789-000",
      bankName: "BDO",
      bankAccount: "0012-3456-7890",
      birthday: "1990-03-14",
      civilStatus: "Married",
    },
    {
      id: "DLX-002",
      firstName: "Maria",
      lastName: "Santos",
      position: "CS Manager",
      department: "Customer Service",
      employmentType: "Regular",
      status: "Active",
      dateHired: "2022-06-15",
      dateRegularized: "2022-09-15",
      monthlySalary: 22000,
      contact: "0917-200-0002",
      email: "maria.santos@digilex.ph",
      address: "Mandaluyong City, Metro Manila",
      emergencyContactName: "Pedro Santos",
      emergencyContactNumber: "0917-200-0099",
      sss: "02-3456789-0",
      philhealth: "02-345678901-2",
      pagibig: "2345-6789-0123",
      tin: "234-567-890-000",
      bankName: "BPI",
      bankAccount: "1122-3344-5566",
      birthday: "1992-07-22",
      civilStatus: "Single",
    },
    {
      id: "DLX-003",
      firstName: "Juan",
      lastName: "dela Cruz",
      position: "Warehouse Staff",
      department: "Warehouse",
      employmentType: "Regular",
      status: "Active",
      dateHired: "2023-02-01",
      dateRegularized: "2023-05-01",
      monthlySalary: 18000,
      contact: "0917-300-0003",
      email: "juan.delacruz@digilex.ph",
      address: "Caloocan City, Metro Manila",
      emergencyContactName: "Elena dela Cruz",
      emergencyContactNumber: "0917-300-0099",
      sss: "03-4567890-1",
      philhealth: "03-456789012-3",
      pagibig: "3456-7890-1234",
      tin: "345-678-901-000",
      bankName: "Metrobank",
      bankAccount: "2233-4455-6677",
      birthday: "1995-11-05",
      civilStatus: "Married",
    },
    {
      id: "DLX-004",
      firstName: "Ana",
      lastName: "Reyes",
      position: "Marketing Specialist",
      department: "Sales & Marketing",
      employmentType: "Probationary",
      status: "Active",
      dateHired: "2026-02-10",
      dateRegularized: "",
      monthlySalary: 20000,
      contact: "0917-400-0004",
      email: "ana.reyes@digilex.ph",
      address: "Pasig City, Metro Manila",
      emergencyContactName: "Carmen Reyes",
      emergencyContactNumber: "0917-400-0099",
      sss: "04-5678901-2",
      philhealth: "04-567890123-4",
      pagibig: "4567-8901-2345",
      tin: "456-789-012-000",
      bankName: "BDO",
      bankAccount: "3344-5566-7788",
      birthday: "1998-01-30",
      civilStatus: "Single",
    },
    {
      id: "DLX-005",
      firstName: "Carlo",
      lastName: "Mendoza",
      position: "CS Representative",
      department: "Customer Service",
      employmentType: "Contractual",
      status: "Active",
      dateHired: "2026-03-01",
      dateRegularized: "",
      monthlySalary: 16000,
      contact: "0917-500-0005",
      email: "carlo.mendoza@digilex.ph",
      address: "Taguig City, Metro Manila",
      emergencyContactName: "Nora Mendoza",
      emergencyContactNumber: "0917-500-0099",
      sss: "05-6789012-3",
      philhealth: "05-678901234-5",
      pagibig: "5678-9012-3456",
      tin: "567-890-123-000",
      bankName: "UnionBank",
      bankAccount: "4455-6677-8899",
      birthday: "1997-09-18",
      civilStatus: "Single",
    },
    {
      id: "DLX-006",
      firstName: "Liza",
      lastName: "Bautista",
      position: "Admin Assistant",
      department: "Admin",
      employmentType: "Regular",
      status: "Active",
      dateHired: "2023-08-16",
      dateRegularized: "2023-11-16",
      monthlySalary: 17000,
      contact: "0917-600-0006",
      email: "liza.bautista@digilex.ph",
      address: "Manila City, Metro Manila",
      emergencyContactName: "Ramon Bautista",
      emergencyContactNumber: "0917-600-0099",
      sss: "06-7890123-4",
      philhealth: "06-789012345-6",
      pagibig: "6789-0123-4567",
      tin: "678-901-234-000",
      bankName: "BPI",
      bankAccount: "5566-7788-9900",
      birthday: "1994-05-27",
      civilStatus: "Married",
    },
    {
      id: "DLX-007",
      firstName: "Mark",
      lastName: "Villanueva",
      position: "Logistics Coordinator",
      department: "Logistics",
      employmentType: "Regular",
      status: "Active",
      dateHired: "2022-11-03",
      dateRegularized: "2023-02-03",
      monthlySalary: 19000,
      contact: "0917-700-0007",
      email: "mark.villanueva@digilex.ph",
      address: "Valenzuela City, Metro Manila",
      emergencyContactName: "Divina Villanueva",
      emergencyContactNumber: "0917-700-0099",
      sss: "07-8901234-5",
      philhealth: "07-890123456-7",
      pagibig: "7890-1234-5678",
      tin: "789-012-345-000",
      bankName: "Metrobank",
      bankAccount: "6677-8899-0011",
      birthday: "1993-12-09",
      civilStatus: "Single",
    },
    {
      id: "DLX-008",
      firstName: "Grace",
      lastName: "Tan",
      position: "Business Dev Officer",
      department: "Business Development",
      employmentType: "Probationary",
      status: "Active",
      dateHired: "2026-01-20",
      dateRegularized: "",
      monthlySalary: 21000,
      contact: "0917-800-0008",
      email: "grace.tan@digilex.ph",
      address: "Makati City, Metro Manila",
      emergencyContactName: "Henry Tan",
      emergencyContactNumber: "0917-800-0099",
      sss: "08-9012345-6",
      philhealth: "08-901234567-8",
      pagibig: "8901-2345-6789",
      tin: "890-123-456-000",
      bankName: "BDO",
      bankAccount: "7788-9900-1122",
      birthday: "1996-04-11",
      civilStatus: "Single",
    },
  ];

  // ---------------------------------------------------------------------
  // Seed: Attendance — generate ~last 45 days of plausible logs
  // ---------------------------------------------------------------------
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function generateSeedAttendance() {
    var records = [];
    var today = new Date();
    var start = new Date(today);
    start.setDate(start.getDate() - 44);

    SEED_EMPLOYEES.forEach(function (emp, idx) {
      var cursor = new Date(start);
      var seed = idx + 1;
      while (cursor <= today) {
        var dow = cursor.getDay();
        var dateStr = isoDate(cursor);
        if (dow === 0) {
          records.push({ id: "ATT-" + emp.id + "-" + dateStr, employeeId: emp.id, date: dateStr, status: "Rest Day", timeIn: "", timeOut: "", hoursWorked: 0, notes: "" });
        } else {
          var roll = (seed * 7 + cursor.getDate() * 3) % 20;
          var status, timeIn, timeOut, hours;
          if (roll < 1) {
            status = "Absent"; timeIn = ""; timeOut = ""; hours = 0;
          } else if (roll < 3) {
            status = "Late"; timeIn = "09:" + pad(15 + (roll * 3) % 40); timeOut = "18:00"; hours = 8;
          } else if (roll < 4) {
            status = "Half Day"; timeIn = "09:00"; timeOut = "13:00"; hours = 4;
          } else {
            status = "Present"; timeIn = "08:" + pad(45 + (roll % 15)); timeOut = "18:00"; hours = 8;
          }
          if (cursor > today) { status = ""; timeIn = ""; timeOut = ""; hours = 0; }
          records.push({ id: "ATT-" + emp.id + "-" + dateStr, employeeId: emp.id, date: dateStr, status: status, timeIn: timeIn, timeOut: timeOut, hoursWorked: hours, notes: "" });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return records;
  }

  // ---------------------------------------------------------------------
  // Seed: Leave requests
  // ---------------------------------------------------------------------
  var SEED_LEAVE_REQUESTS = [
    { id: "LV-0001", employeeId: "DLX-003", leaveType: "SL", dateFrom: "2026-06-10", dateTo: "2026-06-11", days: 2, reason: "Flu", status: "Approved", dateFiled: "2026-06-08" },
    { id: "LV-0002", employeeId: "DLX-002", leaveType: "VL", dateFrom: "2026-07-20", dateTo: "2026-07-22", days: 3, reason: "Family trip", status: "Pending", dateFiled: "2026-07-09" },
    { id: "LV-0003", employeeId: "DLX-006", leaveType: "EL", dateFrom: "2026-07-14", dateTo: "2026-07-14", days: 1, reason: "Personal matter", status: "Pending", dateFiled: "2026-07-10" },
    { id: "LV-0004", employeeId: "DLX-007", leaveType: "VL", dateFrom: "2026-05-04", dateTo: "2026-05-05", days: 2, reason: "Rest", status: "Approved", dateFiled: "2026-04-28" },
  ];

  // ---------------------------------------------------------------------
  // Seed: Performance (monthly scorecards, last 3 months)
  // ---------------------------------------------------------------------
  function monthKey(offset) {
    var d = new Date();
    d.setMonth(d.getMonth() - offset);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  }

  function generateSeedPerformance() {
    var out = [];
    SEED_EMPLOYEES.forEach(function (emp, idx) {
      if (emp.id === "DLX-001") return;
      for (var m = 2; m >= 0; m--) {
        var base = 70 + ((idx * 5 + m * 3) % 25);
        out.push({
          id: "PERF-" + emp.id + "-" + monthKey(m),
          employeeId: emp.id,
          month: monthKey(m),
          tasksCompleted: Math.min(100, base + 5),
          qualityScore: Math.round((6 + ((idx + m) % 4)) * 10) / 10,
          csat: emp.department === "Customer Service" ? Math.round((3 + ((idx + m) % 3)) * 10) / 10 : null,
          ordersProcessed: (emp.department === "Warehouse" || emp.department === "Logistics") ? 150 + idx * 20 + m * 10 : null,
          notes: "",
        });
      }
    });
    return out;
  }

  // ---------------------------------------------------------------------
  // Seed: Recruitment
  // ---------------------------------------------------------------------
  var SEED_POSITIONS = [
    { id: "POS-001", title: "CS Representative", department: "Customer Service", salaryMin: 15000, salaryMax: 18000, datePosted: "2026-06-15", status: "Open" },
    { id: "POS-002", title: "Warehouse Staff", department: "Warehouse", salaryMin: 17000, salaryMax: 19000, datePosted: "2026-06-20", status: "Open" },
    { id: "POS-003", title: "Graphic Designer", department: "Sales & Marketing", salaryMin: 18000, salaryMax: 23000, datePosted: "2026-05-10", status: "On Hold" },
  ];

  var SEED_APPLICANTS = [
    { id: "APP-0001", name: "Jasmine Cruz", position: "CS Representative", dateApplied: "2026-06-16", source: "Facebook", contact: "0917-900-1001", email: "jasmine.cruz@gmail.com", interviewDate: "", notes: "", stage: "Applied" },
    { id: "APP-0002", name: "Ronnie Aquino", position: "CS Representative", dateApplied: "2026-06-17", source: "JobStreet", contact: "0917-900-1002", email: "ronnie.aquino@gmail.com", interviewDate: "", notes: "Good phone voice", stage: "Screening" },
    { id: "APP-0003", name: "Bea Fernandez", position: "CS Representative", dateApplied: "2026-06-18", source: "Referral", contact: "0917-900-1003", email: "bea.fernandez@gmail.com", interviewDate: "2026-07-14T10:00", notes: "Referred by Maria", stage: "Interview Scheduled" },
    { id: "APP-0004", name: "Miguel Torres", position: "CS Representative", dateApplied: "2026-06-20", source: "Walk-in", contact: "0917-900-1004", email: "miguel.torres@gmail.com", interviewDate: "2026-07-08T14:00", notes: "Strong communication", stage: "Interview Done" },
    { id: "APP-0005", name: "Kim Salazar", position: "Warehouse Staff", dateApplied: "2026-06-22", source: "Referral", contact: "0917-900-1005", email: "kim.salazar@gmail.com", interviewDate: "", notes: "", stage: "Job Offer" },
    { id: "APP-0006", name: "Paolo Ramirez", position: "CS Representative", dateApplied: "2026-06-05", source: "JobStreet", contact: "0917-900-1006", email: "paolo.ramirez@gmail.com", interviewDate: "", notes: "No-show on interview", stage: "Rejected" },
  ];

  // ---------------------------------------------------------------------
  // Seed: Documents
  // ---------------------------------------------------------------------
  var SEED_DOCUMENTS = [
    { id: "DOC-001", name: "DIGILEX Employee Handbook v1.0", category: "HR Policy", dateUploaded: "2026-01-05", uploadedBy: "Lee Obseñares" },
    { id: "DOC-002", name: "Employment Contract Template", category: "Employment Contract", dateUploaded: "2026-01-05", uploadedBy: "Lee Obseñares" },
    { id: "DOC-003", name: "SSS E1 Form Template", category: "Government Forms", dateUploaded: "2026-01-06", uploadedBy: "Liza Bautista" },
    { id: "DOC-004", name: "PhilHealth PMRF Form", category: "Government Forms", dateUploaded: "2026-01-06", uploadedBy: "Liza Bautista" },
    { id: "DOC-005", name: "Pag-IBIG Membership Form", category: "Government Forms", dateUploaded: "2026-01-06", uploadedBy: "Liza Bautista" },
    { id: "DOC-006", name: "COD Fulfillment SOP", category: "Operations SOP", dateUploaded: "2026-02-01", uploadedBy: "Mark Villanueva" },
    { id: "DOC-007", name: "Facebook Ads Brand Guidelines", category: "Training Materials", dateUploaded: "2026-02-10", uploadedBy: "Ana Reyes" },
  ];

  var SEED_ANNOUNCEMENTS = [
    { id: "ANN-001", body: "Welcome to the new DIGILEX HR system! Please review your profile info and report any corrections to Liza.", date: "2026-07-01" },
  ];

  var SEED_SETTINGS = {
    companyName: "DIGILEX Solutions Inc.",
    companyAddress: "Taguig City, Metro Manila, Philippines",
    payrollCutoffDays: [15, 30],
    workHoursStart: "09:00",
    workHoursEnd: "18:00",
    restDays: ["Sunday"],
    holidays: PH_HOLIDAYS_2026,
  };

  // ---------------------------------------------------------------------
  // Seed: Employee login accounts (one per employee; DLX-001/Lee is admin)
  // ---------------------------------------------------------------------
  var DEFAULT_PASSWORD = "digilex123";
  function generateSeedAccounts() {
    return SEED_EMPLOYEES.map(function (e) {
      return {
        employeeId: e.id,
        username: e.id,
        password: DEFAULT_PASSWORD,
        role: e.id === "DLX-001" ? "admin" : "employee",
      };
    });
  }

  global.DigilexData = {
    DEFAULT_PASSWORD: DEFAULT_PASSWORD,
    generateSeedAccounts: generateSeedAccounts,
    DEPARTMENTS: DEPARTMENTS,
    LEAVE_TYPES: LEAVE_TYPES,
    KPI_TEMPLATES: KPI_TEMPLATES,
    PH_HOLIDAYS: PH_HOLIDAYS_2026,
    SSS_TABLE: SSS_TABLE,
    computeSss: computeSss,
    computePhilHealth: computePhilHealth,
    computePagibig: computePagibig,
    computeWithholdingTax: computeWithholdingTax,
    SEED_EMPLOYEES: SEED_EMPLOYEES,
    generateSeedAttendance: generateSeedAttendance,
    SEED_LEAVE_REQUESTS: SEED_LEAVE_REQUESTS,
    generateSeedPerformance: generateSeedPerformance,
    SEED_POSITIONS: SEED_POSITIONS,
    SEED_APPLICANTS: SEED_APPLICANTS,
    SEED_DOCUMENTS: SEED_DOCUMENTS,
    SEED_ANNOUNCEMENTS: SEED_ANNOUNCEMENTS,
    SEED_SETTINGS: SEED_SETTINGS,
  };
})(window);
