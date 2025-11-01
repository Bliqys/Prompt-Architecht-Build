import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, CheckCircle, FileText, Award } from "lucide-react";

export const PromptDisplay = () => {
  const [promptData, setPromptData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('latestPrompt');
    if (stored) {
      setPromptData(JSON.parse(stored));
    }

    const handlePromptGenerated = () => {
      const stored = localStorage.getItem('latestPrompt');
      if (stored) {
        setPromptData(JSON.parse(stored));
      }
    };

    window.addEventListener('promptGenerated', handlePromptGenerated);
    return () => window.removeEventListener('promptGenerated', handlePromptGenerated);
  }, []);

  const handleCopy = async () => {
    if (!promptData?.final_prompt && !promptData?.prompt) return;

    try {
      await navigator.clipboard.writeText(promptData.final_prompt || promptData.prompt);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!promptData?.final_prompt && !promptData?.prompt) return;

    const blob = new Blob([promptData.final_prompt || promptData.prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Prompt saved to your device",
    });
  };

  if (!promptData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No prompt yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Complete the interview and generate your first enterprise-grade prompt
        </p>
      </div>
    );
  }

  const scores = promptData.scores || {};
  const totalScore = scores.total || 0;
  const scorePercentage = Math.round(totalScore * 100);

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return "text-green-600";
    if (score >= 0.75) return "text-blue-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "outline" => {
    if (score >= 0.9) return "default";
    if (score >= 0.75) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quality Scores */}
      <Card className="glass elevated-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <span className="text-sm font-medium">Overall Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(totalScore)}`}>
              {scorePercentage}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(scores).filter(([key]) => key !== 'total').map(([key, value]) => (
              <div key={key} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground">
                  {key.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center justify-between">
                  <Badge variant={getScoreBadgeVariant(value as number)} className="text-xs">
                    {Math.round((value as number) * 100)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {promptData.references && (
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Referenced {promptData.references.historical_count || 0} historical prompts • 
                {' '}{promptData.references.kb_count || 0} knowledge base patterns
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datasets */}
      {promptData.datasets && promptData.datasets.length > 0 && (
        <Card className="glass elevated-sm border-border/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Reference Datasets
              <Badge variant="outline" className="ml-auto">
                {promptData.datasets.length} datasets
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {promptData.datasets.map((dataset: any, idx: number) => (
              <div key={idx} className="p-4 bg-card rounded-lg border border-border/50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-mono text-sm font-semibold text-primary">
                    {dataset.name}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {dataset.entries?.length || 0} entries
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {dataset.description}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dataset.entries?.map((entry: string, i: number) => (
                    <div key={i} className="text-xs p-2 bg-muted/30 rounded border border-border/30">
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Prompt Text */}
      <Card className="glass elevated-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Generated Prompt
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono p-6 bg-muted/30 rounded-xl border border-border/50 overflow-x-auto">
            {promptData.final_prompt || promptData.prompt}
          </pre>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      {promptData.usage_instructions && (
        <Card className="glass elevated-sm border-border/50 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">📖 How to Use This Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {promptData.usage_instructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Usage Tips */}
      <Card className="glass elevated-sm border-border/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">💡 Usage Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs leading-relaxed text-muted-foreground">
            • Test your prompt with sample inputs to verify output quality
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            • Monitor performance and iterate based on real-world results
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            • Store successful prompts in your library for future reference
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
