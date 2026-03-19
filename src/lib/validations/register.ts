import { z } from "zod";

export const step1BusinessInfoSchema = z.object({
  businessName: z
    .string()
    .min(1, "Business name is required")
    .min(2, "Business name must be at least 2 characters"),
  ownerFirstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters"),
  ownerLastName: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Business email is required")
    .email("Please enter a valid email"),
  category: z.string().min(1, "Please select a category"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z
    .string()
    .min(1, "State is required")
    .length(2, "Use 2-letter state code (e.g. CA)"),
  zip: z
    .string()
    .min(1, "ZIP code is required")
    .regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code (e.g. 12345 or 12345-6789)"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[\d\s\-().+]+$/, "Enter a valid phone number"),
  website: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || z.string().url().safeParse(val).success,
      "Enter a valid URL"
    ),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
});

export type Step1BusinessInfoValues = z.infer<typeof step1BusinessInfoSchema>;

// Step 2: Document upload validation
export const DOCUMENT_UPLOAD = {
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  acceptedTypes: [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ] as const,
  acceptedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
} as const;

export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (file.size > DOCUMENT_UPLOAD.maxFileSizeBytes) {
    return { valid: false, error: `File must be under ${DOCUMENT_UPLOAD.maxFileSizeBytes / 1024 / 1024}MB` };
  }
  const type = file.type?.toLowerCase();
  const isAccepted = DOCUMENT_UPLOAD.acceptedTypes.some(
    (t) => t === type || (type === "image/jpeg" && t === "image/jpg")
  );
  if (!isAccepted) {
    return { valid: false, error: "File must be PDF, JPG, PNG, or WebP" };
  }
  return { valid: true };
}
