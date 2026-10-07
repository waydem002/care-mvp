// Pluggable embedding generation. Defaults to OpenAI's text-embedding-3-small
// (1536 dimensions, matching document_chunks.embedding). Swappable for a
// self-hosted model later if avoiding a third-party processor for
// patient-linked documents matters — see README.
//
// Without an API key configured, this runs in a "not configured" mode:
// documents still save, just without a searchable embedding yet, rather
// than silently sending content to a provider nobody explicitly enabled.

export type EmbeddingResult =
  | { status: "ok"; embedding: number[] }
  | { status: "not_configured" }
  | { status: "error"; message: string };

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { status: "not_configured" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { status: "error", message: data?.error?.message ?? `Embedding API error (HTTP ${res.status})` };
    }

    return { status: "ok", embedding: data.data[0].embedding };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Unknown error generating embedding" };
  }
}

// Naive fixed-size chunking with a bit of overlap so context isn't lost at
// chunk boundaries. Good enough for an MVP — swap for a smarter,
// paragraph-aware splitter later if retrieval quality needs it.
export function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= chunkSize) return [trimmed];

  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    const end = Math.min(start + chunkSize, trimmed.length);
    chunks.push(trimmed.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}
