import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Container } from "@/components/shared";
import { LoginForm, SignUpForm } from "@/components/auth";
import type { LoginFormValues, SignUpFormValues } from "@/lib/validations/auth";
import { Navigation } from "@/components/Navigation";
import { login, register, confirmRegistration } from "@/lib/auth-service";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [authCode, setAuthCode] = useState("");

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await login({ email: values.email, password: values.password });

      if (result.isSignedIn) {
        if (!result.hasCustomRole) {
          toast({
            variant: "destructive",
            title: "Token Verification Warning",
            description: "custom:role not found in token. Check Cognito app client settings.",
          });
        }

        toast({ title: "Welcome back!", description: "You're signed in." });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Please check your credentials.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      await register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });

      setUserEmail(values.email);
      setNeedsConfirmation(true);

      toast({
        title: "Registration Started",
        description: "Please check your email for a verification code.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!authCode) return;
    setIsLoading(true);
    try {
      await confirmRegistration(userEmail, authCode);

      toast({
        title: "Account Verified",
        description: "Your account is now active. Please sign in.",
      });

      setNeedsConfirmation(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Container maxWidth="md" padding="lg">
        <div className="max-w-md mx-auto">
        {/* Show confirmation UI when awaiting email verification, otherwise show login/signup tabs */}
        {needsConfirmation ? (
          <Card className="animate-in fade-in zoom-in duration-300">
            <CardHeader>
              <CardTitle>Verify Your Email</CardTitle>
              <CardDescription>
                We sent a code to <strong>{userEmail}</strong>. Enter it below to activate your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Enter 6-digit code" 
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
              />
              <Button 
                className="w-full" 
                onClick={handleConfirmCode} 
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify Account"}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => setNeedsConfirmation(false)}
              >
                Back to Sign Up
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Sign in to your account to continue</CardDescription>
                </CardHeader>
                <CardContent>
                  <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>Join our community of supporters</CardDescription>
                </CardHeader>
                <CardContent>
                  <SignUpForm onSubmit={handleSignUp} isLoading={isLoading} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Business Owner?
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Register your minority-owned business and reach customers who want to support you.
            </p>
            <Button 
              variant="outline" 
              className="w-full border-border text-foreground hover:bg-muted"
              onClick={() => {
                toast({ title: "Business Onboarding", description: "Redirecting to owner registration..." });
              }}
            >
              Register Your Business
            </Button>
          </CardContent>
        </Card>
        </div>
      </Container>
    </div>
  );
};

export default Auth;