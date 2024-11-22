import { pipeline } from 'stream/promises';

import { Context, GET, HeaderParam, Path, QueryParam, ServiceContext } from 'typescript-rest';
import { ClerkContext } from '../Auth/types.js';
import { getGDriveService } from '../GDrive/auth.js';
import { MediaType } from '../Mongo/types.js';
import { getVideoFile } from '../GDrive/files.js';


@Path('/api/proxy') 
export class ProxyService {
  @Context
  context!: ClerkContext;

  @GET
  @Path("image")
  async getImage(
    @QueryParam("gDriveId") gDriveId: string,
    @QueryParam("type") type: MediaType,
  ): Promise<void> {

    console.log('Request for image:', gDriveId);
    const { response: res } = this.context;
    try {

      if (type === MediaType.IMAGE) {
        const service = await getGDriveService();

        const response = await service.files.get({ fileId: gDriveId, alt: 'media'}, { responseType: 'stream'});
  
        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader('Content-Length', response.headers['content-length']);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
  
        if (res.writable) {
          await pipeline(response.data, res);
        }
      } else if (type === MediaType.VIDEO) {
        const file = await getVideoFile(gDriveId);
        const [ fileMetadata ] = await file.getMetadata();
        res.setHeader('Content-Type', fileMetadata.contentType || 'video/mp4');
        res.setHeader('Content-Length', fileMetadata.size?.toString() as string);
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        const readStream = file.createReadStream();

        if (res.writableEnded || !res.writable) {
          console.warn(`Response stream has ended or become unwriteable`);
          readStream.destroy(); // Prevent leaks
          return;
        }

        if (res.writable) {
          await pipeline(readStream, res);
        }
      }
     
    } catch (err) {
      console.warn(`Error while trying to stream ${type}: ${gDriveId}`);

      if (res.writable && !res.writableEnded) {
        this.context.response.status(500).send('Error proxying image');
      } else {
        console.warn(`Response stream has ended or become unwriteable`);
      }
    }
  }
}







        // PIPE SOLUTION
        // response.data
        //   .on('data', (data) => {
        //     totalDataSent += data.length;
        //   })
        //   .on('error', (streamError) => {
        //     console.error(`Stream error`, streamError, 'HeadersSent', res.headersSent);
        //   })
        //   .on('close', () => {
        //     console.log('response stream has closed');
        //     console.log(`sent total of ${totalDataSent}`);
        //   })
        //   .pipe(res)
        //     .on('error', (streamError) => {
        //       console.error(`Pipe error`, streamError, 'HeadersSent', res.headersSent);
        //       response.data.unpipe();
        //       res.end();
        //     })
        //     .on('close', () => {
        //       console.log('Pipe stream has closed');
        //     })


        // MANUAL WRITE/END SOLUTION

        // let streamErrorOccurred = false; // Flag to track stream errors
       // let totalDataSent = 0;

        // response.data
        // .on('data', (data) => {
        //   if (!streamErrorOccurred && res.writable) {
        //     totalDataSent += data.length;
        //     const canWrite = res.write(data);
        //     if (!canWrite) {
        //       console.log(`Paused writes after ${totalDataSent} sent`);
        //       response.data.pause();
        //       res.once('drain', () => {
        //         console.log('Drained. resume writes');
        //         response.data.resume();
        //       });
        //     }
        //   }
        // })
        // .on('error', (streamError) => {
        //   console.error(`Stream error`, streamError, 'HeadersSent', res.headersSent);
        //   streamErrorOccurred = true;
        //   if (res.writableEnded || res.writableFinished) return;
        //   if (res.writable) {
        //     res.status(500).send(`Error proxying image`);
        //   } 
        // })
        // .on('end', () => {
        //   if (!streamErrorOccurred && res.writable) {
        //     res.end()
        //   }
        // })
        // .on('close', () => {
        //   console.log('response stream has closed');
        //   console.log(`sent total of ${totalDataSent}`);
        // })