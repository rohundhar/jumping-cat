import cliProgress from 'cli-progress';
import * as path from 'path';
import cors from "cors";
import express from 'express';
import { Server } from 'typescript-rest';
import { connectToMongoDB } from './Mongo/index.js';
import config from './config/config.js';
import { resetEmbeddings, runEmbeddingsExample, getQueryResults, updateAllEmbeddings } from './Embeddings/main.js';
import { annotateVideoTags, extractAndUploadImageFacialTags, extractAndUploadImageVisionTags, setupMongoDocs } from './main.js';
import { getFaceMatcher } from './FaceTrainingService/main.js';
import { compressAssets } from './FaceTrainingService/compression.js';
import { assignCustomTags } from './TaggingService/customTags.js';
import { correctMediaDates, extractMetadataTagsFromVideo } from './TaggingService/metadataTags.js';
import { getAllMedia } from './Mongo/Helpers/media.js';
import { getFolder } from './GDrive/files.js';
import models from './Mongo/index.js';
import { Media } from './Mongo/Schemas/Media.js';
import { HomeService } from './Services/home.js';
import { clerkMiddleware } from '@clerk/express';
import { FolderService } from './Services/folders.js';


const app = express();

const init = async () => {
  await connectToMongoDB();
  Server.buildServices(app, HomeService, FolderService);
}

const start = async () => {

  app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'content-type', 'time-zone'],
  }))

  // app.use(cors())

  app.use(express.urlencoded({ extended: true }));

  app.use(express.json());

  app.use(clerkMiddleware());

  await init();

  // app.use(ClerkExpressRequire)

  const port = config.PORT;

  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });


  // await getAllMedia();
  // console.log('Done updating media');

  // extractMediaMetadata();
  // setupMongoDocs();
  // extractAndUploadVisionTags();
  // annotateVideoTags();
  // getFaceMatcher();
  // compressAssets('./Assets/FaceTraining', './Assets/FaceTrainingCompressed');
  // extractAndUploadImageFacialTags();
  // extractMetadataTagsFromVideo();
  // getFolder(folderName);
  // await correctMediaDates();
  // assignCustomTags();
  // updateAllEmbeddings();

  // runEmbeddingsExample();
  // updateAllEmbeddings();


}

start();