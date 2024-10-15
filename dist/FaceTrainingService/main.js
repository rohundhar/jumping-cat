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
const faceapi = __importStar(require("face-api.js"));
const fs = __importStar(require("fs"));
const helper_1 = require("./helper");
// Path to save/load the model
const modelSavePath = './models/faceMatcher';
// Load face-api.js models (replace with your paths)
async function loadModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
}
// Generate labeled face descriptors
async function generateLabeledFaceDescriptors(imagePathsByLabel) {
    const labeledFaceDescriptors = [];
    for (const label in imagePathsByLabel) {
        const descriptorsForLabel = [];
        for (const imagePath of imagePathsByLabel[label]) {
            try {
                const img = await faceapi.fetchImage(imagePath);
                const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
                if (detections.length) {
                    descriptorsForLabel.push(...detections.map(d => d.descriptor));
                }
                else {
                    console.warn(`No face detected in ${imagePath} for label ${label}`);
                }
            }
            catch (error) {
                console.error(`Error processing ${imagePath}:`, error);
            }
        }
        labeledFaceDescriptors.push({ label, descriptors: descriptorsForLabel });
    }
    return labeledFaceDescriptors;
}
// Train the face matcher
async function trainModel(labeledFaceDescriptors) {
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
    return faceMatcher;
}
// Save the trained model
async function saveModel(faceMatcher) {
    try {
        await fs.promises.mkdir(modelSavePath, { recursive: true });
        await fs.promises.writeFile(modelSavePath + "/faceMatcher.json", JSON.stringify(faceMatcher), 'utf8');
        console.log("Model saved successfully.");
    }
    catch (error) {
        console.error("Error saving model:", error);
    }
}
// Load a saved model
async function loadSavedModel() {
    try {
        if (!fs.existsSync(modelSavePath + "/faceMatcher.json")) {
            return undefined;
        }
        const savedDescriptors = JSON.parse(await fs.promises.readFile(modelSavePath + "/faceMatcher.json", 'utf8'));
        return new faceapi.FaceMatcher(savedDescriptors);
    }
    catch (error) {
        console.log("No saved model found or error loading. Training a new model...");
        return undefined;
    }
}
// Main function to run the training process
async function runFaceTrainer() {
    const trainingData = await (0, helper_1.getTrainingData)();
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
