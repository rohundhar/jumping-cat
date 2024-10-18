import { drive_v3 } from 'googleapis';
import models from '../index.js';
import { Media } from '../Schemas/Media.js';



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