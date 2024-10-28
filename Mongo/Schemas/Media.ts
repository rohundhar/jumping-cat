import mongoose, { Schema, Model, Document } from 'mongoose';
import { BaseSchema } from './BaseSchema.js';
import { MimeType } from '../../GDrive/types.js';
import { ImageMetadata, MediaType } from '../types.js';


export interface TagEmbeddings {
  individual: number[];
  phrases: number[];
}

export interface Media extends BaseSchema { // Add Document interface

  // Extract from drive file
  gDriveId: string;
  gDriveFilename: string;
  gDriveFolders: string[];
  mimeType?: MimeType;
  thumbnailLink?: string;
  webContentLink?: string;

  // Extract custom from various functions
  fileMetadata?: ImageMetadata;
  facialRecognitionTags: string[];
  googleVisionTags: string[];
  customTags: string[];

  tagEmbeddings: TagEmbeddings;

  tag_embeddings?: number[][];
  tags: string[];
  mediaType: MediaType;
}

export interface MediaModel extends Model<Media> {}

const MediaSchema = new Schema<Media, MediaModel>({
  gDriveId: {
      type: String,
      required: true, // Make gDriveId required
      unique: true // Ensure gDriveIds are unique
  },
  gDriveFilename: {
    required: true,
    type: String,
  },
  gDriveFolders: {
    type: [String],
    default: []
  },
  fileMetadata: {
      type: Schema.Types.Mixed
  },
  facialRecognitionTags: {
    type: [String],
    default: []
  },
  googleVisionTags: {
    type: [String],
    default: []
  },   
  customTags: {
    type: [String],
    default: []
  },
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
  tagEmbeddings: {
    individual: {
      type: [Number],
      default: []
    },
    phrases: {
      type: [Number],
      default: []
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    required: true
  }, 
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


const computeTags = (media:Media) => {
  const allTags = [
    ...media.facialRecognitionTags,
    ...media.googleVisionTags,
    ...media.customTags
  ].map(tag => tag.toLowerCase());

  return [...new Set(allTags)];
}

MediaSchema.virtual('tags').get(function (this: Media) {
  return computeTags(this);
});

MediaSchema.set('toJSON', { virtuals: true });


MediaSchema.pre<Media>('save', async function (next) {
    this.updatedAt = new Date();
    if (
    this.isModified('facialRecognitionTags') || 
    this.isModified('googleVisionTags')      || 
    this.isModified('customTags')) {
      const tags = computeTags(this);
      // console.log('Modify tag embeddings based on new tag list', tags);
      // this.tag_embeddings = await generateEmbeddings(this.tags);
    }
    next(); 
});

export default mongoose.model<Media, MediaModel>('Media', MediaSchema); //