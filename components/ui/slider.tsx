"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  valueLabel?: string;
  showValue?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, valueLabel, showValue = true, value, onChange, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(value || props.defaultValue || props.min || 0);

    React.useEffect(() => {
      if (value !== undefined) {
        setLocalValue(value);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      onChange?.(e);
    };

    const displayValue = valueLabel || localValue;
    const percentage = ((Number(localValue) - Number(props.min || 0)) / 
      (Number(props.max || 100) - Number(props.min || 0))) * 100;

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{label}</label>
            {showValue && (
              <span className="text-sm text-muted-foreground font-semibold">
                {displayValue}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <input
            type="range"
            ref={ref}
            value={localValue}
            onChange={handleChange}
            className={cn(
              "w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer",
              "accent-primary",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer",
              "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer",
              className
            )}
            {...props}
          />
          <div
            className="absolute top-0 left-0 h-2 bg-primary/30 rounded-lg pointer-events-none"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };

