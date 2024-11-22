import { Context, GET, HeaderParam, Path, QueryParam, ServiceContext } from 'typescript-rest';
import { MediaResponse, ServerResponse } from './types.js';
import { getIndividualQueryResults, getPhrasesQueryResults, VectorResult } from '../Embeddings/main.js';
import { getAllMediaResults } from '../Mongo/Helpers/media.js';
import { ClerkContext } from '../Auth/types.js';
import { allKeyed } from '../Util/helpers.js';
import { Media } from '../Mongo/Schemas/Media.js';


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
  ): ServerResponse<{results: string[]}> {

    try {
      const { individualResults, phrasesResults } = await allKeyed({
        individualResults: getIndividualQueryResults(query),
        phrasesResults: getPhrasesQueryResults(query)
      })

      console.log(`Individual Results: ${individualResults.length}`);
      console.log(`Phrases Results: ${phrasesResults.length}`);


      const combinedResults = [...individualResults, ...phrasesResults];

      const uniqueResults = new Map<string, VectorResult>();

      combinedResults.forEach((obj) => {
        const id = obj._id.toString();
        const existing = uniqueResults.get(id);
        if (!existing || obj.score > existing.score) {
          uniqueResults.set(id, obj);
        } 
      })

      const sorted = Array.from(uniqueResults.values()).sort((a, b) => b.score - a.score);
      const ids = sorted.map((obj) => obj._id);

      console.log(`Discovered ${ids.length} total matches`);
      return {
        success: true,
        data: {
          results: ids
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