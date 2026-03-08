/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum Emotion {
  Happy = 'Happy',
  Sad = 'Sad',
  Angry = 'Angry',
  Neutral = 'Neutral'
}

export interface TranscriptionSegment {
  speaker: string;
  timestamp: string;
  content: string;
  language: string;
  translation?: string;
  emotion?: Emotion;
}

export type TranscriptionContext = 'general' | 'professional' | 'academic' | 'legal';

export interface TranscriptionResponse {
  markdown: string;
}

export enum AppStatus {
  Idle = 'idle',
  Recording = 'recording',
  Processing = 'processing',
  Success = 'success',
  Error = 'error'
}

export interface AudioData {
  blob: Blob;
  base64: string;
  mimeType: string;
}