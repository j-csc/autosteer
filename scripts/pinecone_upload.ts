const { Pinecone } = require('@pinecone-database/pinecone');
const { CohereClient } = require('cohere-ai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const COHERE_API_KEY = process.env.COHERE_API_KEY || '';
const INDEX_NAME = 'gemma-2-2b-1-gemmascope-res-16k';
const VECTOR_DIMENSION = 1024;
const DATA_FILE = 'gemma-2-2b_1-gemmascope-res-16k.json';

// Initialize Pinecone client
const client = new Pinecone({
    apiKey: PINECONE_API_KEY,
});

// Initialize Cohere client
const cohere = new CohereClient({
  token: COHERE_API_KEY
});

const EMBEDDINGS_FILE = 'saved_embeddings.json';

// Load embeddings from a file
function loadEmbeddingsFromFile(): any[] | null {
  const filePath = path.join(__dirname, 'data', EMBEDDINGS_FILE);
  if (fs.existsSync(filePath)) {
    console.log(`Loading embeddings from ${filePath}`);
    const rawEmbeddings = fs.readFileSync(filePath, 'utf8');
    const embeddingsData = JSON.parse(rawEmbeddings);
    return embeddingsData; // Return the whole embedding objects with index
  }
  return null;
}

// Save embeddings to a file
function saveEmbeddingsToFile(embeddings: number[][], data: any[]) {
  const embeddingsData = data.map((item: any, index: number) => ({
    index: item.index,
    embedding: embeddings[index]
  }));

  const filePath = path.join(__dirname, 'data', EMBEDDINGS_FILE);
  fs.writeFileSync(filePath, JSON.stringify(embeddingsData, null, 2));
  console.log(`Embeddings saved to ${filePath}`);
}

// Modify the convertToVectors function to handle batching
async function convertToVectorsInBatches(texts: string[], batchSize: number): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}`);
    const response = await cohere.embed({
      model: "embed-multilingual-v3.0",
      texts: batch,
      inputType: "classification",
      truncate: "NONE"
    });
    allEmbeddings.push(...response.embeddings);
  }
  return allEmbeddings;
}

// Main function to load JSON, create the index (if not exists), and upload vectors
async function main() {
  try {
    // Check if the index exists
    const existingIndexes = await client.listIndexes();
    console.log(existingIndexes);

    // Load JSON file
    const jsonDataPath = path.join(__dirname, 'data', DATA_FILE);
    const rawData = fs.readFileSync(jsonDataPath, 'utf8');
    const data = JSON.parse(rawData);

    // Connect to the index
    const index = client.Index(INDEX_NAME);

    // Extract texts for embedding
    const texts = data.map((item: any) => item.description);

    // Try to load embeddings from file
    let embeddingsData = loadEmbeddingsFromFile();

    // If embeddings are not available, generate and save them
    if (!embeddingsData) {
      console.log("No saved embeddings found, generating new embeddings...");
      const texts = data.map((item: any) => item.description);
      const embeddings = await convertToVectorsInBatches(texts, 96);
      saveEmbeddingsToFile(embeddings, data);
      embeddingsData = data.map((item: any, index: number) => ({
        index: item.index,
        embedding: embeddings[index]
      }));
    }

    // Ensure embeddings length matches data length
    if (embeddingsData && embeddingsData.length !== data.length) {
      throw new Error("Mismatch between the number of embeddings and the data length.");
    }
      
    if (embeddingsData) {
        // Ensure embeddings index alignment
        const embeddingsMap = new Map(embeddingsData.map(item => [item.index, item.embedding]));
        console.log(embeddingsMap);

        // Prepare vectors for Pinecone by matching indices
        const vectors = data.map((item: any) => {
            const embedding = embeddingsMap.get(item.index);
            if (!embedding) {
                throw new Error(`Embedding not found for index ${item.index}`);
            }
            return {
                id: item.index.toString(),
                values: embedding, // Use the correct embedding from the map
                metadata: { ...item } // Include all item fields as metadata
            };
        });

        // Upsert vectors in batches
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await index.upsert(batch);
            console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}`);
        }

        console.log('Upload complete!');
    }

  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run the main function
main();