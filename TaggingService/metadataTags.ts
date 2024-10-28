import momentTimezone from 'moment-timezone';
import cliProgress from 'cli-progress';
import { Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import exifr from 'exifr';
import { drive_v3 } from 'googleapis';
import pLimit from 'p-limit';
import { getImageContent } from '../GDrive/files.js';
import { MimeType } from '../GDrive/types.js';
import { ImageMetadata, ValidImageMetadataKeys } from '../Mongo/types.js';
import { extractValidParams } from '../Util/helpers.js';
import { TaggableImage } from './types.js';
import { getAllMediaMongo, ImageTypes, VideoTypes } from '../Mongo/Helpers/media.js';
import { Media } from '../Mongo/Schemas/Media.js';
import models from '../Mongo/index.js';

export const extractAndUploadMetadata = async (files: drive_v3.Schema$File[]) => {

  const limit = pLimit(10);



  const allFiles = files.slice(0,10);

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
          }
        } catch (error) {
            errors.push(`Error processing ${file.name}:`)
            // console.error(`Error processing ${file.name}:${file.mimeType}`, error);
        } finally { // Ensure progress bar updates even on error
          bar.increment();
        }
      });
    }));

    console.log(errors);
    bar.stop();

}

export const extractImageMetadataTags = async (img: TaggableImage): Promise<ImageMetadata> => {
  const { content, id, name } = img;

  try {
    const metadata = await exifr.parse(content);

    const parsedMetadata = extractValidParams({
      params: metadata,
      ValidKeys: ValidImageMetadataKeys
    }) as ImageMetadata;
    
    return parsedMetadata;
  } catch (err) {
    console.warn(`Error while trying to extract metadata from image: ${name} - ${id}`,err);
    return {};
  }
}

const extractVideoMetadataTags = (metadata: any) => {
  const result: ImageMetadata = {};

  if (metadata.format.tags.creation_time) {
    result.DateTimeOriginal = new Date(metadata.format.tags.creation_time);
  }

  if (metadata.format.tags['com.android.manufacturer']) {
    result.Model = metadata.format.tags['com.android.manufacturer'];
  }

  if (metadata.format.tags['com.android.model']) {
    result.Make = metadata.format.tags['com.android.model'];
  }

  return result;
}


export const extractMetadataTagsFromVideo = async () => {
  const {
    allVideos
  } = await getAllMediaMongo();


  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);


  bar.start(allVideos.length, 0);

  const limit = pLimit(5);

  const errors: any[] = [];

  await Promise.all(allVideos.map(async (file) => {
    await limit(async () => { // Wrap the processing function with limit
      try {
        if (!file.fileMetadata) {
          const media = await getImageContent(file.gDriveId)
          const metadata = await getVideoMetadataFromArrayBuffer(media);
          const formattedMetadata = extractVideoMetadataTags(metadata);
          file.fileMetadata = formattedMetadata;
          await file.save();
        }
      } catch (error) {
          errors.push(`Error processing ${file.gDriveFilename}:`)
          // console.error(`Error processing ${file.name}:${file.mimeType}`, error);
      } finally { // Ensure progress bar updates even on error
        bar.increment();
      }
    });
  }));


  bar.stop();
}

async function getVideoMetadataFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<any | null> {
  return new Promise((resolve, reject) => {
      try {
          ffmpeg(Readable.from([Buffer.from(arrayBuffer)])) // Use Readable stream
              .ffprobe((err: any, metadata: any) => {
                  if (err) {
                      console.error('Error getting metadata:', err);
                      // Fallback to temp file if needed
                      return;
                  }
                  resolve(metadata as any); // Type assertion might be needed
              });
      } catch (error) {
          console.error('Unexpected error:', error);
          reject(error); // Or handle gracefully
      }
  });
}


const RohunGoogle = 'Rohun Google Phone';
const RohunPhone = 'Rohun iPhone';
const LUMIX = 'Mom LUMIX SD';
const RohunRed = 'Rohun Digital SD RED';
const RohunBlk = 'Rohun Digital SD BLK';
const MomPhone = 'Mom iPhone';
const DidiPhone = 'Didi';
const RishiPhone = 'Rishi iPhone';


const getHourChanges = (media: Media): number | undefined => {
  const { gDriveFolders, mimeType } = media;

  if (mimeType) {
    if (gDriveFolders.includes(RohunGoogle)) {
      return VideoTypes.includes(mimeType) ? undefined : -10;
    } else if (gDriveFolders.includes(RohunPhone)) {
      return VideoTypes.includes(mimeType) ? undefined : -10;
    } else if (gDriveFolders.includes(LUMIX)) {
      return VideoTypes.includes(mimeType) ? 4 : -3;
    } else if (gDriveFolders.includes(RohunRed)) {
      return -15;
    } else if (gDriveFolders.includes(RohunBlk)) {
      return VideoTypes.includes(mimeType) ? 24 : 9;
    } else if (gDriveFolders.includes(MomPhone)) {
      return ImageTypes.includes(mimeType) ? -10 : undefined;
    } else if (gDriveFolders.includes(DidiPhone)) {
      return ImageTypes.includes(mimeType) ? -10 : undefined;
    } else if (gDriveFolders.includes(RishiPhone)) {
      return ImageTypes.includes(mimeType) ? -10 : undefined;
    }
  }

  return undefined;
}

const advanceMetadataDate = async (media: Media, advanceHours: number): Promise<void> => {

  if (media.fileMetadata?.DateTimeOriginal) {
    const createdDate = momentTimezone(media.fileMetadata.DateTimeOriginal);
    const updatedDate = createdDate.add(advanceHours, "hours").utc().toDate();

    if (!media.fileMetadata.IsTimelineVerified) {
      const result = await models.media.updateOne({
        gDriveId: media.gDriveId
      }, {
        $set: {
          'fileMetadata.DateTimeOriginal': updatedDate,
          'fileMetadata.CreateDate': updatedDate,
          'fileMetadata.IsTimelineVerified': true
        }
      })
    }
  }
}

export const correctMediaDates = async () => {

  const {
    allImages,
    allVideos
  } = await getAllMediaMongo();

  const allMedia = [...allImages, ...allVideos];

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.rect);

  bar.start(allMedia.length, 0);

  const limit = pLimit(10);

  await Promise.all(allMedia.map(async (media) => {
    await limit(async () => { // Wrap the processing function with limit
      try {
        const hourChanges = getHourChanges(media);
        if (hourChanges) {
          await advanceMetadataDate(media, hourChanges);
        }
      } catch (error) {
          console.error(`Error processing ${media.gDriveFilename}:${media.mimeType}`, error);
      } finally { 
        bar.increment();
      }
    });
  }));


  bar.stop();




}