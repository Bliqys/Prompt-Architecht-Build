import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationList } from "@/components/ConversationList";
import { ConversationView } from "@/components/ConversationView";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { AuthForm } from "@/components/AuthForm";
import { Sparkles, LogOut, Database } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
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

  const handleNewConversation = () => {
    setSelectedConversationId(null);
  };

  const handleConversationCreated = (id: string) => {
    setSelectedConversationId(id);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* iOS-style header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
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

      {/* Main Content - Full Height Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List Sidebar */}
        <aside className="w-80 border-r border-border/50 hidden lg:block">
          <ConversationList
            userId={user.id}
            projectId={projectId}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            onNew={handleNewConversation}
          />
        </aside>

        {/* Main Conversation Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ConversationView
            conversationId={selectedConversationId}
            userId={user.id}
            projectId={projectId}
            onConversationCreated={handleConversationCreated}
          />
        </main>

        {/* Knowledge Base Sidebar */}
        <aside className="w-96 border-l border-border/50 hidden xl:block overflow-y-auto">
          <div className="p-6 space-y-6">
            {projectId && <KnowledgeBase projectId={projectId} />}
            
            {/* Feature Cards */}
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
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;