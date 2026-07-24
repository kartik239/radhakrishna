const SHEET_NAME = 'Registrations';
const HEADERS = ['Timestamp','Registration ID','Child Name','Address','Mobile Number','Parent Name','WhatsApp Mobile Number','School Name','Grade','Birth Date','Gender','Character (राधा / श्री कृष्ण)','Browser','Consent'];

function doPost(e) {
  // Lock prevents two simultaneous submissions from getting the same ID
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // wait up to 10 seconds for the lock

  try {
    const sheet = getSheet_();
    const data = JSON.parse(e.parameter.data || e.postData?.contents || '{}');

    // Generate registration ID server-side based on sheet count
    const registrationId = generateRegistrationId_(sheet);

    sheet.appendRow([
      new Date(),
      registrationId,
      data.childName || '',
      data.address || '',
      data.mobile || '',
      data.parentName || '',
      data.parentMobile || '',
      data.schoolName || '',
      data.grade || '',
      data.birthDate || '',
      data.gender || '',
      data.character || '',
      data.browser || '',
      data.consent || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, registrationId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function generateRegistrationId_(sheet) {
  const lastRow = sheet.getLastRow();
  // lastRow=0 means empty, lastRow=1 means only header row
  if (lastRow <= 1) {
    return 'SRK2026-0001';
  }
  // Find the highest existing registration number
  const regIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
  let maxNum = 0;
  regIds.forEach(id => {
    const match = String(id).match(/SRK2026-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  return 'SRK2026-' + String(maxNum + 1).padStart(4, '0');
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'Server is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}
