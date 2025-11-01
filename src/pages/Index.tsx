import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterviewWizard } from "@/components/InterviewWizard";
import { PromptDisplay } from "@/components/PromptDisplay";
import { PromptHistory } from "@/components/PromptHistory";
import { AuthForm } from "@/components/AuthForm";
import { Sparkles, LogOut } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out successfully",
      description: "Come back soon!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Prompt Architect™
              </h1>
              <p className="text-sm text-muted-foreground">Enterprise-Grade Prompt Engineering</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Create Your Prompt
                </CardTitle>
                <CardDescription>
                  Our AI will interview you, retrieve proven patterns, synthesize a production-ready prompt, and grade it against enterprise standards.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="create" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create">Create</TabsTrigger>
                    <TabsTrigger value="result">Result</TabsTrigger>
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
          </div>

          <div className="lg:col-span-1">
            <Card className="border-secondary/20 shadow-lg">
              <CardHeader>
                <CardTitle>Your Prompt Library</CardTitle>
                <CardDescription>
                  Access and reuse your best prompts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PromptHistory userId={user.id} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">RAG-Powered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Retrieves your best historical prompts and knowledge base patterns to inform synthesis.
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Self-Grading</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Every prompt is scored on Clarity, Completeness, Determinism, and Safety before delivery.
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Enterprise Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Production-ready prompts with consistent ROLE → OBJECTIVE → CONTEXT → EXECUTE skeleton.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
