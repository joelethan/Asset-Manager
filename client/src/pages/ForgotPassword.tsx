import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { forgotPasswordSchema, type ForgotPasswordRequest } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearch } from "wouter";
import SetNewPassword from "./SetNewPassword";

export default function ForgotPassword() {
  const token = new URLSearchParams(useSearch()).get("token");
  if (token) return <SetNewPassword token={token} />;
  return <RequestResetLink />;
}

function RequestResetLink() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordRequest) {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await authApi.forgotPassword(values.email);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerError(data.error?.message || data.message || "Could not send reset link. Please try again.");
        return;
      }
      setSentTo(values.email);
    } catch {
      setServerError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppLayout
      title="Forgot Password"
      description="Reset your account password."
      breadcrumbs={[{ label: "Login", href: "/login" }, { label: "Forgot Password" }]}
      centered
    >
      <div className="max-w-md mx-auto">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Forgot your password?</CardTitle>
            <CardDescription>
              Enter the email address on your account and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sentTo ? (
              <div className="space-y-6">
                <Alert>
                  <MailCheck className="h-4 w-4" />
                  <AlertDescription>
                    If an account exists for <span className="font-medium">{sentTo}</span>, a reset link is on its
                    way. The link expires in 1 hour.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setSentTo(null)}>
                    Use a different email
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/login">Back to Sign In</Link>
                  </Button>
                </div>
              </div>
            ) : (
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
                          <Input type="email" placeholder="your.email@example.com" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Remembered it?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                      Back to Sign In
                    </Link>
                  </p>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
