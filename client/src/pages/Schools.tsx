import { AppLayout } from "@/components/layout/AppLayout";
import { useSchools, useCreateSchool } from "@/hooks/use-schools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, MapPin, Users, Calendar, Building2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { insertSchoolSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

type FormSchema = z.infer<typeof insertSchoolSchema>;

export default function Schools() {
  const { data: schools, isLoading } = useSchools();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const createSchool = useCreateSchool();
  
  const form = useForm<FormSchema>({
    resolver: zodResolver(insertSchoolSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const onSubmit = (data: FormSchema) => {
    createSchool.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "School created successfully",
        });
        form.reset();
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      },
    });
  };

  const filteredSchools = schools?.filter(school => 
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    school.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout 
      title="Schools" 
      description="Manage educational institutions and tenant configurations."
      breadcrumbs={[{ label: "Schools" }]}
    >
      <div className="relative w-full max-w-sm mb-6">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
        <Input 
          type="search" 
          placeholder="Search schools..." 
          className="pl-9 bg-white border-slate-200 focus-visible:ring-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-slate-200">
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Schools Management</CardTitle>
            <CardDescription>Create and manage schools on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: List */}
              <div>
                {filteredSchools?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <Building2 className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-slate-500">No schools found</p>
                    <p className="text-sm text-slate-400 mt-1">Create one to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredSchools?.map((school) => (
                      <SchoolCard key={school.id} school={school} />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Form */}
              <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                <h3 className="font-semibold text-slate-900 mb-4">Create New School</h3>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">School Name</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Springfield High" 
                      {...form.register("name")}
                      className="focus-visible:ring-primary"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Unique Slug</Label>
                    <Input 
                      id="slug" 
                      placeholder="e.g. springfield-high" 
                      {...form.register("slug")} 
                      className="focus-visible:ring-primary font-mono text-sm"
                    />
                    {form.formState.errors.slug && (
                      <p className="text-sm text-red-500">{form.formState.errors.slug.message}</p>
                    )}
                    <p className="text-xs text-slate-500">Used for URL identification. Must be unique.</p>
                  </div>
                  <Button type="submit" disabled={createSchool.isPending} className="w-full gap-2">
                    {createSchool.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {createSchool.isPending ? "Creating..." : "Create School"}
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}

function SchoolCard({ school }: { school: any }) {
  return (
    <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {school.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900">{school.name}</h4>
            <p className="text-xs text-slate-500">{school.slug}</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-500">
          Active
        </span>
      </div>
    </div>
  );
}
