import cliProgress from 'cli-progress';
import * as fs from 'fs';
import * as faceapi from 'face-api.js';
import exifr from 'exifr';
import canvas from 'canvas';
import { drive_v3 } from 'googleapis';
import pLimit from 'p-limit';
import { getFolder, getImageContent } from '../GDrive/files.js';
import { MimeType } from '../GDrive/types.js';
import { ImageMetadata } from '../Mongo/types.js';
import { createValidKeys, extractValidParams } from '../Util/helpers.js';
import { TaggableImage } from './types.js';

const folderName = 'Safari 2024';


const imageTypes = [MimeType.HEIC, MimeType.JPG, MimeType.PNG];

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
    const keys = createValidKeys<ImageMetadata>();

    const parsedMetadata = extractValidParams({
      params: metadata,
      ValidKeys: keys
    }) as ImageMetadata;
    
    return parsedMetadata;
  } catch (err) {
    console.warn(`Error while trying to extract metadata from image: ${name} - ${id}`);
    return {};
  }
}