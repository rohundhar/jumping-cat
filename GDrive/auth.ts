import { drive_v3, google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly', 
  'https://www.googleapis.com/auth/drive.readonly'
];


let driveService: drive_v3.Drive;

export const BUCKET_NAME = 'jumping-cat';

export const getGDriveService = async (): Promise<drive_v3.Drive | undefined> => {

  if (driveService) {
    return driveService;
  }

  try {
      const auth = new google.auth.GoogleAuth({
        keyFilename: './TaggingService/safari-private-key.json', // Same service account key file
        scopes: SCOPES,
      });

      const authClient = await auth.getClient(); // Get the authenticated client

      // Create a JWT client (for service accounts)
      const jwtClient = new google.auth.JWT({
        email: (authClient as any).email, // Access email from the authClient
        key: (authClient as any).key,     // Access key from the authClient
        scopes: SCOPES,
      });

  
      driveService = google.drive({ version: 'v3', auth: jwtClient });
      return driveService;
  } catch (error) {
      console.error('Error authenticating with Google Drive:', error);
      return undefined;
  }
}
