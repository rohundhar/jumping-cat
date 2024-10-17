import * as fs from 'fs';
import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import { getFaceMatcher } from './FaceTrainingService/main';
import { getFolder, getOrUploadManyVideos, getOrUploadVideo } from './GDrive/files';
import { MimeType } from './GDrive/types';
import { analyzeVideo } from './TaggingService/main';
import { drive_v3 } from 'googleapis';

const main = async () => {
  const folderName = 'Safari 2024';
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

main();

