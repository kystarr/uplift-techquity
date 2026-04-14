import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Globe, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BusinessContactCardProps extends React.HTMLAttributes<HTMLDivElement> {
  email?: string;
  phone?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

const ContactRow = ({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) => {
  const content = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded break-all"
    >
      {value}
    </a>
  ) : (
    <span className="whitespace-pre-line break-words">{value}</span>
  );
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <span className="sr-only">{label}: </span>
        {content}
      </div>
    </div>
  );
};

/**
 * Contact info card: email, phone, website. Renders only provided fields.
 */
const BusinessContactCardComponent = ({
  email,
  phone,
  website,
  street,
  city,
  state,
  zip,
  className,
  ...props
}: BusinessContactCardProps) => {
  const addressLine = [street, city && state ? `${city}, ${state}` : city ?? state, zip]
    .filter(Boolean)
    .join(' • ');

  const hasAny = email || phone || website || addressLine;
  if (!hasAny) return null;

  return (
    <Card className={cn(className)} {...props}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {addressLine && (
          <ContactRow
            icon={MapPin}
            label="Address"
            value={[street, city && state ? `${city}, ${state} ${zip ?? ''}`.trim() : ''].filter(Boolean).join('\n')}
          />
        )}
        {email && (
          <ContactRow icon={Mail} label="Email" value={email} href={`mailto:${email}`} />
        )}
        {phone && (
          <ContactRow icon={Phone} label="Phone" value={phone} href={`tel:${phone}`} />
        )}
        {website && (
          <ContactRow
            icon={Globe}
            label="Website"
            value={website}
            href={website.startsWith("http") ? website : `https://${website}`}
          />
        )}
      </CardContent>
    </Card>
  );
};

export const BusinessContactCard = React.memo(BusinessContactCardComponent);
