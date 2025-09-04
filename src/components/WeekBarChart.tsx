import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from '@/hooks/useData';

export function WeekBarChart() {
  const { data: dashboardData, isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividades da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 space-y-2">
                <div className="text-center">
                  <div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" />
                </div>
                <div className="relative h-32 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = dashboardData?.chartData || [];
  const maxValue = Math.max(
    ...chartData.map(d => d.completed + d.overdue),
    1
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades da Semana</CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-green-500 rounded" />
            <span>Concluídas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-red-500 rounded" />
            <span>Pendentes</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-between gap-4">
          {chartData.map((data, index) => {
            const totalHeight = 200; // Max height in pixels
            const completedHeight = maxValue > 0 ? (data.completed / maxValue) * totalHeight : 0;
            const overdueHeight = maxValue > 0 ? (data.overdue / maxValue) * totalHeight : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-sm font-medium">
                  {data.day}
                </div>
                
                <div 
                  className="relative w-full flex flex-col justify-end"
                  style={{ height: totalHeight }}
                >
                  {/* Completed tasks (green) */}
                  {data.completed > 0 && (
                    <div
                      className="w-full bg-green-500 rounded-t"
                      style={{ height: completedHeight }}
                      title={`${data.completed} concluídas`}
                    />
                  )}
                  
                  {/* Overdue tasks (red) */}
                  {data.overdue > 0 && (
                    <div
                      className={`w-full bg-red-500 ${data.completed === 0 ? 'rounded-t' : ''}`}
                      style={{ height: overdueHeight }}
                      title={`${data.overdue} pendentes`}
                    />
                  )}
                  
                  {/* Empty state */}
                  {data.completed === 0 && data.overdue === 0 && (
                    <div className="w-full h-2 bg-muted rounded" />
                  )}
                </div>
                
                {/* Numbers */}
                <div className="text-xs text-center">
                  {data.completed + data.overdue > 0 && (
                    <div className="space-y-1">
                      {data.completed > 0 && (
                        <div className="text-green-600">{data.completed}</div>
                      )}
                      {data.overdue > 0 && (
                        <div className="text-red-600">{data.overdue}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}