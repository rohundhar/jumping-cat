import { Context, GET, HeaderParam, Path, QueryParam, ServiceContext } from 'typescript-rest';
import { MediaResponse, ServerResponse } from './types.js';
import { getQueryResults } from '../Embeddings/main.js';
import { getAllMediaResults } from '../Mongo/Helpers/media.js';
import { ClerkContext } from '../Auth/types.js';


@Path('/api/home') // Define the base path for this service
export class HomeService {
  @Context
  context!: ClerkContext;

  @GET
  async home(): Promise<any> {
    return "Home Page";
  }

  @GET
  @Path("query")
  async homeQuery(
    @QueryParam("query") query: string,
  ): ServerResponse<{results: MediaResponse[]}> {

    try {
      const results = await getQueryResults(query);
      return {
        success: true,
        data: {
          results
        }
      }
    } catch (err) {
      console.warn(`Error while trying to get results for query: ${query}`)
      return {
        success: false,
        data: {
          results: []
        }
      }
    }
  }

  @GET
  @Path("all")
  async allMedia(
    @HeaderParam("Authorization") authHeader: string,
  ): ServerResponse<{results: MediaResponse[]}> {
    console.log('AUTH?', this.context.request.auth);
    try {
      const results = await getAllMediaResults();
      return {
        success: true,
        data: {
          results,
        }
      };
    } catch (err) {
      console.warn(`Error while trying to get all media results`, err);
      return {
        success: false,
        data: {
          results: [],
        }
      }
    }
  }
}