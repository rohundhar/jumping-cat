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
const fs = __importStar(require("fs"));
const auth_1 = __importDefault(require("./auth"));
async function main() {
    const service = await (0, auth_1.default)();
    console.log('service', service);
    if (service) {
        const results = await service.files.list({
            pageSize: 10,
            fields: 'nextPageToken, files(id, name, mimeType)',
        });
        const items = results.data.files;
        if (items) {
            for (const item of items) {
                console.log(item.name, item.id);
            }
        }
    }
}
const getChildrenOfFolder = async (folderId) => {
    const service = await (0, auth_1.default)();
    if (service) {
        const results = await service.files.list({
            q: `'${folderId}' in parents`,
            pageSize: 10,
            fields: 'nextPageToken, files(id, name, mimeType, webContentLink)',
        });
        const items = results.data.files;
        console.log('NextPageToken', results.data);
        if (items) {
            for (const item of items) {
                console.log(item.name, item.id, item);
            }
        }
    }
};
async function downloadFile(driveService, fileId, filePath) {
    try {
        const res = await driveService.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
        res.data.pipe(fs.createWriteStream(filePath));
        console.log(`File downloaded to ${filePath}`);
    }
    catch (error) {
        console.error('Error downloading file:', error);
    }
}
const getAllFilesInFolder = async (driveService, folderId) => {
    let allFiles = [];
    let pageToken = undefined;
    let res;
    do {
        res = await driveService.files.list({
            q: `'${folderId}' in parents`,
            fields: 'nextPageToken, files(id, name, mimeType, webContentLink, webViewLink, thumbnailLink)',
            pageToken: pageToken, // Include the pageToken for subsequent pages
            pageSize: 1000 // Optional: Set a larger page size (max 1000) for fewer requests
        });
        // If any of these files are folders, then we need to get all files within THAT FOLDER
        const promises = [];
        const mediaFiles = [];
        res.data.files?.forEach((file) => {
            if (file.id && file.mimeType === 'application/vnd.google-apps.folder') {
                promises.push(getAllFilesInFolder(driveService, file.id));
            }
            else {
                mediaFiles.push(file);
            }
        });
        let results;
        if (promises.length > 0) {
            results = await Promise.all(promises);
            allFiles = allFiles.concat(mediaFiles, ...results);
        }
        else {
            console.log(`We found all ${mediaFiles.length} files at the leaf`);
            allFiles = allFiles.concat(mediaFiles);
        }
        pageToken = res.data.nextPageToken; // Update the pageToken for the next iteration
    } while (pageToken); // Continue as long as there's a nextPageToken
    return allFiles;
};
async function getFolder() {
    const driveService = await (0, auth_1.default)();
    if (!driveService) {
        return;
    }
    // Find the folder with the specified name
    const folderName = 'Safari 2024';
    const folders = await driveService.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'nextPageToken, files(id, name)',
    });
    if (folders.data.files) {
        if (folders.data.files.length === 0) {
            console.log(`Folder not found: ${folderName}`);
            return;
        }
        const folderId = folders.data.files[0].id;
        if (folderId) {
            console.log(`Folder found: ${folderName} (ID: ${folderId})`);
            const allFiles = await getAllFilesInFolder(driveService, folderId);
            console.log("All Files", allFiles.length);
            console.log('Some Files', allFiles.slice(0, 10));
        }
    }
}
getFolder();
