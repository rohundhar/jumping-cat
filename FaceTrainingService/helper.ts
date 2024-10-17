import * as fs from 'fs/promises'; // Use fs.promises for async file operations
import * as path from 'path';

async function prepareTrainingData(assetsDir: string): Promise<{ [label: string]: string[] }> {
    const trainingData: { [label: string]: string[] } = {};

    try {
        const faceTrainingDir = path.join(assetsDir, 'FaceTraining');
        const personDirs = await fs.readdir(faceTrainingDir);

        for (const personDir of personDirs) {
            const personPath = path.join(faceTrainingDir, personDir);
            const stat = await fs.stat(personPath); // Check if it's a directory

            if (stat.isDirectory()) {
                const imageFiles = await fs.readdir(personPath);
                const imagePaths = imageFiles.map(imageFile => path.join(personPath, imageFile));
                trainingData[personDir] = imagePaths;
            }
        }

        return trainingData;

    } catch (error) {
        console.error("Error preparing training data:", error);
        return {}; // Return an empty object in case of errors
    }
}


export async function getTrainingData() {
    const assetsDirectory = './Assets'; // Replace with your actual assets directory
    const imagePathsByLabel = await prepareTrainingData(assetsDirectory);

    if (Object.keys(imagePathsByLabel).length === 0) {
        console.error("No training data found. Exiting.");
        return {};
    }
    // console.log('Prepared training data:', imagePathsByLabel); // You can now use this data in your face training module

    return imagePathsByLabel;

}
