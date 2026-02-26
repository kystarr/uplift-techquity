import { useParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Progress } from "@/components/ui/progress";
import {
  Step1_BusinessInfo,
  Step2_DocumentUpload,
  Step3_Confirmation,
} from "@/components/register";

const TOTAL_STEPS = 3;

const RegisterBusiness = () => {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const currentStep = Math.min(Math.max(1, parseInt(step ?? "1", 10) || 1), TOTAL_STEPS);

  const goNext = () => {
    if (currentStep < TOTAL_STEPS) {
      navigate(`/register/${currentStep + 1}`);
    }
  };

  const goBack = () => {
    if (currentStep === 1) {
      navigate("/");
    } else {
      navigate(`/register/${currentStep - 1}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
          <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
        </div>

        {currentStep === 1 && (
          <Step1_BusinessInfo onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 2 && (
          <Step2_DocumentUpload onNext={goNext} onBack={goBack} />
        )}
        {currentStep === 3 && (
          <Step3_Confirmation onBack={goBack} />
        )}
      </main>
    </div>
  );
};

export default RegisterBusiness;
