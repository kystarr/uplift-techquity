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
  const [savingDesc, setSavingDesc] = useState(false);

  useEffect(() => {
    if (backendRow) setDescription(backendRow.description ?? "");
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
        <CardTitle>Your business</CardTitle>
        <CardDescription>
          Edit how your listing appears to customers. Metrics and review tools stay under{" "}
          <Link to="/profile/business" className="text-primary underline underline-offset-2">
            Business Analytics
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <div className="space-y-3">
          <Label>Photos</Label>
          {images.length > 0 && (
            <Carousel className="w-full max-w-xl">
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
      </CardContent>
    </Card>
  );
}
