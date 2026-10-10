import { ArtifactVersion, MessageGroup } from "@/types";

// Artifact'ı model yazar ve web içeriğinden prompt injection'a açıktır. iframe sandbox'ı (allow-same-origin olmadan)
// uygulamanın token'ına ve DOM'una erişimi keser; CSP de veriyi dışarı sızdırabilecek ağ isteklerini engeller.
// Kütüphaneler sadece bilinen CDN'lerden yüklenebilir.
const CDNS = "https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com";

const ARTIFACT_CSP = [
  "default-src 'none'",
  `script-src 'unsafe-inline' 'unsafe-eval' ${CDNS}`,
  `style-src 'unsafe-inline' ${CDNS} https://fonts.googleapis.com`,
  `font-src data: ${CDNS} https://fonts.gstatic.com`,
  "img-src data: blob:",
  "media-src data: blob:",
  "connect-src 'none'",
].join("; ");

/** CSP'yi, sayfadaki her script'ten önce uygulanması için belgenin en başına ekler. */
export function buildArtifactDocument(html: string): string {
  const body = html.replace(/^\s*<!doctype[^>]*>/i, "");
  return `<!DOCTYPE html><meta http-equiv="Content-Security-Policy" content="${ARTIFACT_CSP}">${body}`;
}

/** Sohbetteki tüm artifact versiyonlarını artifact_id'ye göre gruplar (versiyon sırasıyla). */
export function collectArtifactVersions(messages: MessageGroup[]): Record<string, ArtifactVersion[]> {
  const byId: Record<string, ArtifactVersion[]> = {};
  for (const message of messages) {
    for (const event of message.uiEvents) {
      if (event.type !== "artifact" || !event.artifact_id || !event.version) continue;
      (byId[event.artifact_id] ??= []).push({
        artifactId: event.artifact_id,
        version: event.version,
        title: event.title || "Artifact",
        content: event.content || "",
      });
    }
  }
  for (const versions of Object.values(byId)) versions.sort((a, b) => a.version - b.version);
  return byId;
}

export function downloadArtifact(artifact: ArtifactVersion) {
  const slug = artifact.title.toLowerCase().replace(/[^a-z0-9ğüşıöç]+/gi, "-").replace(/^-|-$/g, "") || "artifact";
  const url = URL.createObjectURL(new Blob([artifact.content], { type: "text/html" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}-v${artifact.version}.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
