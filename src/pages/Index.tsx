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
      {/* Clean iOS-style header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold tracking-tight">
                  Prompt Architect
                </h1>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="gap-2 tap-feedback"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-6 py-6 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
          {/* Left Column - Main Interface */}
          <div className="space-y-6">
            {/* Primary Card */}
            <Card className="overflow-hidden border-border/50 elevated-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl font-semibold tracking-tight mb-1">
                      Create Prompt
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      AI interviews you, retrieves proven patterns, and synthesizes production-ready prompts
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                <Tabs defaultValue="create" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50">
                    <TabsTrigger value="create" className="tap-feedback">
                      Create
                    </TabsTrigger>
                    <TabsTrigger value="result" className="tap-feedback">
                      Result
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="create" className="mt-6">
                    <InterviewWizard userId={user.id} />
                  </TabsContent>
                  <TabsContent value="result" className="mt-6">
                    <PromptDisplay />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Knowledge Base */}
            {projectId && <KnowledgeBase projectId={projectId} />}
          </div>

          {/* Right Column - Compact sidebar */}
          <div className="space-y-6">
            {/* Library */}
            <Card className="overflow-hidden border-border/50 elevated-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <History className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Library
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Your best prompts
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <PromptHistory userId={user.id} />
              </CardContent>
            </Card>

            {/* Feature Cards - Compact */}
            <div className="space-y-3">
              <Card className="border-border/50 elevated-xs hover-lift transition-all">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    RAG-Powered
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Retrieves historical prompts and knowledge base patterns to inform synthesis
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 elevated-xs hover-lift transition-all">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Self-Grading
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Every prompt scored on Clarity, Completeness, Determinism, and Safety
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 elevated-xs hover-lift transition-all">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Enterprise Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Production-ready with ROLE → OBJECTIVE → CONTEXT → EXECUTE skeleton
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