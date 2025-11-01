import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Award, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PromptHistoryProps {
  userId: string;
}

export const PromptHistory = ({ userId }: PromptHistoryProps) => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();

    const handlePromptGenerated = () => {
      fetchHistory();
    };

    window.addEventListener('promptGenerated', handlePromptGenerated);
    return () => window.removeEventListener('promptGenerated', handlePromptGenerated);
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId);

      if (!projects || projects.length === 0) {
        setLoading(false);
        return;
      }

      const projectIds = projects.map(p => p.id);

      const { data, error } = await supabase
        .from('prompt_records')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrompt = (e: React.MouseEvent, prompt: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Extract metadata fields
    const metadata = prompt.metadata || {};
    
    const promptData = {
      final_prompt: prompt.synthesized_prompt || prompt.prompt_text,
      prompt: prompt.synthesized_prompt || prompt.prompt_text,
      scores: prompt.scores,
      datasets: metadata.datasets || [],
      usage_instructions: metadata.usage_instructions || '',
    };
    
    // Dispatch event with data directly (no localStorage)
    window.dispatchEvent(new CustomEvent('promptGenerated', { detail: promptData }));
    
    // Switch to Result tab
    const resultTab = document.querySelector('[value="result"]') as HTMLElement;
    if (resultTab) {
      resultTab.click();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-sm text-muted-foreground">Loading history...</div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No prompts yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Generate your first prompt to see it here
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-3">
        {prompts.map((prompt) => {
          const totalScore = prompt.scores?.total || prompt.total_score || 0;
          const scorePercentage = Math.round(totalScore * 100);

          return (
            <Card
              key={prompt.id}
              className="p-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
              onClick={(e) => handleSelectPrompt(e, prompt)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelectPrompt(e as any, prompt);
                }
              }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 mb-1">
                      {(prompt.synthesized_prompt || prompt.prompt_text).substring(0, 60)}...
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={scorePercentage >= 85 ? "default" : "secondary"} className="text-xs">
                    <Award className="w-3 h-3 mr-1" />
                    {scorePercentage}%
                  </Badge>
                  {prompt.features && Object.keys(prompt.features).length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(prompt.features).length} features
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
};
