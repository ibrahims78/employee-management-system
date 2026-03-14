import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  className?: string;
  color?: "blue" | "green" | "orange" | "red";
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  className,
  color = "blue"
}: StatsCardProps) {
  
  const iconColors = {
    blue: "bg-blue-600 text-white shadow-blue-500/30",
    green: "bg-green-600 text-white shadow-green-500/30",
    orange: "bg-orange-600 text-white shadow-orange-500/30",
    red: "bg-red-600 text-white shadow-red-500/30",
  };

  const isNumeric = typeof value === 'number';
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef<number>(0);

  useEffect(() => {
    if (!isNumeric) return;
    const target = value as number;
    const start = prevValueRef.current;
    prevValueRef.current = target;
    if (start === target) return;
    const duration = 900;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, isNumeric]);

  const displayedValue = isNumeric ? displayValue : value;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm border transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{displayedValue}</h3>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn("rounded-xl p-3 shadow-lg", iconColors[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className={cn(
        "absolute -left-6 -bottom-6 h-24 w-24 rounded-full opacity-50 blur-2xl",
        color === 'blue' && "bg-blue-500",
        color === 'green' && "bg-green-500",
        color === 'orange' && "bg-orange-500",
        color === 'red' && "bg-red-500",
      )} />
    </div>
  );
}
