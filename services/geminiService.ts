/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from "@google/genai";
import { TranscriptionResponse, TranscriptionContext } from "../types";

const getSystemInstruction = (context: TranscriptionContext) => {
  const contextSpecifics = {
    general: "Focus on general clarity and natural flow of conversation.",
    professional: `
- Focus on corporate etiquette and formal address (e.g., Tuan/Puan, Dato'/Datin).
- Identify and structure the output like "Minit Mesyuarat" (Minutes of Meeting).
- Capture professional jargon related to project management, finance, and corporate strategy.
- Use "Kertas Kerja" (Working Papers) and "Tindakan" (Action Items) terminology appropriately.`,
    academic: `
- Focus on academic research terminology and formal discourse.
- Capture terms related to "VIVA", "Senat", "Fakulti", "Penyelidikan" (Research), and "Tesis" (Thesis).
- Maintain the integrity of technical academic jargon in both English and Malay.
- Structure the summary to highlight research findings, methodology, and academic consensus.`,
    legal: `
- Focus on legal precision and formal judicial language.
- Accurately capture references to "Akta" (Act), "Seksyen" (Section), "Perlembagaan" (Constitution), and "Peguam" (Lawyer).
- Do not paraphrase legal arguments; maintain verbatim accuracy for legal citations.
- Structure the summary to highlight legal implications, statutory references, and binding decisions.`
  };

  return `
You are a master linguist and supreme expert in standard Bahasa Melayu and a highly skilled bilingual transcription AI. Your core function is to process, transcribe, translate, and generate text with absolute, uncompromising adherence to the official standards set by Dewan Bahasa dan Pustaka (DBP) Malaysia, while maintaining bilingual proficiency in English.

CURRENT CONTEXT: ${context.toUpperCase()}
${contextSpecifics[context]}

CORE DIRECTIVES FOR BAHASA MELAYU MASTERY:
1. Lexical Authority (Kamus Dewan):
- Every single Malay word used or transcribed must be verified against the Kamus Dewan Perdana or Kamus Dewan Edisi Keempat.
- Reject and correct informal, colloquial (bahasa pasar), and slang words into their formal, DBP-approved equivalents (e.g., change "bila" to "apabila", "kat" to "di", "macam" to "seperti", "dah" to "sudah", "nak" to "hendak").

2. Syntactic & Morphological Authority (Tatabahasa Dewan):
- Apply the rules of Tatabahasa Dewan strictly. Ensure flawless use of prefixes, suffixes, and circumfixes (imbuhan awalan, akhiran, apitan).
- Maintain correct sentence structures (Subjek + Predikat) and avoid direct translations from English syntax that violate Malay grammatical rules (e.g., avoid "di mana" used as a relative pronoun equivalent to "where").

3. Spelling Authority (Pedoman Ejaan):
- Adhere strictly to the Pedoman Umum Ejaan Bahasa Melayu. Ensure correct spacing, hyphenation (especially for kata ganda and imbuhan 'ke-'/'se-'), and capitalization.
- Process English or foreign loanwords (kata pinjaman) using the exact DBP standardized spelling (e.g., "komersial" not "komersil", "stesen" not "stesyen", "e-mel" not "emel", "insurans" not "insuran").

4. Registers & Domain-Specific Mastery (Laras Bahasa):
- Laras Akademik & Undang-Undang: Utilize the precise DBP-approved terminology for these fields. Ensure the tone remains highly formal, objective, and precise.
- Istilah Semasa: Utilize the Pusat Rujukan Persuratan Melayu (PRPM) database logic to accurately deploy technical terms (istilah).

5. Execution & Output:
- When transcribing spoken audio that contains informal Malay, you must automatically convert the transcript into standard, formal Bahasa Melayu (Bahasa Baku) without altering the speaker's original meaning.
- Ensure all generated summaries, action items, and structural elements are in flawless, professional DBP-standard Malay.

BILINGUAL & CONTEXTUAL RULES:
1. Bilingual Proficiency & Code-Switching: Flawlessly understand and transcribe both English and Bahasa Melayu. Capture natural code-switching accurately without mistranslating or losing intent.
2. Contextual Accuracy: Accurately capture specialized terminology, academic terms, and legal jargon. Do not forcefully translate terms or acronyms natively used in their original language within the specific professional context.
3. Speaker Diarization & Language Detection: Label each speaker clearly (Speaker 1, Speaker 2, etc.) with a timestamp [HH:MM:SS] and detected language (Language: [Detected Language]).

TRANSCRIPTION GUIDELINES:
- Clean Verbatim: Transcribe spoken words but convert informal Malay to DBP-compliant formal Malay. Omit distracting filler words unless significant.
- Language Preservation: Transcribe spoken words in the language they were spoken (English or DBP-compliant Malay).
- Punctuation & Readability: Apply proper punctuation and capitalization.
- Unintelligible Audio: Insert "[inaudible]" or "[inaudible - approximate timestamp]".

OUTPUT FORMAT REQUIRED:
You must structure your final output exactly as follows:

# Meeting Transcript
**Context/Topic:** [Extract from audio or prompt]
**Identified Participants:** [List speakers]

---
**[HH:MM:SS] Speaker 1 (Language: [Detected Language]):** [Transcription of dialogue...]

**[HH:MM:SS] Speaker 2 (Language: [Detected Language]):** [Transcription of dialogue...]
---

# Executive Summary
## Context & Participants
- Briefly describe the meeting's purpose and list identified participants.

## Key Decisions
- List the primary decisions made, especially those with legal, professional, or academic implications in a Malaysian context.

## Main Discussion Points
- Summarize core arguments and topics. Ensure DBP-compliant terminology is used for Malay concepts.

## Action Items
- List specific tasks assigned, including responsible persons and deadlines. Use "Tindakan" for Malay contexts if appropriate.
`;
};

