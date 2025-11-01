import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";

interface InterviewWizardProps {
  userId: string;
}

const REQUIRED_FIELDS = ["Goal", "Audience", "Inputs", "Output_Format", "Constraints"];

const fieldValidation = z.object({
  Goal: z.string().min(10, "Goal must be at least 10 characters").max(500, "Goal must be less than 500 characters"),
  Audience: z.string().min(3, "Audience must be at least 3 characters").max(200, "Audience must be less than 200 characters"),
  Inputs: z.string().min(5, "Inputs must be at least 5 characters").max(2000, "Inputs must be less than 2000 characters"),
  Output_Format: z.string().min(2, "Output format required").max(50, "Format must be less than 50 characters"),
  Constraints: z.string().min(5, "Constraints must be at least 5 characters").max(2000, "Constraints must be less than 2000 characters"),
});

export const InterviewWizard = ({ userId }: InterviewWizardProps) => {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [projectId, setProjectId] = useState<string>("");
  const [userMessage, setUserMessage] = useState("");
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([]);
  const [collected, setCollected] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const { toast } = useToast();

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedCollected = sessionStorage.getItem('promptArchitect_collected');
    const savedConversation = sessionStorage.getItem('promptArchitect_conversation');
    const savedMessage = sessionStorage.getItem('promptArchitect_message');
    
    if (savedCollected) setCollected(JSON.parse(savedCollected));
    if (savedConversation) setConversation(JSON.parse(savedConversation));
    if (savedMessage) setUserMessage(savedMessage);
  }, []);

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('promptArchitect_collected', JSON.stringify(collected));
  }, [collected]);

  useEffect(() => {
    sessionStorage.setItem('promptArchitect_conversation', JSON.stringify(conversation));
  }, [conversation]);

  useEffect(() => {
    sessionStorage.setItem('promptArchitect_message', userMessage);
  }, [userMessage]);

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

    // Validate all fields before generation
    const errors: Record<string, string> = {};
    REQUIRED_FIELDS.forEach(field => {
      try {
        fieldValidation.shape[field as keyof typeof fieldValidation.shape].parse(collected[field] || "");
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors[field] = error.issues[0].message;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation errors",
        description: "Please fix the highlighted fields before generating",
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
      
      // Clear session storage after successful generation
      sessionStorage.removeItem('promptArchitect_collected');
      sessionStorage.removeItem('promptArchitect_conversation');
      sessionStorage.removeItem('promptArchitect_message');
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
    
    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Requirements</span>
            {collected && Object.keys(collected).length > 0 && (
              <Badge variant="outline" className="text-xs">
                Auto-saved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{completionPercentage}%</span>
            {Object.keys(collected).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Clear all form data? This cannot be undone.')) {
                    setCollected({});
                    setConversation([]);
                    setUserMessage("");
                    sessionStorage.removeItem('promptArchitect_collected');
                    sessionStorage.removeItem('promptArchitect_conversation');
                    sessionStorage.removeItem('promptArchitect_message');
                    toast({
                      title: "Form cleared",
                      description: "All data has been reset",
                    });
                  }
                }}
                className="h-8 text-xs"
              >
                Clear Form
              </Button>
            )}
          </div>
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
          <Label htmlFor="goal" className="text-sm font-medium">
            Goal * 
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              What do you want to achieve?
            </span>
          </Label>
          <Input
            id="goal"
            placeholder="Generate product descriptions for our e-commerce site"
            value={collected.Goal || ""}
            onChange={(e) => handleFieldUpdate('Goal', e.target.value)}
            className={`h-11 ${validationErrors.Goal ? 'border-destructive' : ''}`}
            maxLength={500}
          />
          {validationErrors.Goal && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.Goal}
            </div>
          )}
          {collected.Goal && !validationErrors.Goal && (
            <p className="text-xs text-muted-foreground">
              {collected.Goal.length}/500 characters
            </p>
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor="audience" className="text-sm font-medium">
            Audience *
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              Who will use this? Which channel?
            </span>
          </Label>
          <Input
            id="audience"
            placeholder="Marketing team, web content"
            value={collected.Audience || ""}
            onChange={(e) => handleFieldUpdate('Audience', e.target.value)}
            className={`h-11 ${validationErrors.Audience ? 'border-destructive' : ''}`}
            maxLength={200}
          />
          {validationErrors.Audience && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.Audience}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor="inputs" className="text-sm font-medium">
            Inputs *
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              What data will be provided?
            </span>
          </Label>
          <Textarea
            id="inputs"
            placeholder="Product specs, features, target demographics"
            value={collected.Inputs || ""}
            onChange={(e) => handleFieldUpdate('Inputs', e.target.value)}
            rows={3}
            className={`resize-none ${validationErrors.Inputs ? 'border-destructive' : ''}`}
            maxLength={2000}
          />
          {validationErrors.Inputs && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.Inputs}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor="format" className="text-sm font-medium">
            Output Format *
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              JSON, Markdown, plain text, etc.
            </span>
          </Label>
          <Input
            id="format"
            placeholder="JSON"
            value={collected.Output_Format || ""}
            onChange={(e) => handleFieldUpdate('Output_Format', e.target.value)}
            className={`h-11 ${validationErrors.Output_Format ? 'border-destructive' : ''}`}
            maxLength={50}
          />
          {validationErrors.Output_Format && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.Output_Format}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Label htmlFor="constraints" className="text-sm font-medium">
            Constraints *
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              Length limits, tone, safety requirements
            </span>
          </Label>
          <Textarea
            id="constraints"
            placeholder="Max 150 words, professional tone, avoid technical jargon"
            value={collected.Constraints || ""}
            onChange={(e) => handleFieldUpdate('Constraints', e.target.value)}
            rows={3}
            className={`resize-none ${validationErrors.Constraints ? 'border-destructive' : ''}`}
            maxLength={2000}
          />
          {validationErrors.Constraints && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.Constraints}
            </div>
          )}
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