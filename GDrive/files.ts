import * as fs from 'fs';
import { Storage } from '@google-cloud/storage';
import { drive_v3 } from 'googleapis';
import cliProgress from 'cli-progress';
import pLimit from 'p-limit';
import { BUCKET_NAME, getGDriveService } from './auth.js';
import { MimeType } from './types.js';
import { Media } from '../Mongo/Schemas/Media.js';


const storage = new Storage({
  projectId: 'safari-2024',
  keyFilename: './config/safari-private-key.json', // Same service account key file
});

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


export const getFolder = async (name: string): Promise<drive_v3.Schema$File[]> => {
    const driveService = await getGDriveService();
    
    if (!driveService) {
        return [];
    }
    // Find the folder with the specified name
    const folders = await driveService.files.list({
        q: `name='${name}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'nextPageToken, files(id, name)',
    });
    
    if (folders.data.files) {
        if (folders.data.files.length === 0) {
            console.log(`Folder not found: ${name}`);
            return [];
        }
        const folderId = folders.data.files[0].id;

        if (folderId) {
            console.log(`Folder found: ${name} (ID: ${folderId})`);
            const allFiles = await getAllFilesInFolder(driveService, folderId);
            console.log("All Files", allFiles.length);
            // console.log('Some Files', allFiles.slice(0, 10));

            return allFiles;
            
        }

    }
    return [];
}

export const getImageContent = async (fileId: string): Promise<Buffer> => {

  const service = await getGDriveService();

  try {
      const res = await service.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
      return Buffer.from(res.data as ArrayBuffer);
  } catch (error: any) {
      console.error(`Error downloading from Drive: ${error.message}`);
      throw error; // Re-throw the error for handling in the calling function
  }
}


const getVideoFileName = (fileId: string) => {
  return `videos/${fileId}`;
}


const videoTypes = [MimeType.QUICKTIME, MimeType.MP4];

export const getOrUploadManyVideos = async (allMedia: Media[]): Promise<any> => {

  const videos = allMedia.filter((media) => videoTypes.includes(media.mimeType as MimeType));

  const limit = pLimit(5);

  const multibar = new cliProgress.MultiBar({
      clearOnComplete: true,
      hideCursor: true,
      format: ' {bar} | {filename} | {percentage}% | {value}/{total}',
  }, cliProgress.Presets.shades_grey);


  const bar = multibar.create(videos.length, 0);
  bar.start(videos.length, 0);

  const promises = videos.map((file) => {
      return limit(async () => {

        if (file.id) {
          const url = await getOrUploadVideo(file, multibar);
          bar.increment();
        }

      });
  });

  await Promise.all(promises);
  bar.stop();
  multibar.stop(); // Stop the multibar after all uploads are complete
}

export const getOrUploadVideo = async (file: Media, multiBar: cliProgress.MultiBar): Promise<string | undefined> => {

  const service = await getGDriveService();

  const { gDriveId: fileId} = file;
  
  if (!service || !fileId) {
    return undefined;
  }

  const fileName = getVideoFileName(fileId);

  const bucket = storage.bucket(BUCKET_NAME);
  const gcsFile = bucket.file(fileName); 

  const [exists] = await gcsFile.exists();

  if (!exists) {
    try {
      const driveFile = await service.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
      const bar = multiBar.create(driveFile.headers["content-length"], 0, { filename: name})
      const totalBytes = parseInt(driveFile.headers['content-length'] as string, 10);
      bar.start(totalBytes, 0); // Start progress bar with total size

      let uploadedBytes = 0;
      driveFile.data.on('data', (chunk) => {
          uploadedBytes += chunk.length;
          bar.update(uploadedBytes, { filename: name}); // Update progress bar with uploaded bytes
      });
      

      const writeStream = gcsFile.createWriteStream();
      driveFile.data.pipe(writeStream);
    
      await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', () => {
            bar.stop(); // Stop progress bar on finish
            resolve();
          });
          writeStream.on('error', () => {
            bar.stop();
            reject()
          });
      });
    } catch (err) {
      console.warn(`Error while trying to upload video ${fileName}`);
    }
  } else {
    // console.log(`${fileName} already exists in Google Cloud Storage`)
  }
  

  return `gs://${BUCKET_NAME}/${fileName}`;
}