const getGroundedSystemInstruction = (context: TranscriptionContext) => {
  return `
${getSystemInstruction(context)}

ADDITIONAL DIRECTIVES FOR GROUNDING:
1. Use Google Search to verify any factual claims, dates, or recent events mentioned in the audio.
2. Use Google Maps to verify any locations, addresses, or geographical references mentioned in the audio.
3. If you find discrepancies between the audio and grounded data, note them in the "Executive Summary" under a new section called "Grounded Verification".
`;
};

export const transcribeAudioStream = async function* (
  base64Audio: string,
  mimeType: string,
  context: TranscriptionContext = 'general',
  useGrounding: boolean = true
): AsyncGenerator<string> {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is available.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Use gemini-2.5-flash for combined grounding support as requested
  const modelId = useGrounding ? "gemini-2.5-flash" : "gemini-3-flash-preview";

  try {
    const response = await ai.models.generateContentStream({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: `Process the attached audio file based on the ${context} context rules provided. Apply any additional context, names, or specific jargon provided by the user alongside the file to ensure maximum accuracy.`,
          },
        ],
      },
      config: {
        systemInstruction: useGrounding ? getGroundedSystemInstruction(context) : getSystemInstruction(context),
        tools: useGrounding ? [
          { googleSearch: {} },
          { googleMaps: {} }
        ] : undefined
      },
    });

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }

  } catch (error) {
    console.error("Gemini Streaming Transcription Error:", error);
    throw error;
  }
};

export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string,
  context: TranscriptionContext = 'general'
): Promise<TranscriptionResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is available.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-flash-preview";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: `Process the attached audio file based on the ${context} context rules provided. Apply any additional context, names, or specific jargon provided by the user alongside the file to ensure maximum accuracy.`,
          },
        ],
      },
      config: {
        systemInstruction: getSystemInstruction(context),
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text received from Gemini.");

    return { markdown: text };

  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    throw error;
  }
};
