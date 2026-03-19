import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BusinessContactCardProps extends React.HTMLAttributes<HTMLDivElement> {
  email?: string;
  phone?: string;
  website?: string;
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
      className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
    >
      {value}
    </a>
  ) : (
    <span>{value}</span>
  );
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
      <div>
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
  className,
  ...props
}: BusinessContactCardProps) => {
  const hasAny = email || phone || website;
  if (!hasAny) return null;

  return (
    <Card className={cn(className)} {...props}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
