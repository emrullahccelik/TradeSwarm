// ==========================================
// DATABASE ENTITIES (matching FastAPI backend)
// ==========================================

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string | null;
  ui_state: UIEvent[] | null;
  created_at: string;
}

// ==========================================
// SSE STREAM EVENTS (from /api/chat)
// ==========================================

export interface UIEvent {
  type:
    | "content"
    | "reasoning"
    | "tool_start"
    | "tool_end"
    | "sub_agent_start"
    | "sub_agent_end"
    | "done"
    | "error"
    | "audio";
  text?: string;
  tool?: string;
  run_id?: string;
  parent_ids?: string[];
  audio?: string;
  index?: number;
}

// ==========================================
// VOICE CHAT STATE MACHINE
// ==========================================

export type VoiceChatState =
  | "idle"           // Beklemede
  | "recording"      // Kullanıcı konuşuyor
  | "transcribing"   // STT çalışıyor
  | "thinking"       // LLM cevap üretiyor
  | "speaking"       // TTS ses çalıyor
  | "auto-listening"; // Otomatik tekrar dinleme (kısa bekleme)

// ==========================================
// API REQUEST/RESPONSE TYPES
// ==========================================

export interface ChatRequest {
  message: string;
  session_id: string;
}

export interface SessionCreateRequest {
  title?: string;
}

export interface STTRequest {
  audio_base64: string;
  format: string;
}

export interface STTResponse {
  text: string;
}

export interface TTSRequest {
  text: string;
}

export interface TTSResponse {
  audio: string;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// ==========================================
// COMPONENT PROPS
// ==========================================

export interface MessageGroup {
  id: string;
  role: "user" | "assistant";
  content: string;
  uiEvents: UIEvent[];
  isStreaming?: boolean;
}

export interface ActiveSubAgent {
  runId: string;
  toolName: string;
}
