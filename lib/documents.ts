"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding, chunkText } from "@/lib/embeddings";
import { extractTextFromPdf } from "@/lib/pdf";

export type SearchResult = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentCategory: string;
  content: string;
  similarity: number;
};

export type SearchOutcome =
  | { mode: "semantic"; results: SearchResult[] }
  | { mode: "text_fallback"; results: SearchResult[]; note: string }
  | { mode: "error"; message: string };

export async function addDocument(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const folder = (formData.get("folder") as string) || "General";
  const patientId = (formData.get("patient_id") as string) || null;
  const pastedContent = (formData.get("content") as string) || "";

  const file = formData.get("file") as File | null;
  let content = pastedContent;
  let filePath: string | null = null;
  let fileName: string | null = null;

  if (file && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    filePath = `${folder}/${Date.now()}-${file.name}`;
    fileName = file.name;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, { contentType: file.type || "application/octet-stream" });
    if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

    if (file.type === "application/pdf") {
      try {
        content = await extractTextFromPdf(buffer);
      } catch (e) {
        throw new Error(
          `Uploaded, but couldn't extract text from this PDF (it may be a scanned image rather than real text): ${
            e instanceof Error ? e.message : "unknown error"
          }`
        );
      }
    } else if (file.type === "text/plain") {
      content = buffer.toString("utf-8");
    }
    // Other file types: still uploaded and downloadable, just not
    // text-searchable yet (content stays as whatever was pasted, if anything).
  }

  if (!content.trim() && !filePath) {
    throw new Error("Provide either pasted content or a file to upload.");
  }

  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      title,
      category,
      folder,
      content: content || `[File: ${fileName}. No text extracted.]`,
      patient_id: patientId,
      file_path: filePath,
      file_name: fileName,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Chunk and embed the extracted/pasted text. Without a configured
  // embedding provider, chunks still save with a null embedding —
  // searchDocuments() falls back to plain text matching in that case.
  if (content.trim()) {
    const chunks = chunkText(content);
    for (let i = 0; i < chunks.length; i++) {
      const embeddingResult = await generateEmbedding(chunks[i]);
      await supabase.from("document_chunks").insert({
        document_id: document.id,
        chunk_index: i,
        content: chunks[i],
        embedding: embeddingResult.status === "ok" ? embeddingResult.embedding : null,
      });
    }
  }

  revalidatePath("/documents");
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  const supabase = createClient();
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", documentId)
    .single();
  if (docError) throw new Error(docError.message);
  if (!doc.file_path) throw new Error("This document has no uploaded file to download.");

  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteDocument(documentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
}

export async function searchDocuments(query: string): Promise<SearchOutcome> {
  if (!query.trim()) return { mode: "semantic", results: [] };

  const supabase = createClient();
  const embeddingResult = await generateEmbedding(query);

  if (embeddingResult.status === "ok") {
    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: embeddingResult.embedding,
      match_count: 5,
    });
    if (error) return { mode: "error", message: error.message };

    return {
      mode: "semantic",
      results: (data ?? []).map((r: any) => ({
        chunkId: r.chunk_id,
        documentId: r.document_id,
        documentTitle: r.document_title,
        documentCategory: r.document_category,
        content: r.content,
        similarity: r.similarity,
      })),
    };
  }

  // No embedding provider configured — fall back to plain text search so
  // the feature still works, just without semantic ranking.
  const { data, error } = await supabase
    .from("document_chunks")
    .select("id, document_id, content, documents(title, category)")
    .ilike("content", `%${query}%`)
    .limit(5);
  if (error) return { mode: "error", message: error.message };

  return {
    mode: "text_fallback",
    note: "No embedding provider configured — showing plain keyword matches instead of semantic search.",
    results: ((data as any[]) ?? []).map((r) => ({
      chunkId: r.id,
      documentId: r.document_id,
      documentTitle: r.documents?.title ?? "Untitled",
      documentCategory: r.documents?.category ?? "general",
      content: r.content,
      similarity: 0,
    })),
  };
}
