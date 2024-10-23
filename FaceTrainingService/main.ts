import * as faceapi from 'face-api.js';
import * as fs from 'fs';
import pLimit from 'p-limit';
import { getTrainingData } from './helper.js';
import canvas from 'canvas';
import cliProgress from 'cli-progress';

const modelsPath = `./FaceTrainingService/models`;

// Path to save/load the model
const modelSavePath = `${modelsPath}/faceMatcher`;


// Monkey patch face-api.js (REQUIRED for Node.js)
const { Canvas, Image, ImageData } = canvas;
//@ts-ignore
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })

// Load face-api.js models (replace with your paths)
async function loadModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
}


// Generate labeled face descriptors
async function generateLabeledFaceDescriptors(imagePathsByLabel: { [label: string]: string[] }): 
Promise<{labeledFaceDescriptors: faceapi.LabeledFaceDescriptors[], rawLabeledFaceDescriptors: {label: string, descriptors: Float32Array[]}[]}> {
    const labeledFaceDescriptors: faceapi.LabeledFaceDescriptors[] = []; // Use LabeledFaceDescriptors type

    const rawLabeledFaceDescriptors: {label: string, descriptors: Float32Array[]}[] = [];

    const limit = pLimit(5);

    for (const label in imagePathsByLabel) {
        const descriptorsForLabel: Float32Array[] = [];
        const imagesPerLabel = imagePathsByLabel[label];

        console.log(`Training on ${label}: ${imagesPerLabel.length} Photos`);

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        bar.start(imagesPerLabel.length, 0);

        // Parallelize processing of images for each label
        await Promise.all(imagesPerLabel.map(async (imagePath) => {
          await limit(async () => { // Wrap the processing function with limit
            try {
                if (!imagePath.includes('DS_Store')) {
                  // console.log('Attempt Train', imagePath);
                  const img = await canvas.loadImage(imagePath);
                  const detections = await faceapi.detectAllFaces(img as any).withFaceLandmarks().withFaceDescriptors();
                  if (detections.length) {
                      descriptorsForLabel.push(...detections.map(d => d.descriptor!));
                  } else {
                      console.warn(`No face detected in ${imagePath} for label ${label}`);
                  }
                }
            } catch (error) {
                console.error(`Error processing ${imagePath}:`, error);
            } finally { // Ensure progress bar updates even on error
                bar.increment();
            }
          });
        }));

        bar.stop();
        labeledFaceDescriptors.push(new faceapi.LabeledFaceDescriptors(label, descriptorsForLabel)); // Create LabeledFaceDescriptors
        rawLabeledFaceDescriptors.push({label, descriptors: descriptorsForLabel})
    }

    return {
        labeledFaceDescriptors,
        rawLabeledFaceDescriptors
    };
}

// Train the face matcher
async function trainModel(labeledFaceDescriptors: { label: string; descriptors: Float32Array[] }[]): Promise<faceapi.FaceMatcher> {
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
    return faceMatcher;
}


// Save the labeled descriptors
async function saveModel(rawLabeledFaceDescriptors: { label: string; descriptors: Float32Array[] }[]) {
  try {
      // Convert Float32Array to regular arrays before saving
      const dataToSave = rawLabeledFaceDescriptors.map(item => ({
          label: item.label,
          descriptors: item.descriptors.map(descriptor => Array.from(descriptor)) // Convert to Array
      }));

      await fs.promises.writeFile(`${modelSavePath}/faceMatcher.json`, JSON.stringify(dataToSave));
      console.log("Model saved successfully.");
  } catch (error) {
      console.error("Error saving model:", error);
  }
}

async function loadSavedModel(): Promise<faceapi.LabeledFaceDescriptors[] | undefined> {
  try {
      const savedData = JSON.parse(await fs.promises.readFile(`${modelSavePath}/faceMatcher.json`, 'utf8'));

      // Convert back to Float32Array after loading
      const labeledFaceDescriptors = savedData.map((data: { label: string; descriptors: number[][] }) => {
          const descriptors = data.descriptors.map(descriptor => new Float32Array(descriptor));
          console.log(`Found ${descriptors.length} descriptors for ${data.label}`);
          return new faceapi.LabeledFaceDescriptors(data.label, descriptors);
      });

      return labeledFaceDescriptors;
  } catch (error) {
      console.log(`Error while retrieving existing model descriptors: ${error}`);
      return undefined;
  }
}


let faceMatcher: faceapi.FaceMatcher;

// Main function to run the training process
export async function getFaceMatcher() {

    if (faceMatcher) {
        return faceMatcher;
    }

    await loadModels();

    const storedDescriptors = await loadSavedModel();

    if (!storedDescriptors) {
        const trainingData = await getTrainingData();
        console.log("Training a new model...");
        const {
            labeledFaceDescriptors, 
            rawLabeledFaceDescriptors
        } = await generateLabeledFaceDescriptors(trainingData);
        console.log('Label Face Descriptors', labeledFaceDescriptors);
        faceMatcher = await trainModel(labeledFaceDescriptors);
        await saveModel(rawLabeledFaceDescriptors);
    } else {
        faceMatcher = await trainModel(storedDescriptors);
        console.log("Loaded saved model.");
    }

    return faceMatcher;
}