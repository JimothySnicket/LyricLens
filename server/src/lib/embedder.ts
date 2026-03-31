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

export async function embedQuery(text: string): Promise<number[]> {
  const embed = await getEmbedder();

  // nomic requires "search_query: " prefix at query time.
  // "search_document: " is used for indexed text (in the Python pipeline).
  const output = await embed(["search_query: " + text], { pooling: "mean" }) as Tensor;

  // nomic requires layer_norm before L2 normalisation.
  // (Python sentence-transformers handles this internally via trust_remote_code;
  //  transformers.js does not, so we apply it manually.)
  const lastDim = output.dims[output.dims.length - 1];
  const normalized = layer_norm(output, [lastDim]).normalize(2, -1);

  return Array.from(normalized.data as Float32Array);
}
