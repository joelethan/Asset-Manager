import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/context/ProfileContext";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";
import { loginUserSchema, type LoginUserRequest } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";

export default function Login() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { setProfile, setIsAuthenticated } = useProfile();
  const form = useForm<LoginUserRequest>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginUserRequest) {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await authApi.login(values.email, values.password);
      const data = await res.json();

      if (!res.ok) {
        // Handle authentication errors with proper UI display
        const errorMessage = data.error?.message || data.message || "Invalid email or password.";
        setServerError(errorMessage);

        // Also show toast for additional feedback
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Save access token
      if (data.access_token) {
        try {
          localStorage.setItem("access_token", data.access_token);
        } catch { }
      }

      // Fetch profile and store in context
      try {
        const profileRes = await authApi.profile();
        if (profileRes.ok) {
          const profile = await profileRes.json();
          try {
            setProfile(profile);
            setIsAuthenticated(true);
          } catch { }
        }
      } catch { }

      toast({ title: "Success", description: "You have been logged in successfully." });

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error) {
      const errorMsg = "An unexpected error occurred. Please try again later." + (error instanceof Error ? ` (${error.message})` : "");
      setServerError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppLayout
      title="Login"
      description="Sign In to your account."
      breadcrumbs={[{ label: "Login" }]}
      centered
    >
      <div className="max-w-md mx-auto">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {serverError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{serverError}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your.email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="********"
                            {...field}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    form.reset();
                    setServerError(null);
                  }} disabled={isLoading} className="flex-1">
                    Clear
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
