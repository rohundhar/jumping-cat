import { Context, GET, HeaderParam, Path, POST, QueryParam, ServiceContext } from 'typescript-rest';
import { ServerResponse } from './types.js';
import { ClerkContext } from '../Auth/types.js';
import { UserFolder } from './../Mongo/Schemas/UserFolder.js';
import { addMediaToFolder, createNewFolder, deleteFolder, getAllUserFolders } from '../Mongo/Helpers/folders.js';


@Path('/api/folders') 
export class FolderService {
  @Context
  context!: ClerkContext;

  @GET
  async getUserFolders(): ServerResponse<{results: UserFolder[]}> {
    try {

      console.log('get all user folders');

      const { request: { auth }}= this.context;
      const { userId } = auth;

      if (userId) {

        const folders = await getAllUserFolders(userId);
        
        return {
          success: true,
          data: {
            results: folders
          }
        }
      } else {
        return {
          success: false,
          error: 'Unauthorized',
          data: {
            results: []
          }
        }
      }
    } catch (err) {
      console.warn(`Error while trying to get user folders`, err);
      return {
        success: false,
        data: {
          results: []
        }
      }
    }
  }

  @POST
  @Path('add-media')
  async addMediaToFolder(response: { mediaIds: string[], folderId: string } ): ServerResponse<any> {
    try {
      const { mediaIds: newMediaIds, folderId } = response;
      console.log('add media to user folders', newMediaIds, folderId);
      const mediaAdded = await addMediaToFolder({ newMediaIds, folderId });
      return {
        success: mediaAdded,
      }
    } catch (err) {
      console.warn(`error while trying to add media to files to folder`);
      return {
        success: false
      }
    }
  }

  @POST
  @Path("create")
  async createFolder(response: {name: string, color: string}): ServerResponse<any> {
    try {

      const { request: { auth }} = this.context;
      const { userId } = auth;
      const { name, color } = response;

      console.log('create new folder', name, color);
      if (userId) {
        const newFolderCreated = await createNewFolder({
          name,
          color,
          userId
        })
        if (newFolderCreated) {
          return {
            success: true,
          }
        } 
      }

    } catch (err) {
      console.warn(`Error while trying to create new folder`, err)
      return {
        success: false,
      }
    }

    return {
      success: false,
      error: 'Unauthorized'
    }
  }

  @POST
  @Path("delete")
  async deleteFolder(response: { folderId: string } ): ServerResponse<any> {

    try {
      const { request: { auth }} = this.context;
      const { userId } = auth;

      const { folderId } = response;

      if (userId) {
        const folderDeletion = await deleteFolder(folderId);
        if (folderDeletion) {
          return {
            success: true
          }
        }
      }
    } catch (err) {
      console.warn(`Error while trying to delete a folder`, err);
      return {
        success: false,
      }
    }

    return {
      success: false
    }

  }
}