
import React, { useState, useEffect, useRef } from 'react';
import { VibrationInputs, VibrationType, MultiResult } from './types';
import { calculateResults } from './calculations';
import VibrationChart from './components/VibrationChart';
import { Activity, Waves, Ruler, CheckCircle2, Info, FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const [inputs, setInputs] = useState<VibrationInputs>({
    checkType: VibrationType.WALKING,
    dampingRatio: 3.0,
    bodyWeightKg: 75,
    frfMaxLow: 0.02,
    frfMaxHigh: 0.015,
    dominantFreqLow: 5.5,
    dominantFreqHigh: 12.0
  });

  const [results, setResults] = useState<MultiResult | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newResults = calculateResults(inputs);
    setResults(newResults);
  }, [inputs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: name === 'checkType' ? value : parseFloat(value) || 0
    }));
  };

  const userPoints = results ? [
    { f: inputs.dominantFreqLow, a: results.lowFreq.peakAcceleration, name: 'Peak: Low Freq' },
    { f: inputs.dominantFreqHigh, a: results.highFreq.peakAcceleration, name: 'Peak: High Freq' }
  ] : [];

  const generatePDF = async () => {
    if (!results || !chartRef.current) return;
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let y = 20;

      // 1. Header & Title
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42); 
      doc.setFont('Helvetica', 'bold');
      doc.text('Structural Vibration Analysis Report', pageWidth / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Performance Evaluation based on AISC Design Guide 11', pageWidth / 2, y, { align: 'center' });
      y += 15;

      // 2. Project Information Section
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 5, contentWidth, 22, 'F');
      doc.rect(margin, y - 5, contentWidth, 22, 'S');
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('REPORT DETAILS', margin + 5, y);
      y += 6;
      doc.setFont('Helvetica', 'normal');
      doc.text(`Date of Issue: ${new Date().toLocaleDateString()}`, margin + 5, y);
      doc.text(`Project Engineer: Eng. Raed Saad Eldin Mohamed`, margin + 100, y);
      y += 6;
      doc.text(`Vibration Case: ${inputs.checkType}`, margin + 5, y);
      y += 18;

      // 3. Input Parameters Table
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('1. Design Inputs', margin, y);
      y += 6;
      
      doc.setDrawColor(226, 232, 240);
      const rowHeight = 7;
      const inputsList = [
        ['Parameter', 'Value', 'Unit'],
        ['Damping Ratio (β)', `${inputs.dampingRatio}`, '%'],
        ['Design Step Weight (Q)', `${inputs.bodyWeightKg}`, 'kg'],
        ['Low Freq FRF Max', `${inputs.frfMaxLow}`, '%g/lb'],
        ['Low Freq Dominant Frequency', `${inputs.dominantFreqLow}`, 'Hz'],
        ['High Freq FRF Max', `${inputs.frfMaxHigh}`, '%g/lb'],
        ['High Freq Dominant Frequency', `${inputs.dominantFreqHigh}`, 'Hz']
      ];

      inputsList.forEach((row, i) => {
        if (i === 0) {
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y - 5, contentWidth, rowHeight, 'F');
          doc.setFont('Helvetica', 'bold');
        } else {
          doc.setFont('Helvetica', 'normal');
        }
        doc.text(row[0], margin + 2, y);
        doc.text(row[1], margin + 80, y);
        doc.text(row[2], margin + 140, y);
        doc.line(margin, y + 2, margin + contentWidth, y + 2);
        y += rowHeight;
      });
      y += 10;

      // 4. Performance Summary
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.text('2. Analysis Results & Compliance', margin, y);
      y += 6;

      const resultsList = [
        ['Check Description', 'Calc. Peak', 'Limit (ISO)', 'Result'],
        ['Low-Freq Response (Resonant)', `${results.lowFreq.peakAcceleration.toFixed(4)}%g`, `${results.lowFreq.limit.toFixed(3)}%g`, results.lowFreq.isAcceptable ? 'PASS' : 'FAIL'],
        ['High-Freq Response (Transient)', `${results.highFreq.peakAcceleration.toFixed(4)}%g`, `${results.highFreq.limit.toFixed(3)}%g`, results.highFreq.isAcceptable ? 'PASS' : 'FAIL']
      ];

      resultsList.forEach((row, i) => {
        if (i === 0) {
          doc.setFillColor(15, 23, 42);
          doc.setTextColor(255, 255, 255);
          doc.rect(margin, y - 5, contentWidth, rowHeight, 'F');
          doc.setFont('Helvetica', 'bold');
        } else {
          doc.setTextColor(15, 23, 42);
          doc.setFont('Helvetica', 'normal');
          if (row[3] === 'FAIL') doc.setTextColor(220, 38, 38);
          if (row[3] === 'PASS') doc.setTextColor(21, 128, 61);
        }
        doc.text(row[0], margin + 2, y);
        doc.text(row[1], margin + 80, y);
        doc.text(row[2], margin + 120, y);
        doc.text(row[3], margin + 150, y);
        doc.setTextColor(15, 23, 42);
        doc.line(margin, y + 2, margin + contentWidth, y + 2);
        y += rowHeight;
      });
      y += 15;

      // 5. Chart Visualization
      const canvas = await html2canvas(chartRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (y + imgHeight > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      
      doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
      y += imgHeight + 15;

      // 6. Methodology (Improved for Visibility)
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y - 6, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.text('3. Engineering Methodology', margin + 5, y + 1);
      y += 12;
      
      doc.setFontSize(9);
      const methods = [
        { t: "Standards Applied:", b: "Analysis follows the AISC Steel Design Guide 11, Chapter 7 (Finite Element Method). Performance thresholds are mapped to ISO 2631-2 human comfort baseline curves." },
        { t: "Frequency Threshold Calculation:", b: "Limits are frequency-dependent. The software performs log-linear interpolation across the spectrum from 1Hz to 80Hz, scaling baseline values by site-specific multipliers (M=10 for Offices, M=30 for Malls)." },
        { t: "Resonant Peak Response (fn ≤ 9 Hz):", b: "Uses the resonant build-up model: ap = FRF_Max * α * Q * ρ. It accounts for dynamic coefficients (α) and the damping-dependent resonance factor (ρ)." },
        { t: "Impulsive Peak Response (fn > 9 Hz):", b: "Evaluates the transient decay of individual footsteps using Effective Peak Acceleration (ESPA) strategy for floors dominated by stiffness." }
      ];

      methods.forEach(item => {
        const lines = doc.splitTextToSize(item.b, contentWidth - 10);
        const height = 6 + (lines.length * 5) + 5;
        if (y + height > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('Helvetica', 'bold');
        doc.text(item.t, margin + 5, y);
        y += 5;
        doc.setFont('Helvetica', 'normal');
        lines.forEach((l: string) => {
          doc.text(l, margin + 5, y);
          y += 4.5;
        });
        y += 4;
      });

      // 7. Pagination & Footer
      const pages = doc.internal.pages.length - 1;
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Vibration Check Report – Produced by AISC Design Guide 11 Performance Tool', pageWidth / 2, pageHeight - 15, { align: 'center' });
        doc.text(`Page ${i} of ${pages}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        doc.text('© 2026 Eng. Raed Saad Eldin Mohamed', margin, pageHeight - 15);
      }

      doc.save(`Vibration_Analysis_${inputs.checkType.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Error generating report. Please check browser console.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white p-6 shadow-lg border-b-4 border-blue-600 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Vibration Check Tool</h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Peak Acceleration Performance Tool – AISC Guide 11
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              {isGeneratingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
              {isGeneratingPDF ? 'Generating Report...' : 'Download PDF Report'}
            </button>
            <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 text-sm">
              Reference: <span className="text-blue-400 font-mono">Guide 11, Ch 7</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Panel */}
        <section className="lg:col-span-4 space-y-6 no-print">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4">
              <Ruler className="text-blue-600 w-5 h-5" /> Input Parameters
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Vibration Check Type</label>
                <select 
                  name="checkType"
                  value={inputs.checkType}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                >
                  {Object.values(VibrationType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Damping (%)</label>
                  <input 
                    type="number" 
                    name="dampingRatio"
                    step="0.1"
                    value={inputs.dampingRatio}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Weight (kg)</label>
                  <input 
                    type="number" 
                    name="bodyWeightKg"
                    value={inputs.bodyWeightKg}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Waves className="w-4 h-4" /> Low Frequency (fn &le; 9 Hz)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">FRF Max (%g/lb)</label>
                    <input 
                      type="number" 
                      name="frfMaxLow"
                      step="0.001"
                      value={inputs.frfMaxLow}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Freq (Hz)</label>
                    <input 
                      type="number" 
                      name="dominantFreqLow"
                      step="0.1"
                      value={inputs.dominantFreqLow}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Waves className="w-4 h-4 text-blue-400" /> High Frequency (fn &gt; 9 Hz)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">FRF Max (%g/lb)</label>
                    <input 
                      type="number" 
                      name="frfMaxHigh"
                      step="0.001"
                      value={inputs.frfMaxHigh}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Freq (Hz)</label>
                    <input 
                      type="number" 
                      name="dominantFreqHigh"
                      step="0.1"
                      value={inputs.dominantFreqHigh}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 shadow-inner">
            <Info className="w-6 h-6 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Acceptability Status:</strong> Checks use frequency-dependent ISO thresholds. The limit adjusts for each case based on the frequency to ensure rigorous compliance.
            </p>
          </div>
        </section>

        {/* Results Panel */}
        <section className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600 w-5 h-5" /> Calculated Performance
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Low Freq Card */}
              <div className={`p-5 rounded-2xl border-2 transition-all ${results?.lowFreq.isAcceptable ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">Low-Freq Response</h3>
                  {results?.lowFreq.isAcceptable ? 
                    <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Acceptable ✅</span> :
                    <span className="bg-rose-200 text-rose-800 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Not Acceptable ❌</span>
                  }
                </div>
                <div className="text-center py-4">
                  <div className="text-4xl font-black text-slate-900 leading-tight">
                    {results?.lowFreq.peakAcceleration.toFixed(4)} <span className="text-lg font-normal text-slate-500">%g</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-mono uppercase tracking-tighter">{results?.lowFreq.formulaUsed}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/50 text-xs flex justify-between text-slate-600">
                  <span>Frequency Threshold:</span>
                  <span className="font-bold">{results?.lowFreq.limit.toFixed(3)}%g</span>
                </div>
              </div>

              {/* High Freq Card */}
              <div className={`p-5 rounded-2xl border-2 transition-all ${results?.highFreq.isAcceptable ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">High-Freq Response</h3>
                  {results?.highFreq.isAcceptable ? 
                    <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Acceptable ✅</span> :
                    <span className="bg-rose-200 text-rose-800 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Not Acceptable ❌</span>
                  }
                </div>
                <div className="text-center py-4">
                  <div className="text-4xl font-black text-slate-900 leading-tight">
                    {results?.highFreq.peakAcceleration.toFixed(4)} <span className="text-lg font-normal text-slate-500">%g</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-mono uppercase tracking-tighter">{results?.highFreq.formulaUsed}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200/50 text-xs flex justify-between text-slate-600">
                  <span>Frequency Threshold:</span>
                  <span className="font-bold">{results?.highFreq.limit.toFixed(3)}%g</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" ref={chartRef}>
            <h2 className="text-xl font-bold mb-6">Human Comfort Limits Visualization</h2>
            <VibrationChart userPoints={userPoints} />
          </div>

          {/* Methodology Info Panel */}
          <div className="bg-slate-100 p-8 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" /> Calculation Methodology (Guide 11)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Low Frequency Floors (fn &le; 9 Hz)</h4>
                <p>
                  For floors where the natural frequency is within the first few harmonics of walking (typically &le; 9 Hz), the response is dominated by resonance. The peak acceleration is calculated using the established AISC Guide 11 Chapter 7 FEA-based formula <strong>ap = FRF_Max * α * Q * ρ</strong>.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2">High Frequency Floors (fn &gt; 9 Hz)</h4>
                <p>
                  Floors with higher stiffness and frequency are sensitive to individual impulses. The response is calculated using an Effective Peak Acceleration (ESPA) strategy adapted for repetitive loading.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto p-6 text-center text-slate-400 text-sm mt-12 border-t border-slate-200">
        <p className="font-semibold text-slate-600 mb-1">
          © 2026 Eng. Raed Saad Eldin Mohamed – Structural Design Engineer. All rights reserved.
        </p>
        <p className="opacity-75">
          For engineering reference only. Always verify critical results with Guide 11 full text.
        </p>
      </footer>
    </div>
  );
};

export default App;
