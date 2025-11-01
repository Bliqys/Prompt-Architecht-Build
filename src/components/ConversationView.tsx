import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, Send, Sparkles, CheckCircle2, AlertCircle, 
  Copy, Download, Award, FileText, CheckCircle, MessageSquare
} from "lucide-react";
import { z } from "zod";

interface Message {
  role: string;
  content: string;
  isPrompt?: boolean;
  promptData?: {
    final_prompt: string;
    scores?: any;
    datasets?: any[];
    usage_instructions?: string;
  };
}

interface ConversationViewProps {
  conversationId: string | null;
  userId: string;
  projectId: string;
  onConversationCreated: (id: string) => void;
}

const REQUIRED_FIELDS = ["Goal", "Audience", "Inputs", "Output_Format", "Constraints"];

const fieldValidation = z.object({
  Goal: z.string().min(10, "Goal must be at least 10 characters").max(500, "Goal must be less than 500 characters"),
  Audience: z.string().min(3, "Audience must be at least 3 characters").max(200, "Audience must be less than 200 characters"),
  Inputs: z.string().min(5, "Inputs must be at least 5 characters").max(2000, "Inputs must be less than 2000 characters"),
  Output_Format: z.string().min(2, "Output format required").max(50, "Format must be less than 50 characters"),
  Constraints: z.string().min(5, "Constraints must be at least 5 characters").max(2000, "Constraints must be less than 2000 characters"),
});

