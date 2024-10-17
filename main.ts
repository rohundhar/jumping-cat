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

const folderName = 'Safari 2024';

const imagetypes = [MimeType.JPG];

export const extractMediaMetadata = async () => {
  const allFilesInDrive = await getFolder(folderName);

  const limit = pLimit(10);

  const allFiles = allFilesInDrive.filter(file => imagetypes.includes(file.mimeType as MimeType));

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

const main = async () => {
  const allFilesInDrive = await getFolder(folderName);





  const videos: drive_v3.Schema$File[] = []

  for (const file of allFilesInDrive) {
       switch (file.mimeType as MimeType) {
        case MimeType.MP4:
        case MimeType.QUICKTIME: {
          if (file.id) {
            videos.push(file);
          }
          break;
        }
        case MimeType.HEIC: {
          // console.log('convert to jpg stream?')
          break;
        }
        case MimeType.JPG:
        case MimeType.PNG: {
          // console.log('handle image normally');
          break;
        }
        default: {
          console.log('Unknown File Type', file.mimeType);
        }
      }
  }

  await getOrUploadManyVideos(videos);
}


const recognize = async () => {
  const url = `Assets/Testing/GroupPhoto2.jpg`;

  const faceMatcher = await getFaceMatcher();

  try {
    const img = await canvas.loadImage(url);
    const queryDetections = await faceapi.detectAllFaces(img as any).withFaceLandmarks().withFaceDescriptors();
  
    for (const detection of queryDetections) {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor!);
        console.log(`Best match: ${bestMatch.label} (confidence: ${bestMatch.distance})`);
    }
  } catch (err) {
    console.log('Error while trying to detect Image', url, err);
  }
}

