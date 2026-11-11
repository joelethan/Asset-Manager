import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { changePasswordSchema, type ChangePasswordRequest } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

/** Change password for a logged-in user (requires current password). */
export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<ChangePasswordRequest>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordRequest) {
    setIsLoading(true);
    setServerError(null);
    setSuccess(false);
    try {
      const res = await authApi.changePassword(values.currentPassword, values.newPassword);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error?.message || data.message || "Could not change password. Please try again.");
        return;
      }
      setSuccess(true);
      form.reset();
    } catch {
      setServerError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  const passwordInput = (field: object) => (
    <div className="relative">
      <Input type={showPassword ? "text" : "password"} placeholder="********" {...field} />
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

  const fields = [
    { name: "currentPassword", label: "Current Password" },
    { name: "newPassword", label: "New Password" },
    { name: "confirmPassword", label: "Confirm New Password" },
  ] as const;

  return (
    <AppLayout
      title="Reset Password"
      description="Change your account password."
      breadcrumbs={[{ label: "Reset Password" }]}
      centered
    >
      <div className="mx-auto max-w-md w-full">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Change your password</CardTitle>
            <CardDescription>
              Enter your current password, then choose a new one of at least 8 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {success && (
                  <Alert className="border-green-200 bg-green-50 text-green-800">
                    <CheckCircle2 className="h-4 w-4 !text-green-600" />
                    <AlertDescription>Password has been changed successfully.</AlertDescription>
                  </Alert>
                )}
                {serverError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{serverError}</AlertDescription>
                  </Alert>
                )}

                {fields.map(({ name, label }) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>{passwordInput(field)}</FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Saving..." : "Change Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
