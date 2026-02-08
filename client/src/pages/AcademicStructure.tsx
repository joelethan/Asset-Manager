import { AppLayout } from "@/components/layout/AppLayout";
import {
  useTermTemplates,
  useCreateTermTemplate,
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYearStatus,
  // useTerms,
} from "@/hooks/use-academic-structure";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { termTemplatesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function formatDateDMY(input?: string | Date | null) {
  if (!input) return "";
  const d = new Date(input as any);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function AcademicStructure() {
  const { selectedTenant } = useTenant();

  if (!selectedTenant) {
    return (
      <AppLayout
        title="Academic Structure"
        description="Configure terms, academic years, and school calendar."
        breadcrumbs={[{ label: "Academic Structure" }]}
      >
        <div className="text-center py-12">
          <p className="text-slate-500">Please select a school from the top header to get started.</p>
        </div>
      </AppLayout>
    );
  }

  const [prefetchedTemplates, setPrefetchedTemplates] = useState<any[] | null>(null);
  const schoolId = selectedTenant.id;

  useEffect(() => {
    let mounted = true;
    termTemplatesApi
      .list(schoolId)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setPrefetchedTemplates(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setPrefetchedTemplates([]);
      });

    return () => {
      mounted = false;
    };
  }, [schoolId]);

  return (
    <AppLayout
      title="Academic Structure"
      description="Configure terms, academic years, and school calendar."
      breadcrumbs={[{ label: "Academic Structure" }]}
    >
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Term Templates</TabsTrigger>
          <TabsTrigger value="years">Academic Years</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <TermTemplatesSection schoolId={schoolId} initialTemplates={prefetchedTemplates} />
        </TabsContent>

        <TabsContent value="years">
          <AcademicYearsSection
            schoolId={schoolId}
            initialTemplates={prefetchedTemplates}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function TermTemplatesSection({
  schoolId,
  initialTemplates,
}: {
  schoolId: string;
  initialTemplates?: any[] | null;
}) {
  const { data: templates, isLoading } = useTermTemplates(schoolId);
  const templatesToShow = templates ?? initialTemplates ?? [];
  const { mutate: createTemplate, isPending } = useCreateTermTemplate();
  const { toast } = useToast();
  const { register, handleSubmit, reset, watch, formState: { errors, isValid }, control } = useForm<Record<string, any>>({
    defaultValues: {
      name: "",
      structure: [{ ordinal: 1, name: "" }, { ordinal: 2, name: "" }],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = watch("structure") ?
    {
      fields: watch("structure"),
      append: (item: any) => {
        const current = watch("structure");
        reset({ name: watch("name"), structure: [...current, { ordinal: current.length + 1, name: "" }] });
      },
      remove: (idx: number) => {
        const current = watch("structure");
        const updated = current.filter((_: any, i: number) => i !== idx).map((item: any, i: number) => ({ ...item, ordinal: i + 1 }));
        reset({ name: watch("name"), structure: updated });
      }
    }
    : { fields: [], append: () => { }, remove: () => { } };

  const onSubmit = (data: any) => {
    if (!data.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    const structure = data.structure
      .filter((item: any) => item.name.trim())
      .map((item: any, idx: number) => ({
        ordinal: idx + 1,
        name: item.name,
      }));

    if (structure.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one term",
        variant: "destructive",
      });
      return;
    }

    createTemplate(
      {
        schoolId,
        name: data.name,
        structure,
      },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Term template created" });
          reset();
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Term Templates
        </CardTitle>
        <CardDescription>
          Define term structures for the school
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Existing Templates */}
          <div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : templatesToShow.length > 0 ? (
              <div className="space-y-2">
                {templatesToShow.map((template: any) => (
                  <div
                    key={template.id}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">
                        {template.name}
                      </h4>
                      <Badge variant="outline">
                        {template.structure?.length || 0} Terms
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {template.structure?.map((term: any, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {term.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">
                No term templates yet. Create one to get started.
              </p>
            )}
          </div>

          {/* Right: Create Form */}
          <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-4">Create New Template</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Standard 3-Term Template"
                  {...register("name", {
                    required: "Template name is required",
                    minLength: { value: 1, message: "Name cannot be empty" }
                  })}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{String(errors.name.message)}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Term Structure</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => append({ ordinal: watch("structure").length + 1, name: "" })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Term
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {watch("structure")?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-500 w-8">
                        {idx + 1}.
                      </span>
                      <Input
                        placeholder={`Term name`}
                        {...register(`structure.${idx}.name`)}
                        className="flex-1"
                      />
                      {watch("structure").length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(idx)}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={isPending || watch("structure").every((s: any) => !s.name.trim())} className="w-full">
                {isPending ? "Creating..." : "Create Template"}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AcademicYearsSection({
  schoolId,
  initialTemplates,
}: {
  schoolId: string;
  initialTemplates?: any[] | null;
}) {
  const { data: years, isLoading: yearsLoading } = useAcademicYears(schoolId);
  const { data: templates } = useTermTemplates(schoolId);
  const templatesToUse = templates ?? initialTemplates ?? [];
  const { mutate: createYear, isPending: isCreatingYear } =
    useCreateAcademicYear();
  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateAcademicYearStatus();
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isValid }, control } = useForm({
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      termTemplateId: "",
    },
    mode: "onChange",
  });

  const onSubmit = (data: any) => {
    if (!data.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a year name",
        variant: "destructive",
      });
      return;
    }

    if (!data.startDate || !data.endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (!data.termTemplateId) {
      toast({
        title: "Error",
        description: "Please select a term template",
        variant: "destructive",
      });
      return;
    }

    createYear(
      {
        schoolId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        termTemplateId: data.termTemplateId,
      },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Academic year created",
          });
          reset();
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleActivateYear = (yearId: number) => {
    updateStatus(
      { id: yearId, status: "active" },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Academic year activated",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Academic Years
        </CardTitle>
        <CardDescription>
          Create and manage academic years with terms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Existing Years */}
          <div>
            {yearsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : years && years.length > 0 ? (
              <div className="space-y-3">
                {[...years].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).map((year: any) => (
                  <AcademicYearCard
                    key={year.id}
                    year={year}
                    onActivate={() => handleActivateYear(year.id)}
                    isUpdatingStatus={isUpdatingStatus}
                    schoolId={schoolId}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">
                No academic years yet. Create one to get started.
              </p>
            )}
          </div>

          {/* Right: Create Form */}
          <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-4">Create New Year</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="year-name">Year Name</Label>
                <Input
                  id="year-name"
                  placeholder="e.g., 2025"
                  {...register("name", {
                    required: "Year name is required",
                    minLength: { value: 1, message: "Name cannot be empty" }
                  })}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{String(errors.name.message)}</p>}
              </div>

              <div>
                <Label htmlFor="term-template">Term Template</Label>
                {!templatesToUse || templatesToUse.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Create a term template first
                  </p>
                ) : (
                  <>
                    <Controller
                      name="termTemplateId"
                      control={control}
                      rules={{ required: "Please select a template" }}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="term-template">
                            <SelectValue placeholder="Select a template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {templatesToUse.map((template: any) => (
                              <SelectItem
                                key={template.id}
                                value={template.id.toString()}
                              >
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.termTemplateId && <p className="text-xs text-red-500 mt-1">{String(errors.termTemplateId.message)}</p>}
                  </>
                )}
              </div>

              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  {...register("startDate", { required: "Start date is required" })}
                />
                {errors.startDate && <p className="text-xs text-red-500 mt-1">{String(errors.startDate.message)}</p>}
              </div>

              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  {...register("endDate", { required: "End date is required" })}
                />
                {errors.endDate && <p className="text-xs text-red-500 mt-1">{String(errors.endDate.message)}</p>}
              </div>

              <Button type="submit" disabled={isCreatingYear || !isValid} className="w-full">
                {isCreatingYear ? "Creating..." : "Create Year"}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AcademicYearCard({
  year,
  onActivate,
  isUpdatingStatus,
  schoolId,
}: {
  year: any;
  onActivate: () => void;
  isUpdatingStatus: boolean;
  schoolId: string;
}) {
  // const { data: terms, isLoading: termsLoading } = useTerms(year.id);

  return (
    <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900">Academic Year {year.name}</h4>
          <p className="text-sm text-slate-500">
            {formatDateDMY(year.start_date)} - {formatDateDMY(year.end_date)}
          </p>
          {year.term_template?.name && (
            <p className="text-sm text-slate-500 mt-1">Term Template: {year.term_template.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              year.status === "active"
                ? "default"
                : year.status === "planned"
                  ? "secondary"
                  : "outline"
            }
          >
            {year.status.charAt(0).toUpperCase() + year.status.slice(1)}
          </Badge>
          {year.status === "planned" && (
            <Button
              size="sm"
              onClick={onActivate}
              disabled={isUpdatingStatus}
            >
              Activate
            </Button>
          )}
        </div>
      </div>

      {/* {termsLoading ? (
        <div className="space-y-1">
          <Skeleton className="h-6 w-32" />
        </div>
      ) : terms && terms.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {terms.map((term: any) => (
            <Badge key={term.id} variant="outline">
              {term.name}
            </Badge>
          ))}
        </div>
      ) : null} */}
    </div>
  );
}
