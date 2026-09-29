import type en from "../en"
import common from "./common.json"
import nav from "./nav.json"
import toolCatalog from "./tool-catalog.json"
import faq from "./faq.json"
import shell from "./shell.json"
import apiErrors from "./api-errors.json"
import home from "./home.json"
import plagiaAi from "./plagia-ai.json"
import plagiarismChecker from "./plagiarism-checker.json"
import aiDetector from "./ai-detector.json"
import aiHumanizer from "./ai-humanizer.json"
import paraphraser from "./paraphraser.json"
import summarizer from "./summarizer.json"
import grammarChecker from "./grammar-checker.json"
import wordCounter from "./word-counter.json"
import imageToText from "./image-to-text.json"
import infographicGenerator from "./infographic-generator.json"
import thumbnailGenerator from "./thumbnail-generator.json"
import chartGenerator from "./chart-generator.json"
import speechToText from "./speech-to-text.json"
import textToSpeech from "./text-to-speech.json"
import voiceToEssay from "./voice-to-essay.json"
import audioSummarizer from "./audio-summarizer.json"
import pdfReport from "./pdf-report.json"
import allTools from "./all-tools.json"
import auth from "./auth.json"
import history from "./history.json"
import privacy from "./privacy.json"
import terms from "./terms.json"
import pricing from "./pricing.json"
import billing from "./billing.json"
import checkoutResult from "./checkout-result.json"

const messages: typeof en = {
  Common: common,
  Nav: nav,
  ToolCatalog: toolCatalog,
  Faq: faq,
  Shell: shell,
  ApiErrors: apiErrors,
  Home: home,
  PlagiaAi: plagiaAi,
  PlagiarismChecker: plagiarismChecker,
  AiDetector: aiDetector,
  AiHumanizer: aiHumanizer,
  Paraphraser: paraphraser,
  Summarizer: summarizer,
  GrammarChecker: grammarChecker,
  WordCounter: wordCounter,
  ImageToText: imageToText,
  InfographicGenerator: infographicGenerator,
  ThumbnailGenerator: thumbnailGenerator,
  ChartGenerator: chartGenerator,
  SpeechToText: speechToText,
  TextToSpeech: textToSpeech,
  VoiceToEssay: voiceToEssay,
  AudioSummarizer: audioSummarizer,
  PdfReport: pdfReport,
  AllTools: allTools,
  Auth: auth,
  History: history,
  Privacy: privacy,
  Terms: terms,
  Pricing: pricing,
  Billing: billing,
  CheckoutResult: checkoutResult,
}

export default messages
