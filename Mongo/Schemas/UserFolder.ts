import mongoose, { Schema, Model, Document } from 'mongoose';
import { BaseSchema } from './BaseSchema.js';
import { Media } from './Media.js';

export interface UserFolder extends BaseSchema { 
  userId: string;
  name: string;
  color: string;
  files: Media[] | string[];
}

export interface UserFolderModel extends Model<UserFolder> {}

const UserFolderSchema = new Schema<UserFolder, UserFolderModel>({
  userId: {
      type: String,
      required: true,
  },
  name: {
    type: String,
    required: true
  },
  color: {
    type: String,
  },
  files: [{
    type: Schema.Types.ObjectId,
    ref: 'Media',
  }],
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

UserFolderSchema.pre<UserFolder>('save', async function (next) {
    this.updatedAt = new Date();
    next(); 
});

export default mongoose.model<UserFolder, UserFolderModel>('UserFolder', UserFolderSchema);