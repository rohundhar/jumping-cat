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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vision = __importStar(require("@google-cloud/vision"));
const googleapis_1 = require("googleapis");
const auth_1 = __importDefault(require("../auth"));
// Set up Google Cloud Vision client
const client = new vision.ImageAnnotatorClient({
    keyFilename: './TaggingService/safari-private-key.json', // Path to your service account key file
});
// Set up Google Drive API client
const auth = new googleapis_1.google.auth.GoogleAuth({
    keyFilename: './TaggingService/safari-private-key.json', // Same service account key file
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
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
async function batchTagImages(imageInfos) {
    const results = [];
    const driveService = await (0, auth_1.default)();
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
batchTagImages(imageInfos)
    .then((taggedImages) => {
    for (const imageData of taggedImages) {
        console.log(`Image: ${imageData.imageUrl}, Tags: ${imageData.tags}`);
    }
})
    .catch((error) => {
    console.error('Overall error:', error);
});
