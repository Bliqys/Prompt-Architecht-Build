import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Copy, Download, Check } from "lucide-react";

export const PromptDisplay = () => {
  const [promptData, setPromptData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load from localStorage
    const loadPrompt = () => {
      const stored = localStorage.getItem('latestPrompt');
      if (stored) {
        setPromptData(JSON.parse(stored));
      }
    };

    loadPrompt();

    // Listen for new prompts
    const handler = () => loadPrompt();
    window.addEventListener('promptGenerated', handler);
    return () => window.removeEventListener('promptGenerated', handler);
  }, []);

  const handleCopy = async () => {
    if (!promptData?.prompt) return;
    
    try {
      await navigator.clipboard.writeText(promptData.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy prompt",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!promptData?.prompt) return;

    const blob = new Blob([promptData.prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "Prompt saved as text file",
    });
  };

  if (!promptData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">No prompt generated yet</p>
          <p className="text-sm">Complete the interview to generate your first prompt</p>
        </div>
      </div>
    );
  }

  const scores = promptData.scores || {};

  return (
    <div className="space-y-6">
      {/* Quality Scores */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Quality Assessment</h3>
              <Badge 
                variant={scores.total >= 0.85 ? "default" : scores.total >= 0.75 ? "secondary" : "destructive"}
                className="text-lg px-4 py-1"
              >
                {Math.round((scores.total || 0) * 100)}%
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(scores).map(([key, value]: [string, any]) => {
                if (key === 'total') return null;
                const score = Math.round(value * 100);
                return (
                  <div key={key} className="text-center space-y-1">
                    <div className="text-2xl font-bold text-primary">{score}%</div>
                    <div className="text-xs text-muted-foreground">{key.replace('_', ' ')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* References */}
      {promptData.references && (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>📚 Retrieved:</span>
          <span>{promptData.references.historical_count || 0} historical prompts</span>
          <span>•</span>
          <span>{promptData.references.kb_count || 0} KB patterns</span>
        </div>
      )}

      {/* Prompt Display */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" size="sm">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {promptData.prompt}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Usage Tips */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">💡 Usage Tips</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Copy this prompt directly into your AI system (ChatGPT, Claude, etc.)</li>
            <li>• The structure ensures consistent, high-quality outputs</li>
            <li>• Test with sample inputs and track performance</li>
            <li>• Iterate based on real-world results</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
