import * as React from "react";
import { useEditBusinessProfile } from "@/hooks/useEditBusinessProfile";
import { EditBusinessProfileLayout } from "./EditBusinessProfileLayout";
import type { Business } from "@/types/business";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface EditBusinessProfileFormProps {
  businessId: string;
  business: Business | null;
  /** "display" | "edit" — controlled by parent so page can switch after save */
  mode: "display" | "edit";
  onModeChange: (mode: "display" | "edit") => void;
  /** Called after successful save with updated business (e.g. update cache or redirect) */
  onSaveSuccess?: (updated: Business) => void;
}

/**
 * Edit business profile form: wraps useEditBusinessProfile and EditBusinessProfileLayout.
 * Controlled inputs, local form state in hook, validation before submit, PUT to /api/business/:id,
 * optimistic UI via onSaveSuccess, loading state during save, and error handling.
 */
export function EditBusinessProfileForm({
  businessId,
  business,
  mode,
  onModeChange,
  onSaveSuccess,
}: EditBusinessProfileFormProps) {
  const {
    values,
    errors,
    saving,
    saveError,
    saveDisabled,
    setField,
    save,
    reset,
  } = useEditBusinessProfile({
    businessId,
    initialBusiness: business,
    onSuccess: (updated) => {
      onSaveSuccess?.(updated);
      onModeChange("display");
    },
  });

  const handleCancel = () => {
    reset();
    onModeChange("display");
  };

  return (
    <div className="space-y-4">
      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError.message}</AlertDescription>
        </Alert>
      )}
      <EditBusinessProfileLayout
        mode={mode}
        values={values}
        errors={errors}
        onChange={setField}
        onSave={save}
        onCancel={handleCancel}
        onEdit={() => onModeChange("edit")}
        saving={saving}
        saveDisabled={saveDisabled}
      />
    </div>
  );
}
