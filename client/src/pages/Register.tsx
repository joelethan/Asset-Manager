import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerUserSchema, type RegisterUserRequest } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import { AlertCircle } from "lucide-react";

interface ErrorDetail {
  field?: string | null;
  message: string;
}

export default function Register() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [serverErrors, setServerErrors] = useState<(ErrorDetail | string)[]>([]);
  const { setProfile, setIsAuthenticated } = useProfile();
  const form = useForm<RegisterUserRequest>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  async function onSubmit(values: RegisterUserRequest) {
    setIsLoading(true);
    setServerErrors([]);
    try {
      const res = await authApi.register(values);
      const data = await res.json();

      if (!res.ok) {
        // Handle array of validation errors or plain error message
        const errors: (ErrorDetail | string)[] = [];

        if (data.error?.errors && Array.isArray(data.error.errors)) {
          // Handle validation errors array
          errors.push(...data.error.errors);
        } else if (data.error?.message) {
          // Handle plain error message
          errors.push(data.error.message);
        } else if (data.message) {
          // Fallback to message field
          errors.push(data.message);
        } else {
          errors.push("Please check your information and try again.");
        }

        setServerErrors(errors);

        // Show toast with main error message
        const mainMessage = data.error?.message || data.message || "Registration failed";
        toast({
          title: "Registration failed",
          description: mainMessage,
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

      toast({
        title: "Success",
        description: "Your account has been created successfully. Welcome!",
      });

      // Redirect to create school if the user has no memberships yet
      navigate("/schools-create");
    } catch (error) {
      const errorMsg = "An unexpected error occurred. Please try again later.";
      setServerErrors([errorMsg]);
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
      title="Register User"
      description="Create a new user account in the system."
      breadcrumbs={[{ label: "Register" }]}
      centered
    >
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Enter the details for the new user account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {serverErrors.length > 0 && (
                  <Alert variant="destructive">
                    {(serverErrors.length === 1 && typeof serverErrors[0] === 'string') && <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>
                      {serverErrors.length === 1 && typeof serverErrors[0] === 'string' ? (
                        serverErrors[0]
                      ) : (
                        <ul className="mt-2 ml-4 list-disc space-y-1">
                          {serverErrors.map((error, idx) => (
                            <li key={idx}>
                              {typeof error === 'string' ? error : error.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} />
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
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    form.reset();
                    setServerErrors([]);
                  }} disabled={isLoading} className="flex-1">
                    Reset
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? "Registering..." : "Register User"}
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
