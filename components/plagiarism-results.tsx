import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface PlagiarismMatch {
  text: string
  similarity: number
}

interface PlagiarismResult {
  plagiarismPercentage: number
  matches: PlagiarismMatch[]
}

interface PlagiarismResultsProps {
  isChecking: boolean
  progress: number
  result: PlagiarismResult | null
}

export function PlagiarismResults({ isChecking, progress, result }: PlagiarismResultsProps) {
  if (!isChecking && !result) return null

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>
          {isChecking ? 'Checking for plagiarism...' : 'Plagiarism Check Results'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isChecking ? (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {progress}% complete
            </p>
          </div>
        ) : result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Plagiarism Score:</span>
              <span 
                className={`text-lg font-bold ${
                  result.plagiarismPercentage > 50 
                    ? 'text-red-500' 
                    : result.plagiarismPercentage > 20 
                    ? 'text-orange-500' 
                    : 'text-green-500'
                }`}
              >
                {result.plagiarismPercentage.toFixed(1)}%
              </span>
            </div>
            {result.matches.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Potential matches:</h4>
                <div className="space-y-2">
                  {result.matches.map((match, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{match.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Similarity: {match.similarity.toFixed(1)}%
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
  )
}

