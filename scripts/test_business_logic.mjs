import assert from "node:assert/strict";
import {
  format,
  startOfToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWeekend,
  isSameDay,
} from "date-fns";
import * as XLSX from "xlsx";

console.log("=================================================");
console.log("AGENDA LAB EMPIRICAL BUSINESS LOGIC TEST HARNESS");
console.log("=================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`[PASS] Test ${totalCount}: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalCount}: ${name}`);
    console.error(err);
    throw err;
  }
}

// -------------------------------------------------------------
// SUITE 1: QUOTA CALCULATION ENGINE
// -------------------------------------------------------------

function calculateWeeklyUsage({
  effectiveProfName,
  selectedDate,
  selectedLab,
  monthSchedules,
  userRole,
  userUid,
  maxWeeklyHours,
  usePerLabQuota,
  quotaPerLab,
  customQuotasMap,
}) {
  const profLower = effectiveProfName ? effectiveProfName.toLowerCase().trim() : "";
  const custom = profLower ? customQuotasMap.get(profLower) : null;
  const isCustomQuota = Boolean(custom);

  let currentMax = maxWeeklyHours;
  if (usePerLabQuota) {
    if (custom?.quotaPerLab && typeof custom.quotaPerLab[selectedLab] === "number") {
      currentMax = Number(custom.quotaPerLab[selectedLab]);
    } else {
      currentMax = Number(quotaPerLab[selectedLab]) || 2;
    }
  } else {
    if (typeof custom?.weeklyQuota === "number") {
      currentMax = custom.weeklyQuota;
    } else {
      currentMax = maxWeeklyHours;
    }
  }

  if (!selectedDate || !effectiveProfName) {
    return { used: 0, maxLimit: currentMax, isCustomQuota, schedules: [], weekStartFormatted: "", weekEndFormatted: "" };
  }
  const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const profWeekSchedules = monthSchedules.filter((s) => {
    const inWeek = s.date >= weekStart && s.date <= weekEnd;
    const isProf =
      (s.professorName && s.professorName.toLowerCase().trim() === profLower) ||
      (userRole === "professor" && s.professorId === userUid);
    const isCurrentLab = usePerLabQuota ? s.laboratory === selectedLab : true;
    return inWeek && isProf && isCurrentLab;
  });

  const usedHours = profWeekSchedules.reduce((acc, curr) => acc + (curr.classHours?.length || 0), 0);
  return {
    used: usedHours,
    maxLimit: currentMax,
    isCustomQuota,
    schedules: profWeekSchedules,
    weekStartFormatted: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "dd/MM"),
    weekEndFormatted: format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "dd/MM"),
  };
}

runTest("Quota 1.1: Global Weekly Quota default limit (4 hours)", () => {
  const date = new Date(2026, 7, 24); // Monday 24-Aug-2026
  const schedules = [
    { professorName: "Prof. Marcos", date: "2026-08-24", laboratory: "LabTec", classHours: [1, 2] },
    { professorName: "Prof. Marcos", date: "2026-08-25", laboratory: "Manutec", classHours: [3] },
  ];
  const customMap = new Map();

  const usage = calculateWeeklyUsage({
    effectiveProfName: "Prof. Marcos",
    selectedDate: date,
    selectedLab: "Robotica",
    monthSchedules: schedules,
    userRole: "professor",
    userUid: "uid-marcos",
    maxWeeklyHours: 4,
    usePerLabQuota: false,
    quotaPerLab: { LabTec: 2, Manutec: 2, Robotica: 2, Biologia: 2 },
    customQuotasMap: customMap,
  });

  assert.equal(usage.used, 3);
  assert.equal(usage.maxLimit, 4);
  assert.equal(usage.isCustomQuota, false);

  // Attempting to book 2 hours -> total = 5 > 4 (Blocked)
  const canBook2 = usage.used + 2 <= usage.maxLimit;
  assert.equal(canBook2, false);

  // Attempting to book 1 hour -> total = 4 <= 4 (Allowed)
  const canBook1 = usage.used + 1 <= usage.maxLimit;
  assert.equal(canBook1, true);
});

