import * as fs from 'fs/promises';
import * as path from 'path';
import imagemin from 'imagemin';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';

export async function compressAssets(inputDir: string, outputDir: string) {
    try {
        await fs.mkdir(outputDir, { recursive: true });
        const entries = await fs.readdir(inputDir);

        for (const entry of entries) {
            const inputPath = path.join(inputDir, entry);
            const outputPath = path.join(outputDir, entry);
            const stat = await fs.stat(inputPath);

            if (stat.isDirectory()) {
                await compressAssets(inputPath, outputPath);
            } else if (stat.isFile() && /\.(jpg|jpeg|png)$/i.test(entry)) {
                try {
                    await imagemin([inputPath], {
                        destination: path.dirname(outputPath), // Output to the correct directory
                        plugins: [
                            imageminMozjpeg({ quality: 80 }), // Adjust quality as needed
                            imageminPngquant({ quality: [0.6, 0.8] }), // Adjust quality as needed
                        ],
                    });
                } catch (err) {
                    console.log(`Error on entry`, entry);
                }
            }
        }
    } catch (error) {
        console.error("Error compressing assets:", error, inputDir);
    }
}
