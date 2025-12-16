// PDF Report Generator Utility
// Uses browser's built-in print functionality to generate PDFs

interface PlagiarismReportData {
  text: string
  plagiarismPercentage: number
  matches: { text: string; similarity: number }[]
  date: Date
}

interface AIDetectorReportData {
  text: string
  aiScore: number
  humanLikelihood: string
  analysis: string
  date: Date
}

interface GrammarReportData {
  originalText: string
  correctedText: string
  issues: { type: string; text: string; replacement: string; message: string }[]
  date: Date
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getBaseStyles(): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        padding: 40px;
        max-width: 800px;
        margin: 0 auto;
      }
      .header {
        border-bottom: 3px solid #3b82f6;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .logo {
        font-size: 28px;
        font-weight: bold;
        color: #3b82f6;
      }
      .report-title {
        font-size: 24px;
        margin-top: 10px;
        color: #374151;
      }
      .date {
        color: #6b7280;
        font-size: 14px;
        margin-top: 5px;
      }
      .section {
        margin-bottom: 30px;
      }
      .section-title {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      .score-box {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        padding: 25px;
        border-radius: 12px;
        text-align: center;
        margin-bottom: 20px;
      }
      .score-value {
        font-size: 48px;
        font-weight: bold;
      }
      .score-label {
        font-size: 16px;
        opacity: 0.9;
      }
      .score-green {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }
      .score-yellow {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }
      .score-red {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
      .text-box {
        background: #f9fafb;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 14px;
        max-height: 300px;
        overflow: hidden;
      }
      .match-item {
        padding: 15px;
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        margin-bottom: 10px;
        border-radius: 0 8px 8px 0;
      }
      .match-text {
        font-style: italic;
        color: #92400e;
      }
      .match-similarity {
        font-weight: 600;
        color: #b45309;
        margin-top: 5px;
      }
      .issue-item {
        padding: 12px 15px;
        margin-bottom: 10px;
        border-radius: 8px;
      }
      .issue-error {
        background: #fef2f2;
        border-left: 4px solid #ef4444;
      }
      .issue-warning {
        background: #fffbeb;
        border-left: 4px solid #f59e0b;
      }
      .issue-suggestion {
        background: #eff6ff;
        border-left: 4px solid #3b82f6;
      }
      .issue-message {
        font-size: 14px;
        color: #374151;
      }
      .issue-fix {
        margin-top: 8px;
        font-size: 13px;
      }
      .strike {
        text-decoration: line-through;
        color: #ef4444;
      }
      .replacement {
        color: #10b981;
        font-weight: 500;
      }
      .analysis-box {
        background: #f0fdf4;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #bbf7d0;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        color: #6b7280;
        font-size: 12px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-bottom: 20px;
      }
      .stat-item {
        text-align: center;
        padding: 15px;
        background: #f9fafb;
        border-radius: 8px;
      }
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #1f2937;
      }
      .stat-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
      }
      @media print {
        body {
          padding: 20px;
        }
        .text-box {
          max-height: none;
        }
      }
    </style>
  `
}

export function generatePlagiarismReport(data: PlagiarismReportData): void {
  const scoreClass = data.plagiarismPercentage < 20 ? "score-green" : data.plagiarismPercentage < 50 ? "score-yellow" : "score-red"

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Plagiarism Report - Plagiacheck</title>
      ${getBaseStyles()}
    </head>
    <body>
      <div class="header">
        <div class="logo">Plagiacheck</div>
        <div class="report-title">Plagiarism Detection Report</div>
        <div class="date">Generated on ${formatDate(data.date)}</div>
      </div>

      <div class="section">
        <div class="score-box ${scoreClass}">
          <div class="score-value">${data.plagiarismPercentage}%</div>
          <div class="score-label">Plagiarism Detected</div>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${data.text.split(/\s+/).filter(Boolean).length}</div>
            <div class="stat-label">Words</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.text.length}</div>
            <div class="stat-label">Characters</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.matches.length}</div>
            <div class="stat-label">Matches Found</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Analyzed Text</div>
        <div class="text-box">${data.text.substring(0, 1000)}${data.text.length > 1000 ? "..." : ""}</div>
      </div>

      ${data.matches.length > 0 ? `
      <div class="section">
        <div class="section-title">Potential Matches (${data.matches.length})</div>
        ${data.matches.map((match, i) => `
          <div class="match-item">
            <div class="match-text">"${match.text}"</div>
            <div class="match-similarity">${match.similarity}% similarity</div>
          </div>
        `).join("")}
      </div>
      ` : ""}

      <div class="footer">
        <p>This report was generated by Plagiacheck - AI-Powered Plagiarism Detection</p>
        <p>www.plagiacheck.online</p>
      </div>
    </body>
    </html>
  `

  openPrintWindow(html, "Plagiarism_Report")
}

