import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Container } from "@/components/shared/Container";
import {
  step1BusinessInfoSchema,
  type Step1BusinessInfoValues,
} from "@/lib/validations/register";

const BUSINESS_CATEGORIES = [
  "Beauty & Wellness",
  "Restaurant",
  "Retail",
  "Healthcare",
  "Technology Services",
  "Professional Services",
  "Education",
  "Arts & Entertainment",
  "Other",
];

export interface Step1_BusinessInfoProps {
  defaultValues?: Partial<Step1BusinessInfoValues>;
  onNext: () => void;
  onBack: () => void;
  onStep1Complete?: (data: Step1BusinessInfoValues) => void;
}

export const Step1_BusinessInfo = ({
  defaultValues,
  onNext,
  onBack,
  onStep1Complete,
}: Step1_BusinessInfoProps) => {
  const form = useForm<Step1BusinessInfoValues>({
    resolver: zodResolver(step1BusinessInfoSchema),
    defaultValues: {
      businessName: "",
      category: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      website: "",
      description: "",
      ...defaultValues,
    },
  });

  const handleSubmit = (values: Step1BusinessInfoValues) => {
    onStep1Complete?.(values);
    onNext();
  };

  return (
    <Container maxWidth="2xl" padding="default">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Business Info</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about your business. All fields with * are required.
        </p>
      </header>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 rounded-lg border border-border bg-card p-6"
          noValidate
        >
          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your business name"
                    autoComplete="organization"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street address *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123 Main St"
                    autoComplete="street-address"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City"
                      autoComplete="address-level2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. CA"
                      autoComplete="address-level1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP code *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="12345"
                      autoComplete="postal-code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number *</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    autoComplete="url"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Short description (optional, max 500 characters)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell customers what your business offers..."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </form>
      </Form>
    </Container>
  );
};
