import { useRef, useState, useCallback } from "react";
import { FileUp, FileText, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import {
  DOCUMENT_UPLOAD,
  validateDocumentFile,
} from "@/lib/validations/register";
import { cn } from "@/lib/utils";

export interface Step2_DocumentUploadProps {
  onNext: () => void;
  onBack: () => void;
  onStep2Complete?: (files: File[]) => void;
  defaultFiles?: File[];
}

type FileEntry = {
  id: string;
  file: File;
  error?: string;
  status: "pending" | "ready";
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const Step2_DocumentUpload = ({
  onNext,
  onBack,
  onStep2Complete,
  defaultFiles = [],
}: Step2_DocumentUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>(() =>
    defaultFiles.map((file, i) => {
      const result = validateDocumentFile(file);
      return {
        id: `default-${file.name}-${file.size}-${i}`,
        file,
        error: result.valid ? undefined : result.error,
        status: result.valid ? "ready" : "pending",
      };
    })
  );
  const [dragActive, setDragActive] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const processFiles = useCallback((fileList: FileList | null): FileEntry[] => {
    if (!fileList?.length) return [];
    const newEntries: FileEntry[] = [];
    const remaining = DOCUMENT_UPLOAD.maxFiles - entries.length;
    const toAdd = Math.min(fileList.length, remaining);

    for (let i = 0; i < toAdd; i++) {
      const file = fileList[i];
      const result = validateDocumentFile(file);
      newEntries.push({
        id: `${file.name}-${file.size}-${Date.now()}-${i}`,
        file,
        error: result.valid ? undefined : result.error,
        status: result.valid ? "ready" : "pending",
      });
    }
    return newEntries;
  }, [entries.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmitError(null);
    const added = processFiles(e.target.files);
    if (added.length > 0) setEntries((prev) => [...prev, ...added]);
    if (e.target.files?.length && added.length < e.target.files.length) {
      setSubmitError(`Max ${DOCUMENT_UPLOAD.maxFiles} files. Some were not added.`);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setSubmitError(null);
    const added = processFiles(e.dataTransfer.files);
    if (added.length > 0) setEntries((prev) => [...prev, ...added]);
    if (e.dataTransfer.files?.length && added.length < e.dataTransfer.files.length) {
      setSubmitError(`Max ${DOCUMENT_UPLOAD.maxFiles} files. Some were not added.`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSubmitError(null);
  };

  const validFiles = entries.filter((e) => e.status === "ready" && !e.error);
  const canProceed = validFiles.length > 0;

  const handleNext = () => {
    if (!canProceed) {
      setSubmitError("Please add at least one valid document (PDF, JPG, PNG, or WebP under 5MB).");
      return;
    }
    setSubmitError(null);
    onStep2Complete?.(validFiles.map((e) => e.file));
    onNext();
  };

  const acceptStr = DOCUMENT_UPLOAD.acceptedExtensions.join(",");
  const maxSizeMB = DOCUMENT_UPLOAD.maxFileSizeBytes / 1024 / 1024;

  return (
    <Container maxWidth="2xl" padding="default">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Verification Documents</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload business license, certifications, or other verification (PDF or images). Max {maxSizeMB}MB per file, up to {DOCUMENT_UPLOAD.maxFiles} files.
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          multiple
          className="hidden"
          onChange={handleInputChange}
          aria-label="Select verification documents"
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
          )}
        >
          <FileUp className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            Drag files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, JPG, PNG, WebP — max {maxSizeMB}MB each
          </p>
        </div>

        {entries.length > 0 && (
          <ul className="space-y-3">
            <p className="text-sm font-medium text-foreground">Selected files</p>
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(entry.file.size)}
                    {entry.error && (
                      <span className="flex items-center gap-1 mt-1 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {entry.error}
                      </span>
                    )}
                    {!entry.error && entry.status === "ready" && (
                      <span className="block text-success">Ready</span>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeEntry(entry.id)}
                  aria-label={`Remove ${entry.file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {submitError && (
          <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {submitError}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Next
        </Button>
      </div>
    </Container>
  );
};
