import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
  Step1_BusinessInfo,
  Step2_DocumentUpload,
  Step3_Confirmation,
} from "@/components/register";
import type { Step1BusinessInfoValues } from "@/lib/validations/register";
import { useAuth } from "@/contexts/AuthContext";
import { createBusinessFromRegistration } from "@/lib/business-registration";
import { getCognitoSub } from "@/lib/cognito-identity";

const TOTAL_STEPS = 3;

const RegisterBusiness = () => {
  const { step } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentStep = Math.min(Math.max(1, parseInt(step ?? "1", 10) || 1), TOTAL_STEPS);
  const [step1Data, setStep1Data] = useState<Step1BusinessInfoValues | null>(null);
  const [step2Files, setStep2Files] = useState<File[]>([]);

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
    <div className="bg-background">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 glass-panel rounded-2xl p-5">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
          <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
        </div>

        {currentStep === 1 && (
          <Step1_BusinessInfo
            defaultValues={step1Data ?? undefined}
            onNext={goNext}
            onBack={goBack}
            onStep1Complete={setStep1Data}
          />
        )}
        {currentStep === 2 && (
          <Step2_DocumentUpload
            defaultFiles={step2Files}
            onNext={goNext}
            onBack={goBack}
            onStep2Complete={setStep2Files}
          />
        )}
        {currentStep === 3 && (
          <Step3_Confirmation
            step1Data={step1Data}
            step2Files={step2Files}
            onBack={goBack}
            onSubmit={async () => {
              if (!step1Data) {
                throw new Error("Missing business information from Step 1.");
              }

              const sub = await getCognitoSub();
              if (user && !sub) {
                throw new Error(
                  "Could not resolve your account id. Try signing out and back in."
                );
              }
              await createBusinessFromRegistration({
                step1: step1Data,
                ...(sub ? { ownerId: sub } : {}),
                documents: step2Files,
              });

              navigate("/");
            }}
          />
        )}
      </main>
    </div>
  );
};

export default RegisterBusiness;
