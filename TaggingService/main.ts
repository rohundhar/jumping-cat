import * as vision from '@google-cloud/vision';
import { drive_v3, google } from 'googleapis';
import * as fs from 'fs/promises'; // For file system access
import getGDriveService from '../auth';

// Set up Google Cloud Vision client
const client = new vision.ImageAnnotatorClient({
    keyFilename: './TaggingService/safari-private-key.json', // Path to your service account key file
});

// Set up Google Drive API client
const auth = new google.auth.GoogleAuth({
    keyFilename: './TaggingService/safari-private-key.json', // Same service account key file
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
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
}