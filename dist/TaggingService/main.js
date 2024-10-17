"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagImageBuffer = exports.analyzeVideo = void 0;
const vision = __importStar(require("@google-cloud/vision"));
const video_intelligence_1 = require("@google-cloud/video-intelligence");
const auth_1 = require("../GDrive/auth");
// Set up Google Cloud Vision client
const client = new vision.ImageAnnotatorClient({
    keyFilename: './TaggingService/safari-private-key.json', // Path to your service account key file
});
const videoClient = new video_intelligence_1.VideoIntelligenceServiceClient({
    keyFilename: './TaggingService/safari-private-key.json', // Path to your service account key file
});
async function get_image_content_from_drive(service, fileId) {
    try {
        const res = await service.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
        return Buffer.from(res.data);
    }
    catch (error) {
        console.error(`Error downloading from Drive: ${error.message}`);
        throw error; // Re-throw the error for handling in the calling function
    }
}
const analyzeVideo = async (gcsUri) => {
    const features = ['LABEL_DETECTION'];
    const tagResults = [];
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
                            console.log(`  Segment: ${startTime?.seconds}.${startTime?.nanos}s to ${endTime?.seconds}.${endTime?.nanos}s`);
                        }
                    }
                }
            }
            else {
                console.log('No segment label annotations found.');
            }
        }
    }
    catch (error) {
        console.error('Error analyzing video:', error);
    }
    return tagResults;
};
exports.analyzeVideo = analyzeVideo;
const tagImageBuffer = async (img) => {
    const results = [];
    const { content, id } = img;
    try {
        const request = {
            image: { content },
        };
        const [response] = await client.labelDetection(request);
        const labels = response.labelAnnotations?.map((label) => label.description) || [];
        results.push({ tags: labels });
    }
    catch (error) {
        console.error(`Error processing ${id}: ${error.message}`);
        results.push({ tags: [] });
    }
    return results;
};
exports.tagImageBuffer = tagImageBuffer;
async function batchTagImages(imageInfos) {
    const results = [];
    const driveService = await (0, auth_1.getGDriveService)();
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
        }
        catch (error) {
            console.error(`Error processing ${imageInfo.url}: ${error.message}`);
            results.push({ imageUrl: imageInfo.url, tags: [], error: error.message });
        }
    }
    return results;
}
// Example usage
const imageInfos = [
    { id: '1ofduUI0JYY7VzfmfJ_0EsfGvB5dQQGzO', url: 'https://drive.google.com/uc?id=1ofduUI0JYY7VzfmfJ_0EsfGvB5dQQGzO&export=download' },
    { id: '1BMNd-RDmdmH6HcUq3ZO4MJVcy9Ab6BAw', url: 'https://drive.google.com/uc?id=1BMNd-RDmdmH6HcUq3ZO4MJVcy9Ab6BAw&export=download' },
];
const main = () => {
    batchTagImages(imageInfos)
        .then((taggedImages) => {
        for (const imageData of taggedImages) {
            console.log(`Image: ${imageData.imageUrl}, Tags: ${imageData.tags}`);
        }
    })
        .catch((error) => {
        console.error('Overall error:', error);
    });
};
