import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";

export interface Step2_DocumentUploadProps {
  onNext: () => void;
  onBack: () => void;
}

export const Step2_DocumentUpload = ({ onNext, onBack }: Step2_DocumentUploadProps) => {
  return (
    <Container maxWidth="2xl" padding="default">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Document Upload</h2>
      </header>
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">
        <p>Placeholder: Document upload area for business licenses, certifications, etc.</p>
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Next
        </Button>
      </div>
    </Container>
  );
};
