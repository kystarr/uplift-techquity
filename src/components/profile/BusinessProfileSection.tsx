import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { uploadData, getUrl } from "aws-amplify/storage";
import { fetchAuthSession } from "aws-amplify/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOwnerBusiness } from "@/hooks/useOwnerBusiness";
import { amplifyDataClient } from "@/amplifyDataClient";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Business description + gallery for owners on the Profile tab (not only Business Analytics).
 */
export function BusinessProfileSection() {
  const { business, backendRow, loading, error, refetch } = useOwnerBusiness();
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bizName, setBizName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [bizState, setBizState] = useState("");
  const [zip, setZip] = useState("");
  const [pendingDocs, setPendingDocs] = useState<File[]>([]);
  const [savingContact, setSavingContact] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  useEffect(() => {
    if (backendRow) {
      setDescription(backendRow.description ?? "");
      setPhone(backendRow.phone ?? "");
      setEmail(backendRow.contactEmail ?? "");
      setBizName(backendRow.businessName ?? "");
      setStreet(backendRow.street ?? "");
      setCity(backendRow.city ?? "");
      setBizState(backendRow.state ?? "");
      setZip(backendRow.zip ?? "");
    }
  }, [backendRow]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your business…
      </div>
    );
  }

  if (error || !business || !backendRow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your business</CardTitle>
          <CardDescription>
            No business is linked to this account yet. Complete registration to create a listing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/register/1">Register a business</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const id = backendRow.id;
  const images = backendRow.images ?? [];
  const identityChanged =
    bizName.trim() !== (backendRow.businessName ?? "") ||
    street.trim() !== (backendRow.street ?? "") ||
    city.trim() !== (backendRow.city ?? "") ||
    bizState.trim() !== (backendRow.state ?? "") ||
    zip.trim() !== (backendRow.zip ?? "");

  const saveContactOnly = async () => {
    setSavingContact(true);
    try {
      await amplifyDataClient.models.Business.update(
        {
          id,
          phone: phone.trim() || undefined,
          contactEmail: email.trim(),
        } as never,
        { authMode: "userPool" }
      );
      toast.success("Contact Info Saved");
      await refetch();
    } catch {
      toast.error("Save Failed");
    } finally {
      setSavingContact(false);
    }
  };

  const submitVerification = async () => {
    if (!pendingDocs.length) {
      toast.error("Upload Verification Documents");
      return;
    }
    const session = await fetchAuthSession();
    const identityId = session.identityId;
    if (!identityId) {
      toast.error("Storage Unavailable");
      return;
    }
    setVerifySubmitting(true);
    try {
      const keys: string[] = [];
      for (const file of pendingDocs) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `verification-documents/${identityId}/${Date.now()}-${safe}`;
        await uploadData({
          path,
          data: file,
          options: { contentType: file.type || "application/pdf" },
        }).result;
        keys.push(path);
      }
      await amplifyDataClient.mutations.requestBusinessProfileVerification(
        {
          businessId: id,
          documentKeys: keys,
          pendingBusinessName: bizName.trim() !== backendRow.businessName ? bizName.trim() : undefined,
          pendingStreet: street.trim() !== (backendRow.street ?? "") ? street.trim() : undefined,
          pendingCity: city.trim() !== (backendRow.city ?? "") ? city.trim() : undefined,
          pendingState: bizState.trim() !== (backendRow.state ?? "") ? bizState.trim() : undefined,
          pendingZip: zip.trim() !== (backendRow.zip ?? "") ? zip.trim() : undefined,
        },
        { authMode: "userPool" }
      );
      toast.success("Verification Submitted — Admin Will Review");
      setPendingDocs([]);
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Verification Request Failed");
    } finally {
      setVerifySubmitting(false);
    }
  };

  const saveDescription = async () => {
    setSavingDesc(true);
    try {
      await amplifyDataClient.models.Business.update(
        { id, description: description.trim() || undefined } as never,
        { authMode: "userPool" }
      );
      toast.success("Description saved");
      await refetch();
    } catch {
      toast.error("Could not save description");
    } finally {
      setSavingDesc(false);
    }
  };

  const uploadBusinessImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const session = await fetchAuthSession();
    const identityId = session.identityId;
    if (!identityId) {
      toast.error("Could not resolve storage identity");
      return;
    }
    const newUrls: string[] = [...images];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `business-media/${identityId}/${Date.now()}-${safe}`;
      await uploadData({
        path,
        data: file,
        options: { contentType: file.type || "image/jpeg" },
      }).result;
      const u = await getUrl({ path });
      newUrls.push(u.url.toString());
    }
    await amplifyDataClient.models.Business.update(
      { id, images: newUrls } as never,
      { authMode: "userPool" }
    );
    toast.success("Images updated");
    await refetch();
  };

  const removeImageAt = async (index: number) => {
    const next = images.filter((_, i) => i !== index);
    await amplifyDataClient.models.Business.update(
      { id, images: next } as never,
      { authMode: "userPool" }
    );
    toast.success("Image removed");
    await refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Business Details</CardTitle>
        <CardDescription>
          Edit how your listing appears to customers. Metrics and review tools stay under{" "}
          <Link to="/profile/business" className="text-primary underline underline-offset-2">
            Business Analytics
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to={`/business/${id}`}>View Profile</Link>
        </Button>

        <div className="space-y-3">
          <Label>Photos</Label>
          {images.length > 0 && (
            <Carousel className="w-full max-w-xl mx-auto">
              <CarouselContent>
                {images.map((src, i) => (
                  <CarouselItem key={src + i}>
                    <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
                      <img src={src} alt="" className="object-cover w-full h-full" />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute bottom-2 right-2"
                        onClick={() => removeImageAt(i)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          )}
          <div>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => uploadBusinessImages(e.target.files)}
            />
            <p className="text-xs text-muted-foreground mt-1">Upload one or more images for your public page.</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-semibold">Contact</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-phone">Phone</Label>
              <Input
                id="business-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-email">Email</Label>
              <Input
                id="business-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" size="sm" onClick={saveContactOnly} disabled={savingContact}>
            {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Contact"}
          </Button>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h3 className="text-base font-semibold">Name & Address</h3>
          <p className="text-sm text-muted-foreground">
            Changing display name or address requires document upload. Submitted requests are marked{" "}
            <strong>Pending Verification</strong> until an admin approves.
          </p>
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input
              id="business-name"
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business-street">Street</Label>
            <Input
              id="business-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="business-city">City</Label>
              <Input id="business-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-state">State</Label>
              <Input
                id="business-state"
                value={bizState}
                onChange={(e) => setBizState(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-zip">ZIP</Label>
              <Input id="business-zip" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verification-docs">Verification Documents</Label>
            <Input
              id="verification-docs"
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => setPendingDocs(Array.from(e.target.files ?? []))}
            />
          </div>
          <Button
            type="button"
            disabled={!identityChanged || verifySubmitting || !pendingDocs.length}
            onClick={submitVerification}
          >
            {verifySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit For Verification"}
          </Button>
          {backendRow.verificationStatus === "UNDER_REVIEW" && (
            <p className="text-sm text-amber-600">Your Changes Are Under Admin Review.</p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-1">{backendRow.businessName}</p>
          <p className="text-xs text-muted-foreground">
            {[backendRow.street, backendRow.city, backendRow.state, backendRow.zip]
              .filter(Boolean)
              .join(", ") || "Address on file"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="biz-desc">Description</Label>
          <Textarea
            id="biz-desc"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell customers what makes your business special."
          />
          <Button type="button" size="sm" onClick={saveDescription} disabled={savingDesc}>
            {savingDesc ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save description"}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
