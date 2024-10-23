import * as path from 'path';
import express from 'express';
import { connectToMongoDB } from './Mongo/index.js';
import config from './config/config.js';
import { runExample } from './Embeddings/main.js';
import { annotateVideoTags, extractAndUploadImageFacialTags, extractAndUploadImageVisionTags, setupMongoDocs } from './main.js';
import { getFaceMatcher } from './FaceTrainingService/main.js';
import { compressAssets } from './FaceTrainingService/compression.js';


const app = express();

const init = async () => {

  await connectToMongoDB();

  app.get('/auth', (req: any, res: any) => {
    const code = req.query.code;
    // Handle the authorization code here
    res.send('Authorization code received!');
  });
  
}

const start = async () => {
  await init();


  const port = config.PORT;
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });

  // extractMediaMetadata();
  // setupMongoDocs();
  // extractAndUploadVisionTags();
  // annotateVideoTags();
  // getFaceMatcher();
  // compressAssets('./Assets/FaceTraining', './Assets/FaceTrainingCompressed');
  // extractAndUploadImageFacialTags();
}

start();