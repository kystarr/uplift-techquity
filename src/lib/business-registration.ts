import { amplifyDataClient } from "@/amplifyDataClient";
import type { Schema } from "../../amplify/data/resource";
import type { Step1BusinessInfoValues } from "@/lib/validations/register";

type BusinessModel = Schema["Business"]["type"];

export interface CreateBusinessFromRegistrationInput {
  step1: Step1BusinessInfoValues;
  ownerId: string;
}

/**
 * Creates a Business record from the multi-step registration flow.
 * Uses the existing Amplify Gen 2 Business model and keeps new fields
 * (tags, categories, images, averageRating, verified) optional and
 * backward compatible.
 */
export async function createBusinessFromRegistration(
  input: CreateBusinessFromRegistrationInput
): Promise<BusinessModel> {
  const { step1, ownerId } = input;

  const displayName = step1.businessName.trim();
  const contactName = `${step1.ownerFirstName} ${step1.ownerLastName}`.trim();

  const { data, errors } = await amplifyDataClient.models.Business.create({
    businessName: displayName,
    legalBusinessName: displayName,
    businessType: step1.category,
    contactName,
    contactEmail: step1.email,
    ownerId,

    phone: step1.phone || undefined,
    website: step1.website || undefined,
    description: step1.description || undefined,

    images: [],
    tags: [],
    categories: step1.category ? [step1.category] : [],
    averageRating: 0,
    verified: false,

    verificationStatus: "PENDING",
    verificationSubmittedAt: new Date().toISOString(),
    // verificationDocumentKey will be wired when S3 upload is implemented.
  });

  if (errors && errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join(", "));
  }

  if (!data) {
    throw new Error("Failed to create business");
  }

  return data;
}

