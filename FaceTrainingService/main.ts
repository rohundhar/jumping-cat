import * as faceapi from 'face-api.js';
import * as fs from 'fs';
import { getTrainingData } from './helper';

// Path to save/load the model
const modelSavePath = './models/faceMatcher';

// Load face-api.js models (replace with your paths)
async function loadModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
}


// Generate labeled face descriptors
async function generateLabeledFaceDescriptors(imagePathsByLabel: { [label: string]: string[] }): Promise<{ label: string; descriptors: Float32Array[] }[]> {
    const labeledFaceDescriptors: { label: string; descriptors: Float32Array[] }[] = [];

    for (const label in imagePathsByLabel) {
        const descriptorsForLabel: Float32Array[] = [];
        for (const imagePath of imagePathsByLabel[label]) {
            try {
                const img = await faceapi.fetchImage(imagePath);
                const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();

                if (detections.length) {
                    descriptorsForLabel.push(...detections.map(d => d.descriptor!));
                } else {
                    console.warn(`No face detected in ${imagePath} for label ${label}`);
                }

            } catch (error) {
                console.error(`Error processing ${imagePath}:`, error);
            }
        }
        labeledFaceDescriptors.push({ label, descriptors: descriptorsForLabel });
    }

    return labeledFaceDescriptors;
}

// Train the face matcher
async function trainModel(labeledFaceDescriptors: { label: string; descriptors: Float32Array[] }[]): Promise<faceapi.FaceMatcher> {
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
    return faceMatcher;
}


// Save the trained model
async function saveModel(faceMatcher: faceapi.FaceMatcher) {
    try {
        await fs.promises.mkdir(modelSavePath, { recursive: true });
        await fs.promises.writeFile(modelSavePath + "/faceMatcher.json", JSON.stringify(faceMatcher), 'utf8');
        console.log("Model saved successfully.");
    } catch (error) {
        console.error("Error saving model:", error);
    }
}

// Load a saved model
async function loadSavedModel(): Promise<faceapi.FaceMatcher | undefined> {
    try {
        if (!fs.existsSync(modelSavePath + "/faceMatcher.json")) {
            return undefined;
        }
        const savedDescriptors = JSON.parse(await fs.promises.readFile(modelSavePath + "/faceMatcher.json", 'utf8'));
        return new faceapi.FaceMatcher(savedDescriptors);
    } catch (error) {
        console.log("No saved model found or error loading. Training a new model...");
        return undefined;
    }
}


// Main function to run the training process
async function runFaceTrainer() {


    const trainingData = await getTrainingData();

    // await loadModels();

    // let faceMatcher = await loadSavedModel();

    // if (!faceMatcher) {
    //     console.log("Training a new model...");
    //     const labeledFaceDescriptors = await generateLabeledFaceDescriptors(trainingData);
    //     faceMatcher = await trainModel(labeledFaceDescriptors);
    //     await saveModel(faceMatcher);
    // } else {
    //     console.log("Loaded saved model.");
    // }
}


runFaceTrainer();