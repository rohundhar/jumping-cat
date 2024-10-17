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
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline_1 = __importDefault(require("readline"));
const dirName = `/Users/rohundhar/Desktop/Projects/jumping-cat`;
const SCOPES = [
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
];
const getGDriveService = async () => {
    const credentialsPath = path.join(dirName, 'credentials.json');
    const tokenPath = path.join(dirName, 'token.json');
    let credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    let token = fs.existsSync(tokenPath) ? JSON.parse(fs.readFileSync(tokenPath, 'utf8')) : null;
    // token = '4/0AVG7fiRizM3ABVDN5N1EbbVf395aJUgWRW9JI6s3RUdACv4pTEf2D6GV-q1lSYkUiU6N6A';
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    if (token) {
        oAuth2Client.setCredentials(token);
        return googleapis_1.google.drive({ version: 'v3', auth: oAuth2Client });
    }
    else {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        const rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the authorization code: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) {
                    console.error('Error retrieving access token', err);
                    return;
                }
                if (token) {
                    oAuth2Client.setCredentials(token);
                    fs.writeFileSync(tokenPath, JSON.stringify(token));
                    console.log('Token stored to', tokenPath);
                    return googleapis_1.google.drive({ version: 'v3', auth: oAuth2Client });
                }
            });
        });
    }
    return undefined;
};
exports.default = getGDriveService;