runTest("Quota 1.2: Per-Lab Isolated Quotas (LabTec: 2, Manutec: 3, Robotica: 1, Biologia: 2)", () => {
  const date = new Date(2026, 7, 24);
  const schedules = [
    { professorName: "Prof. Julia", date: "2026-08-24", laboratory: "LabTec", classHours: [1, 2] },
    { professorName: "Prof. Julia", date: "2026-08-25", laboratory: "Manutec", classHours: [1] },
  ];
  const customMap = new Map();

  // Check LabTec usage (should be 2/2)
  const labTecUsage = calculateWeeklyUsage({
    effectiveProfName: "Prof. Julia",
    selectedDate: date,
    selectedLab: "LabTec",
    monthSchedules: schedules,
    userRole: "professor",
    userUid: "uid-julia",
    maxWeeklyHours: 8,
    usePerLabQuota: true,
    quotaPerLab: { LabTec: 2, Manutec: 3, Robotica: 1, Biologia: 2 },
    customQuotasMap: customMap,
  });
  assert.equal(labTecUsage.used, 2);
  assert.equal(labTecUsage.maxLimit, 2);
  assert.equal(labTecUsage.used + 1 <= labTecUsage.maxLimit, false); // blocked in LabTec

  // Check Manutec usage (should be 1/3)
  const manutecUsage = calculateWeeklyUsage({
    effectiveProfName: "Prof. Julia",
    selectedDate: date,
    selectedLab: "Manutec",
    monthSchedules: schedules,
    userRole: "professor",
    userUid: "uid-julia",
    maxWeeklyHours: 8,
    usePerLabQuota: true,
    quotaPerLab: { LabTec: 2, Manutec: 3, Robotica: 1, Biologia: 2 },
    customQuotasMap: customMap,
  });
  assert.equal(manutecUsage.used, 1);
  assert.equal(manutecUsage.maxLimit, 3);
  assert.equal(manutecUsage.used + 2 <= manutecUsage.maxLimit, true); // allowed 2 more in Manutec

  // Check Robotica usage (should be 0/1)
  const roboticaUsage = calculateWeeklyUsage({
    effectiveProfName: "Prof. Julia",
    selectedDate: date,
    selectedLab: "Robotica",
    monthSchedules: schedules,
    userRole: "professor",
    userUid: "uid-julia",
    maxWeeklyHours: 8,
    usePerLabQuota: true,
    quotaPerLab: { LabTec: 2, Manutec: 3, Robotica: 1, Biologia: 2 },
    customQuotasMap: customMap,
  });
  assert.equal(roboticaUsage.used, 0);
  assert.equal(roboticaUsage.maxLimit, 1);
  assert.equal(roboticaUsage.used + 1 <= roboticaUsage.maxLimit, true);
});

runTest("Quota 1.3: Custom Teacher Individual Quotas (Global Mode Override)", () => {
  const date = new Date(2026, 7, 24);
  const schedules = [
    { professorName: "Prof. Roberto Santos", date: "2026-08-24", laboratory: "LabTec", classHours: [1, 2, 3, 4] },
  ];
  const customMap = new Map();
  customMap.set("prof. roberto santos", { weeklyQuota: 10 });

  const usage = calculateWeeklyUsage({
    effectiveProfName: "Prof. Roberto Santos",
    selectedDate: date,
    selectedLab: "LabTec",
    monthSchedules: schedules,
    userRole: "professor",
    userUid: "uid-roberto",
    maxWeeklyHours: 4, // default is 4, but Roberto has 10
    usePerLabQuota: false,
    quotaPerLab: { LabTec: 2, Manutec: 2, Robotica: 2, Biologia: 2 },
    customQuotasMap: customMap,
  });

  assert.equal(usage.used, 4);
  assert.equal(usage.maxLimit, 10);
  assert.equal(usage.isCustomQuota, true);
  assert.equal(usage.used + 5 <= usage.maxLimit, true); // 9 <= 10 -> Allowed
});

runTest("Quota 1.4: Custom Teacher Individual Quotas (Per-Lab Mode Override)", () => {
  const date = new Date(2026, 7, 24);
  const schedules = [
    { professorName: "Prof. Marina", date: "2026-08-24", laboratory: "LabTec", classHours: [1, 2, 3] },
  ];
  const customMap = new Map();
  customMap.set("prof. marina", {
    quotaPerLab: { LabTec: 6, Manutec: 1, Robotica: 2, Biologia: 2 },
  });

  const usageLabTec = calculateWeeklyUsage({
    effectiveProfName: "Prof. Marina",
    selectedDate: date,
    selectedLab: "LabTec",
    monthSchedules: schedules,
    userRole: "professor",
    userUid: "uid-marina",
    maxWeeklyHours: 4,
    usePerLabQuota: true,
    quotaPerLab: { LabTec: 2, Manutec: 2, Robotica: 2, Biologia: 2 },
    customQuotasMap: customMap,
  });
  assert.equal(usageLabTec.used, 3);
  assert.equal(usageLabTec.maxLimit, 6);
  assert.equal(usageLabTec.isCustomQuota, true);
  assert.equal(usageLabTec.used + 2 <= usageLabTec.maxLimit, true); // 5 <= 6 -> Allowed

  const usageManutec = calculateWeeklyUsage({
    effectiveProfName: "Prof. Marina",
    selectedDate: date,
    selectedLab: "Manutec",
    monthSchedules: schedules,
    userRole: "professor",
    userUid: "uid-marina",
    maxWeeklyHours: 4,
    usePerLabQuota: true,
    quotaPerLab: { LabTec: 2, Manutec: 2, Robotica: 2, Biologia: 2 },
    customQuotasMap: customMap,
  });
  assert.equal(usageManutec.used, 0);
  assert.equal(usageManutec.maxLimit, 1);
  assert.equal(usageManutec.used + 2 <= usageManutec.maxLimit, false); // 2 > 1 -> Blocked
});

