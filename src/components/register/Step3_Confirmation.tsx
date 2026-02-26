import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";

export interface Step3_ConfirmationProps {
  onBack: () => void;
}

export const Step3_Confirmation = ({ onBack }: Step3_ConfirmationProps) => {
  return (
    <Container maxWidth="2xl" padding="default">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Confirmation</h2>
      </header>
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">
        <p>Placeholder: Review summary and submit confirmation will go here.</p>
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    </Container>
  );
};
