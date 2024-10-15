import * as fs from 'fs';
import getGDriveService from './auth';
import { drive_v3 } from 'googleapis';

async function main() {
  const service = await getGDriveService();

  console.log('service', service);
  if (service) {
    const results = await service.files.list({
        pageSize: 10,
        fields: 'nextPageToken, files(id, name, mimeType)',
      });
      const items = results.data.files;
    
      if (items) {
        for (const item of items) {
            console.log(item.name, item.id);
          }
      }
  }
}


const getChildrenOfFolder = async (folderId: string) => {
  const service = await getGDriveService();
  if (service) {
      const results = await service.files.list({
      q: `'${folderId}' in parents`,
      pageSize: 10,
      fields: 'nextPageToken, files(id, name, mimeType, webContentLink)',
      });
      const items = results.data.files;

      console.log('NextPageToken', results.data);
      if (items) {
      for (const item of items) {
          console.log(item.name, item.id, item);
      }
      }
  }
}


async function downloadFile(driveService: any, fileId: string, filePath: string) {
    try {
        const res = await driveService.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );
        res.data.pipe(fs.createWriteStream(filePath));
        console.log(`File downloaded to ${filePath}`);
    } catch (error) {
        console.error('Error downloading file:', error);
    }
}


const getAllFilesInFolder = async (driveService: drive_v3.Drive, folderId: string): Promise<drive_v3.Schema$File[]> => {
    let allFiles: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined | null = undefined;
    let res;

    do {
         res = await driveService.files.list({
            q: `'${folderId}' in parents`,
            fields: 'nextPageToken, files(id, name, mimeType, webContentLink, webViewLink, thumbnailLink)',
            pageToken: pageToken, // Include the pageToken for subsequent pages
            pageSize: 1000 // Optional: Set a larger page size (max 1000) for fewer requests
        });

        // If any of these files are folders, then we need to get all files within THAT FOLDER
        const promises: Promise<drive_v3.Schema$File[]>[] = [];
        const mediaFiles: drive_v3.Schema$File[] = [];

        res.data.files?.forEach((file) => {
            if (file.id && file.mimeType === 'application/vnd.google-apps.folder') {
                promises.push(getAllFilesInFolder(driveService, file.id))
            } else {
                mediaFiles.push(file)
            }
        });

        let results: drive_v3.Schema$File[][];
        if (promises.length > 0) {
            results = await Promise.all(promises);
            allFiles = allFiles.concat(mediaFiles, ...results)
        } else {
            console.log(`We found all ${mediaFiles.length} files at the leaf`);
            allFiles = allFiles.concat(mediaFiles)
        }

        pageToken = res.data.nextPageToken; // Update the pageToken for the next iteration

    } while (pageToken); // Continue as long as there's a nextPageToken

    return allFiles;
}


async function getFolder() {
    const driveService = await getGDriveService();
    
    if (!driveService) {
        return;
    }
    // Find the folder with the specified name
    const folderName = 'Safari 2024';
    const folders = await driveService.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'nextPageToken, files(id, name)',
    });
    
    if (folders.data.files) {
        if (folders.data.files.length === 0) {
            console.log(`Folder not found: ${folderName}`);
            return;
        }
        const folderId = folders.data.files[0].id;

        if (folderId) {
            console.log(`Folder found: ${folderName} (ID: ${folderId})`);
            const allFiles = await getAllFilesInFolder(driveService, folderId);
            console.log("All Files", allFiles.length);
            console.log('Some Files', allFiles.slice(0, 10));

            
        }

    }
      
}
getFolder();