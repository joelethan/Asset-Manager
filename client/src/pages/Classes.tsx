import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/TenantContext";
import { classroomDefinitionsApi, classroomOfferingsApi, academicYearsApi } from "@/lib/api";

interface ClassroomDefinition {
  id: string;
  school_id: string;
  name: string;
  level: string;
}

interface AcademicYear {
  id: string;
  name: string;
  status: string;
}

interface ClassroomOffering {
  id: string;
  academic_year_id: string;
  classroom_definition_id: string;
  display_name: string;
}

interface FormState {
  isOpen: boolean;
  isLoading: boolean;
  editingId: string | null;
}

export default function Classes() {
  const { toast } = useToast();
  const { selectedTenant } = useTenant();
  const schoolId = selectedTenant?.id as string;

  // Classroom Definition states
  const [classrooms, setClassrooms] = useState<ClassroomDefinition[]>([]);
  const [offerings, setOfferings] = useState<ClassroomOffering[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Form states
  const [classroomForm, setClassroomForm] = useState<FormState>({
    isOpen: false,
    isLoading: false,
    editingId: null,
  });

  const [offeringForm, setOfferingForm] = useState<FormState>({
    isOpen: false,
    isLoading: false,
    editingId: null,
  });

  // Form data
  const [classroomData, setClassroomData] = useState({ name: "", level: "" });
  const [offeringData, setOfferingData] = useState({ classroomDefinitionId: "", displayName: "" });

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount and when tenant changes
  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId]);

  // Load academic years when selected year changes
  useEffect(() => {
    if (selectedYear) {
      loadOfferings(selectedYear);
    }
  }, [selectedYear]);

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      // Load classroom definitions
      const classroomsRes = await classroomDefinitionsApi.list(schoolId);
      if (!classroomsRes.ok) throw new Error("Failed to load classrooms");
      const classroomsData = await classroomsRes.json();
      setClassrooms(Array.isArray(classroomsData) ? classroomsData : []);

      // Load academic years
      const yearsRes = await academicYearsApi.list(schoolId);
      if (!yearsRes.ok) throw new Error("Failed to load academic years");
      const yearsData = await yearsRes.json();
      const years = Array.isArray(yearsData) ? yearsData : [];
      setAcademicYears(years);

      // Set first year as default
      if (years.length > 0) {
        setSelectedYear(years[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast({
        title: "Error loading data",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadOfferings = async (yearId: string) => {
    try {
      const res = await classroomOfferingsApi.list(yearId);
      if (!res.ok) throw new Error("Failed to load classroom offerings");
      const data = await res.json();
      setOfferings(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error loading offerings",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Classroom Definition handlers
  const handleAddClassroom = () => {
    setClassroomData({ name: "", level: "" });
    setClassroomForm({ isOpen: true, isLoading: false, editingId: null });
  };

  const handleEditClassroom = (classroom: ClassroomDefinition) => {
    setClassroomData({ name: classroom.name, level: classroom.level });
    setClassroomForm({ isOpen: true, isLoading: false, editingId: classroom.id });
  };

  const handleSaveClassroom = async () => {
    if (!classroomData.name.trim() || !classroomData.level.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and level are required",
        variant: "destructive",
      });
      return;
    }

    setClassroomForm(prev => ({ ...prev, isLoading: true }));
    try {
      const method = classroomForm.editingId ? "update" : "create";
      let res;

      if (classroomForm.editingId) {
        res = await classroomDefinitionsApi.update(schoolId, classroomForm.editingId, classroomData);
      } else {
        res = await classroomDefinitionsApi.create(schoolId, classroomData);
      }

      if (!res.ok) throw new Error(`Failed to ${method} classroom`);

      toast({
        title: "Success",
        description: `Classroom ${method === "create" ? "created" : "updated"} successfully`,
      });

      setClassroomForm({ isOpen: false, isLoading: false, editingId: null });
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setClassroomForm(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteClassroom = async (id: string) => {
    if (!confirm("Are you sure you want to delete this classroom?")) return;

    try {
      const res = await classroomDefinitionsApi.delete(schoolId, id);
      if (!res.ok) throw new Error("Failed to delete classroom");

      toast({
        title: "Success",
        description: "Classroom deleted successfully",
      });

      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Classroom Offering handlers
  const handleAddOffering = () => {
    setOfferingData({ classroomDefinitionId: "", displayName: "" });
    setOfferingForm({ isOpen: true, isLoading: false, editingId: null });
  };

  const handleEditOffering = (offering: ClassroomOffering) => {
    setOfferingData({
      classroomDefinitionId: offering.classroom_definition_id,
      displayName: offering.display_name,
    });
    setOfferingForm({ isOpen: true, isLoading: false, editingId: offering.id });
  };

  const handleSaveOffering = async () => {
    if (!offeringData.classroomDefinitionId || !offeringData.displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    setOfferingForm(prev => ({ ...prev, isLoading: true }));
    try {
      const method = offeringForm.editingId ? "update" : "create";
      let res;

      const payload = {
        classroomDefinitionId: offeringData.classroomDefinitionId,
        displayName: offeringData.displayName,
      };

      if (offeringForm.editingId) {
        res = await classroomOfferingsApi.update(selectedYear, offeringForm.editingId, payload);
      } else {
        res = await classroomOfferingsApi.create(selectedYear, payload);
      }

      if (!res.ok) throw new Error(`Failed to ${method} classroom offering`);

      toast({
        title: "Success",
        description: `Classroom offering ${method === "create" ? "created" : "updated"} successfully`,
      });

      setOfferingForm({ isOpen: false, isLoading: false, editingId: null });
      loadOfferings(selectedYear);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setOfferingForm(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteOffering = async (id: string) => {
    if (!confirm("Are you sure you want to delete this classroom offering?")) return;

    try {
      const res = await classroomOfferingsApi.delete(selectedYear, id);
      if (!res.ok) throw new Error("Failed to delete classroom offering");

      toast({
        title: "Success",
        description: "Classroom offering deleted successfully",
      });

      loadOfferings(selectedYear);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (isLoadingData) {
    return (
      <AppLayout title="Classes" description="Manage classroom definitions and offerings">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const getClassroomName = (id: string) => {
    return classrooms.find(c => c.id === id)?.name || "Unknown";
  };

  return (
    <AppLayout
      title="Classes"
      description="Manage classroom definitions and offerings for your school"
      breadcrumbs={[{ label: "Classes" }]}
    >
      <Tabs defaultValue="definitions" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="definitions">Classroom Definitions</TabsTrigger>
          <TabsTrigger value="offerings">Classroom Offerings</TabsTrigger>
        </TabsList>

        {/* Classroom Definitions Tab */}
        <TabsContent value="definitions" className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Classroom Definitions</h3>
              <p className="text-sm text-slate-500">Create and manage classroom levels for your school (e.g., Primary 7, Form 4A)</p>
            </div>
            <Dialog open={classroomForm.isOpen} onOpenChange={(open) => setClassroomForm({ ...classroomForm, isOpen: open })}>
              <DialogTrigger asChild>
                <Button onClick={handleAddClassroom} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Classroom
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {classroomForm.editingId ? "Edit Classroom" : "Create Classroom"}
                  </DialogTitle>
                  <DialogDescription>
                    Define a new classroom level or edit an existing one
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="class-name">Classroom Name *</Label>
                    <Input
                      id="class-name"
                      placeholder="e.g., Primary 7"
                      value={classroomData.name}
                      onChange={(e) => setClassroomData({ ...classroomData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="class-level">Level *</Label>
                    <Input
                      id="class-level"
                      placeholder="e.g., Primary"
                      value={classroomData.level}
                      onChange={(e) => setClassroomData({ ...classroomData, level: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setClassroomForm({ ...classroomForm, isOpen: false })}
                      disabled={classroomForm.isLoading}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveClassroom} disabled={classroomForm.isLoading} className="gap-2">
                      {classroomForm.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {classroomForm.editingId ? "Update" : "Create"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {classrooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                  <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-slate-500">No classroom definitions yet.</p>
                  <p className="text-sm text-slate-400 mt-1">Create one to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classrooms.map((classroom) => (
                      <TableRow key={classroom.id}>
                        <TableCell className="font-medium">{classroom.name}</TableCell>
                        <TableCell>{classroom.level}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClassroom(classroom)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClassroom(classroom.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classroom Offerings Tab */}
        <TabsContent value="offerings" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Classroom Offerings</h3>
              <p className="text-sm text-slate-500">Create classroom offerings for the selected academic year</p>
            </div>
            <Dialog open={offeringForm.isOpen} onOpenChange={(open) => setOfferingForm({ ...offeringForm, isOpen: open })}>
              <DialogTrigger asChild>
                <Button onClick={handleAddOffering} className="gap-2" disabled={!selectedYear}>
                  <Plus className="h-4 w-4" />
                  Add Offering
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {offeringForm.editingId ? "Edit Offering" : "Create Offering"}
                  </DialogTitle>
                  <DialogDescription>
                    Create a new classroom offering for this academic year
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="classroom-select">Classroom Definition *</Label>
                    <Select value={offeringData.classroomDefinitionId} onValueChange={(value) => setOfferingData({ ...offeringData, classroomDefinitionId: value })}>
                      <SelectTrigger id="classroom-select">
                        <SelectValue placeholder="Select a classroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {classrooms.map((classroom) => (
                          <SelectItem key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="display-name">Display Name *</Label>
                    <Input
                      id="display-name"
                      placeholder="e.g., Primary 7 A"
                      value={offeringData.displayName}
                      onChange={(e) => setOfferingData({ ...offeringData, displayName: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setOfferingForm({ ...offeringForm, isOpen: false })}
                      disabled={offeringForm.isLoading}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveOffering} disabled={offeringForm.isLoading} className="gap-2">
                      {offeringForm.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {offeringForm.editingId ? "Update" : "Create"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {academicYears.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Academic Year</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.status && `(${year.status})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              {academicYears.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                  <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-slate-500">No academic years found.</p>
                  <p className="text-sm text-slate-400 mt-1">Create an academic year first</p>
                </div>
              ) : offerings.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                  <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-slate-500">No classroom offerings for this year.</p>
                  <p className="text-sm text-slate-400 mt-1">Create one to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Classroom Definition</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offerings.map((offering) => (
                      <TableRow key={offering.id}>
                        <TableCell className="font-medium">{offering.display_name}</TableCell>
                        <TableCell>{getClassroomName(offering.classroom_definition_id)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditOffering(offering)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteOffering(offering.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
