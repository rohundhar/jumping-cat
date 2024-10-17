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
exports.getFaceMatcher = getFaceMatcher;
const faceapi = __importStar(require("face-api.js"));
const fs = __importStar(require("fs"));
const p_limit_1 = __importDefault(require("p-limit"));
const helper_1 = require("./helper");
const canvas_1 = __importDefault(require("canvas"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const modelsPath = `./FaceTrainingService/models`;
// Path to save/load the model
const modelSavePath = `${modelsPath}/faceMatcher`;
// Monkey patch face-api.js (REQUIRED for Node.js)
const { Canvas, Image, ImageData } = canvas_1.default;
//@ts-ignore
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
// Load face-api.js models (replace with your paths)
async function loadModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
}
// Generate labeled face descriptors
async function generateLabeledFaceDescriptors(imagePathsByLabel) {
    const labeledFaceDescriptors = []; // Use LabeledFaceDescriptors type
    const rawLabeledFaceDescriptors = [];
    const limit = (0, p_limit_1.default)(5);
    for (const label in imagePathsByLabel) {
        const descriptorsForLabel = [];
        const imagesPerLabel = imagePathsByLabel[label];
        console.log(`Training on ${label}: ${imagesPerLabel.length} Photos`);
        const bar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
        bar.start(imagesPerLabel.length, 0);
        // Parallelize processing of images for each label
        await Promise.all(imagesPerLabel.map(async (imagePath) => {
            await limit(async () => {
                try {
                    if (!imagePath.includes('DS_Store')) {
                        // console.log('Attempt Train', imagePath);
                        const img = await canvas_1.default.loadImage(imagePath);
                        const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
                        if (detections.length) {
                            descriptorsForLabel.push(...detections.map(d => d.descriptor));
                        }
                        else {
                            console.warn(`No face detected in ${imagePath} for label ${label}`);
                        }
                    }
                }
                catch (error) {
                    console.error(`Error processing ${imagePath}:`, error);
                }
                finally { // Ensure progress bar updates even on error
                    bar.increment();
                }
            });
        }));
        bar.stop();
        labeledFaceDescriptors.push(new faceapi.LabeledFaceDescriptors(label, descriptorsForLabel)); // Create LabeledFaceDescriptors
        rawLabeledFaceDescriptors.push({ label, descriptors: descriptorsForLabel });
    }
    return {
        labeledFaceDescriptors,
        rawLabeledFaceDescriptors
    };
}
// Train the face matcher
async function trainModel(labeledFaceDescriptors) {
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
    return faceMatcher;
}
// Save the labeled descriptors
async function saveModel(rawLabeledFaceDescriptors) {
    try {
        // Convert Float32Array to regular arrays before saving
        const dataToSave = rawLabeledFaceDescriptors.map(item => ({
            label: item.label,
            descriptors: item.descriptors.map(descriptor => Array.from(descriptor)) // Convert to Array
        }));
        await fs.promises.writeFile(`${modelSavePath}/faceMatcher.json`, JSON.stringify(dataToSave));
        console.log("Model saved successfully.");
    }
    catch (error) {
        console.error("Error saving model:", error);
    }
}
async function loadSavedModel() {
    try {
        const savedData = JSON.parse(await fs.promises.readFile(`${modelSavePath}/faceMatcher.json`, 'utf8'));
        // Convert back to Float32Array after loading
        const labeledFaceDescriptors = savedData.map((data) => {
            const descriptors = data.descriptors.map(descriptor => new Float32Array(descriptor));
            console.log(`Found ${descriptors.length} descriptors for ${data.label}`);
            return new faceapi.LabeledFaceDescriptors(data.label, descriptors);
        });
        return labeledFaceDescriptors;
    }
    catch (error) {
        console.log(`Error while retrieving existing model descriptors: ${error}`);
        return undefined;
    }
}
// Main function to run the training process
async function getFaceMatcher() {
    const trainingData = await (0, helper_1.getTrainingData)();
    await loadModels();
    const storedDescriptors = await loadSavedModel();
    let faceMatcher;
    if (!storedDescriptors) {
        console.log("Training a new model...");
        const { labeledFaceDescriptors, rawLabeledFaceDescriptors } = await generateLabeledFaceDescriptors(trainingData);
        console.log('Label Face Descriptors', labeledFaceDescriptors);
        faceMatcher = await trainModel(labeledFaceDescriptors);
        await saveModel(rawLabeledFaceDescriptors);
    }
    else {
        faceMatcher = await trainModel(storedDescriptors);
        console.log("Loaded saved model.");
    }
    return faceMatcher;
}
