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
exports.getTrainingData = getTrainingData;
const fs = __importStar(require("fs/promises")); // Use fs.promises for async file operations
const path = __importStar(require("path"));
async function prepareTrainingData(assetsDir) {
    const trainingData = {};
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
    }
    catch (error) {
        console.error("Error preparing training data:", error);
        return {}; // Return an empty object in case of errors
    }
}
async function getTrainingData() {
    const assetsDirectory = './Assets'; // Replace with your actual assets directory
    const imagePathsByLabel = await prepareTrainingData(assetsDirectory);
    if (Object.keys(imagePathsByLabel).length === 0) {
        console.error("No training data found. Exiting.");
        return {};
    }
    // console.log('Prepared training data:', imagePathsByLabel); // You can now use this data in your face training module
    return imagePathsByLabel;
}
