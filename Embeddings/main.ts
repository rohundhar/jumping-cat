import * as tf from '@tensorflow/tfjs-node'; // If using TensorFlow.js
import cliProgress from 'cli-progress';
import { pipeline } from '@xenova/transformers';
import { getAllMediaMongo, getMediaIterator, mediaBatchGeneratorWithTimeout } from '../Mongo/Helpers/media.js';
import pLimit from 'p-limit';
import { allKeyed } from '../Util/helpers.js';
import { Media, TagEmbeddings } from '../Mongo/Schemas/Media.js';
import models from '../Mongo/index.js';


const simplifyTags = (tags: string[]): string[] => {
  const simplifiedTags: string[] = [];

  for (const tag of tags) {
    const words = tag.split(/\s+/); // Split the tag into individual words
    simplifiedTags.push(...words);   // Add the words to the simplifiedTags array
  }

  return [...new Set(simplifiedTags)];
}

const combineEmbeddings = (embeddings: number[][]): number[] => {
  const tensorEmbeddings = tf.tensor(embeddings);
  const meanEmbedding = tf.mean(tensorEmbeddings, 0).arraySync() as number[]; // Calculate the mean
  return meanEmbedding;
}


const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
    const extractor = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2'); // Use the appropriate model name
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    return output.tolist();
}

const generateQueryVector = async (query: string): Promise<number[]> => {
  const splitQuery = query.split(" ");
  const embeddings = await generateEmbeddings(splitQuery);
  const combined = combineEmbeddings(embeddings);
  return combined;
}

export const runEmbeddingsExample = async () => {
  const tags = ['elephant', 'maasai mara', 'cheetah', 'lion', 'landscape'];
  const embeddings = await generateEmbeddings(tags);
  const combined = combineEmbeddings(embeddings);
  console.log(combined, combined.length);
}


const generateTagEmbeddings = async (media: Media): Promise<TagEmbeddings | undefined> => {

  try {
    const tags = media.tags;

    const { phrasesEmbeddings, individualEmbeddings } = await allKeyed({
      phrasesEmbeddings: generateEmbeddings(tags),
      individualEmbeddings: generateEmbeddings(simplifyTags(tags))
    })

    const tagEmbeddings = {
      individual: combineEmbeddings(individualEmbeddings),
      phrases: combineEmbeddings(phrasesEmbeddings)
    };

    return tagEmbeddings;

  } catch (err) {
    console.warn(`Error while generating embeddings for ${media.gDriveFilename}`);
    return undefined;
  }

}


export const updateAllEmbeddings = async () => {

    const count = await models.media.find({}).countDocuments();
    const query = models.media.find({});

    const limit = pLimit(2);  
    const batchSize = 20;


    console.log(`Generating embeddings for ${count} pieces of media`);
  
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  
    bar.start(count, 0);

    const batches = mediaBatchGeneratorWithTimeout(query, batchSize);
    for await (const mediaBatch of batches) {
      const batchPromises = mediaBatch.map((media) => limit(async () => {
        try {
          if (media.tagEmbeddings.phrases.length === 0) {
            const tagEmbeddings = await generateTagEmbeddings(media);
            if (tagEmbeddings) {
              await models.media.updateOne({ gDriveId: media.gDriveId }, {
                $set: { tagEmbeddings }
              });
            }
          }
        } catch (err: any) {
          console.error(`Error processing ${media.gDriveFilename}:${media.mimeType}`, err);
          console.warn('Root Cause', err.cause);
        } finally {
          bar.increment();
        }
      }));

      await Promise.all(batchPromises); 
    }

    bar.stop();
    console.log('Finished generating embeddings');
  // }
}

export const resetEmbeddings = async () => {

  try {
    await models.media.updateMany({}, {
      $set: {
        "tagEmbeddings.individual": [],
        "tagEmbeddings.phrases": []
      }
    }
    )
  } catch (err) {
    console.warn(`Error while resetting embeddings`);
  }
}

export const getQueryResults = async (query: string) => {

  try {
    const queryVector = await generateQueryVector(query);
  
    const pipeline = [
      {
        "$vectorSearch": {
          "index": "TagEmbeddingsIndividual",
          "path": "tagEmbeddings.individual",
          "queryVector": queryVector,
          "numCandidates": 1000,
          "limit": 50
        }
      },
      {
        "$addFields": {
            "score": { "$meta": "vectorSearchScore" }
        }
      },
      {
        "$project": {
            "tagEmbeddings": 0,
            // "_id": 0, 

            // "mimeType": 0,
            // "thumbnailLink": 0,
            // "webContentLink": 0,
            // "fileMetadata": 0,
            // "facialRecognitionTags": 0,
            // "googleVisionTags": 0,
            // "customTags": 0,
            // "gDriveFilename": 0,
            // "gDriveFolders": 0,
        }
      },
      {
        "$project": {
            "gDriveId": 1,
            "score": 1,
            "_id": 1, 

            "gDriveFilename": 1,
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
  
    const results = await models.media.aggregate(pipeline).exec();

    results.sort((a,b) => b.score = a.score);
  
    return results;
  } catch (err) {
    console.warn(`Failure while trying to perform vector query`, err);
    return [];
  }
}