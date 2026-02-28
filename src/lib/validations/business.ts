/**
 * Client-side validation for edit business profile form.
 * No external libraries; used to validate before submit and for inline errors.
 */

export interface BusinessFormValues {
  name: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  tags: string[];
  categories: string[];
}

export interface BusinessFormErrors {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  tags?: string;
  categories?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;
const MAX_DESCRIPTION_LENGTH = 500;

export function validateBusinessForm(values: BusinessFormValues): BusinessFormErrors {
  const errors: BusinessFormErrors = {};

  if (!values.name?.trim()) {
    errors.name = "Business name is required";
  } else if (values.name.trim().length < 2) {
    errors.name = "Business name must be at least 2 characters";
  }

  if (!values.email?.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Please enter a valid email address";
  }

  if (!values.phone?.trim()) {
    errors.phone = "Phone number is required";
  } else if (!/^[\d\s\-().+]+$/.test(values.phone.trim()) || values.phone.trim().length < 10) {
    errors.phone = "Please enter a valid phone number";
  }

  if (values.website?.trim() && !URL_REGEX.test(values.website.trim())) {
    errors.website = "Please enter a valid URL (e.g. https://example.com)";
  }

  if (values.description?.length && values.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
  }

  return errors;
}

export function isBusinessFormValid(errors: BusinessFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
