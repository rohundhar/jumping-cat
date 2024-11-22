import { string } from "@tensorflow/tfjs-node";
import models from "../index.js";
import { UserFolder } from "../Schemas/UserFolder.js";


export const getAllUserFolders = async (userId: string | null): Promise<UserFolder[]> => {
  try {
    const userFolders = await models.userFolder.find({ userId }).exec();
    return userFolders;
  } catch (err) {
    console.warn(`Error while trying to get user folders`, err)
    return [];
  }
}

export const createNewFolder = async ({name, color, userId}: {name: string, color: string, userId: string}): Promise<boolean> => {

  try {
    const folder = new models.userFolder({
      name,
      color,
      userId,
      files: []
    });

    await folder.save();
    return true;
  } 
  catch (err) {
    console.warn(`Error while trying to create new folder`, err);
    return false;
  }
}

export const deleteFolder = async (folderId: string): Promise<boolean> => {
  try {
    await models.userFolder.deleteOne({_id: folderId}).exec();
    return true;
  } catch (err) {
    console.warn(`Error while trying to delete folder`, err);
    return false;
  }
}

export const addMediaToFolder = async ({folderId, newMediaIds}: { folderId: string, newMediaIds: string[]}): Promise<boolean> => {

  try {
    const userFolder = await models.userFolder.findOne({ _id: folderId}).exec();

    if (userFolder) {
      const files = new Set(userFolder.files.map(String));

      const combinedFiles = [...new Set([...files,...newMediaIds])];

      console.log('combined files', combinedFiles);
      await models.userFolder.findOneAndUpdate({_id: folderId}, {
        $set: {
          files: combinedFiles
        }
      }).exec();

      return true;
    }
  } catch (err) {
    console.warn(`Error while trying to add media files to a folder`, err);
    return false;
  }

  return false;
}