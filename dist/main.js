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
const faceapi = __importStar(require("face-api.js"));
const canvas_1 = __importDefault(require("canvas"));
const main_1 = require("./FaceTrainingService/main");
const files_1 = require("./GDrive/files");
const types_1 = require("./GDrive/types");
const main = async () => {
    const folderName = 'Safari 2024';
    const allFilesInDrive = await (0, files_1.getFolder)(folderName);
    const videos = [];
    for (const file of allFilesInDrive) {
        switch (file.mimeType) {
            case types_1.MimeType.MP4:
            case types_1.MimeType.QUICKTIME: {
                if (file.id) {
                    videos.push(file);
                }
                break;
            }
            case types_1.MimeType.HEIC: {
                // console.log('convert to jpg stream?')
                break;
            }
            case types_1.MimeType.JPG:
            case types_1.MimeType.PNG: {
                // console.log('handle image normally');
                break;
            }
            default: {
                console.log('Unknown File Type', file.mimeType);
            }
        }
    }
    await (0, files_1.getOrUploadManyVideos)(videos);
};
const recognize = async () => {
    const url = `Assets/Testing/GroupPhoto2.jpg`;
    const faceMatcher = await (0, main_1.getFaceMatcher)();
    try {
        const img = await canvas_1.default.loadImage(url);
        const queryDetections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
        for (const detection of queryDetections) {
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
            console.log(`Best match: ${bestMatch.label} (confidence: ${bestMatch.distance})`);
        }
    }
    catch (err) {
        console.log('Error while trying to detect Image', url, err);
    }
};
main();
