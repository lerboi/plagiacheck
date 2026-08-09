import type { MetadataRoute } from "next"

const BASE_URL = "https://www.plagiacheck.online"

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    // Home (plagiarism checker / PlagiaAI)
    "/",
    // Writing tools
    "/plagiarism-checker",
    "/ai-detector",
    "/ai-humanizer",
    "/paraphraser",
    "/summarizer",
    "/grammar-checker",
    "/word-counter",
    // Image & visual tools
    "/image-to-text",
    "/infographic-generator",
    "/thumbnail-generator",
    "/chart-generator",
    // Voice & audio tools
    "/speech-to-text",
    "/text-to-speech",
    "/voice-to-essay",
    "/audio-summarizer",
    // Other public pages
    "/all-tools",
    "/pricing",
    "/privacy",
    "/terms",
  ]

  return routes.map((route) => ({
    url: `${BASE_URL}${route === "/" ? "" : route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/pricing" || route === "/all-tools" ? 0.8 : 0.6,
  }))
}
