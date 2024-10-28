import { Media } from "../Mongo/Schemas/Media.js";

export type ServerResponse<T> = Promise<{
  success: boolean;
  error?: any;
  data?: T
}>

export type MediaResponse = Omit<Media, "tagEmbeddings" | "_id">