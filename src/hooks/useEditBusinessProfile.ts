import { useState, useCallback, useEffect } from "react";
import { amplifyDataClient } from "@/amplifyDataClient";
import type { Business, BusinessUpdatePayload } from "@/types/business";
import {
  validateBusinessForm,
  isBusinessFormValid,
  type BusinessFormValues,
  type BusinessFormErrors,
} from "@/lib/validations/business";

export interface UseEditBusinessProfileArgs {
  businessId: string;
  initialBusiness: Business | null;
  /** Callback after successful save (e.g. update parent state or navigate) */
  onSuccess?: (updated: Business) => void;
}

export interface UseEditBusinessProfileResult {
  values: BusinessFormValues;
  errors: BusinessFormErrors;
  saving: boolean;
  saveError: Error | null;
  saveDisabled: boolean;
  setValues: (values: BusinessFormValues | ((prev: BusinessFormValues) => BusinessFormValues)) => void;
  setField: (field: keyof BusinessFormValues, value: string | string[]) => void;
  validate: () => BusinessFormErrors;
  save: () => Promise<void>;
  reset: () => void;
}

function businessToFormValues(b: Business | null): BusinessFormValues {
  if (!b) {
    return {
      name: "",
      description: "",
      email: "",
      phone: "",
      website: "",
      tags: [],
      categories: [],
    };
  }
  return {
    name: b.name ?? "",
    description: b.description ?? "",
    email: b.email ?? "",
    phone: b.phone ?? "",
    website: b.website ?? "",
    tags: Array.isArray(b.tags) ? [...b.tags] : [],
    categories: Array.isArray(b.categories) ? [...b.categories] : [],
  };
}

/**
 * Manages form state and submit for editing a business profile.
 * Validates before submit; supports optimistic UI by calling onSuccess with
 * the payload so the parent can update the displayed business immediately.
 */
export function useEditBusinessProfile({
  businessId,
  initialBusiness,
  onSuccess,
}: UseEditBusinessProfileArgs): UseEditBusinessProfileResult {
  const [values, setValuesState] = useState<BusinessFormValues>(() =>
    businessToFormValues(initialBusiness)
  );
  const [errors, setErrors] = useState<BusinessFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  // Sync form when switching to a different business (e.g. navigation)
  useEffect(() => {
    setValuesState(businessToFormValues(initialBusiness));
    setErrors({});
    setSaveError(null);
  }, [initialBusiness?.id]);

  const setValues = useCallback(
    (arg: BusinessFormValues | ((prev: BusinessFormValues) => BusinessFormValues)) => {
      setValuesState(arg);
      setErrors({});
      setSaveError(null);
    },
    []
  );

  const setField = useCallback((field: keyof BusinessFormValues, value: string | string[]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setSaveError(null);
  }, []);

  const validate = useCallback((): BusinessFormErrors => {
    const nextErrors = validateBusinessForm(values);
    setErrors(nextErrors);
    return nextErrors;
  }, [values]);

  const save = useCallback(async () => {
    const nextErrors = validate();
    if (!isBusinessFormValid(nextErrors)) return;

    setSaving(true);
    setSaveError(null);

    const payload: BusinessUpdatePayload = {
      name: values.name.trim(),
      description: values.description.trim(),
      email: values.email.trim() || undefined,
      phone: values.phone.trim() || undefined,
      website: values.website.trim() || undefined,
      tags: values.tags,
      categories: values.categories,
    };

    try {
      const { data, errors } = await amplifyDataClient.models.Business.update({
        id: businessId,
        businessName: payload.name,
        description: payload.description || undefined,
        contactEmail: payload.email,
        phone: payload.phone,
        website: payload.website,
        tags: payload.tags,
        categories: payload.categories,
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(", "));
      }

      if (!data) {
        throw new Error("Save failed");
      }

      const updated: Business = {
        id: data.id,
        name: data.businessName,
        description: data.description ?? "",
        email: data.contactEmail ?? undefined,
        phone: data.phone ?? undefined,
        website: data.website ?? undefined,
        images: data.images ?? [],
        isVerified: data.verified ?? false,
        tags: data.tags ?? [],
        categories: data.categories ?? [],
        averageRating: typeof data.averageRating === "number" ? data.averageRating : 0,
      };

      // Optimistic UI: parent can show updated data immediately
      onSuccess?.(updated);
      setValuesState(businessToFormValues(updated));
      setErrors({});
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to save");
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }, [businessId, values, validate, onSuccess]);

  const reset = useCallback(() => {
    setValuesState(businessToFormValues(initialBusiness));
    setErrors({});
    setSaveError(null);
  }, [initialBusiness]);

  const saveDisabled = !isBusinessFormValid(validateBusinessForm(values));

  return {
    values,
    errors,
    saving,
    saveError,
    saveDisabled,
    setValues,
    setField,
    validate,
    save,
    reset,
  };
}