export const ConversationView = ({ conversationId, userId, projectId, onConversationCreated }: ConversationViewProps) => {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [collected, setCollected] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      // New conversation
      setMessages([]);
      setCollected({});
      setShowForm(true);
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Check if there's a prompt result
      const { data: promptRecord } = await supabase
        .from('prompt_records')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const loadedMessages: Message[] = data.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      if (promptRecord) {
        const metadata = promptRecord.metadata as any;
        loadedMessages.push({
          role: 'assistant',
          content: 'Here is your generated prompt:',
          isPrompt: true,
          promptData: {
            final_prompt: promptRecord.synthesized_prompt || promptRecord.prompt_text,
            scores: promptRecord.scores,
            datasets: metadata?.datasets || [],
            usage_instructions: metadata?.usage_instructions || '',
          },
        });
        setShowForm(false);
      }

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSubmitForm = async () => {
    // Validate all fields
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
        description: "Please fix the highlighted fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Create conversation title from Goal
    const title = collected.Goal.substring(0, 60) + (collected.Goal.length > 60 ? '...' : '');

    try {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          project_id: projectId,
          title,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Save initial message
      const initialMessage = `Goal: ${collected.Goal}\nAudience: ${collected.Audience}\nInputs: ${collected.Inputs}\nOutput Format: ${collected.Output_Format}\nConstraints: ${collected.Constraints}`;

      await supabase.from('conversation_messages').insert({
        conversation_id: conversation.id,
        role: 'user',
        content: initialMessage,
      });

      setMessages([{ role: 'user', content: initialMessage }]);

      // Generate prompt
      const { data, error } = await supabase.functions.invoke('prompt-architect', {
        body: {
          action: 'generate',
          session_id: sessionId,
          project_id: projectId,
          conversation_id: conversation.id,
          user_message: 'Generate my prompt',
          collected,
        },
      });

      if (error) throw error;

      // Save assistant response
      await supabase.from('conversation_messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Here is your generated prompt:',
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Here is your generated prompt:',
          isPrompt: true,
          promptData: data,
        },
      ]);

      // Update parent with conversation ID BEFORE hiding form
      onConversationCreated(conversation.id);
      setShowForm(false);

      toast({
        title: "Success!",
        description: "Your prompt has been generated",
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate prompt",
        variant: "destructive",
      });
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !conversationId) return;

    setLoading(true);
    const userMsg = userMessage;
    setUserMessage("");

    const newUserMessage = { role: 'user', content: userMsg };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      await supabase.from('conversation_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMsg,
      });

      // Get AI response
      const { data, error } = await supabase.functions.invoke('prompt-architect', {
        body: {
          action: 'interview',
          session_id: sessionId,
          user_message: userMsg,
          conversation_id: conversationId,
          collected: {},
        },
      });

      if (error) throw error;

      const assistantMessage = { role: 'assistant', content: data.questions || data.message };
      setMessages(prev => [...prev, assistantMessage]);

      await supabase.from('conversation_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage.content,
      });
    } catch (error: any) {
      console.error('Send message error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied!", description: "Prompt copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleDownload = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Prompt saved to your device" });
  };

  const handleFieldUpdate = (field: string, value: string) => {
    setCollected(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const completionPercentage = Math.round(
    (Object.keys(collected).filter(k => REQUIRED_FIELDS.includes(k) && collected[k]).length / REQUIRED_FIELDS.length) * 100
  );

  if (!conversationId && !showForm) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Select a conversation or start a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {showForm && !conversationId ? (
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Create New Prompt</h2>
              <p className="text-muted-foreground">Fill in the details to generate an enterprise-grade prompt</p>
            </div>

            {/* Progress */}
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

            {/* Form Fields */}
            <div className="grid gap-6">
              <div className="space-y-3">
                <Label htmlFor="goal">Goal * <span className="text-xs text-muted-foreground font-normal ml-2">What do you want to achieve?</span></Label>
                <Input
                  id="goal"
                  placeholder="Generate product descriptions for our e-commerce site"
                  value={collected.Goal || ""}
                  onChange={(e) => handleFieldUpdate('Goal', e.target.value)}
                  className={validationErrors.Goal ? 'border-destructive' : ''}
                  maxLength={500}
                />
                {validationErrors.Goal && (
                  <div className="flex items-center gap-2 text-destructive text-xs">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.Goal}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="audience">Audience * <span className="text-xs text-muted-foreground font-normal ml-2">Who will use this?</span></Label>
                <Input
                  id="audience"
                  placeholder="Marketing team, web content"
                  value={collected.Audience || ""}
                  onChange={(e) => handleFieldUpdate('Audience', e.target.value)}
                  className={validationErrors.Audience ? 'border-destructive' : ''}
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
                <Label htmlFor="inputs">Inputs * <span className="text-xs text-muted-foreground font-normal ml-2">What data will be provided?</span></Label>
                <Textarea
                  id="inputs"
                  placeholder="Product specs, features, target demographics"
                  value={collected.Inputs || ""}
                  onChange={(e) => handleFieldUpdate('Inputs', e.target.value)}
                  rows={3}
                  className={validationErrors.Inputs ? 'border-destructive' : ''}
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
                <Label htmlFor="format">Output Format * <span className="text-xs text-muted-foreground font-normal ml-2">JSON, Markdown, etc.</span></Label>
                <Input
                  id="format"
                  placeholder="JSON"
                  value={collected.Output_Format || ""}
                  onChange={(e) => handleFieldUpdate('Output_Format', e.target.value)}
                  className={validationErrors.Output_Format ? 'border-destructive' : ''}
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
                <Label htmlFor="constraints">Constraints * <span className="text-xs text-muted-foreground font-normal ml-2">Length limits, tone, etc.</span></Label>
                <Textarea
                  id="constraints"
                  placeholder="Max 150 words, professional tone, avoid technical jargon"
                  value={collected.Constraints || ""}
                  onChange={(e) => handleFieldUpdate('Constraints', e.target.value)}
                  rows={3}
                  className={validationErrors.Constraints ? 'border-destructive' : ''}
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

            <Button
              onClick={handleSubmitForm}
              disabled={loading || completionPercentage !== 100}
              className="w-full h-14 text-base font-medium"
              size="lg"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" />Generate Enterprise Prompt</>
              )}
            </Button>
          </div>
        </ScrollArea>
      ) : (
        <>
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  {msg.isPrompt && msg.promptData ? (
                    <div className="w-full space-y-6">
                      <div className="max-w-[85%] p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
                        <p className="text-sm">{msg.content}</p>
                      </div>

                      {/* Scores */}
                      {msg.promptData.scores && (
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
                              <span className="text-2xl font-bold text-primary">
                                {Math.round((msg.promptData.scores.total || 0) * 100)}%
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {Object.entries(msg.promptData.scores).filter(([key]) => key !== 'total').map(([key, value]) => (
                                <div key={key} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <Badge variant="default" className="text-xs w-fit">
                                    {Math.round((value as number) * 100)}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Prompt */}
                      <Card className="glass elevated-sm border-border/50">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-primary" />
                              Generated Prompt
                            </span>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleCopy(msg.promptData.final_prompt)} className="gap-2">
                                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied' : 'Copy'}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(msg.promptData.final_prompt)} className="gap-2">
                                <Download className="w-4 h-4" />
                                Download
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono p-6 bg-muted/30 rounded-xl border border-border/50 overflow-x-auto">
                            {msg.promptData.final_prompt}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className={`max-w-[85%] p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border/50 shadow-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {conversationId && !loading && (
            <div className="border-t border-border/50 p-4 bg-background/95 backdrop-blur-sm">
              <div className="max-w-4xl mx-auto flex gap-3">
                <Textarea
                  placeholder="Ask a follow-up question or request modifications..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  disabled={loading}
                  className="flex-1 resize-none"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !userMessage.trim()}
                  size="icon"
                  className="h-auto w-12 shrink-0"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
