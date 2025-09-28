// backend/app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const generateQRCode = require("./utils/qr");
const {
  appendRow,
  getAllRows,
  updateRow,
  deleteRow,
  getSetting,
  setSetting,
} = require("./services/sheets");
const ExcelJS = require("exceljs");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

/**
 * Utility: get today's date (YYYY-MM-DD) in IST
 */
function todayDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Utility: get current hour (0–23) in IST as number
 */
function currentHour() {
  // returns "0".."23" as string — convert to number when used
  return new Date().toLocaleString("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Helper: normalize the "vote_poll_enabled" setting to a boolean
 * Accepts raw values like: true, false, "true", "TRUE", " True ", etc.
 * Returns boolean (default true if undefined/null).
 */
async function getPollEnabledBoolean() {
  const raw = await getSetting("vote_poll_enabled"); // may be undefined, boolean, or string
  if (raw === undefined || raw === null) return true;
  // Coerce to string then compare lowercased trimmed value to "true"
  return String(raw).trim().toLowerCase() === "true";
}

/**
 * ------------------------
 * ADMIN: Poll enable/disable (global)
 * ------------------------
 */

// Get admin poll status (for admin UI)
app.get("/admin/poll-status", async (req, res) => {
  try {
    const enabled = await getPollEnabledBoolean();
    res.status(200).json({ enabled });
  } catch (err) {
    res.status(500).json({ message: "Error fetching poll status", error: err.message });
  }
});

// Set admin poll status (admin toggles)
app.post("/admin/poll-status", async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "enabled must be boolean" });
    }
    // store normalized string in sheet
    await setSetting("vote_poll_enabled", enabled ? "true" : "false");

    // If enabling now, initialize poll rows for tomorrow (so all students have default NO)
    if (enabled) {
      await ensurePollInitializedForTomorrow();
    }

    res.status(200).json({ enabled });
  } catch (err) {
    res.status(500).json({ message: "Error setting poll status", error: err.message });
  }
});

// Public endpoint for clients (students) to know if poll is globally enabled
app.get("/poll-enabled", async (req, res) => {
  try {
    const enabled = await getPollEnabledBoolean();
    res.status(200).json({ enabled });
  } catch (err) {
    res.status(500).json({ message: "Error fetching poll enabled", error: err.message });
  }
});

/**
 * ------------------------
 * ADMIN LOGIN
 * ------------------------
 */
app.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const admins = await getAllRows("admins");
    const found = admins.find((r) => r[0] === email && r[1] === password);

    if (found) {
      res.status(200).json({ message: "Login successful" });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error validating admin", error: err.message });
  }
});

/**
 * ------------------------
 * STUDENT MGMT
 * ------------------------
 */