export function generateAIDetectorReport(data: AIDetectorReportData): void {
  const scoreClass = data.aiScore < 30 ? "score-green" : data.aiScore < 70 ? "score-yellow" : "score-red"

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Detection Report - Plagiacheck</title>
      ${getBaseStyles()}
    </head>
    <body>
      <div class="header">
        <div class="logo">Plagiacheck</div>
        <div class="report-title">AI Content Detection Report</div>
        <div class="date">Generated on ${formatDate(data.date)}</div>
      </div>

      <div class="section">
        <div class="score-box ${scoreClass}">
          <div class="score-value">${data.aiScore}%</div>
          <div class="score-label">AI Probability</div>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${data.text.split(/\s+/).filter(Boolean).length}</div>
            <div class="stat-label">Words</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.text.length}</div>
            <div class="stat-label">Characters</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.humanLikelihood}</div>
            <div class="stat-label">Verdict</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Analysis Summary</div>
        <div class="analysis-box">
          <p>${data.analysis}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Analyzed Text</div>
        <div class="text-box">${data.text.substring(0, 1000)}${data.text.length > 1000 ? "..." : ""}</div>
      </div>

      <div class="footer">
        <p>This report was generated by Plagiacheck - AI-Powered Content Detection</p>
        <p>www.plagiacheck.online</p>
      </div>
    </body>
    </html>
  `

  openPrintWindow(html, "AI_Detection_Report")
}

export function generateGrammarReport(data: GrammarReportData): void {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Grammar Check Report - Plagiacheck</title>
      ${getBaseStyles()}
    </head>
    <body>
      <div class="header">
        <div class="logo">Plagiacheck</div>
        <div class="report-title">Grammar Check Report</div>
        <div class="date">Generated on ${formatDate(data.date)}</div>
      </div>

      <div class="section">
        <div class="score-box ${data.issues.length === 0 ? "score-green" : data.issues.length < 5 ? "score-yellow" : "score-red"}">
          <div class="score-value">${data.issues.length}</div>
          <div class="score-label">Issues Found</div>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${data.issues.filter(i => i.type === "error").length}</div>
            <div class="stat-label">Errors</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.issues.filter(i => i.type === "warning").length}</div>
            <div class="stat-label">Warnings</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.issues.filter(i => i.type === "suggestion").length}</div>
            <div class="stat-label">Suggestions</div>
          </div>
        </div>
      </div>

      ${data.issues.length > 0 ? `
      <div class="section">
        <div class="section-title">Issues Found</div>
        ${data.issues.map((issue, i) => `
          <div class="issue-item issue-${issue.type}">
            <div class="issue-message">${issue.message}</div>
            <div class="issue-fix">
              <span class="strike">${issue.text}</span>
              <span> → </span>
              <span class="replacement">${issue.replacement}</span>
            </div>
          </div>
        `).join("")}
      </div>
      ` : ""}

      <div class="section">
        <div class="section-title">Original Text</div>
        <div class="text-box">${data.originalText.substring(0, 800)}${data.originalText.length > 800 ? "..." : ""}</div>
      </div>

      <div class="section">
        <div class="section-title">Corrected Text</div>
        <div class="text-box" style="background: #f0fdf4; border-color: #bbf7d0;">${data.correctedText.substring(0, 800)}${data.correctedText.length > 800 ? "..." : ""}</div>
      </div>

      <div class="footer">
        <p>This report was generated by Plagiacheck - AI-Powered Grammar Checker</p>
        <p>www.plagiacheck.online</p>
      </div>
    </body>
    </html>
  `

  openPrintWindow(html, "Grammar_Report")
}

function openPrintWindow(html: string, filename: string): void {
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }
}
