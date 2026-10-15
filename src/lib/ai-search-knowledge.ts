import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  buildAiSearchKnowledgeContext,
  parseKnowledgeFile,
  type AiSearchKnowledgeDocument,
} from "@/lib/ai-search";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "content");
const ALLOWED_EXTENSIONS = new Set([".json", ".md", ".txt"]);
const MAX_KNOWLEDGE_BASE_BYTES = 25 * 1024 * 1024;

let documentsPromise: Promise<AiSearchKnowledgeDocument[]> | undefined;

async function listKnowledgeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => listKnowledgeFiles(path.join(directory, entry.name))),
  );

  const files = entries
    .filter((entry) => entry.isFile() && ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(directory, entry.name));

  return [...files, ...nested.flat()].sort();
}

async function loadKnowledgeDocuments(): Promise<AiSearchKnowledgeDocument[]> {
  const files = await listKnowledgeFiles(KNOWLEDGE_ROOT);
  const fileStats = await Promise.all(files.map((file) => stat(file)));
  const totalBytes = fileStats.reduce((total, fileStat) => total + fileStat.size, 0);
  if (totalBytes > MAX_KNOWLEDGE_BASE_BYTES) {
    throw new Error("The local aviation knowledge base exceeds the configured size limit.");
  }

  const groups = await Promise.all(
    files.map(async (file) => {
      const contents = await readFile(file, "utf8");
      const source = path.relative(process.cwd(), file).split(path.sep).join("/");
      return parseKnowledgeFile(source, contents);
    }),
  );
  return groups.flat();
}

function getKnowledgeDocuments(): Promise<AiSearchKnowledgeDocument[]> {
  if (!documentsPromise) {
    documentsPromise = loadKnowledgeDocuments().catch((error: unknown) => {
      documentsPromise = undefined;
      throw error;
    });
  }
  return documentsPromise;
}

export async function getAiSearchKnowledgeContext(query: string): Promise<string> {
  const documents = await getKnowledgeDocuments();
  return buildAiSearchKnowledgeContext(query, documents);
}
