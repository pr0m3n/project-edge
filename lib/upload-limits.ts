export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_PROJECT_UPLOAD_BYTES = 250 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed"
] as const;

export function isAllowedUpload(file: File) {
  return ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number]) &&
    file.size <= MAX_UPLOAD_BYTES;
}
