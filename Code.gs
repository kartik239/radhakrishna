const SHEET_NAME = 'Registrations';
const HEADERS = ['Timestamp','Registration ID','Child Name','Address','Mobile Number','Parent Name','WhatsApp Mobile Number','School Name','Grade','Birth Date','Gender','Character (राधा / श्री कृष्ण)','Browser','Consent'];
const GROQ_API_KEY = 'PASTE_YOUR_GROQ_KEY_HERE'; // ← only edit this line

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'Server running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // Parse from FormData (e.parameter.data) or raw JSON body
    let data = {};
    if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    // ── Chatbot request ──
    if (data.type === 'chat') {
      const groqRes = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GROQ_API_KEY
        },
        payload: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 500,
          messages: data.messages
        }),
        muteHttpExceptions: true
      });
      const groqData = JSON.parse(groqRes.getContentText());
      const reply = groqData.choices && groqData.choices[0]
        ? groqData.choices[0].message.content
        : JSON.stringify(groqData); // send raw response for debugging if something goes wrong
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, reply: reply }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Registration request ──
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet_();
      const registrationId = generateRegistrationId_(sheet);
      sheet.appendRow([
        new Date(), registrationId,
        data.childName || '', data.address || '', data.mobile || '',
        data.parentName || '', data.parentMobile || '', data.schoolName || '',
        data.grade || '', data.birthDate || '', data.gender || '',
        data.character || '', data.browser || '', data.consent || ''
      ]);
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, registrationId: registrationId }))
        .setMimeType(ContentService.MimeType.JSON);
    } finally {
      lock.releaseLock();
    }

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function generateRegistrationId_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 'SRK2026-0001';
  const regIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
  let maxNum = 0;
  regIds.forEach(function(id) {
    const match = String(id).match(/SRK2026-(\d+)/);
    if (match) { const n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
  });
  return 'SRK2026-' + String(maxNum + 1).padStart(4, '0');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function testFetch() {
  const res = UrlFetchApp.fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY },
    muteHttpExceptions: true
  });
  Logger.log(res.getContentText());
}
