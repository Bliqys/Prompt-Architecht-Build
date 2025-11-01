import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles, CheckCircle2 } from "lucide-react";

interface InterviewWizardProps {
  userId: string;
}

const REQUIRED_FIELDS = ["Goal", "Audience", "Inputs", "Output_Format", "Constraints"];

export const InterviewWizard = ({ userId }: InterviewWizardProps) => {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [projectId, setProjectId] = useState<string>("");
  const [userMessage, setUserMessage] = useState("");
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([]);
  const [collected, setCollected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initProject = async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (projects && projects.length > 0) {
        setProjectId(projects[0].id);
      } else {
        const { data: newProject } = await supabase
          .from('projects')
          .insert({ name: 'My First Project', user_id: userId })
          .select('id')
          .single();
        
        if (newProject) {
          setProjectId(newProject.id);
        }
      }
    };

    initProject();
  }, [userId]);

  const completionPercentage = Math.round(
    (Object.keys(collected).filter(k => REQUIRED_FIELDS.includes(k) && collected[k]).length / REQUIRED_FIELDS.length) * 100
  );

  const handleInterview = async () => {
    if (!userMessage.trim()) return;

    setLoading(true);
    const userMsg = userMessage;
    setUserMessage("");

    setConversation(prev => [...prev, { role: 'user', content: userMsg }]);

    const newCollected = { ...collected };
    const lowerMsg = userMsg.toLowerCase();
    
    if (!collected.Goal && (lowerMsg.includes('goal') || lowerMsg.includes('want') || lowerMsg.includes('need'))) {
      newCollected.Goal = userMsg;
    }
    if (!collected.Audience && (lowerMsg.includes('audience') || lowerMsg.includes('for '))) {
      newCollected.Audience = userMsg;
    }
    if (!collected.Inputs && lowerMsg.includes('input')) {
      newCollected.Inputs = userMsg;
    }
    if (!collected.Output_Format && (lowerMsg.includes('format') || lowerMsg.includes('json') || lowerMsg.includes('markdown'))) {
      newCollected.Output_Format = userMsg;
    }
    if (!collected.Constraints && lowerMsg.includes('constraint')) {
      newCollected.Constraints = userMsg;
    }

    setCollected(newCollected);

    try {
      const { data, error } = await supabase.functions.invoke('prompt-architect', {
        body: {
          action: 'interview',
          session_id: sessionId,
          user_message: userMsg,
          collected: newCollected,
        },
      });

      if (error) throw error;

      if (data.type === 'questions') {
        setConversation(prev => [...prev, { role: 'assistant', content: data.questions }]);
        setCollected(data.collected);
      } else if (data.type === 'ready') {
        setConversation(prev => [...prev, { role: 'assistant', content: data.message }]);
        setReadyToGenerate(true);
      }
    } catch (error: any) {
      console.error('Interview error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process interview",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Project not initialized",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('prompt-architect', {
        body: {
          action: 'generate',
          session_id: sessionId,
          project_id: projectId,
          user_message: 'Generate my prompt',
          collected,
        },
      });

      if (error) throw error;

      localStorage.setItem('latestPrompt', JSON.stringify(data));

      toast({
        title: "Success!",
        description: "Your prompt has been generated. Check the Result tab.",
      });

      window.dispatchEvent(new CustomEvent('promptGenerated'));
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate prompt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldUpdate = (field: string, value: string) => {
    setCollected(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Requirements</span>
          <span className="text-sm font-semibold">{completionPercentage}%</span>
        </div>
        <Progress value={completionPercentage} className="h-2.5" />
        <div className="flex flex-wrap gap-2">
          {REQUIRED_FIELDS.map(field => (
            <Badge 
              key={field} 
              variant={collected[field] ? "default" : "outline"}
              className="text-xs font-medium px-3 py-1"
            >
              {collected[field] && <CheckCircle2 className="w-3 h-3 mr-1.5" />}
              {field.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Conversation */}
      {conversation.length > 0 && (
        <div className="space-y-4 max-h-96 overflow-y-auto p-6 bg-muted/30 rounded-xl border border-border/50">
          {conversation.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border/50 shadow-sm'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Field Inputs */}
      <div className="grid gap-6">
        <div className="space-y-3">
          <Label htmlFor="goal" className="text-sm font-medium">Goal *</Label>
          <Input
            id="goal"
            placeholder="What do you want to achieve?"
            value={collected.Goal || ""}
            onChange={(e) => handleFieldUpdate('Goal', e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="audience" className="text-sm font-medium">Audience *</Label>
          <Input
            id="audience"
            placeholder="Who is this for? Which channel?"
            value={collected.Audience || ""}
            onChange={(e) => handleFieldUpdate('Audience', e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="inputs" className="text-sm font-medium">Inputs *</Label>
          <Textarea
            id="inputs"
            placeholder="What data/information will be provided?"
            value={collected.Inputs || ""}
            onChange={(e) => handleFieldUpdate('Inputs', e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="format" className="text-sm font-medium">Output Format *</Label>
          <Input
            id="format"
            placeholder="e.g., JSON, Markdown, plain text"
            value={collected.Output_Format || ""}
            onChange={(e) => handleFieldUpdate('Output_Format', e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="constraints" className="text-sm font-medium">Constraints *</Label>
          <Textarea
            id="constraints"
            placeholder="Length limits, tone, safety requirements, etc."
            value={collected.Constraints || ""}
            onChange={(e) => handleFieldUpdate('Constraints', e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {/* Chat Input */}
      <div className="flex gap-3">
        <Textarea
          placeholder="Describe your prompt needs or ask a question..."
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleInterview();
            }
          }}
          rows={3}
          disabled={loading}
          className="flex-1 resize-none"
        />
        <Button
          onClick={handleInterview}
          disabled={loading || !userMessage.trim()}
          size="icon"
          className="h-auto w-12 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Generate Button */}
      {(readyToGenerate || completionPercentage === 100) && (
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full h-14 text-base font-medium"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Enterprise Prompt
            </>
          )}
        </Button>
      )}
    </div>
  );
};