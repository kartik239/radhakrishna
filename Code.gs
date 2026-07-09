const SHEET_NAME = 'Registrations';
const HEADERS = ['Timestamp','Registration ID','Child Name','Address','Mobile Number','Parent Name','WhatsApp Mobile Number','School Name','Grade','Birth Date','Gender','Character (राधा / श्री कृष्ण)','Browser','Consent'];

function doPost(e) {
  const sheet = getSheet_();
  const data = JSON.parse(e.parameter.data || e.postData?.contents || '{}');
  sheet.appendRow([
    data.timestamp || new Date(),
    data.registrationId || '',
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
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}