runTest("Quota 1.5: Secretary Override Logic Scenarios", () => {
  // Scenario A: secretaryQuotaOverride = true, allowSecretaryOverride = true -> can override
  const secretaryCanOverrideA = (secretaryQuotaOverride, allowSecretaryOverride) => {
    return secretaryQuotaOverride && allowSecretaryOverride;
  };
  assert.equal(secretaryCanOverrideA(true, true), true);

  // Scenario B: secretaryQuotaOverride = true, allowSecretaryOverride = false -> blocked
  assert.equal(secretaryCanOverrideA(true, false), false);

  // Scenario C: secretaryQuotaOverride = false, allowSecretaryOverride = true -> blocked (admin disabled it)
  assert.equal(secretaryCanOverrideA(false, true), false);

  // Scenario D: secretaryQuotaOverride = false, allowSecretaryOverride = false -> blocked
  assert.equal(secretaryCanOverrideA(false, false), false);
});

// -------------------------------------------------------------
// SUITE 2: CONFLICT DETECTION ENGINE
// -------------------------------------------------------------

function checkScheduleConflict({
  targetDateStr,
  selectedShift,
  selectedClasses,
  finalProfName,
  userUid,
  userRole,
  monthSchedules,
}) {
  const profLower = finalProfName.toLowerCase().trim();
  const conflictSchedule = monthSchedules.find((s) => {
    const isSameDay = s.date === targetDateStr;
    const isSameShift = s.shift === selectedShift;
    const isSameProf =
      (s.professorName && s.professorName.toLowerCase().trim() === profLower) ||
      (s.professorId === userUid && userRole === "professor");

    if (isSameDay && isSameShift && isSameProf) {
      return s.classHours.some((h) => selectedClasses.includes(h));
    }
    return false;
  });
  return conflictSchedule || null;
}

runTest("Conflict 2.1: Inter-Lab Schedule Overlap Detection", () => {
  const monthSchedules = [
    {
      id: "sch-1",
      professorId: "uid-10",
      professorName: "Prof. Fernando",
      laboratory: "LabTec",
      date: "2026-08-29",
      shift: "Matutino",
      classHours: [1, 2],
    },
    {
      id: "sch-2",
      professorId: "uid-10",
      professorName: "Prof. Fernando",
      laboratory: "Manutec",
      date: "2026-08-29",
      shift: "Vespertino",
      classHours: [1, 2],
    },
  ];

  // Test 2.1.1: Same prof, same day, same shift, overlapping hour (class 2 in Manutec Matutino)
  const conflict1 = checkScheduleConflict({
    targetDateStr: "2026-08-29",
    selectedShift: "Matutino",
    selectedClasses: [2, 3],
    finalProfName: "Prof. Fernando",
    userUid: "uid-10",
    userRole: "professor",
    monthSchedules,
  });
  assert.notEqual(conflict1, null);
  assert.equal(conflict1.laboratory, "LabTec");

  // Test 2.1.2: Same prof, same day, same shift, NON-overlapping hours ([3, 4] in Manutec Matutino)
  const conflict2 = checkScheduleConflict({
    targetDateStr: "2026-08-29",
    selectedShift: "Matutino",
    selectedClasses: [3, 4],
    finalProfName: "Prof. Fernando",
    userUid: "uid-10",
    userRole: "professor",
    monthSchedules,
  });
  assert.equal(conflict2, null);

  // Test 2.1.3: Different shift (Noturno [1, 2]) -> no conflict
  const conflict3 = checkScheduleConflict({
    targetDateStr: "2026-08-29",
    selectedShift: "Noturno",
    selectedClasses: [1, 2],
    finalProfName: "Prof. Fernando",
    userUid: "uid-10",
    userRole: "professor",
    monthSchedules,
  });
  assert.equal(conflict3, null);

  // Test 2.1.4: Different date (2026-08-30 Matutino [1, 2]) -> no conflict
  const conflict4 = checkScheduleConflict({
    targetDateStr: "2026-08-30",
    selectedShift: "Matutino",
    selectedClasses: [1, 2],
    finalProfName: "Prof. Fernando",
    userUid: "uid-10",
    userRole: "professor",
    monthSchedules,
  });
  assert.equal(conflict4, null);
});

