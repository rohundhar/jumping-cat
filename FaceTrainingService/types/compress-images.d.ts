declare module 'compress-images' {
  type Options = {
      compress_force?: boolean;
      statistic?: boolean;
      autoupdate?: boolean;
  };

  type Algorithms = {
      jpg?: { engine: string; command: string[] };
      png?: { engine: string; command: string[] };
      svg?: { engine: string; command: string[] };
      gif?: { engine: string; command: string[] };
  };

  type Statistic = {
      path: string;
      originalSize: number;
      optimizedSize: number;
  };

  const compress_images: (
      inputPath: string,
      outputPath: string,
      options: Options,
      onProgress: false, // Make onProgress optional or false
      jpg: Algorithms["jpg"],
      png: Algorithms["png"],
      svg: Algorithms["svg"],
      gif: Algorithms["gif"],
      callback: (error: any, completed: boolean, statistic: Statistic[]) => void
  ) => void; // Return type is void

  export default compress_images;
}