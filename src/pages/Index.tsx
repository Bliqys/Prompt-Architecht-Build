import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterviewWizard } from "@/components/InterviewWizard";
import { PromptDisplay } from "@/components/PromptDisplay";
import { PromptHistory } from "@/components/PromptHistory";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { AuthForm } from "@/components/AuthForm";
import { Sparkles, LogOut, Database, History, Zap } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        fetchProjectId(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProjectId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProjectId = async (userId: string) => {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (projects && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "See you next time",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse space-y-2 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 glass backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Prompt Architect
                </h1>
                <p className="text-sm text-muted-foreground">Enterprise Prompt Engineering</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 lg:px-8 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Interface */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="glass elevated-xl border-border/50 animate-fade-in">
              <CardHeader className="pb-4">
                <CardTitle className="text-3xl font-semibold tracking-tight flex items-center gap-3">
                  <Zap className="w-7 h-7 text-primary" />
                  Create Prompt
                </CardTitle>
                <CardDescription className="text-base">
                  Our AI interviews you, retrieves proven patterns, synthesizes production-ready prompts, 
                  and grades them against enterprise standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="create" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/30">
                    <TabsTrigger value="create" className="data-[state=active]:bg-background">
                      Create
                    </TabsTrigger>
                    <TabsTrigger value="result" className="data-[state=active]:bg-background">
                      Result
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="create" className="mt-8">
                    <InterviewWizard userId={user.id} />
                  </TabsContent>
                  <TabsContent value="result" className="mt-8">
                    <PromptDisplay />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Knowledge Base */}
            {projectId && <KnowledgeBase projectId={projectId} />}
          </div>

          {/* Right Column - History & Features */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="glass elevated animate-fade-in border-border/50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Library
                </CardTitle>
                <CardDescription>
                  Your best prompts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PromptHistory userId={user.id} />
              </CardContent>
            </Card>

            {/* Feature Cards */}
            <div className="space-y-4">
              <Card className="glass elevated-sm animate-slide-up border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    RAG-Powered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Retrieves your best historical prompts and knowledge base patterns to inform synthesis
                  </p>
                </CardContent>
              </Card>

              <Card className="glass elevated-sm animate-slide-up border-border/50" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Self-Grading
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every prompt is scored on Clarity, Completeness, Determinism, and Safety before delivery
                  </p>
                </CardContent>
              </Card>

              <Card className="glass elevated-sm animate-slide-up border-border/50" style={{ animationDelay: '0.2s' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Enterprise Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Production-ready prompts with consistent ROLE → OBJECTIVE → CONTEXT → EXECUTE skeleton
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;