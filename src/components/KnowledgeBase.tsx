import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Trash2, Loader2, Database } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface KnowledgeBaseProps {
  projectId: string;
}

export const KnowledgeBase = ({ projectId }: KnowledgeBaseProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [kbCount, setKbCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [kbSources, setKbSources] = useState<Array<{ source_name: string; chunk_count: number }>>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch current KB chunk count and sources
  useEffect(() => {
    const fetchKBData = async () => {
      try {
        const { count, error } = await supabase
          .from('kb_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId);
        
        if (error) throw error;
        setKbCount(count || 0);

        // Fetch unique sources with chunk counts
        const { data: sourcesData, error: sourcesError } = await supabase
          .from('kb_chunks')
          .select('source_name')
          .eq('project_id', projectId);

        if (sourcesError) throw sourcesError;

        // Group by source_name and count chunks
        const sourceMap = new Map<string, number>();
        sourcesData?.forEach((row) => {
          const count = sourceMap.get(row.source_name) || 0;
          sourceMap.set(row.source_name, count + 1);
        });

        const sources = Array.from(sourceMap.entries()).map(([source_name, chunk_count]) => ({
          source_name,
          chunk_count,
        }));

        setKbSources(sources);
      } catch (error) {
        console.error('Error fetching KB data:', error);
      } finally {
        setLoadingCount(false);
      }
    };

    fetchKBData();
  }, [projectId, uploading, deleting]);

  const chunkText = (text: string, chunkSize = 1000): string[] => {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      let totalChunks = 0;
      let processedChunks = 0;

      // First pass: count total chunks
      for (const file of files) {
        const text = await file.text();
        const chunks = chunkText(text, 1000);
        totalChunks += chunks.length;
      }

      console.log(`Uploading ${files.length} file(s) with ${totalChunks} total chunks to project ${projectId}`);

      // Second pass: upload chunks with embeddings
      for (const file of files) {
        const text = await file.text();
        const chunks = chunkText(text, 1000);
        
        console.log(`Processing file: ${file.name} (${chunks.length} chunks)`);

        for (let i = 0; i < chunks.length; i++) {
          // Generate embedding for this chunk
          let embedding = null;
          try {
            const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
              body: { text: chunks[i] }
            });
            
            if (!embeddingError && embeddingData?.embedding) {
              embedding = embeddingData.embedding;
            } else {
              console.warn('Embedding generation failed:', embeddingError);
            }
          } catch (e) {
            console.warn('Embedding error:', e);
          }

          const { error } = await supabase.from('kb_chunks').insert({
            project_id: projectId,
            text: chunks[i],
            source_name: file.name,
            chunk_index: i,
            embedding: embedding,
            metadata: {
              file_size: file.size,
              file_type: file.type,
              total_chunks: chunks.length,
              upload_timestamp: new Date().toISOString(),
              has_embedding: !!embedding,
            },
          });

          if (error) {
            console.error('Error uploading chunk:', error);
            throw error;
          }

          processedChunks++;
          setUploadProgress((processedChunks / totalChunks) * 100);
        }
      }

      toast({
        title: "Knowledge Base Updated",
        description: `Successfully uploaded ${files.length} file(s) with ${totalChunks} vector-embedded chunks`,
      });

      setFiles([]);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload knowledge base files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSource = async (sourceName: string) => {
    setDeleting(sourceName);
    try {
      const { error } = await supabase
        .from('kb_chunks')
        .delete()
        .eq('project_id', projectId)
        .eq('source_name', sourceName);

      if (error) throw error;

      toast({
        title: "Dataset Removed",
        description: `Successfully deleted ${sourceName} from knowledge base`,
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete dataset",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card className="p-8 glass elevated animate-slide-up">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold tracking-tight">Knowledge Base</h3>
            {!loadingCount && (
              <Badge variant={kbCount > 0 ? "default" : "secondary"} className="gap-1.5">
                <Database className="w-3 h-3" />
                {kbCount} chunks
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Upload prompt engineering datasets, best practices, and examples. Files are automatically embedded using OpenAI for semantic search.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="file-upload"
              className="flex-1 cursor-pointer"
            >
              <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click to upload datasets</p>
                <p className="text-xs text-muted-foreground">TXT, JSON, CSV, MD files supported</p>
              </div>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".txt,.json,.csv,.md"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Selected files ({files.length})</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={uploading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Processing... {uploadProgress.toFixed(0)}%
                  </p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full h-12 text-base"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload to Knowledge Base
                  </>
                )}
              </Button>
            </div>
          )}

          {kbSources.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-border">
              <p className="text-sm font-medium">Existing Datasets</p>
              <div className="space-y-2">
                {kbSources.map((source) => (
                  <div
                    key={source.source_name}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{source.source_name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {source.chunk_count} chunks
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSource(source.source_name)}
                      disabled={deleting === source.source_name}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {deleting === source.source_name ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};