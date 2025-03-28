import { invoke } from "@tauri-apps/api/core";

interface TranscriptionPayload {
  serverId: string;
  audioType: string;
  audioContent: string;
}

interface TranscriptionResponse {
  text: string;
}

export const transcription = (payload: TranscriptionPayload) => {
  return invoke<TranscriptionResponse>("transcription", { ...payload });
};
