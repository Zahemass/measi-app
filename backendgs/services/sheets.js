// backend/services/sheets.js
const { google } = require("googleapis");
const path = require("path");
require("dotenv").config();

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../credentials.json"),
  scopes: SCOPES,
});
const sheets = google.sheets({ version: "v4", auth });

const spreadsheetId = process.env.SPREADSHEET_ID;

/**
 * Append a single row to a sheet (sheet name is the tab name)
 */
async function appendRow(sheet, row) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheet}!A1`,
    valueInputOption: "USER_ENTERED",
    resource: { values: [row] },
  });
}

/**
 * Get all rows in the sheet (A1:Z1000)
 */
async function getAllRows(sheet) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheet}!A1:Z1000`,
  });
  return res.data.values || [];
}

/**
 * Update a row by zero-based rowIndex (0 => A1)
 */
async function updateRow(sheet, rowIndex, values) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheet}!A${rowIndex + 1}:Z${rowIndex + 1}`,
    valueInputOption: "USER_ENTERED",
    resource: { values: [values] },
  });
}

/**
 * Delete a row by zero-based rowIndex.
 * Note: This uses batchUpdate deleteDimension; it requires sheetId.
 * If your sheet tab IDs differ, update sheetIdMap below.
 */
async function deleteRow(sheet, rowIndex) {
  const sheetIdMap = {
    students: 0,
    polls: 1,
    attendance: 2,
    qrcodes: 3,
    settings: 4,
    admins: 5,
  };
  const sheetId = sheetIdMap[sheet] ?? 0;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

/**
 * Settings helper (settings sheet stores rows like: [key, value])
 * The functions below are robust to different cell value types (string, boolean, etc.)
 */

// getSetting returns the raw stored value (string or boolean) or undefined if not found
async function getSetting(key) {
  const rows = await getAllRows("settings");
  if (!rows || rows.length === 0) return undefined;
  // Find row where first cell matches key (trimmed)
  const found = rows.find((r) => {
    if (!r || r.length === 0) return false;
    const k = String(r[0] ?? "").trim();
    return k === key;
  });
  if (!found) return undefined;
  // Return the second cell (value) as-is (string, boolean, etc.)
  return found[1];
}

// setSetting writes the key/value (stores value as a string, normalized lower-case)
async function setSetting(key, value) {
  const storeVal = String(value).trim().toLowerCase();
  const rows = await getAllRows("settings");
  const idx = rows.findIndex((r) => {
    if (!r || r.length === 0) return false;
    return String(r[0] ?? "").trim() === key;
  });
  if (idx === -1) {
    await appendRow("settings", [key, storeVal]);
  } else {
    rows[idx][1] = storeVal;
    await updateRow("settings", idx, rows[idx]);
  }
}

module.exports = {
  appendRow,
  getAllRows,
  updateRow,
  deleteRow,
  getSetting,
  setSetting,
};
