import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, AlertTriangle, ShieldCheck } from "lucide-react";
import React, { useState } from "react";

interface PlagiarismMatch {
  text: string;
  startIndex?: number | null;
  endIndex?: number | null;
  similarity: number;
  reason?: string;
}

interface PlagiarismMatchResult {
  plagiarismPercentage: number;
  matches: PlagiarismMatch[];
}

interface PlagiarismResultsProps {
  isChecking: boolean;
  progress: number;
  result?: PlagiarismMatchResult | null;
  originalText?: string;
}

const formatNumber = (num: number | undefined | null): string =>
  typeof num === "number" ? num.toFixed(1) : "0.0";

const getScoreColor = (percentage: number | undefined | null): string => {
  const score = typeof percentage === "number" ? percentage : 0;
  if (score > 50) return "text-red-500";
  if (score > 20) return "text-orange-500";
  return "text-green-500";
};

const getScoreVerdict = (percentage: number | undefined | null) => {
  const score = typeof percentage === "number" ? percentage : 0;
  if (score > 50) return { label: "High similarity detected", icon: AlertTriangle, color: "text-red-500" };
  if (score > 20) return { label: "Moderate similarity", icon: AlertTriangle, color: "text-orange-500" };
  return { label: "Looks original", icon: ShieldCheck, color: "text-green-500" };
};

function hasValidSpan(match: PlagiarismMatch): boolean {
  return (
    typeof match.startIndex === "number" &&
    typeof match.endIndex === "number" &&
    match.endIndex > match.startIndex
  );
}

export function PlagiarismResults({
  isChecking,
  progress,
  result,
  originalText,
}: PlagiarismResultsProps) {
  const [copied, setCopied] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number | null>(null);

  if (!isChecking && !result) return null;

  const highlightPlagiarizedText = (
    text: string,
    matches: PlagiarismMatch[]
  ): React.ReactNode => {
    if (!text) return null;

    const spanned = matches.filter(hasValidSpan);
    if (spanned.length === 0) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>;
    }

    const sorted = [...spanned].sort(
      (a, b) => (a.startIndex as number) - (b.startIndex as number)
    );

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((match, index) => {
      const startIndex = match.startIndex as number;
      const endIndex = match.endIndex as number;

      if (startIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>{text.substring(lastIndex, startIndex)}</span>
        );
      }

      const isActive = activeMatchIndex === index;
      elements.push(
        <button
          type="button"
          key={`highlight-${index}`}
          onClick={() => setActiveMatchIndex(isActive ? null : index)}
          aria-label={`Match ${index + 1}: ${formatNumber(match.similarity)}% similarity`}
          className={`inline px-1 py-0.5 rounded transition-colors text-left ${
            isActive
              ? "bg-red-300 dark:bg-red-800/60 ring-2 ring-red-500"
              : "bg-red-200 dark:bg-red-900/40 hover:bg-red-300 dark:hover:bg-red-800/60"
          } text-red-900 dark:text-red-200`}
        >
          {text.substring(startIndex, endIndex)}
        </button>
      );

      lastIndex = Math.max(lastIndex, endIndex);
    });

    if (lastIndex < text.length) {
      elements.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return <div className="text-sm leading-relaxed whitespace-pre-wrap">{elements}</div>;
  };

  const buildReportText = (): string => {
    if (!result) return "";
    const lines: string[] = [];
    lines.push("Plagiarism Check Report");
    lines.push("=======================");
    lines.push("");
    lines.push(`Plagiarism Score: ${formatNumber(result.plagiarismPercentage)}%`);
    lines.push(`Verdict: ${getScoreVerdict(result.plagiarismPercentage).label}`);
    lines.push("");
    if (result.matches.length === 0) {
      lines.push("No plagiarism matches detected.");
    } else {
      lines.push(`Matches detected: ${result.matches.length}`);
      lines.push("");
      result.matches.forEach((match, i) => {
        lines.push(`Match ${i + 1} — Similarity: ${formatNumber(match.similarity)}%`);
        if (match.reason) lines.push(`Reason: ${match.reason}`);
        lines.push(`Text: ${match.text}`);
        lines.push("");
      });
    }
    if (originalText) {
      lines.push("Analyzed Text:");
      lines.push("--------------");
      lines.push(originalText);
    }
    return lines.join("\n");
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; silently ignore.
    }
  };

  const handleDownloadReport = () => {
    const blob = new Blob([buildReportText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plagiarism-report-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const verdict = result ? getScoreVerdict(result.plagiarismPercentage) : null;
  const VerdictIcon = verdict?.icon;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>
          {isChecking ? "Checking for plagiarism..." : "Plagiarism Check Results"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isChecking ? (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {formatNumber(progress)}% complete
            </p>
          </div>
        ) : (
          result && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border bg-muted/30">
                <div className="flex items-center gap-3">
                  {VerdictIcon && verdict && (
                    <VerdictIcon className={`h-6 w-6 ${verdict.color}`} />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Plagiarism Score</p>
                    <p
                      className={`text-3xl font-bold ${getScoreColor(
                        result.plagiarismPercentage
                      )}`}
                    >
                      {formatNumber(result.plagiarismPercentage)}%
                    </p>
                  </div>
                </div>
                {verdict && (
                  <p className={`text-sm font-medium ${verdict.color}`}>{verdict.label}</p>
                )}
              </div>

              {originalText && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Analyzed Text</h4>
                    {result.matches.filter(hasValidSpan).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Click highlighted text to see details
                      </p>
                    )}
                  </div>
                  <div className="p-4 border rounded-lg max-h-72 overflow-y-auto bg-background">
                    {highlightPlagiarizedText(originalText, result.matches)}
                  </div>
                </div>
              )}

              {result.matches.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    Detected Matches ({result.matches.length})
                  </h4>
                  <ul className="space-y-2">
                    {result.matches.map((match, i) => {
                      const isActive = activeMatchIndex === i;
                      const isClickable = hasValidSpan(match);
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() =>
                              isClickable
                                ? setActiveMatchIndex(isActive ? null : i)
                                : undefined
                            }
                            disabled={!isClickable}
                            className={`w-full text-left p-3 border rounded-lg transition-colors ${
                              isActive
                                ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                                : "border-border bg-background hover:bg-muted/40"
                            } ${!isClickable ? "cursor-default" : "cursor-pointer"}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground line-clamp-2">
                                  &ldquo;{match.text}&rdquo;
                                </p>
                                {match.reason && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {match.reason}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`text-sm font-semibold whitespace-nowrap ${getScoreColor(
                                  match.similarity
                                )}`}
                              >
                                {formatNumber(match.similarity)}%
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    No plagiarism matches detected in the analyzed text.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyReport}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Report
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReport}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
