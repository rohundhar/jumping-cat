import { Document } from "mongoose";

export interface BaseSchema extends Document {
  // The timestamp for when the document was last updated
  updatedAt: Date;
  createdAt: Date;
}
