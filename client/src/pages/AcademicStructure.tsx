import { AppLayout } from "@/components/layout/AppLayout";
import {
  useTermTemplates,
  useCreateTermTemplate,
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYearStatus,
  useTerms,
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
import { Plus, Calendar, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { termTemplatesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

  const [termTemplateDialogOpen, setTermTemplateDialogOpen] = useState(false);
  const [academicYearDialogOpen, setAcademicYearDialogOpen] = useState(false);
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
      <div className="space-y-6">
        {/* Term Templates Section */}
        <TermTemplatesSection schoolId={schoolId} initialTemplates={prefetchedTemplates} />

        {/* Academic Years Section */}
        <AcademicYearsSection
          schoolId={schoolId}
          termTemplateDialogOpen={termTemplateDialogOpen}
          setTermTemplateDialogOpen={setTermTemplateDialogOpen}
          academicYearDialogOpen={academicYearDialogOpen}
          setAcademicYearDialogOpen={setAcademicYearDialogOpen}
          initialTemplates={prefetchedTemplates}
        />
      </div>
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm<Record<string, any>>({
    defaultValues: {
      name: "",
      term1: "Term 1",
      term2: "Term 2",
      term3: "Term 3",
      numberOfTerms: "3",
    },
  });

  const numberOfTerms = parseInt(watch("numberOfTerms"));

  const onSubmit = (data: any) => {
    const structure = [];
    for (let i = 1; i <= numberOfTerms; i++) {
      structure.push({
        ordinal: i,
        name: data[`term${i}`] || `Term ${i}`,
      });
    }

    // createTemplate(
    //   {
    //     schoolId,
    //     name: data.name,
    //     structure,
    //   },
    //   {
    //     onSuccess: () => {
    //       toast({ title: "Success", description: "Term template created" });
    //       setIsDialogOpen(false);
    //       reset();
    //     },
    //     onError: (error: any) => {
    //       toast({
    //         title: "Error",
    //         description: error.message,
    //         variant: "destructive",
    //       });
    //     },
    //   }
    // );
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Term Templates
          </CardTitle>
          <CardDescription>
            Define term structures for the school
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Term Template</DialogTitle>
              <DialogDescription>
                Define the number of terms and their names
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Standard 3-Term Template"
                  {...register("name", { required: true })}
                />
              </div>

              <div>
                <Label htmlFor="number-terms">Number of Terms</Label>
                <Select
                  value={numberOfTerms.toString()}
                  onValueChange={(value) => {
                    reset((state) => ({
                      ...state,
                      numberOfTerms: value,
                    }));
                  }}
                >
                  <SelectTrigger id="number-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Terms</SelectItem>
                    <SelectItem value="3">3 Terms</SelectItem>
                    <SelectItem value="4">4 Terms</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Term Names</Label>
                {Array.from({ length: numberOfTerms }).map((_, i) => (
                  <Input
                    key={i}
                    placeholder={`Term ${i + 1}`}
                    {...register(`term${i + 1}`)}
                  />
                ))}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

function AcademicYearsSection({
  schoolId,
  termTemplateDialogOpen,
  setTermTemplateDialogOpen,
  academicYearDialogOpen,
  setAcademicYearDialogOpen,
  initialTemplates,
}: {
  schoolId: string;
  termTemplateDialogOpen: boolean;
  setTermTemplateDialogOpen: (open: boolean) => void;
  academicYearDialogOpen: boolean;
  setAcademicYearDialogOpen: (open: boolean) => void;
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
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: new Date().getFullYear().toString(),
      startDate: "2025-02-01",
      endDate: "2025-11-30",
      termTemplateId: "",
    },
  });

  const onSubmit = (data: any) => {
    if (!data.termTemplateId) {
      toast({
        title: "Error",
        description: "Please select a term template",
        variant: "destructive",
      });
      return;
    }

    // createYear(
    //   {
    //     schoolId,
    //     name: data.name,
    //     startDate: new Date(data.startDate),
    //     endDate: new Date(data.endDate),
    //     termTemplateId: parseInt(data.termTemplateId),
    //   },
    //   {
    //     onSuccess: () => {
    //       toast({
    //         title: "Success",
    //         description: "Academic year created",
    //       });
    //       setAcademicYearDialogOpen(false);
    //       reset();
    //     },
    //     onError: (error: any) => {
    //       toast({
    //         title: "Error",
    //         description: error.message,
    //         variant: "destructive",
    //       });
    //     },
    //   }
    // );
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Academic Years
          </CardTitle>
          <CardDescription>
            Create and manage academic years with terms
          </CardDescription>
        </div>
        <Dialog
          open={academicYearDialogOpen}
          onOpenChange={setAcademicYearDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Year
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Academic Year</DialogTitle>
              <DialogDescription>
                Create a new academic year with terms from a template
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="year-name">Year Name</Label>
                <Input
                  id="year-name"
                  placeholder="e.g., 2025"
                  {...register("name", { required: true })}
                />
              </div>

              <div>
                <Label htmlFor="term-template">Term Template</Label>
                {!templatesToUse || templatesToUse.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Create a term template first
                  </p>
                ) : (
                  <Select {...register("termTemplateId", { required: true })}>
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
              </div>

              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  {...register("startDate", { required: true })}
                />
              </div>

              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  {...register("endDate", { required: true })}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAcademicYearDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingYear}>
                  {isCreatingYear ? "Creating..." : "Create Year"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {yearsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : years && years.length > 0 ? (
          <div className="space-y-3">
            {years.map((year: any) => (
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
  const { data: terms, isLoading: termsLoading } = useTerms(year.id);

  return (
    <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900">Academic Year {year.name}</h4>
          <p className="text-sm text-slate-500">
            {new Date(year.startDate).toLocaleDateString()} -{" "}
            {new Date(year.endDate).toLocaleDateString()}
          </p>
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

      {termsLoading ? (
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
      ) : null}
    </div>
  );
}
