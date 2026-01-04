
import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';
import { OFFICE_LIMIT_DATA, MALL_LIMIT_DATA, OUTDOOR_BRIDGE_DATA } from '../constants';

interface VibrationChartProps {
  userPoints: Array<{ f: number; a: number; name: string }>;
}

const VibrationChart: React.FC<VibrationChartProps> = ({ userPoints }) => {
  // Separate low and high freq points for distinct legend entries/styling if needed
  const lowFreqPoint = userPoints.filter(p => p.name === 'Peak: Low Freq');
  const highFreqPoint = userPoints.filter(p => p.name === 'Peak: High Freq');

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl shadow-inner">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            type="number" 
            dataKey="f" 
            name="Frequency" 
            unit="Hz" 
            domain={[1, 80]} 
            scale="log"
            label={{ value: 'Frequency (Hz)', position: 'insideBottomRight', offset: -10 }}
          />
          <YAxis 
            type="number" 
            dataKey="a" 
            name="Acceleration" 
            unit="%g" 
            domain={[0.01, 20]} 
            scale="log"
            label={{ value: 'Peak Acceleration (%g)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }} 
            formatter={(value: any, name: string) => [
              parseFloat(value).toFixed(3) + ' %g', 
              name === 'a' ? 'Threshold' : 'Calculated Peak'
            ]}
          />
          <Legend verticalAlign="top" height={36} />
          
          <Line 
            data={OFFICE_LIMIT_DATA} 
            type="monotone" 
            dataKey="a" 
            stroke="#10b981" 
            name="Office Threshold Curve" 
            dot={false} 
            strokeWidth={2}
          />
          <Line 
            data={MALL_LIMIT_DATA} 
            type="monotone" 
            dataKey="a" 
            stroke="#f59e0b" 
            name="Mall Threshold Curve" 
            dot={false} 
            strokeWidth={2}
          />
          <Line 
            data={OUTDOOR_BRIDGE_DATA} 
            type="monotone" 
            dataKey="a" 
            stroke="#ef4444" 
            name="Bridge/Track Threshold" 
            dot={false} 
            strokeWidth={2}
          />
          
          <Scatter 
            name="Low Freq Response" 
            data={lowFreqPoint} 
            fill="#3b82f6"
            shape="star"
          />
          <Scatter 
            name="High Freq Response" 
            data={highFreqPoint} 
            fill="#6366f1"
            shape="diamond"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-2 italic text-center">
        * Graph based on AISC Guide 11 Fig 2-1 Human Comfort Tolerance Limits. Star/Diamond points indicate your calculated peak floor response.
      </p>
    </div>
  );
};

export default VibrationChart;
