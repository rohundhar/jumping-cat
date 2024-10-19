import { drive_v3 } from 'googleapis';
import models from '../index.js';
import { Media } from '../Schemas/Media.js';
import { getFolder, getImageContent } from '../../GDrive/files.js';
import pLimit from 'p-limit';
import { MimeType } from '../../GDrive/types.js';

const folderName = 'Safari 2024';

const VideoTypes = [MimeType.QUICKTIME, MimeType.MP4];

const ImageTypes = [MimeType.HEIC, MimeType.JPG, MimeType.PNG];


export const getOrCreateMedia = async (file: drive_v3.Schema$File): Promise<Media | undefined> => {
  try {

    const media = await models.media.findOneAndUpdate(
      {
        gDriveId: file.id
      },
      {
        gDriveFilename: file.name,
        webContentLink: file.webContentLink,
        thumbnailLink: file.thumbnailLink,
        mimeType: file.mimeType
      },
      { 
        upsert: true,
        new: true,
        setDefaultsOnInsert: true 
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
  const allMedia = await models.media.find({});

  const _allMedia = allMedia.filter(media => !!media);
  const allImages = _allMedia.filter(media => ImageTypes.includes(media.mimeType as MimeType));
  const allVideos = _allMedia.filter(media => VideoTypes.includes(media.mimeType as MimeType));

  return {
    allImages,
    allVideos
  }
}

export const getAllMedia = async (): Promise<{
  allImages: Media[];
  allVideos: Media[];
}> => {
  const allFilesInDrive = await getFolder(folderName);

  const limit = pLimit(50);

  const allFiles = allFilesInDrive;

  const allMedia = await Promise.all(allFiles.map(async (file) => {
    return await limit(async () => { // Wrap the processing function with limit
      try {
        if (file.id) {
          const media = getOrCreateMedia(file);
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

export const populateMedia = async (mediaFiles: Media[]) => {

  const limit = pLimit(10);

  const allPopulatedMedia = await Promise.all(mediaFiles.map (async (media) => {
    return await limit(async () => {
      try {
        const content = await getImageContent(media.gDriveId);


      } catch (err) {
        console.warn(`Error while trying to populate media with buffer: ${media.gDriveFilename}`)
      }
    })
  }))


}