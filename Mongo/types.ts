export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  UNKNOWN = 'unknown'
}

interface ImageSharedProperties {
  // Beginning of Shared Properties // 
  Make?: string;
  Model?: string;
  Orientation?: string;

  // Resolution density
  ResolutionUnit?: string;
  XResolution?: number;
  YResolution?: number;

  DateTimeOriginal?: Date;
  CreateDate?: Date;

  ExifImageWidth?: number;
  ExifImageHeight?: number;

  ISO?: string;
}

interface iPhoneProperties {
  // GPS data
  GPSLatitudeRef?: string;
  GPSLatitude?: number[];
  GPSLongitudeRef?: string;
  GPSLongitude?: number[];
  GPSAltitude?: number;

  latitude?: number,
  longitude?: number
}

interface OtherImageProperties {
  DigitalZoomRatio?: number;
}


export type ImageMetadata  = ImageSharedProperties & iPhoneProperties & OtherImageProperties;