import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PromptHistoryProps {
  userId: string;
}

export const PromptHistory = ({ userId }: PromptHistoryProps) => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    try {
      // Get user's project
      const { data: projects } = await (supabase as any)
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!projects || projects.length === 0) return;

      const pid = projects[0].id;
      setProjectId(pid);

      // Get prompts
      const { data, error } = await supabase.functions.invoke('prompt-architect', {
        body: {
          action: 'get_history',
          project_id: pid,
        },
      });

      if (error) throw error;

      setPrompts(data.prompts || []);
    } catch (error: any) {
      console.error('Error loading history:', error);
      toast({
        title: "Error",
        description: "Failed to load prompt history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (prompt: any) => {
    // Store in localStorage and trigger display
    localStorage.setItem('latestPrompt', JSON.stringify({
      prompt: prompt.synthesized_prompt,
      scores: prompt.rubric_scores || {},
      id: prompt.id,
      references: {},
    }));
    window.dispatchEvent(new CustomEvent('promptGenerated'));

    toast({
      title: "Prompt loaded",
      description: "Check the Result tab to view",
    });
  };

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Loading...</div>;
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 space-y-2">
        <p className="text-sm">No prompts yet</p>
        <p className="text-xs">Generate your first prompt to get started</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-3">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2">
                  {prompt.user_question || "Untitled Prompt"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {prompt.output_format || "text"}
                  </Badge>
                  {prompt.total_score && (
                    <Badge 
                      variant={prompt.total_score >= 0.85 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {Math.round(prompt.total_score * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                onClick={() => handleView(prompt)}
                variant="ghost"
                size="icon"
                className="shrink-0"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
              </div>
              {prompt.win_rate > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {Math.round(prompt.win_rate * 100)}% win rate
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
