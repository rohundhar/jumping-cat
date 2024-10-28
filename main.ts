import cliProgress from 'cli-progress';
import canvas from 'canvas';
import convert from 'heic-convert';
import { getFaceMatcher } from './FaceTrainingService/main.js';
import { getFolder, getImageContent, getOrUploadVideo } from './GDrive/files.js';
import { MimeType } from './GDrive/types.js';
import pLimit from 'p-limit';
import { getAllMedia, getAllMediaMongo, getOrCreateMedia } from './Mongo/Helpers/media.js';
import { extractImageMetadataTags } from './TaggingService/metadataTags.js';
import { analyzeVideo, extractVisionTags } from './TaggingService/main.js';
import { extractFacialRecognitionTags } from './FaceTrainingService/helper.js';

const folderName = 'Safari 2024';

export const extractAndUploadImageVisionTags = async () => {

  const {
    allImages
  } = await getAllMediaMongo();


  console.log(`Found ${allImages.length} pieces of media`);

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.rect);

  bar.start(allImages.length, 0);

  const limit = pLimit(10);

  await Promise.all(allImages.map(async (media) => {
      await limit(async () => { // Wrap the processing function with limit
        try {
          if (media.googleVisionTags.length === 0 ) {
            let content = await getImageContent(media.gDriveId);
            if (media.mimeType === MimeType.HEIC) {
              content = Buffer.from(await convert({
                buffer: content,
                format: 'JPEG',
                quality: 1
              }));
            }
            const tags = await extractVisionTags({
              id: media.gDriveId,
              name: media.gDriveFilename,
              content
            });
            media.googleVisionTags = tags;
            await media.save();
          }
        } catch (error) {
            console.error(`Error processing ${media.gDriveFilename}:${media.mimeType}`, error);
        } finally { // Ensure progress bar updates even on error
          bar.increment();
        }
      });
    }));

    bar.stop();

}

export const extractAndUploadImageFacialTags = async () => {

  const {
    allImages
  } = await getAllMediaMongo();


  console.log(`Found ${allImages.length} pieces of media`);


  const matcher = await getFaceMatcher();

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.rect);

  bar.start(allImages.length, 0);

  const limit = pLimit(10);

  await Promise.all(allImages.map(async (media) => {
      await limit(async () => { // Wrap the processing function with limit
        try {
          let content = await getImageContent(media.gDriveId);
          if (media.mimeType === MimeType.HEIC) {
            content = Buffer.from(await convert({
              buffer: content,
              format: 'JPEG',
              quality: 1
            }));
          }
          const tags = await extractFacialRecognitionTags(matcher, {
            id: media.gDriveId,
            name: media.gDriveFilename,
            content
          });
          media.facialRecognitionTags = tags;
          await media.save();
        } catch (error) {
            console.error(`Error processing ${media.gDriveFilename}:${media.mimeType}`, error);
        } finally { // Ensure progress bar updates even on error
          bar.increment();
        }
      });
    }));

    bar.stop();

}




const REQUESTS_PER_MINUTE = 2;
const MILLISECONDS_PER_MINUTE = 60000;
const CONCURRENCY_LIMIT = 2;

export const annotateVideoTags = async () => {

  const {
    allVideos
  } = await getAllMediaMongo();


  console.log(`Found ${allVideos.length} pieces of media`);

  const multibar = new cliProgress.MultiBar({
    clearOnComplete: true,
    hideCursor: true,
    format: ' {bar} | {eta_formatted} | elapsed: {timepass} s | {percentage}% | {value}/{total}',
}, cliProgress.Presets.shades_grey);


  const bar = multibar.create(allVideos.length, 0);

  bar.start(allVideos.length, 0);

  const limit = pLimit(CONCURRENCY_LIMIT);


  const startTime = Date.now();
  let requestCount = 0;

  await Promise.all(allVideos.map(async (media) => {
      await limit(async () => { // Wrap the processing function with limit
        try {
          const key = await getOrUploadVideo(media, multibar);
          if (key) {
            const elapsedTime = Date.now() - startTime;
            const expectedRequestCount = (elapsedTime / MILLISECONDS_PER_MINUTE) * REQUESTS_PER_MINUTE;

            if (requestCount > expectedRequestCount) {
              const delay = (requestCount - expectedRequestCount) * (MILLISECONDS_PER_MINUTE / REQUESTS_PER_MINUTE);
              await new Promise(resolve => setTimeout(resolve, delay));
            }

            requestCount++;
            const tags = await analyzeVideo(key);
            media.googleVisionTags = tags;
            await media.save();
          }
        } catch (error: any) {
          if (error?.reason === 'RATE_LIMIT_EXCEEDED') {
            console.log('RATE LIMIT EXCEEDED. waiting before trying again');
            await new Promise(resolve => setTimeout(resolve, MILLISECONDS_PER_MINUTE));
          } else {
            console.error(`Error processing ${media.gDriveFilename}:${media.mimeType}`, error);
          }
        } finally { // Ensure progress bar updates even on error
          bar.update({ timepass: ((Date.now() - startTime) / 1000).toFixed(0)});
          bar.increment();
        }
      });
    }));

    bar.stop();
    multibar.stop()

}

export const setupMongoDocs = async () => {
  const allFilesInDrive = await getFolder(folderName);

  const limit = pLimit(10);

  const allFiles = allFilesInDrive;

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);


  bar.start(allFiles.length, 0);

  await Promise.all(allFiles.map(async (gDriveFile) => {
    await limit(async () => { // Wrap the processing function with limit
      const { file } = gDriveFile;
      try {
        if (file.id) {
          const media = getOrCreateMedia(gDriveFile);
        } 
      } catch (error) {
          console.error(`Error processing ${file.name}:${file.mimeType}`, error);
      } finally { // Ensure progress bar updates even on error
        bar.increment();
      }
    });
  }));
  
  bar.stop();
}