import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationListProps {
  userId: string;
  projectId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export const ConversationList = ({ userId, projectId, selectedId, onSelect, onNew }: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, [projectId]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r border-border/50">
      <div className="p-4 border-b border-border/50">
        <Button 
          onClick={onNew} 
          className="w-full gap-2 h-11"
          size="default"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a new one above</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left p-3 rounded-xl transition-all hover:bg-accent group ${
                  selectedId === conv.id ? 'bg-accent shadow-sm' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 mb-1">
                      {conv.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
