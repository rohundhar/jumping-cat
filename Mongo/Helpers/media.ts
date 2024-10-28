import { drive_v3 } from 'googleapis';
import mongoose from 'mongoose';
import models from '../index.js';
import { Media, MediaModel } from '../Schemas/Media.js';
import { getFolder, getImageContent, GoogleDriveFile } from '../../GDrive/files.js';
import pLimit from 'p-limit';
import { MimeType } from '../../GDrive/types.js';
import { Query, Document, Model, Cursor } from 'mongoose';
import { MediaResponse } from '../../Services/types.js';


const folderName = 'Safari 2024';

export const VideoTypes = [MimeType.QUICKTIME, MimeType.MP4];

export const ImageTypes = [MimeType.HEIC, MimeType.JPG, MimeType.PNG];


export const getOrCreateMedia = async (gFile: GoogleDriveFile): Promise<Media | undefined> => {

  const { file, parentFolders } = gFile;
  try {

    const media = await models.media.findOneAndUpdate(
      {
        gDriveId: file.id
      },
      {
        gDriveFilename: file.name,
        gDriveFolders: parentFolders,
        webContentLink: file.webContentLink,
        thumbnailLink: file.thumbnailLink,
        mimeType: file.mimeType
      },
      { 
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }, // Options for upsert
    ).exec();

    return media;
  } catch (err) {
    console.warn(`Error while trying to get/create media: ${file.id}:${file.name}`)
    return undefined;
  }
}
export const getAllMediaMongo = async (): Promise<{
  allImages: Media[];
  allVideos: Media[];
}> => {
  const allMedia = await models.media.find({}).exec();

  const _allMedia = allMedia.filter(media => !!media);
  const allImages = _allMedia.filter(media => ImageTypes.includes(media.mimeType as MimeType));
  const allVideos = _allMedia.filter(media => VideoTypes.includes(media.mimeType as MimeType));

  return {
    allImages,
    allVideos
  }
}

export const getMediaIterator = async (): Promise<Optional<{count: number, cursor: Cursor<Media, any>}>> => {

  try {
    const count = await models.media.find({}).countDocuments();
    const query = models.media.find({});
    const cursor = query.cursor({ noCursorTimeout: true });

    return {
      cursor,
      count
    }

  } catch (err) {
      console.warn(`Error while trying to get media cursor`);
      return undefined;
  }
}

export async function* mediaBatchGeneratorWithTimeout(query: Query<any, any, any>, batchSize: number) {
  let lastProcessedId: any = null; 

  while (true) { 
    try {
      const batchQuery = lastProcessedId ? query.where({ _id: { $gt: lastProcessedId } }) : query; 
      const cursor = batchQuery.limit(batchSize).cursor(); // Limit each batch size

      let batch: Media[] = [];
      for await (const media of cursor) {
        batch.push(media);
        lastProcessedId = media._id; // Update the last processed ID
      }

      if (batch.length > 0) {
        yield batch;
      } else {
        break; // No more documents to process
      }
    } catch (error: any) {
      console.error("Error during batch processing. Retrying...", error);
      if (error) { 
        continue; 
      }
      // throw error; // Re-throw other errors
    }
  }
}


export const getAllMedia = async (): Promise<{
  allImages: Media[];
  allVideos: Media[];
}> => {
  const allFilesInDrive = await getFolder(folderName);

  const limit = pLimit(50);

  const allFiles = allFilesInDrive;

  const allMedia = await Promise.all(allFiles.map(async (gDriveFile) => {
    return await limit(async () => { // Wrap the processing function with limit
      const { file } = gDriveFile;
      try {
        if (file.id) {
          const media = getOrCreateMedia(gDriveFile);
          return media;
        } 
      } catch (error) {
          console.error(`Error processing ${file.name}:${file.mimeType}`, error);
      } 
    });
  }));

  const _allMedia = allMedia.filter(media => !!media);
  const allImages = _allMedia.filter(media => ImageTypes.includes(media.mimeType as MimeType));
  const allVideos = _allMedia.filter(media => VideoTypes.includes(media.mimeType as MimeType));

  return {
    allImages,
    allVideos
  }
}

export const getAllMediaResults = async (): Promise<MediaResponse[]> => {
  const pipeline = [
    {
      "$project": {
          "tagEmbeddings": 0,
          "_id": 0, 
      }
    },
    {
      "$project": {
          "gDriveFilename": 1,
          "gDriveId": 1,
          "mimeType": 1,
          "thumbnailLink": 1,
          "webContentLink": 1,
          "fileMetadata": 1,
          "facialRecognitionTags": 1,
          "googleVisionTags": 1,
          "customTags": 1,
          "gDriveFolders": 1,
      }
    },
  ]

  try {
    const results: MediaResponse[] = await models.media.aggregate(pipeline).exec();
    return results;
  } catch (err) {
    console.warn(`Error while getting all media results`, err);
    return [];
  }

}

// export const populateMedia = async (mediaFiles: Media[]) => {

//   const limit = pLimit(10);

//   const allPopulatedMedia = await Promise.all(mediaFiles.map (async (media) => {
//     return await limit(async () => {
//       try {
//         const content = await getImageContent(media.gDriveId);

//       } catch (err) {
//         console.warn(`Error while trying to populate media with buffer: ${media.gDriveFilename}`)
//       }
//     })
//   }))
// }