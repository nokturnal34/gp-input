import { google } from 'googleapis';

async function getPasscode() {
  try {
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credentialsJson) {
      console.log('GOOGLE_SERVICE_ACCOUNT_JSON not set');
      return;
    }
    
    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const registrySheetId = process.env.REGISTRY_SHEET_ID;
    
    if (!registrySheetId) {
      console.log('REGISTRY_SHEET_ID not set');
      return;
    }
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: registrySheetId,
      range: 'Sheet1'
    });
    
    const rows = res.data.values;
    if (!rows) {
      console.log('No data in registry');
      return;
    }
    
    const headers = rows[0];
    const clientSlugIdx = headers.indexOf('client_slug');
    const passcodeIdx = headers.indexOf('passcode');
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][clientSlugIdx] === 'cubiq-technologies') {
        console.log(`Passcode for cubiq-technologies: ${rows[i][passcodeIdx]}`);
        return;
      }
    }
    console.log('cubiq-technologies not found in registry');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

getPasscode();
