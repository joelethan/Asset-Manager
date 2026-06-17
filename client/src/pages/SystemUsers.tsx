import { useProfile } from "@/context/ProfileContext";
import { Edit, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { adminApi } from "../lib/api";

interface SystemUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: string;
}

export default function SystemUsers() {
    const { profile } = useProfile();
    const userRole = profile?.role;
    const [activeTab, setActiveTab] = useState("schoolAdmins");
    const [schoolAdmins, setSchoolAdmins] = useState<SystemUser[]>([]);
    const [superAdmins, setSuperAdmins] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        setLoading(true);
        setError(null);
        const promises = [adminApi.listSchoolAdmins()];
        if (userRole === "SUPER_ADMIN") {
            promises.push(adminApi.listSuperAdmins());
        }
        Promise.all(promises)
            .then(async (responses) => {
                const schoolData = await responses[0].json();
                setSchoolAdmins(schoolData);
                if (userRole === "SUPER_ADMIN" && responses[1]) {
                    const superData = await responses[1].json();
                    setSuperAdmins(superData);
                }
            })
            .catch(() => setError("Failed to load system users."))
            .finally(() => setLoading(false));
    }, [userRole]);

    const filteredSchoolAdmins = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return schoolAdmins;
        return schoolAdmins.filter((u) =>
            [u.firstName, u.lastName, u.email].some((v) => v.toLowerCase().includes(q))
        );
    }, [schoolAdmins, search]);

    const filteredSuperAdmins = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return superAdmins;
        return superAdmins.filter((u) =>
            [u.firstName, u.lastName, u.email].some((v) => v.toLowerCase().includes(q))
        );
    }, [superAdmins, search]);

    return (
        <AppLayout
            title="System Users"
            description="Manage School Admins and Super Admins."
            breadcrumbs={[{ label: "System Users" }]}
        >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={`grid w-full border-b ${userRole === "SUPER_ADMIN" ? "grid-cols-2" : "grid-cols-1"}`}>
                    <TabsTrigger value="schoolAdmins">School Admins</TabsTrigger>
                    {userRole === "SUPER_ADMIN" && (
                        <TabsTrigger value="superAdmins">Super Admins</TabsTrigger>
                    )}
                </TabsList>
                <TabsContent value="schoolAdmins">
                    <Card className="border-slate-200">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <Input
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-xs"
                            />
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left table-auto border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="px-3 py-2 text-sm font-medium">Name</th>
                                            <th className="px-3 py-2 text-sm font-medium">Email</th>
                                            <th className="px-3 py-2 text-sm font-medium">Status</th>
                                            <th className="px-3 py-2 text-sm font-medium">Email Verified 2</th>
                                            <th className="px-3 py-2 text-sm font-medium">Created</th>
                                            {/* <th className="px-3 py-2 text-sm font-medium text-right">Actions</th> */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && filteredSchoolAdmins.length === 0 ? (
                                            [...Array(6)].map((_, i) => (
                                                <tr key={i} className="border-t">
                                                    <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                                                    <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                                                    <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                                                    <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                                                    <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                                                    {/* <td className="px-3 py-2 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td> */}
                                                </tr>
                                            ))
                                        ) : error ? (
                                            <tr>
                                                <td colSpan={6} className="text-red-500 text-xs py-4">{error}</td>
                                            </tr>
                                        ) : filteredSchoolAdmins.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8">
                                                    <div className="flex flex-col items-center justify-center text-center">
                                                        <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v.01M12 7v6m0 8a9 9 0 100-18 9 9 0 000 18z" />
                                                        </svg>
                                                        <div className="text-base font-medium text-gray-700 mb-1">No school admins found</div>
                                                        <div className="text-sm text-gray-500 text-center max-w-xs">There are no school admins available.</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSchoolAdmins.map((u) => (
                                                <tr key={u.id} className="border-t">
                                                    <td className="px-3 py-2">{u.firstName} {u.lastName}</td>
                                                    <td className="px-3 py-2">{u.email}</td>
                                                    <td className="px-3 py-2">{u.isActive ? "Active" : "Inactive"}</td>
                                                    <td className="px-3 py-2">{u.emailVerified ? "Yes" : "No"}</td>
                                                    <td className="px-3 py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                                                    {/* <td className="px-3 py-2 text-right">
                                                        <button className="inline-flex items-center p-1 text-blue-600 hover:text-blue-800" title="Edit" disabled>
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button className="inline-flex items-center p-1 text-red-600 hover:text-red-800 ml-2" title="Delete" disabled>
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td> */}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                {userRole === "SUPER_ADMIN" && (
                    <TabsContent value="superAdmins">
                        <Card className="border-slate-200">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <Input
                                    placeholder="Search by name or email..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="max-w-xs"
                                />
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left table-auto border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="px-3 py-2 text-sm font-medium">Name</th>
                                                <th className="px-3 py-2 text-sm font-medium">Email</th>
                                                <th className="px-3 py-2 text-sm font-medium">Status</th>
                                                <th className="px-3 py-2 text-sm font-medium">Email Verified 1</th>
                                                <th className="px-3 py-2 text-sm font-medium">Created</th>
                                                <th className="px-3 py-2 text-sm font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading && filteredSuperAdmins.length === 0 ? (
                                                [...Array(6)].map((_, i) => (
                                                    <tr key={i} className="border-t">
                                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                                                        <td className="px-3 py-2"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                                                        <td className="px-3 py-2 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td>
                                                    </tr>
                                                ))
                                            ) : error ? (
                                                <tr>
                                                    <td colSpan={6} className="text-red-500 text-xs py-4">{error}</td>
                                                </tr>
                                            ) : filteredSuperAdmins.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="py-8">
                                                        <div className="flex flex-col items-center justify-center text-center">
                                                            <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v.01M12 7v6m0 8a9 9 0 100-18 9 9 0 000 18z" />
                                                            </svg>
                                                            <div className="text-base font-medium text-gray-700 mb-1">No super admins found</div>
                                                            <div className="text-sm text-gray-500 text-center max-w-xs">There are no super admins available.</div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredSuperAdmins.map((u) => (
                                                    <tr key={u.id} className="border-t">
                                                        <td className="px-3 py-2">{u.firstName} {u.lastName}</td>
                                                        <td className="px-3 py-2">{u.email}</td>
                                                        <td className="px-3 py-2">{u.isActive ? "Active" : "Inactive"}</td>
                                                        <td className="px-3 py-2">{u.emailVerified ? "Yes" : "No"}</td>
                                                        <td className="px-3 py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                                                        <td className="px-3 py-2 text-right">
                                                            <button className="inline-flex items-center p-1 text-blue-600 hover:text-blue-800" title="Edit" disabled>
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button className="inline-flex items-center p-1 text-red-600 hover:text-red-800 ml-2" title="Delete" disabled>
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </AppLayout>
    );
}
