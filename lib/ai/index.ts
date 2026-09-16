/**
 * The single place the app picks an AI provider.
 *
 * Routes import `ai` from here and never touch a vendor SDK, so adding a
 * second provider later means writing one more adapter alongside
 * `lib/ai/gemini.ts` and choosing between them here — no route changes.
 */
import { geminiProvider } from "./gemini"
import type { AiProvider } from "./types"

export const ai: AiProvider = geminiProvider

export type {
  AiProvider,
  AiToolCall,
  AiToolDef,
  AiTurn,
  GenerateOptions,
  GenerateWithToolsOptions,
  ToolsResult,
} from "./types"
