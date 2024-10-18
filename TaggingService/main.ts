import * as vision from '@google-cloud/vision';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';
import { drive_v3, google } from 'googleapis';
import * as fs from 'fs/promises'; // For file system access
import { getGDriveService } from '../GDrive/auth.js';
import { TaggableImage } from './types.js';

// Set up Google Cloud Vision client
const client = new vision.ImageAnnotatorClient({
    keyFilename: './TaggingService/safari-private-key.json', // Path to your service account key file
});

const videoClient = new VideoIntelligenceServiceClient({
  keyFilename: './TaggingService/safari-private-key.json', // Path to your service account key file
});



async function get_image_content_from_drive(service: drive_v3.Drive, fileId: string): Promise<Buffer> {
    try {
        const res = await service.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
        return Buffer.from(res.data as ArrayBuffer);
    } catch (error: any) {
        console.error(`Error downloading from Drive: ${error.message}`);
        throw error; // Re-throw the error for handling in the calling function
    }
}


export const analyzeVideo = async (gcsUri: string): Promise<string[]> => {

  const features: any[] = ['LABEL_DETECTION'];


  const tagResults: string[] = [];

  const request = {
      inputUri: gcsUri,
      features: features,
  };

  try {
      const [operation] = await videoClient.annotateVideo(request);
      console.log('Waiting for operation to complete...');

      // Poll for operation completion (recommended for longer videos)
      const [operationResult] = await operation.promise();

      console.log('Operation Result', operationResult, operationResult.annotationResults);

      if (operationResult.annotationResults) {
        const annotationResults = operationResult.annotationResults[0];

        // Process the results
        if (annotationResults.segmentLabelAnnotations) {
            for (const annotation of annotationResults.segmentLabelAnnotations) {
                console.log(`Label: ${annotation.entity?.description}`);
                if (annotation.entity?.description) {
                  tagResults.push(annotation.entity?.description);
                }
                if (annotation.segments) {
                    for (const segment of annotation.segments) {
                        const startTime = segment.segment?.startTimeOffset;
                        const endTime = segment.segment?.endTimeOffset;
                        console.log(
                            `  Segment: ${startTime?.seconds}.${startTime?.nanos}s to ${endTime?.seconds}.${endTime?.nanos}s`
                        );
                    }
                }
            }
        } else {
            console.log('No segment label annotations found.');
        }
      }      

  } catch (error) {
      console.error('Error analyzing video:', error);
  }

  return tagResults;
}

async function batchTagImages(imageInfos: { id: string; url: string }[]): Promise<any[]> {
    const results: any[] = [];

    const driveService = await getGDriveService();
    if (!driveService) {
      return results;
    }

    for (const imageInfo of imageInfos) {
        try {
            const content = await get_image_content_from_drive(driveService, imageInfo.id);

            const request = {
                image: { content },
            };

            const [response] = await client.labelDetection(request);
            const labels = response.labelAnnotations?.map((label) => label.description) || [];
            results.push({ imageUrl: imageInfo.url, tags: labels });
        } catch (error: any) {
            console.error(`Error processing ${imageInfo.url}: ${error.message}`);
            results.push({ imageUrl: imageInfo.url, tags: [], error: error.message });
        }
    }

    return results;
}

export const extractVisionTags = async (img: TaggableImage) => {
    const { content, id } = img;
    try {
  
        const request = {
            image: { content },
        };
  
        const [response] = await client.labelDetection(request);
        const labels = response.labelAnnotations?.map((label) => label.description) || [];
        return labels;
    } catch (error: any) {
        console.error(`Error processing ${id}: ${error.message}`);
        return [];
    }
  }