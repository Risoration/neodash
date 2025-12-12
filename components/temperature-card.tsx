'use client';

import { motion } from 'framer-motion';
import { Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeatherData } from '@/types';

interface TemperatureCardProps {
  weatherData: WeatherData | null;
  temperatureUnit: 'fahrenheit' | 'celsius';
  delay?: number;
}

export function TemperatureCard({
  weatherData,
  temperatureUnit,
  delay = 0,
}: TemperatureCardProps) {
  // Use stored values for instant unit switching (no conversion needed)
  let displayValue: number | string = '--';
  if (weatherData) {
    if (temperatureUnit === 'fahrenheit') {
      displayValue =
        weatherData.temperatureF ?? weatherData.temperature ?? '--';
    } else {
      displayValue = weatherData.temperatureC ?? '--';
    }
  }
  const unitSymbol = temperatureUnit === 'fahrenheit' ? 'F' : 'C';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className='glass-card group hover:scale-[1.02] transition-transform duration-300'
    >
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          <div className='flex items-center justify-between mb-1'>
            <p className='text-sm font-medium text-muted-foreground'>
              Temperature
            </p>
          </div>
          {weatherData?.location && (
            <p className='text-xs text-muted-foreground mb-1'>
              {weatherData.location}
            </p>
          )}
          <p className='text-3xl font-bold mb-2'>
            {displayValue}°{unitSymbol}
          </p>
        </div>
        <div
          className={cn(
            'p-3 rounded-lg bg-gradient-to-br',
            'from-blue-500/20 to-cyan-500/20',
            'group-hover:scale-110 transition-transform duration-300'
          )}
        >
          <Cloud className='w-6 h-6 text-primary' />
        </div>
      </div>
    </motion.div>
  );
}
