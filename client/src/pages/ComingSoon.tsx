import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function ComingSoon() {
    return (
        <AppLayout
            title=""
            description=""
            breadcrumbs={[{ label: "Coming Soon" }]}
        >
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full text-center shadow-sm border-slate-200">
                    <CardHeader>
                        <div className="flex justify-center mb-2">
                            <AlertCircle className="h-10 w-10 text-yellow-500" />
                        </div>
                        <CardTitle className="text-2xl">Coming Soon</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-2">
                            This page or feature is not yet available. We’re working hard to bring it to you soon!
                        </p>
                        <p className="text-slate-400 text-sm">
                            Please check back later or contact support if you have any questions.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
