import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field label (for accessibility and display) */
  label: string;
  /** Required indicator and validation */
  required?: boolean;
  /** Error message to show below the field */
  error?: string;
  /** Optional hint text */
  hint?: string;
  /** Input id for label association */
  htmlFor?: string;
  /** Child input/textarea (single element) */
  children: React.ReactElement;
}

/**
 * Reusable form field wrapper: label, optional required asterisk, child control,
 * error message, and hint. Keeps validation UI consistent and accessible.
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    { label, required, error, hint, htmlFor, children, className, ...props },
    ref
  ) => {
    const child = React.Children.only(children);
    const id = htmlFor ?? (child.props as { id?: string }).id;
    const hasError = Boolean(error);

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        <Label
          htmlFor={id}
          className={cn(hasError && "text-destructive")}
        >
          {label}
          {required && <span className="text-destructive ml-0.5" aria-hidden>*</span>}
        </Label>
        {React.cloneElement(child, {
          id,
          "aria-invalid": hasError ? true : undefined,
          "aria-describedby": hasError
            ? `${id}-error`
            : hint
            ? `${id}-hint`
            : undefined,
          ...child.props,
        })}
        {error && (
          <p id={id ? `${id}-error` : undefined} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={id ? `${id}-hint` : undefined} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";
