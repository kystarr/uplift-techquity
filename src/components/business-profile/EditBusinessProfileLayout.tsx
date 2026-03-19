import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "./FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagBadge } from "./TagBadge";
import { CategoryBadge } from "./CategoryBadge";
import { cn } from "@/lib/utils";

/** Shape of per-field validation errors for the edit form */
export interface EditBusinessProfileErrors {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  tags?: string;
  categories?: string;
}

/** Values for the editable business fields (controlled by parent form) */
export interface EditBusinessProfileValues {
  name: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  tags: string[];
  categories: string[];
}

export interface EditBusinessProfileLayoutProps {
  /** "display" shows read-only values and an Edit button; "edit" shows the form */
  mode: "display" | "edit";
  values: EditBusinessProfileValues;
  /** Only used in edit mode: validation errors per field */
  errors?: EditBusinessProfileErrors;
  /** Only used in edit mode: callbacks for controlled inputs */
  onChange?: (field: keyof EditBusinessProfileValues, value: string | string[]) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
  /** Only used in edit mode: save in progress */
  saving?: boolean;
  /** Only used in edit mode: save button disabled when form is invalid */
  saveDisabled?: boolean;
  className?: string;
}

/**
 * Edit business profile layout: display mode (read-only + Edit) or edit mode (form + Save/Cancel).
 * Clear separation between the two modes; validation and state live in the parent form component.
 */
export function EditBusinessProfileLayout({
  mode,
  values,
  errors = {},
  onChange,
  onSave,
  onCancel,
  onEdit,
  saving = false,
  saveDisabled = true,
  className,
}: EditBusinessProfileLayoutProps) {
  if (mode === "display") {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Business information</CardTitle>
            <Button variant="outline" onClick={onEdit} aria-label="Edit business profile">
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-foreground">{values.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-foreground whitespace-pre-wrap">{values.description || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-foreground">{values.email || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p className="text-foreground">{values.phone || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Website</p>
              <p className="text-foreground">{values.website || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
              {values.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {values.tags.map((t, i) => (
                    <TagBadge key={`${t}-${i}`} tag={t} />
                  ))}
                </div>
              ) : (
                <p className="text-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Categories</p>
              {values.categories?.length ? (
                <div className="flex flex-wrap gap-2">
                  {values.categories.map((c) => (
                    <CategoryBadge key={c} category={c} />
                  ))}
                </div>
              ) : (
                <p className="text-foreground">—</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit mode: form with validation and disabled save when invalid
  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Edit business profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Business name" required error={errors.name}>
            <Input
              value={values.name}
              onChange={(e) => onChange?.("name", e.target.value)}
              placeholder="Business name"
              disabled={saving}
            />
          </FormField>
          <FormField label="Description" error={errors.description} hint="Max 500 characters">
            <Textarea
              value={values.description}
              onChange={(e) => onChange?.("description", e.target.value)}
              placeholder="Describe your business"
              rows={4}
              disabled={saving}
            />
          </FormField>
          <FormField label="Email" required error={errors.email}>
            <Input
              type="email"
              value={values.email}
              onChange={(e) => onChange?.("email", e.target.value)}
              placeholder="contact@example.com"
              disabled={saving}
            />
          </FormField>
          <FormField label="Phone" required error={errors.phone}>
            <Input
              type="tel"
              value={values.phone}
              onChange={(e) => onChange?.("phone", e.target.value)}
              placeholder="(555) 123-4567"
              disabled={saving}
            />
          </FormField>
          <FormField label="Website" error={errors.website} hint="Include https://">
            <Input
              type="url"
              value={values.website}
              onChange={(e) => onChange?.("website", e.target.value)}
              placeholder="https://example.com"
              disabled={saving}
            />
          </FormField>
          {/* Tags/categories: simple comma-separated for now; could be tag input later */}
          <FormField label="Tags" error={errors.tags} hint="Comma-separated">
            <Input
              value={values.tags?.join(", ") ?? ""}
              onChange={(e) =>
                onChange?.(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="Natural Hair, Braiding"
              disabled={saving}
            />
          </FormField>
          <FormField label="Categories" error={errors.categories} hint="Comma-separated">
            <Input
              value={values.categories?.join(", ") ?? ""}
              onChange={(e) =>
                onChange?.(
                  "categories",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="Beauty & Wellness"
              disabled={saving}
            />
          </FormField>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onSave}
              disabled={saveDisabled || saving}
              aria-busy={saving}
              aria-disabled={saveDisabled || saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
