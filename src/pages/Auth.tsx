import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Container } from "@/components/shared";
import { LoginForm, SignUpForm } from "@/components/auth";
import type { LoginFormValues } from "@/lib/validations/auth";
import type { SignUpFormValues } from "@/lib/validations/auth";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      // TODO: Replace with real auth API
      await new Promise((r) => setTimeout(r, 1000));
      toast({
        title: "Welcome back!",
        description: "You're signed in.",
      });
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (values: SignUpFormValues) => {
    setIsLoading(true);
    try {
      // TODO: Replace with real auth API
      await new Promise((r) => setTimeout(r, 1000));
      toast({
        title: "Account created",
        description: "Welcome to the community!",
      });
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" padding="lg">
      <div className="max-w-md mx-auto">
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

        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Business Owner?
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Register your minority-owned business and reach customers who want to support you.
            </p>
            <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted">
              Register Your Business
            </Button>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default Auth;
