import { AppLayout } from "@/components/layout/AppLayout";
import { useSchools, useCreateSchool } from "@/hooks/use-schools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, MapPin, Users, Calendar, Building2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { insertSchoolSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";

type FormSchema = z.infer<typeof insertSchoolSchema>;

export default function Schools() {
  const { data: schools, isLoading } = useSchools();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            type="search" 
            placeholder="Search schools..." 
            className="pl-9 bg-white border-slate-200 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <CreateSchoolDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
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
      ) : filteredSchools?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No schools found</h3>
          <p className="text-slate-500 max-w-sm mt-2 mb-6">
            We couldn't find any schools matching your search. Try creating a new one.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create School
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSchools?.map((school) => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function SchoolCard({ school }: { school: any }) {
  return (
    <Card className="group overflow-hidden border-slate-200 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      <div className="h-2 bg-gradient-to-r from-primary to-blue-400" />
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg mb-2">
            {school.name.charAt(0)}
          </div>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            Active
          </span>
        </div>
        <CardTitle className="text-xl group-hover:text-primary transition-colors">{school.name}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
            {school.slug}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>Main Campus</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="h-4 w-4 text-slate-400" />
            <span>1,200 Students</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 col-span-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Established 2024</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateSchoolDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
        onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
          <Plus className="mr-2 h-4 w-4" /> Add School
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New School</DialogTitle>
          <DialogDescription>
            Add a new tenant to the platform. This will create a dedicated workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createSchool.isPending} className="bg-primary text-primary-foreground">
              {createSchool.isPending ? "Creating..." : "Create School"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
