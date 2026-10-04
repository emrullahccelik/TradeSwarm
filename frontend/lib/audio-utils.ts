import { apiPost } from "@/lib/api";

export function getSupportedAudioMimeType(): string {
  const types = [
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
  ];
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "audio/webm";
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function getAudioFormat(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export async function transcribe(blob: Blob): Promise<string> {
  const base64 = await blobToBase64(blob);
  const format = getAudioFormat(blob.type || getSupportedAudioMimeType());
  const response = await apiPost<{ text: string }>("/api/stt", { audio_base64: base64, format });
  return (response.text || "").trim();
}
