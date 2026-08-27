/** Доменные типы, синхронизированные с backend-схемами. */

export type StyleId =
  | "scandinavian"
  | "loft"
  | "minimalism"
  | "classic"
  | "japandi"
  | "industrial"
  | "boho"
  | "art_deco";

export interface StyleInfo {
  id: StyleId;
  name: string;
  description: string;
  preview_url?: string;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface GenerationResult {
  style: StyleId;
  status: string;
  image_url?: string;
  error?: string;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  results: GenerationResult[];
  original_image_url?: string;
}
