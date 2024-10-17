import mongoose, { Schema, Model, Document } from 'mongoose';
import { BaseSchema } from './BaseSchema.js';
import { MimeType } from '../../GDrive/types.js';
import { ImageMetadata, MediaType } from '../types.js';

export interface Media extends BaseSchema, Document { // Add Document interface
    gDriveId: string;
    gDriveFilename: string;
    fileMetadata: ImageMetadata;
    facialRecognitionTags: string[];
    googleVisionTags: string[];
    customTags: string[];
    thumbnailLink: string;
    webContentLink: string;
    mimeType: MimeType;
    tag_embeddings: number[][];
}

export interface MediaModel extends Model<Media> {}

const MediaSchema = new Schema<Media, MediaModel>({
  gDriveId: {
      type: String,
      required: true, // Make gDriveId required
      unique: true // Ensure gDriveIds are unique
  },
  gDriveFilename: {
    type: String,
  },
  fileMetadata: {
      type: Schema.Types.Mixed
  },
  facialRecognitionTags: [String], 
  googleVisionTags: [String],     
  customTags: [String],           
  thumbnailLink: {
      type: String
  },
  webContentLink: {
      type: String
  },
  mimeType: {
      type: String
  },
  tag_embeddings: [[Number]],
  createdAt: { type: Date, default: Date.now }, 
  updatedAt: {
      type: Date,
      default: Date.now,
      required: true
  }
});


MediaSchema.virtual('mediaType').get(function (this: Media) {
  const mimeType = this.mimeType;

  switch (mimeType) {
    case MimeType.HEIC:
    case MimeType.JPG:
    case MimeType.PNG:
      return MediaType.IMAGE;
    case MimeType.MP4:
    case MimeType.QUICKTIME:
      return MediaType.VIDEO
  }
});

MediaSchema.virtual('tags').get(function (this: Media) {
  const allTags = [
      ...this.facialRecognitionTags,
      ...this.googleVisionTags,
      ...this.customTags
  ];

  // Remove duplicates and return the unique tags
  return [...new Set(allTags)];
});

MediaSchema.set('toJSON', { virtuals: true });

const computeTags = (media:Media) => {
  const allTags = [
    ...media.facialRecognitionTags,
    ...media.googleVisionTags,
    ...media.customTags
  ];

  return [...new Set(allTags)];
}
MediaSchema.pre<Media>('save', async function (next) {
    this.updatedAt = new Date();
    if (
    this.isModified('facialRecognitionTags') || 
    this.isModified('googleVisionTags')      || 
    this.isModified('customTags')) {
      const tags = computeTags(this);
      console.log('Modify tag embeddings based on new tag list', tags);
      // this.tag_embeddings = await generateEmbeddings(this.tags);
    }
    next(); 
});

export default mongoose.model<Media, MediaModel>('Media', MediaSchema); //