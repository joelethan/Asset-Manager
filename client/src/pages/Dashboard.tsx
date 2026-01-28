import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Building2, TrendingUp, AlertCircle } from "lucide-react";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid
} from "recharts";

const data = [
  { name: "Jan", students: 400, attendance: 240 },
  { name: "Feb", students: 300, attendance: 139 },
  { name: "Mar", students: 200, attendance: 980 },
  { name: "Apr", students: 278, attendance: 390 },
  { name: "May", students: 189, attendance: 480 },
  { name: "Jun", students: 239, attendance: 380 },
  { name: "Jul", students: 349, attendance: 430 },
];

export default function Dashboard() {
  return (
    <AppLayout 
      title="Dashboard" 
      description="Welcome back, here's what's happening today."
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Students" 
          value="2,853" 
          change="+12% from last month" 
          icon={GraduationCap}
          trend="up"
        />
        <StatsCard 
          title="Active Teachers" 
          value="142" 
          change="+4 new this week" 
          icon={Users}
          trend="up"
        />
        <StatsCard 
          title="Schools Managed" 
          value="12" 
          change="No change" 
          icon={Building2}
          trend="neutral"
        />
        <StatsCard 
          title="Attendance Rate" 
          value="94.2%" 
          change="-0.5% from yesterday" 
          icon={TrendingUp}
          trend="down"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardDescription>Student enrollment over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="students" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorStudents)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>System notifications requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 rounded-lg border p-3 hover:bg-slate-50 transition-colors">
                  <div className="mt-1 rounded-full bg-red-100 p-1">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">System Maintenance</p>
                    <p className="text-sm text-muted-foreground">
                      Scheduled maintenance for server cluster B at 2:00 AM.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatsCard({ title, value, change, icon: Icon, trend }: any) {
  return (
    <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-display text-slate-900">{value}</div>
        <p className={`text-xs ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'} flex items-center mt-1`}>
          {change}
        </p>
      </CardContent>
    </Card>
  );
}
