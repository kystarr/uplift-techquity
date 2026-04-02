import { useState, useEffect } from "react";
import { updatePassword } from "aws-amplify/auth";
import { uploadData, getUrl } from "aws-amplify/storage";
import { fetchAuthSession } from "aws-amplify/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { BusinessProfileSection } from "@/components/profile/BusinessProfileSection";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfileTab() {
  const { isBusiness } = useAuth();
  const { profile, loading, saving, updateName, updateAvatarUrl, refetch } = useUserProfile();
  const [name, setName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (profile && !nameDirty) setName(profile.name);
  }, [profile, nameDirty]);

  if (loading || !profile) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading profile…
      </div>
    );
  }

  const handleSaveName = async () => {
    try {
      await updateName(name.trim() || profile.name);
      setNameDirty(false);
      toast.success("Name updated");
      await refetch();
    } catch {
      toast.error("Could not update name");
    }
  };

  const handlePassword = async () => {
    if (!oldPw || !newPw) {
      toast.error("Enter current and new password");
      return;
    }
    setPwLoading(true);
    try {
      await updatePassword({ oldPassword: oldPw, newPassword: newPw });
      setOldPw("");
      setNewPw("");
      toast.success("Password updated");
    } catch {
      toast.error("Password change failed");
    } finally {
      setPwLoading(false);
    }
  };

  const handleAvatar = async (file: File | null) => {
    if (!file) return;
    try {
      const session = await fetchAuthSession();
      const identityId = session.identityId;
      if (!identityId) throw new Error("No identity");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `profile-avatars/${identityId}/${Date.now()}-${safe}`;
      await uploadData({
        path,
        data: file,
        options: { contentType: file.type || "image/jpeg" },
      }).result;
      const urlResult = await getUrl({ path });
      const publicUrl = urlResult.url.toString();
      await updateAvatarUrl(publicUrl);
      toast.success("Profile picture updated");
      await refetch();
    } catch {
      toast.error("Upload failed");
    }
  };

  return (
    <div className={cn("space-y-6", isBusiness ? "max-w-3xl" : "max-w-lg")}>
      {isBusiness && <BusinessProfileSection />}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your name, photo, and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
              <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <span className="text-sm text-primary underline">Upload photo</span>
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatar(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setNameDirty(true);
                setName(e.target.value);
              }}
            />
            <Button type="button" size="sm" onClick={handleSaveName} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save name"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              Email is managed by your sign-in provider. Contact support to change it.
            </p>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Current password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              autoComplete="current-password"
            />
            <Input
              type="password"
              placeholder="New password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
            <Button type="button" variant="secondary" onClick={handlePassword} disabled={pwLoading}>
              {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
