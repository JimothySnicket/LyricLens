import { pipeline, layer_norm, Tensor } from "@huggingface/transformers";

let embedder: any = null;
let embedderReady: Promise<any> | null = null;

export async function getEmbedder() {
  if (!embedder) {
    if (!embedderReady) {
      embedderReady = pipeline("feature-extraction", "nomic-ai/nomic-embed-text-v1.5", {
        dtype: "fp32",
      }).then((e) => { embedder = e; return e; });
    }
    return embedderReady;
  }
  return embedder;
}

// Eagerly warm the model at import time (non-blocking)
getEmbedder().then(() => console.log("Embedding model loaded")).catch(console.error);

// nomic uses asymmetric prefixes: "search_query: " for queries, "search_document: "
// for indexed text. Both the runtime query path and the offline document-embedding
// script (scripts/build-embeddings.ts) go through this one function, so query and
// document vectors are guaranteed to come from an identical implementation.
type NomicPrefix = "search_query: " | "search_document: ";

export async function embedWithPrefix(text: string, prefix: NomicPrefix): Promise<number[]> {
  const embed = await getEmbedder();

  const output = await embed([prefix + text], { pooling: "mean" }) as Tensor;

  // nomic requires layer_norm before L2 normalisation.
  // (Python sentence-transformers handles this internally via trust_remote_code;
  //  transformers.js does not, so we apply it manually.)
  const lastDim = output.dims[output.dims.length - 1];
  const normalized = layer_norm(output, [lastDim]).normalize(2, -1);

  return Array.from(normalized.data as Float32Array);
}

export function embedQuery(text: string): Promise<number[]> {
  return embedWithPrefix(text, "search_query: ");
}

export function embedDocument(text: string): Promise<number[]> {
  return embedWithPrefix(text, "search_document: ");
}
