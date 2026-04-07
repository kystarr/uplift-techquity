import { useState } from "react";
import { Building2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import type { Step1BusinessInfoValues } from "@/lib/validations/register";
import { useToast } from "@/hooks/use-toast";

export interface Step3_ConfirmationProps {
  step1Data: Step1BusinessInfoValues | null;
  step2Files: File[];
  onBack: () => void;
  onSubmit?: () => void | Promise<void>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const Step3_Confirmation = ({
  step1Data,
  step2Files,
  onBack,
  onSubmit,
}: Step3_ConfirmationProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit();
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }
      toast({
        title: "Registration submitted",
        description: "Thank you! We'll review your business and get back to you.",
      });
    } catch (e) {
      toast({
        title: "Something went wrong",
        description: "Please try again or go back to edit your information.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="2xl" padding="default">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Review & Submit</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm your business details and documents before submitting.
        </p>
      </header>

      <div className="space-y-6">
        {/* Step 1 summary */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Business information</h3>
          </div>
          <div className="p-6">
            {step1Data ? (
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Business name</dt>
                  <dd className="font-medium text-foreground">{step1Data.businessName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-medium text-foreground">{step1Data.category}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="font-medium text-foreground">
                    {step1Data.street}, {step1Data.city}, {step1Data.state} {step1Data.zip}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium text-foreground">{step1Data.phone}</dd>
                </div>
                {step1Data.website && (
                  <div>
                    <dt className="text-muted-foreground">Website</dt>
                    <dd className="font-medium text-foreground">
                      <a
                        href={step1Data.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {step1Data.website}
                      </a>
                    </dd>
                  </div>
                )}
                {step1Data.description && (
                  <div>
                    <dt className="text-muted-foreground">Description</dt>
                    <dd className="font-medium text-foreground">{step1Data.description}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No business information to show. Go back to Step 1 to add details.</p>
            )}
          </div>
        </section>

        {/* Step 2 summary */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Verification documents</h3>
          </div>
          <div className="p-6">
            {step2Files.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {step2Files.map((file, i) => (
                  <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground truncate">{file.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No documents uploaded. Go back to Step 2 to add verification documents.</p>
            )}
          </div>
        </section>
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit registration"
          )}
        </Button>
      </div>
    </Container>
  );
};
