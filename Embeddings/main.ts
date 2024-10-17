import { pipeline } from '@xenova/transformers';

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    const extractor = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2'); // Use the appropriate model name
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    return output.tolist();
}


async function runExample() {
    const tags = ['action movie', 'comedy film', 'romantic story'];
    const embeddings = await generateEmbeddings(tags);
    console.log(embeddings);
}

runExample();