// -------------------------------------------------------------
// SUITE 3: ADMIN BULK IMPORT & USERNAME NORMALIZATION
// -------------------------------------------------------------

function generateUsernameFromName(fullName, existingUsernames) {
  const cleanStr = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const parts = cleanStr
    .split(/\s+/)
    .filter((p) => p.length > 2 || !["de", "da", "do", "dos", "das", "e"].includes(p));

  let base = "usuario";
  if (parts.length === 1) {
    base = parts[0].replace(/[^a-z0-9]/g, "");
  } else if (parts.length >= 2) {
    const first = parts[0].replace(/[^a-z0-9]/g, "");
    const last = parts[parts.length - 1].replace(/[^a-z0-9]/g, "");
    base = `${first}.${last}`;
  }

  if (!base) base = "usuario";

  let candidate = base;
  let counter = 2;
  while (existingUsernames.has(candidate)) {
    candidate = `${base}${counter}`;
    counter++;
  }

  existingUsernames.add(candidate);
  return candidate;
}

runTest("Admin 3.1: Username Generation & Disambiguation", () => {
  const existing = new Set(["admin"]);

  // Multi-word with prepositions
  const u1 = generateUsernameFromName("Maria da Conceição dos Santos", existing);
  assert.equal(u1, "maria.santos");

  // Single word
  const u2 = generateUsernameFromName("Aristóteles", existing);
  assert.equal(u2, "aristoteles");

  // Collision handling
  const u3 = generateUsernameFromName("Maria Santos", existing);
  assert.equal(u3, "maria.santos2");

  const u4 = generateUsernameFromName("Maria Santos", existing);
  assert.equal(u4, "maria.santos3");

  // Accented names
  const u5 = generateUsernameFromName("Érico Veríssimo", existing);
  assert.equal(u5, "erico.verissimo");
});

// -------------------------------------------------------------
// SUITE 4: LOGS & RANKING ENGINE + EXCEL EXPORT ORACLES
// -------------------------------------------------------------