app.post("/add-student", async (req, res) => {
  const { name, registerNumber, department, shift } = req.body;
  try {
    await appendRow("students", [name, registerNumber, department, shift]);

    // Also append a default NO vote for tomorrow for this newly added student
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const polls = await getAllRows("polls");
    const exists = polls.find((r) => r[0] === tomorrow && r[1] === registerNumber);
    if (!exists) {
      await appendRow("polls", [tomorrow, registerNumber, "NO"]);
    }

    res.status(200).json({ message: "Student added" });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.get("/students", async (req, res) => {
  try {
    const rows = await getAllRows("students");
    const result = rows.map(([name, registerNumber, department, shift]) => ({
      name,
      registerNumber,
      department,
      shift,
    }));
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.delete("/delete-student/:registerNumber", async (req, res) => {
  const { registerNumber } = req.params;
  try {
    const rows = await getAllRows("students");
    const index = rows.findIndex((r) => r[1] === registerNumber);
    if (index === -1) return res.status(404).json({ message: "Student not found" });
    await deleteRow("students", index);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

/**
 * ------------------------
 * POLL: "Do you want lunch tomorrow?"
 * ------------------------
 */

/**
 * Helper: ensure poll rows created for tomorrow for all students
 */
async function ensurePollInitializedForTomorrow() {
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const students = await getAllRows("students");
  const polls = await getAllRows("polls");

  for (let stu of students) {
    const exists = polls.find((r) => r[0] === tomorrow && r[1] === stu[1]);
    if (!exists) {
      await appendRow("polls", [tomorrow, stu[1], "NO"]);
    }
  }
}

// Admin trigger to initialize poll (manual)
app.post("/init-poll", async (req, res) => {
  try {
    await ensurePollInitializedForTomorrow();
    res.status(200).json({ message: "Poll initialized for tomorrow" });
  } catch (err) {
    res.status(500).json({ message: "Error initializing poll", error: err.message });
  }
});

/**
 * Get tomorrow's poll status for a student
 * Also returns:
 *  - enabled (boolean) : whether admin enabled polls
 *  - votingOpen (boolean) : whether current time (IST) is within 17:00-06:00
 */
app.get("/poll-status/:registerNumber", async (req, res) => {
  const { registerNumber } = req.params;
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  try {
    const rows = await getAllRows("polls");
    const found = rows.find((r) => r[0] === tomorrow && r[1] === registerNumber);

    const enabled = await getPollEnabledBoolean();

    // compute votingOpen based on IST hour: allow if hour >=17 or hour <6
    const hour = parseInt(currentHour(), 10);
    const votingOpen = (hour >= 17 || hour < 6);

    res.status(200).json({
      date: tomorrow,
      vote: found ? String(found[2] ?? "NO").toUpperCase() : "NO",
      enabled,
      votingOpen,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching poll status", error: err.message });
  }
});

app.post("/vote-food", async (req, res) => {
  const { registerNumber, vote } = req.body; // vote = "YES" | "NO"
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  try {
    // Check global setting (boolean)
    const enabled = await getPollEnabledBoolean();

    if (!enabled) {
      return res.status(403).json({ message: "Voting is currently disabled by admin" });
    }

    // Enforce time window: allow changes only between 17:00 and 06:00 (IST)
    const hour = parseInt(currentHour(), 10);
    if (!(hour >= 17 || hour < 6)) {
      return res.status(403).json({ message: "Voting is only allowed between 5 PM and 6 AM IST" });
    }

    const rows = await getAllRows("polls"); // sheet: [date, reg, vote]
    const idx = rows.findIndex((r) => r[0] === tomorrow && r[1] === registerNumber);

    if (idx === -1) {
      await appendRow("polls", [tomorrow, registerNumber, vote]);
    } else {
      rows[idx][2] = vote;
      await updateRow("polls", idx, rows[idx]);
    }
    res.status(200).json({ message: "Vote recorded", date: tomorrow, vote });
  } catch (err) {
    res.status(500).json({ message: "Poll error", error: err.message });
  }
});

// Admin check summary @ date (YYYY-MM-DD) - enhanced to return YES/NO counts and all students with votes
app.get("/poll-summary/:date", async (req, res) => {
  const { date } = req.params; // YYYY-MM-DD
  try {
    const polls = await getAllRows("polls"); // [date, reg, vote]
    const students = await getAllRows("students");

    // Filter polls for the given date
    const todays = polls.filter((r) => r[0] === date);

    // Map of reg -> vote (if a student missing, default NO)
    const voteMap = {};
    todays.forEach((r) => {
      voteMap[r[1]] = (r[2] || "NO").toUpperCase();
    });

    // For each student, include vote (default NO if missing)
    const allStudentsWithVotes = students.map(([name, reg, dept, shift]) => ({
      name,
      registerNumber: reg,
      department: dept,
      shift,
      vote: voteMap[reg] || "NO",
    }));

    const studentsYes = allStudentsWithVotes.filter((s) => s.vote === "YES");
    const studentsNo = allStudentsWithVotes.filter((s) => s.vote !== "YES");

    res.status(200).json({
      date,
      countYes: studentsYes.length,
      countNo: studentsNo.length,
      studentsYes,
      studentsNo,
      studentsAll: allStudentsWithVotes,
    });
  } catch (err) {
    res.status(500).json({ message: "Summary error", error: err.message });
  }
});

/**
 * QR CODE (Lunch time 1–3 PM)
 */
app.get("/generate-qr", async (req, res) => {
  try {
    const sessionId = Date.now().toString();
    const qrCode = await generateQRCode(sessionId);
    await appendRow("qrcodes", [todayDate(), sessionId, qrCode]);
    res.status(200).json({ qrCode });
  } catch (err) {
    res.status(500).json({ message: "QR error", error: err.message });
  }
});

/**
 * ATTENDANCE
 */
app.post("/mark-attendance", async (req, res) => {
  const { registerNumber } = req.body;
  const date = todayDate();

  try {
    // check if student voted YES today (today meaning same date)
    const polls = await getAllRows("polls");
    const hasVotedYes = polls.some((r) => r[0] === date && r[1] === registerNumber && r[2] === "YES");
    if (!hasVotedYes) {
      return res.status(403).json({ message: "You voted don't want food today!" });
    }

    const rows = await getAllRows("attendance"); // [date, reg, TRUE/FALSE]
    const alreadyMarked = rows.some((r) => r[0] === date && r[1] === registerNumber);

    if (alreadyMarked) return res.status(400).json({ message: "Already marked" });

    await appendRow("attendance", [date, registerNumber, "TRUE"]);
    res.status(200).json({ message: "Attendance marked" });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.get("/attendance", async (req, res) => {
  try {
    const attendanceRows = await getAllRows("attendance");
    const studentRows = await getAllRows("students");

    const attendanceData = attendanceRows.map(([date, registerNumber, status]) => {
      const student = studentRows.find((r) => r[1] === registerNumber);
      return {
        date,
        registerNumber,
        name: student ? student[0] : "Unknown",
        department: student ? student[2] : "Unknown",
        shift: student ? student[3] : "Unknown",
        receivedFood: status === "TRUE",
      };
    });

    res.status(200).json(attendanceData);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance", error: err.message });
  }
});

/**
 * STUDENT CHECK
 */
app.post("/check-student", async (req, res) => {
  const { registerNumber, department, shift } = req.body;
  try {
    const rows = await getAllRows("students");
    const found = rows.find((r) => r[1] === registerNumber && r[2] === department && r[3] === shift);
    if (found) return res.status(200).json({ message: "Student found" });
    res.status(404).json({ message: "No match" });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.get("/get-attendance/:registerNumber", async (req, res) => {
  const { registerNumber } = req.params;
  try {
    const rows = await getAllRows("attendance");
    const dates = rows.filter((r) => r[1] === registerNumber).map((r) => r[0]);
    res.status(200).json(dates);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.get("/export-report", async (req, res) => {
  try {
    const { startDate, endDate, days } = req.query;

    // Helper to parse date strings (YYYY-MM-DD) in IST and return Date object at midnight IST
    function parseISTDate(yyyyMmDd) {
      // yyyy-mm-dd -> new Date('yyyy-mm-dd') gives midnight UTC; adjust by timezone offset
      // Simpler: use Date.UTC for given Y/M/D then create Date in local timezone — for our needs this suffices
      const [y, m, d] = yyyyMmDd.split("-").map(Number);
      // Create Date in IST by building a Date for that yyyy-mm-dd in UTC then shifting to IST
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt;
    }

    // Compute end date (inclusive) in YYYY-MM-DD string
    const today = todayDate(); // returns YYYY-MM-DD in IST
    let end = endDate || today;
    let start;

    if (startDate) {
      start = startDate;
    } else {
      const daysNum = parseInt(days || "7", 10);
      // compute start = end - (daysNum - 1)
      const endDt = parseISTDate(end);
      endDt.setUTCDate(endDt.getUTCDate()); // ensure valid
      const startDt = new Date(endDt);
      startDt.setUTCDate(startDt.getUTCDate() - (daysNum - 1));
      // Format to YYYY-MM-DD
      const y = startDt.getUTCFullYear();
      const m = String(startDt.getUTCMonth() + 1).padStart(2, "0");
      const d = String(startDt.getUTCDate()).padStart(2, "0");
      start = `${y}-${m}-${d}`;
    }

    // Build list of dates from start -> end inclusive
    function listDates(s, e) {
      const arr = [];
      const sDt = parseISTDate(s);
      const eDt = parseISTDate(e);
      for (let d = new Date(sDt); d <= eDt; d.setUTCDate(d.getUTCDate() + 1)) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        arr.push(`${y}-${m}-${dd}`);
      }
      return arr;
    }

    const dates = listDates(start, end);

    // read sheets
    const polls = await getAllRows("polls"); // rows: [date, reg, vote]
    const students = await getAllRows("students"); // rows: [name, reg, dept, shift]

    // Build quick maps for student metadata
    const studentMap = {};
    for (const s of students) {
      const name = s[0] || "";
      const reg = s[1] || "";
      const dept = s[2] || "";
      const shift = s[3] || "";
      if (reg) {
        studentMap[reg] = { name, department: dept, shift };
      }
    }

    // Build vote map per date/reg
    // voteMap[date][reg] = vote
    const voteMap = {};
    for (const p of polls) {
      const d = p[0];
      const reg = p[1];
      const v = (p[2] || "NO").toUpperCase();
      if (!voteMap[d]) voteMap[d] = {};
      voteMap[d][reg] = v;
    }

    // Prepare excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Poll Report");

    // Header row
    sheet.addRow(["date", "registerNumber", "name", "department", "shift", "vote"]);

    // For each date and each student, add a row
    for (const dateStr of dates) {
      for (const reg in studentMap) {
        const meta = studentMap[reg];
        const voteForDate = (voteMap[dateStr] && voteMap[dateStr][reg]) ? voteMap[dateStr][reg] : "NO";
        sheet.addRow([dateStr, reg, meta.name, meta.department, meta.shift, voteForDate]);
      }
    }

    // Auto width columns (simple)
    sheet.columns.forEach((col) => {
      let maxLength = 10;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value ? String(cell.value) : "";
        if (v.length > maxLength) maxLength = v.length;
      });
      col.width = Math.min(Math.max(maxLength + 2, 12), 50);
    });

    // Generate buffer and send as attachment
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const fileName = `poll_report_${start}_to_${end}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ message: "Export error", error: err.message });
  }
});

/* --- make sure your app continues to listen at the bottom --- */

const PORT = process.env.PORT || 5000;
if (!module.parent) {
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
