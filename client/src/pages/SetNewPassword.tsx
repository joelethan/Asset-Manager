import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api";
import { resetPasswordSchema, type ResetPasswordRequest } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";

/** Token-based reset, reached from the emailed link: /forgot-password?token=... */
export default function SetNewPassword({ token }: { token: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<ResetPasswordRequest>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordRequest) {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await authApi.resetPassword(token, values.newPassword);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error?.message || data.message || "Could not reset password. Please try again.");
        return;
      }
      toast({ title: "Password reset", description: "You can now sign in with your new password." });
      navigate("/login?reset=success", { replace: true });
    } catch {
      setServerError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token || !token.trim()) {
    return (
      <AppLayout
        title="Invalid reset link"
        description="This reset link is invalid or expired."
        breadcrumbs={[{ label: "Login", href: "/login" }, { label: "Forgot Password" }]}
        centered
      >
        <div className="mx-auto max-w-md w-full">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Reset link expired</CardTitle>
              <CardDescription>This password reset link is invalid, expired, or missing a token.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const passwordInput = (field: object, placeholder: string) => (
    <div className="relative">
      <Input type={showPassword ? "text" : "password"} placeholder={placeholder} {...field} />
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
  );

  return (
    <AppLayout
      title="Set New Password"
      description="Choose a new password."
      breadcrumbs={[{ label: "Login", href: "/login" }, { label: "Set New Password" }]}
      centered
    >
      <div className="max-w-md mx-auto">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>Your new password must be at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="space-y-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This reset link is invalid or incomplete. Please request a new one.
                  </AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link href="/forgot-password">Request a new link</Link>
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {serverError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {serverError}{" "}
                        <Link href="/forgot-password" className="font-medium underline">
                          Request a new link
                        </Link>
                      </AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>{passwordInput(field, "********")}</FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>{passwordInput(field, "********")}</FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
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
