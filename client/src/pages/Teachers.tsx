import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Teachers() {
  return (
    <AppLayout 
      title="Teachers" 
      description="Manage faculty and staff assignments."
      breadcrumbs={[{ label: "Teachers" }]}
    >
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
          <Plus className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Faculty Management Coming Soon</h3>
        <p className="text-slate-500 max-w-sm mt-2 mb-6">
          This module is currently under development. Check back later for updates.
        </p>
        <Button disabled variant="secondary">
          Feature In Progress
        </Button>
      </div>
    </AppLayout>
  );
}
