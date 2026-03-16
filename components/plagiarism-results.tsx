import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useState } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Eye,
  List,
  ChevronDown,
  ChevronUp,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlagiarismMatch {
  text: string;
  startIndex?: number;
  endIndex?: number;
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

export function PlagiarismResults({ isChecking, progress, result, originalText }: PlagiarismResultsProps) {
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("highlighted");

  if (!isChecking && !result) return null;

  const formatNumber = (num: number | undefined | null): string => {
    return typeof num === 'number' ? num.toFixed(1) : '0.0';
  };

  const getScoreColor = (percentage: number): string => {
    if (percentage > 50) return "text-red-500";
    if (percentage > 20) return "text-orange-500";
    return "text-green-500";
  };

  const getScoreBgColor = (percentage: number): string => {
    if (percentage > 50) return "bg-red-500";
    if (percentage > 20) return "bg-orange-500";
    return "bg-green-500";
  };

  const getScoreLabel = (percentage: number): string => {
    if (percentage > 50) return "High plagiarism risk";
    if (percentage > 20) return "Moderate similarity";
    if (percentage > 5) return "Low similarity";
    return "Original content";
  };

  const getScoreIcon = (percentage: number) => {
    if (percentage > 50) return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (percentage > 20) return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getSeverityBadge = (similarity: number) => {
    if (similarity > 70) return { label: "High", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    if (similarity > 40) return { label: "Medium", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
    return { label: "Low", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" };
  };

  const handleCopyMatch = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const highlightPlagiarizedText = (text: string, matches: PlagiarismMatch[]): React.ReactNode => {
    if (!text || !matches || matches.length === 0) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>;
    }

    const sortedMatches = [...matches]
      .filter(match => match.startIndex !== undefined && match.endIndex !== undefined)
      .sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));

    if (sortedMatches.length === 0) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedMatches.forEach((match, index) => {
      const startIndex = match.startIndex || 0;
      const endIndex = match.endIndex || 0;

      if (startIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`} className="text-foreground">
            {text.substring(lastIndex, startIndex)}
          </span>
        );
      }

      const severity = getSeverityBadge(match.similarity);

      elements.push(
        <span
          key={`highlight-${index}`}
          className={`relative inline bg-red-100 dark:bg-red-900/30 border-b-2 border-red-400 dark:border-red-500 cursor-pointer transition-colors hover:bg-red-200 dark:hover:bg-red-900/50 group`}
          onClick={() => {
            setActiveTab("matches");
            setExpandedMatch(index);
          }}
        >
          {text.substring(startIndex, endIndex)}
          {/* Hover tooltip */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20 pointer-events-none shadow-lg">
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${
              match.similarity > 70 ? 'bg-red-400' : match.similarity > 40 ? 'bg-orange-400' : 'bg-yellow-400'
            }`} />
            {formatNumber(match.similarity)}% match — {severity.label} risk
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
          </span>
        </span>
      );

      lastIndex = endIndex;
    });

    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end" className="text-foreground">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <div className="text-sm leading-[1.8] whitespace-pre-wrap">{elements}</div>;
  };

  const score = result?.plagiarismPercentage ?? 0;
  const matchCount = result?.matches?.length ?? 0;
  const matchesWithPositions = result?.matches?.filter(m => m.startIndex !== undefined && m.endIndex !== undefined) ?? [];

  // Calculate total flagged characters
  const totalFlaggedChars = matchesWithPositions.reduce((sum, m) => {
    return sum + ((m.endIndex || 0) - (m.startIndex || 0));
  }, 0);
  const originalLength = originalText?.length || 1;
  const flaggedPercent = Math.min(100, (totalFlaggedChars / originalLength) * 100);

  return (
    <Card className="mt-4 border-2 overflow-hidden">
      {/* Checking state */}
      {isChecking && (
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-500 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Scanning for plagiarism</h3>
                <p className="text-sm text-muted-foreground">Analyzing your text against known sources...</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {progress < 30 ? 'Preparing analysis...' :
                   progress < 80 ? 'Running AI detection...' :
                   progress < 100 ? 'Finalizing results...' :
                   'Complete!'}
                </span>
                <span className="font-medium text-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Analysis steps */}
            <div className="space-y-2">
              {[
                { label: 'Text preprocessing', threshold: 10 },
                { label: 'Pattern analysis', threshold: 30 },
                { label: 'Source comparison', threshold: 60 },
                { label: 'Generating report', threshold: 90 },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-2 text-sm">
                  {progress >= step.threshold ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                  )}
                  <span className={progress >= step.threshold ? 'text-foreground' : 'text-muted-foreground'}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}

      {/* Results state */}
      {!isChecking && result && (
        <>
          {/* Score Header */}
          <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 border-b bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* Score Circle */}
              <div className="flex items-center gap-4 sm:gap-0">
                <div className="relative flex-shrink-0">
                  <svg className="w-20 h-20 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8"
                      className="text-gray-200 dark:text-gray-800" />
                    <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                      className={getScoreBgColor(score)}
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - score / 100)}`}
                      style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-xl sm:text-2xl font-bold ${getScoreColor(score)}`}>
                      {Math.round(score)}%
                    </span>
                  </div>
                </div>

                {/* Mobile: Score info inline */}
                <div className="sm:hidden flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getScoreIcon(score)}
                    <h3 className="font-semibold text-foreground text-sm">{getScoreLabel(score)}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {matchCount === 0
                      ? 'No potentially plagiarized segments were detected.'
                      : `Found ${matchCount} flagged segment${matchCount !== 1 ? 's' : ''} covering ~${flaggedPercent.toFixed(1)}% of text.`
                    }
                  </p>
                </div>
              </div>

              {/* Desktop: Score info + stats */}
              <div className="hidden sm:block flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getScoreIcon(score)}
                  <h3 className="font-semibold text-foreground">{getScoreLabel(score)}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {matchCount === 0
                    ? 'No potentially plagiarized segments were detected in your text.'
                    : `Found ${matchCount} flagged segment${matchCount !== 1 ? 's' : ''} covering approximately ${flaggedPercent.toFixed(1)}% of your text.`
                  }
                </p>

                {/* Quick stats */}
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{originalText?.split(/\s+/).length || 0} words analyzed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{matchCount} flagged segment{matchCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Mobile stats row */}
              <div className="flex sm:hidden gap-3">
                <div className="flex-1 p-2.5 rounded-lg bg-white dark:bg-gray-800/50 border text-center">
                  <p className="text-xs text-muted-foreground">Words</p>
                  <p className="text-sm font-semibold text-foreground">{originalText?.split(/\s+/).length || 0}</p>
                </div>
                <div className="flex-1 p-2.5 rounded-lg bg-white dark:bg-gray-800/50 border text-center">
                  <p className="text-xs text-muted-foreground">Flagged</p>
                  <p className="text-sm font-semibold text-foreground">{matchCount}</p>
                </div>
                <div className="flex-1 p-2.5 rounded-lg bg-white dark:bg-gray-800/50 border text-center">
                  <p className="text-xs text-muted-foreground">Coverage</p>
                  <p className="text-sm font-semibold text-foreground">{flaggedPercent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed content */}
          {originalText && matchCount > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 sm:px-6 pt-3 sm:pt-4 border-b">
                <TabsList className="w-full sm:w-auto bg-gray-100 dark:bg-gray-800 h-9">
                  <TabsTrigger value="highlighted" className="text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Highlighted</span> Text
                  </TabsTrigger>
                  <TabsTrigger value="matches" className="text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
                    <List className="h-3.5 w-3.5" />
                    Matches
                    <span className="ml-1 text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full font-medium">
                      {matchCount}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Highlighted Text Tab */}
              <TabsContent value="highlighted" className="mt-0">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Click highlighted text to view match details. Hover for quick info.</span>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/30 border-b-2 border-red-400" />
                      <span className="text-muted-foreground">Flagged text</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-muted-foreground">High</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      <span className="text-muted-foreground">Medium</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-muted-foreground">Low</span>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 border-2 rounded-xl max-h-[400px] overflow-y-auto bg-white dark:bg-gray-950 scrollbar-thin">
                    {highlightPlagiarizedText(originalText, result.matches)}
                  </div>
                </div>
              </TabsContent>

              {/* Matches List Tab */}
              <TabsContent value="matches" className="mt-0">
                <div className="p-4 sm:p-6">
                  <div className="space-y-3">
                    {result.matches.map((match, index) => {
                      const severity = getSeverityBadge(match.similarity);
                      const isExpanded = expandedMatch === index;

                      return (
                        <div
                          key={index}
                          className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                            isExpanded ? 'border-gray-300 dark:border-gray-600 shadow-sm' : 'border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          {/* Match header */}
                          <button
                            onClick={() => setExpandedMatch(isExpanded ? null : index)}
                            className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <span className="text-xs font-bold text-muted-foreground w-5 text-center flex-shrink-0">
                                #{index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {match.text.length > 80 ? match.text.substring(0, 80) + '...' : match.text}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                              <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${severity.color}`}>
                                {severity.label}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-foreground w-10 text-right">
                                {Math.round(match.similarity)}%
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t bg-gray-50/50 dark:bg-gray-900/20">
                              <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                                {/* Flagged text */}
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Flagged Text</p>
                                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg">
                                    <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
                                      &ldquo;{match.text}&rdquo;
                                    </p>
                                  </div>
                                </div>

                                {/* Reason */}
                                {match.reason && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Why flagged</p>
                                    <p className="text-sm text-foreground leading-relaxed">{match.reason}</p>
                                  </div>
                                )}

                                {/* Match metadata */}
                                <div className="flex flex-wrap gap-2 sm:gap-4">
                                  <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-gray-800/50 border flex-1 min-w-[80px]">
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">Similarity</p>
                                    <p className="text-sm font-semibold text-foreground">{formatNumber(match.similarity)}%</p>
                                  </div>
                                  <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-gray-800/50 border flex-1 min-w-[80px]">
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">Word count</p>
                                    <p className="text-sm font-semibold text-foreground">{match.text.split(/\s+/).length}</p>
                                  </div>
                                  {match.startIndex !== undefined && match.endIndex !== undefined && (
                                    <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-gray-800/50 border flex-1 min-w-[80px]">
                                      <p className="text-[10px] sm:text-xs text-muted-foreground">Position</p>
                                      <p className="text-sm font-semibold text-foreground">
                                        {match.startIndex}–{match.endIndex}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8"
                                    onClick={() => handleCopyMatch(match.text, index)}
                                  >
                                    {copiedIndex === index ? (
                                      <><Check className="h-3 w-3 mr-1 text-green-500" /> Copied</>
                                    ) : (
                                      <><Copy className="h-3 w-3 mr-1" /> Copy text</>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* No matches but has original text */}
          {originalText && matchCount === 0 && (
            <div className="p-4 sm:p-6">
              <div className="p-4 sm:p-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl text-center space-y-2">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                <h4 className="font-semibold text-green-800 dark:text-green-300">No plagiarism detected</h4>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Your text appears to be original. No matching content was found in our analysis.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