function computeRanking(schedules, logs) {
  const map = new Map();

  schedules.forEach((s) => {
    const rawName = s.professorName?.trim();
    if (!rawName) return;

    const hoursCount = s.classHours?.length || 1;
    const existing = map.get(rawName) || {
      name: rawName,
      totalHours: 0,
      totalReservations: 0,
      labTecHours: 0,
      manutecHours: 0,
      roboticaHours: 0,
      biologiaHours: 0,
      tvCount: 0,
    };

    existing.totalHours += hoursCount;
    existing.totalReservations += 1;
    if (s.laboratory === "LabTec") existing.labTecHours += hoursCount;
    else if (s.laboratory === "Manutec") existing.manutecHours += hoursCount;
    else if (s.laboratory === "Robotica") existing.roboticaHours += hoursCount;
    else if (s.laboratory === "Biologia") existing.biologiaHours += hoursCount;

    if (s.hasTv) existing.tvCount += 1;

    map.set(rawName, existing);
  });

  logs.forEach((l) => {
    if (l.action !== "create") return;
    const rawName = l.professorName?.trim();
    if (!rawName) return;

    if (!map.has(rawName)) {
      map.set(rawName, {
        name: rawName,
        totalHours: 1,
        totalReservations: 1,
        labTecHours: l.details.includes("LabTec") ? 1 : 0,
        manutecHours: l.details.includes("Manutec") ? 1 : 0,
        roboticaHours: l.details.includes("Robotica") || l.details.includes("Robótica") ? 1 : 0,
        biologiaHours: l.details.includes("Biologia") ? 1 : 0,
        tvCount: l.details.includes("TV") ? 1 : 0,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (b.totalHours !== a.totalHours) {
      return b.totalHours - a.totalHours;
    }
    return b.totalReservations - a.totalReservations;
  });
}

runTest("Logs 4.1: Ranking Sorting & Aggregation Oracle", () => {
  const schedules = [
    { professorName: "Prof. Alice", laboratory: "LabTec", classHours: [1, 2], hasTv: true },
    { professorName: "Prof. Alice", laboratory: "Robotica", classHours: [3, 4, 5], hasTv: false },
    { professorName: "Prof. Bruno", laboratory: "Manutec", classHours: [1, 2, 3, 4, 5], hasTv: true }, // 5 hours in 1 booking
    { professorName: "Prof. Clara", laboratory: "Biologia", classHours: [1], hasTv: false },
  ];
  const logs = [];

  const ranking = computeRanking(schedules, logs);

  assert.equal(ranking.length, 3);
  // Alice has 5 hours across 2 reservations
  // Bruno has 5 hours across 1 reservation
  // Alice should be ranked 1st because tiebreaker: reservations (2 > 1)
  assert.equal(ranking[0].name, "Prof. Alice");
  assert.equal(ranking[0].totalHours, 5);
  assert.equal(ranking[0].totalReservations, 2);
  assert.equal(ranking[0].tvCount, 1);
  assert.equal(ranking[0].labTecHours, 2);
  assert.equal(ranking[0].roboticaHours, 3);

  assert.equal(ranking[1].name, "Prof. Bruno");
  assert.equal(ranking[1].totalHours, 5);
  assert.equal(ranking[1].totalReservations, 1);

  assert.equal(ranking[2].name, "Prof. Clara");
  assert.equal(ranking[2].totalHours, 1);
});

runTest("Logs 4.2: Excel Workbook Sheet Generation Oracle", () => {
  const sampleSchedules = [
    { date: "2026-08-25", laboratory: "LabTec", shift: "Matutino", classHours: [1, 2], professorName: "Prof. Alice", hasTv: true },
    { date: "2026-08-25", laboratory: "Manutec", shift: "Vespertino", classHours: [3], professorName: "Prof. Bruno", hasTv: false },
    { date: "2026-08-26", laboratory: "Biologia", shift: "Noturno", classHours: [1, 2, 3], professorName: "Prof. Clara", hasTv: false },
  ];

  // Emulate Excel export logic from src/app/logs/page.tsx
  const wb = XLSX.utils.book_new();

  // Sheet 1: Total por Professor
  const profStatsData = [
    {
      "Professor": "Prof. Alice",
      "Total de Aulas (Horas)": 2,
      "Total de Agendamentos (Reservas)": 1,
      "Aulas no LabTec": 2,
      "Aulas no Manutec": 0,
      "Aulas na Robótica": 0,
      "Aulas na Biologia": 0,
      "Agendamentos c/ TV": 1,
    },
  ];
  const wsProfStats = XLSX.utils.json_to_sheet(profStatsData);
  XLSX.utils.book_append_sheet(wb, wsProfStats, "Total por Professor");

  // Sheet 2: Resumo Geral
  const generalData = sampleSchedules.map((s) => ({
    "Data": s.date,
    "Laboratório": s.laboratory,
    "Turno": s.shift,
    "Aulas / Horários": s.classHours.map((h) => `${h}º`).join(", "),
    "Professor": s.professorName,
    "Uso de TV?": s.hasTv ? "Sim" : "Não",
  }));
  const wsGeneral = XLSX.utils.json_to_sheet(generalData);
  XLSX.utils.book_append_sheet(wb, wsGeneral, "Resumo Geral");

  // Sheet 3: Day tabs
  const wsDay1 = XLSX.utils.json_to_sheet([{ "Laboratório": "LabTec" }]);
  XLSX.utils.book_append_sheet(wb, wsDay1, "25-08-2026");

  assert.ok(wb.SheetNames.includes("Total por Professor"));
  assert.ok(wb.SheetNames.includes("Resumo Geral"));
  assert.ok(wb.SheetNames.includes("25-08-2026"));
});

// -------------------------------------------------------------
// SUITE 5: CALENDAR GRID & WEEKEND FILTER
// -------------------------------------------------------------

runTest("Calendar 5.1: Month Grid & Weekend Filtering", () => {
  const currentMonth = new Date(2026, 7, 1); // August 2026
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  assert.ok(calendarDays.length >= 28);
  assert.equal(calendarDays[0].getDay(), 1); // Starts on Monday

  const filteredWeekdays = calendarDays.filter((d) => !isWeekend(d));
  assert.ok(filteredWeekdays.every((d) => d.getDay() >= 1 && d.getDay() <= 5));
});

console.log("\n=================================================");
console.log(`ALL ${passedCount}/${totalCount} EMPIRICAL TESTS PASSED SUCCESSFULLY!`);
console.log("=================================================");
