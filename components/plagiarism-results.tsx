import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PlagiarismMatch {
  text: string;
  similarity: number;
}

interface PlagiarismMatchResult {
  plagiarismPercentage: number;
  matches: PlagiarismMatch[];
}

interface PlagiarismResultsProps {
  isChecking: boolean;
  progress: number;
  result?: PlagiarismMatchResult | null;
}

export function PlagiarismResults({ isChecking, progress, result }: PlagiarismResultsProps) {
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
              {Array.isArray(result.matches) && result.matches.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Potential matches:</h4>
                  <div className="space-y-2">
                    {result.matches.map((match, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{match.text || 'No text available'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Similarity: {formatNumber(match.similarity)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        
      </CardContent>
    </Card>
  );
}