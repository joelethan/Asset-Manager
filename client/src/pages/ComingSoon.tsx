import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/context/ProfileContext";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function ComingSoon() {
    const { isAuthenticated, profile } = useProfile();
    const targetPath = isAuthenticated && profile?.memberships?.length ? "/dashboard" : "/schools-create";

    return (
        <AppLayout
            title="Feature planned"
            description="This area is still under development, but you can continue with a live part of the system right away."
            breadcrumbs={[{ label: "Planned feature" }]}
        >
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="max-w-lg w-full shadow-sm border-slate-200">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <AlertCircle className="h-10 w-10 text-amber-500" />
                        </div>
                        <CardTitle className="text-2xl">This feature is still in progress</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 text-center">
                        <p className="text-slate-600">
                            The module you requested is not available yet, but the app is already ready for the next step in your workflow.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                            <Button asChild className="bg-primary text-white hover:bg-primary/90">
                                <Link href={targetPath}>Continue now</Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={isAuthenticated ? "/dashboard" : "/login"}>Go back</Link>
                            </Button>
                        </div>
                        <p className="text-sm text-slate-500">
                            If this page was reached from a saved link, it may be pointing to a feature still in the roadmap.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
