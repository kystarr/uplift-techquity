import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";

export interface Step1_BusinessInfoProps {
  onNext: () => void;
  onBack: () => void;
}

export const Step1_BusinessInfo = ({ onNext, onBack }: Step1_BusinessInfoProps) => {
  return (
    <Container maxWidth="2xl" padding="default">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Business Info</h2>
      </header>
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">
        <p>Placeholder: Business name, type, address, and contact details will go here.</p>
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
