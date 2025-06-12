import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import React from "react";

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
  if (!isChecking && !result) return null;

  // Helper function to safely format numbers
  const formatNumber = (num: number | undefined | null): string => {
    return typeof num === 'number' ? num.toFixed(1) : '0.0';
  };

  // Helper function to get color based on percentage
  const getScoreColor = (percentage: number | undefined | null): string => {
    const score = typeof percentage === 'number' ? percentage : 0;
    if (score > 50) return "text-red-500";
    if (score > 20) return "text-orange-500";
    return "text-green-500";
  };

  // Function to highlight plagiarized text
  const highlightPlagiarizedText = (text: string, matches: PlagiarismMatch[]): React.ReactNode => {
    if (!text || !matches || matches.length === 0) {
      return <p className="text-sm leading-relaxed">{text}</p>;
    }

    // Sort matches by start index to process them in order
    const sortedMatches = [...matches]
      .filter(match => match.startIndex !== undefined && match.endIndex !== undefined)
      .sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));

    if (sortedMatches.length === 0) {
      return <p className="text-sm leading-relaxed">{text}</p>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedMatches.forEach((match, index) => {
      const startIndex = match.startIndex || 0;
      const endIndex = match.endIndex || 0;

      // Add text before the match
      if (startIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, startIndex)}
          </span>
        );
      }

      // Add highlighted match
      elements.push(
        <span
          key={`highlight-${index}`}
          className="bg-red-200 text-red-800 px-1 py-0.5 rounded relative group cursor-help"
          title={match.reason || `${formatNumber(match.similarity)}% similarity`}
        >
          {text.substring(startIndex, endIndex)}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            {match.reason || `${formatNumber(match.similarity)}% similarity`}
          </span>
        </span>
      );

      lastIndex = endIndex;
    });

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <div className="text-sm leading-relaxed">{elements}</div>;
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>
          {isChecking ? "Checking for plagiarism..." : "Plagiarism Check Results"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isChecking ? (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {formatNumber(progress)}% complete
            </p>
          </div>
        ) : 
          result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Plagiarism Score:</span>
                <span
                  className={`text-lg font-bold ${getScoreColor(result.plagiarismPercentage)}`}
                >
                  {formatNumber(result.plagiarismPercentage)}%
                </span>
              </div>

              {/* Highlighted Text Section */}
              {originalText && (
                <div className="space-y-2">
                  <h4 className="font-medium">Analyzed Text:</h4>
                  <div className="p-4 border rounded-lg max-h-60 overflow-y-auto">
                    {highlightPlagiarizedText(originalText, result.matches)}
                  </div>
                  {result.matches.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Hover over highlighted text to see similarity details
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        
      </CardContent>
    </Card>
  );
}