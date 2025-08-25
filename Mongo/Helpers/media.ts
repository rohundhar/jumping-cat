import cliProgress from 'cli-progress';
import { drive_v3 } from 'googleapis';
import mongoose from 'mongoose';
import models, { connectToMongoDB, disconnectFromMongoDB } from '../index.js';
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
    console.warn(`Error while trying to get/create media: ${file.id}:${file.name}`, err);
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
      }
    },
    {
      "$project": {
          "_id": 1, 
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

  console.log('Media Setup Complete');
}

export const setupMongoDocsWithBulkWrite = async () => {
  console.log('Connecting to MongoDB...');
  await connectToMongoDB();
  
  console.log('Fetching all files from Google Drive...');
  const allFilesInDrive = await getFolder(folderName);

  if (!allFilesInDrive || allFilesInDrive.length === 0) {
    console.log('No files found in Google Drive folder.');
    await disconnectFromMongoDB();
    return;
  }

  console.log(`Found ${allFilesInDrive.length} files. Preparing bulk operation...`);


    // const media = await models.media.findOneAndUpdate(
    //   {
    //     gDriveId: file.id
    //   },
    //   {
    //     gDriveFilename: file.name,
    //     gDriveFolders: parentFolders,
    //     webContentLink: file.webContentLink,
    //     thumbnailLink: file.thumbnailLink,
    //     mimeType: file.mimeType
    //   },
    //   { 
    //     upsert: true,
    //     new: true,
    //     setDefaultsOnInsert: true,
    //   }, // Options for upsert
    // ).exec();

  // Prepare the operations for bulkWrite
  const bulkOps = allFilesInDrive.map(({file, parentFolders}) => ({
    updateOne: {
      filter: { gDriveId: file.id },
      update: {
        $set: {
          gDriveFilename: file.name,
          gDriveFolders: parentFolders,
          webContentLink: file.webContentLink,
          thumbnailLink: file.thumbnailLink,
          mimeType: file.mimeType
        }
      },
      upsert: true
    }
  }));

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(bulkOps.length, 0);

  // Batch the operations to avoid sending a single massive request
  const batchSize = 500;
  for (let i = 0; i < bulkOps.length; i += batchSize) {
    const batch = bulkOps.slice(i, i + batchSize);
    try {
      await models.media.bulkWrite(batch);
      bar.update(i + batch.length);
    } catch (error) {
      console.error(`\nError processing batch starting at index ${i}:`, error);
    }
  }

  bar.stop();

  console.log('Mongo Docs setup complete.');
  await disconnectFromMongoDB();
  console.log('Disconnected from MongoDB.');
};

setupMongoDocsWithBulkWrite();