import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile } from "@/context/ProfileContext";
import { useTenant } from "@/context/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { authApi, schoolsApi } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { z } from "zod";

const createSchoolFormSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  address: z.string().optional(),
  // logoUrl: z.string().url().optional(),
  currency: z.string().min(1),
  timeZone: z.string().min(1),
  institutionType: z.enum(["PRIMARY_SCHOOL", "SECONDARY_SCHOOL", "UNIVERSITY"]).optional(),
});

export default function CreateSchool() {
  const { toast } = useToast();
  type FormSchema = z.infer<typeof createSchoolFormSchema>;
  const form = useForm<FormSchema>({
    resolver: zodResolver(createSchoolFormSchema),
    defaultValues: {
      code: "",
      name: "",
      domain: "",
      email: "",
      phone: "",
      address: "",
      // logoUrl: "",
      currency: "UGX",
      timeZone: "Africa/Kampala",
      institutionType: "PRIMARY_SCHOOL",
    },
  });
  const [, navigate] = useLocation();
  const { setProfile, profile } = useProfile();
  const { setSelectedTenant } = useTenant();
  const [isResending, setIsResending] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [mainErrorMessage, setMainErrorMessage] = useState<string>("");

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      const res = await authApi.resendVerification();
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to resend verification email" }));
        toast({ variant: "destructive", title: "Error", description: err.message || "Failed to resend verification email" });
        return;
      }
      toast({ title: "Verification sent", description: "A verification email has been sent. Check your inbox." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Unexpected error" });
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (data: FormSchema) => {
    setServerErrors([]);
    setMainErrorMessage("");
    try {
      const res = await schoolsApi.create(data);
      if (!res.ok) {
        let errors: string[] = [];
        let mainMsg = "Failed to create school";
        const err = await res.json().catch(() => ({ message: mainMsg }));
        if (err?.error) {
          if (err.error.message) mainMsg = err.error.message;
          if (err.error.errors && Array.isArray(err.error.errors)) {
            errors = err.error.errors.map((e: any) => e.message || String(e));
          }
        } else if (err?.message) {
          mainMsg = err.message;
        }
        setMainErrorMessage(mainMsg);
        setServerErrors(errors);
        toast({ variant: "destructive", title: "Error", description: mainMsg });
        return;
      }

      const created = await res.json();
      toast({ title: "Success", description: created?.name ? `School "${created.name}" created and selected.` : "School created successfully" });

      // Select the newly created school as active tenant
      try {
        if (created && created.id) {
          setSelectedTenant({ id: String(created.id), name: created.name });
        }
      } catch { }

      // Refresh profile to include new membership
      try {
        const profileRes = await authApi.profile();
        if (profileRes.ok) {
          const p = await profileRes.json();
          try {
            setProfile(p);
          } catch { }
        }
      } catch { }

      navigate("/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Unexpected error" });
    }
  };

  return (
    <AppLayout
      title="Create School"
      description="Create your first school to manage classes, students and teachers."
      centered
    >
      <div className="max-w-xl mx-auto">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Create a School</CardTitle>
            <CardDescription>You'll be assigned as the School Admin for this school.</CardDescription>
          </CardHeader>
          <CardContent>
            {(mainErrorMessage || serverErrors?.length > 0) && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  {mainErrorMessage && <div>{mainErrorMessage}</div>}
                  {serverErrors?.length > 0 && (
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      {serverErrors?.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {profile?.emailVerified === false && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Email not verified</AlertTitle>
                <AlertDescription>
                  <div className="flex items-center justify-between gap-4">
                    <div>Please verify your email by clicking the link we sent to your email address before creating a school.</div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResend}
                        disabled={isResending || profile?.emailVerified === true}
                      >
                        {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend verification"}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Alert className="mb-4">
              <AlertTitle>Note:</AlertTitle>
              <AlertDescription>
                Other app sections are hidden until you create and are assigned to a school.
                {/* You can still access <strong>Settings</strong> while you set up your school. */}
              </AlertDescription>
            </Alert>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">School Code</Label>
                  <Input id="code" placeholder="e.g. SCH002" {...form.register("code")} className="focus-visible:ring-primary" />
                  {form.formState.errors.code && <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input id="domain" placeholder="e.g. atom-high-school" {...form.register("domain")} className="focus-visible:ring-primary font-mono text-sm" />
                  {form.formState.errors.domain && <p className="text-sm text-red-500">{form.formState.errors.domain.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">School Name</Label>
                  <Input id="name" placeholder="e.g. Atom High School" {...form.register("name")} className="focus-visible:ring-primary" />
                  {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" placeholder="contact@domain.test" {...form.register("email")} className="focus-visible:ring-primary" />
                  {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
                </div>
                {/* {false && <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input id="logoUrl" placeholder="https://example.com/logo.png" {...form.register("logoUrl")} className="focus-visible:ring-primary" />
                  {form.formState.errors.logoUrl && <p className="text-sm text-red-500">{form.formState.errors.logoUrl.message}</p>}
                </div>} */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="institutionType">Institution Type</Label>
                  <Select value={form.watch("institutionType") || "PRIMARY_SCHOOL"} onValueChange={(value) => form.setValue("institutionType", value as "PRIMARY_SCHOOL" | "SECONDARY_SCHOOL" | "UNIVERSITY")}>
                    <SelectTrigger id="institutionType" className="focus-visible:ring-primary">
                      <SelectValue placeholder="Select institution type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIMARY_SCHOOL">Primary School</SelectItem>
                      <SelectItem value="SECONDARY_SCHOOL">Secondary School</SelectItem>
                      <SelectItem value="UNIVERSITY">University</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.institutionType && <p className="text-sm text-red-500">{form.formState.errors.institutionType.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeZone">Time Zone</Label>
                  <Input id="timeZone" placeholder="Africa/Kampala" {...form.register("timeZone")} className="focus-visible:ring-primary" />
                  {form.formState.errors.timeZone && <p className="text-sm text-red-500">{form.formState.errors.timeZone.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="0700000001" {...form.register("phone")} className="focus-visible:ring-primary" />
                {form.formState.errors.phone && <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main Street" {...form.register("address")} className="focus-visible:ring-primary" />
                {form.formState.errors.address && <p className="text-sm text-red-500">{form.formState.errors.address.message}</p>}
              </div>

              <Button type="submit" disabled={form.formState.isSubmitting || profile?.emailVerified === false} className="w-full gap-2">
                {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.formState.isSubmitting ? "Creating..." : "Create School"}
              </Button>
              {profile?.emailVerified === false && (
                <p className="text-sm text-red-500 text-center mt-2">Please verify your email by clicking the verification link we sent to your email before creating a school.</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
