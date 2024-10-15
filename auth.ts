import { drive_v3, google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import readline from 'readline';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly', 
  'https://www.googleapis.com/auth/drive.readonly'
];

const getGDriveService = async (): Promise<drive_v3.Drive | undefined> =>{
  const credentialsPath = path.join(__dirname, 'credentials.json');
  const tokenPath = path.join(__dirname, 'token.json');

  let credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  let token = fs.existsSync(tokenPath) ? JSON.parse(fs.readFileSync(tokenPath, 'utf8')) : null;
  // token = '4/0AVG7fiRizM3ABVDN5N1EbbVf395aJUgWRW9JI6s3RUdACv4pTEf2D6GV-q1lSYkUiU6N6A';

  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (token) {
    oAuth2Client.setCredentials(token);
    return google.drive({ version: 'v3', auth: oAuth2Client });
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    

    rl.question('Enter the authorization code: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err:any, token:any) => {
        if (err) {
          console.error('Error retrieving access token', err);
          return;
        }
        if (token) {
          oAuth2Client.setCredentials(token);
          fs.writeFileSync(tokenPath, JSON.stringify(token));
          console.log('Token stored to', tokenPath);

          return google.drive({ version: 'v3', auth: oAuth2Client });
        }
      });
    });

  }

  return undefined;
}

export default getGDriveService;