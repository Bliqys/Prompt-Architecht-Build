import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface KnowledgeBaseProps {
  projectId: string;
}

export const KnowledgeBase = ({ projectId }: KnowledgeBaseProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const chunkText = (text: string, chunkSize = 1000): string[] => {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
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
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const chunks = chunkText(text);

        for (let j = 0; j < chunks.length; j++) {
          await supabase.from('kb_chunks').insert({
            project_id: projectId,
            text: chunks[j],
            chunk_index: j,
            source_name: file.name,
            metadata: {
              filename: file.name,
              chunk_total: chunks.length,
              uploaded_at: new Date().toISOString(),
            },
          });

          setUploadProgress(((i * chunks.length + j + 1) / (files.length * chunks.length)) * 100);
        }
      }

      toast({
        title: "Knowledge base updated",
        description: `Uploaded ${files.length} file(s) successfully`,
      });

      setFiles([]);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-8 glass elevated animate-slide-up">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold tracking-tight">Knowledge Base</h3>
          <p className="text-sm text-muted-foreground">
            Upload prompt engineering datasets for the AI to reference during generation
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
        </div>
      </div>
    </Card>
  );
};