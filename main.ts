import cliProgress from 'cli-progress';
import * as fs from 'fs';
import * as faceapi from 'face-api.js';
import exifr from 'exifr';
import canvas from 'canvas';
import { getFaceMatcher } from './FaceTrainingService/main.js';
import { getFolder, getImageContent, getOrUploadManyVideos, getOrUploadVideo } from './GDrive/files.js';
import { MimeType } from './GDrive/types.js';
import { drive_v3 } from 'googleapis';
import pLimit from 'p-limit';
import { getOrCreateMedia } from './Mongo/Helpers/media.js';

const folderName = 'Safari 2024';

const imagetypes = [MimeType.JPG];

export const extractMediaMetadata = async () => {
  const allFilesInDrive = await getFolder(folderName);

  const limit = pLimit(10);

  const allFiles = allFilesInDrive.slice(0,10);

  const exampleByModel: any = {};


  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  bar.start(allFiles.length, 0);

  const errors: any[] = [];

  await Promise.all(allFiles.map(async (file) => {
      await limit(async () => { // Wrap the processing function with limit
        try {
          if (file.id) {
            const media = await getImageContent(file.id)
            const metadata = await exifr.parse(media);
            const key = `${metadata.Make}:${metadata.Model}`;
            if (!exampleByModel[key]) {
              exampleByModel[key] = metadata;
              exampleByModel[key].name = file.name;
            }
          }
        } catch (error) {
            errors.push(`Error processing ${file.name}:`)
            // console.error(`Error processing ${file.name}:${file.mimeType}`, error);
        } finally { // Ensure progress bar updates even on error
          bar.increment();
        }
      });
    }));

    console.log(exampleByModel);
    console.log(Object.keys(exampleByModel));
    console.log(errors);
    bar.stop();

}

export const setupMongoDocs = async () => {
  const allFilesInDrive = await getFolder(folderName);

  const limit = pLimit(10);

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  const allFiles = allFilesInDrive.slice(0,10);

  bar.start(allFiles.length, 0);


  await Promise.all(allFiles.map(async (file) => {
    await limit(async () => { // Wrap the processing function with limit
      try {
        if (file.id) {
          const media = getOrCreateMedia(file);
        }
      } catch (error) {
          console.error(`Error processing ${file.name}:${file.mimeType}`, error);
      } finally { // Ensure progress bar updates even on error
        bar.increment();
      }
    });
  }));
  
  bar.stop();

  // for (const file of allFilesInDrive) {
  //      switch (file.mimeType as MimeType) {
  //       case MimeType.MP4:
  //       case MimeType.QUICKTIME: {
  //         // Analyze Video 
  //         // Custom Tags
  //       }
  //       case MimeType.HEIC: 
  //       case MimeType.JPG:
  //       case MimeType.PNG: {
  //         // Convert to a buffer / taggable image
  //         // Extract and upload metadata
  //         // Extract and upload google vision annotation 
  //         // Extract and upload face recognition
  //         break;
  //       }
  //       default: {
  //         console.log('Unknown File Type', file.mimeType);
  //       }
  //     }
  // }
}


