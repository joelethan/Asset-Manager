import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Guardians() {

    return (
        <AppLayout
            title="Guardians"
            description="Manage guardians for students."
            breadcrumbs={[{ label: "Guardians" }]}
        >
            <Tabs defaultValue="create" className="w-full">
                <TabsList className="grid w-full grid-cols-2 border-b">
                    <TabsTrigger value="create">Create Guardian</TabsTrigger>
                    <TabsTrigger value="guardians">Guardians List</TabsTrigger>
                </TabsList>

                <TabsContent value="create">
                    Tab 1
                </TabsContent>

                <TabsContent value="guardians">
                    Tab 2
                </TabsContent>
            </Tabs>
        </AppLayout>
    );
}
