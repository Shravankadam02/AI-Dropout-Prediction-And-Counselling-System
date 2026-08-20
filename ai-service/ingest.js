import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QdrantClient } from '@qdrant/js-client-rest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(__dirname, 'knowledge-base');

const COLLECTION_NAME = 'dropout_kb';
const EMBEDDING_DIM = 768;

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
});

function chunkText(text, chunkSize = 500) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + para).length > chunkSize && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

async function embed(text) {
  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama embedding failed: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  if (!data.embeddings?.[0]) {
    throw new Error('Ollama returned no embedding');
  }

  return data.embeddings[0];
}

async function ingest() {
  console.log('Setting up Qdrant collection...');

  const collections = await qdrant.getCollections();

  const exists = collections.collections.some(
    (c) => c.name === COLLECTION_NAME
  );

  if (exists) {
    await qdrant.deleteCollection(COLLECTION_NAME);
    console.log('Cleared existing collection.');
  }

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: EMBEDDING_DIM,
      distance: 'Cosine',
    },
  });

  const files = fs
    .readdirSync(KB_DIR)
    .filter((f) => f.endsWith('.txt'));

  let pointId = 1;
  const points = [];

  for (const file of files) {
    const topic = file.replace('.txt', '');

    const content = fs.readFileSync(
      path.join(KB_DIR, file),
      'utf-8'
    );

    const chunks = chunkText(content);

    console.log(
      `Embedding ${chunks.length} chunks from ${file}...`
    );

    for (const chunk of chunks) {
      const vector = await embed(chunk);

      points.push({
        id: pointId++,
        vector,
        payload: {
          topic,
          text: chunk,
        },
      });
    }
  }

  console.log(
    `Uploading ${points.length} points to Qdrant...`
  );

  await qdrant.upsert(COLLECTION_NAME, {
    points,
  });

  console.log(
    `Ingestion complete. ${points.length} chunks indexed.`
  );
}

ingest().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});