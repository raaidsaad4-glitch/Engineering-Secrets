
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

      // Header
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); 
      doc.setFont('Helvetica', 'bold');
      doc.text('Vibration Check Report', pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('AISC Design Guide 11 - Dynamic Peak Acceleration Analysis', pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Project Info Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 5, contentWidth, 20, 'F');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, margin + 5, y + 2);
      doc.text(`Engineer: Eng. Raed Saad Eldin Mohamed`, margin + 5, y + 10);
      y += 25;

      // 1. Input Section
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.text('1. Input Parameters', margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      const inputData = [
        ['Parameter', 'Value'],
        ['Check Type', inputs.checkType],
        ['Damping Ratio', `${inputs.dampingRatio}%`],
        ['Design Weight', `${inputs.bodyWeightKg} kg`],
        ['Low Freq FRF Max', `${inputs.frfMaxLow} %g/lb`],
        ['Low Freq Dominant', `${inputs.dominantFreqLow} Hz`],
        ['High Freq FRF Max', `${inputs.frfMaxHigh} %g/lb`],
        ['High Freq Dominant', `${inputs.dominantFreqHigh} Hz`]
      ];
      
      inputData.forEach(([label, value]) => {
        doc.text(label, margin + 5, y);
        doc.text(value, margin + 80, y);
        y += 6;
      });
      y += 10;

      // 2. Results Section
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.text('2. Analysis Results', margin, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text('Low-Frequency Response:', margin + 5, y);
      doc.text(`${results.lowFreq.peakAcceleration.toFixed(4)} %g`, margin + 80, y);
      doc.text(`(Limit: ${results.lowFreq.limit.toFixed(3)} %g)`, margin + 120, y);
      y += 6;
      doc.text('High-Frequency Response:', margin + 5, y);
      doc.text(`${results.highFreq.peakAcceleration.toFixed(4)} %g`, margin + 80, y);
      doc.text(`(Limit: ${results.highFreq.limit.toFixed(3)} %g)`, margin + 120, y);
      y += 12;

      // Overall Acceptability
      const isOk = results.lowFreq.isAcceptable && results.highFreq.isAcceptable;
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      if (isOk) {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.text(`OVERALL STATUS: ${isOk ? 'PASS' : 'FAIL'}`, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(15, 23, 42);
      y += 12;

      // Capture Chart
      const canvas = await html2canvas(chartRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (y + imgHeight > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      
      doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
      y += imgHeight + 20;

      // 3. Methodology Section
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y - 6, contentWidth, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. Calculation Methodology', margin + 5, y + 1);
      y += 15;
      
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      
      const methodologySections = [
        {
          title: "Regulatory Basis:",
          body: "Analysis follows AISC Steel Design Guide 11, Chapter 7 (FEA Method). Comfort thresholds are based on ISO 2631-2 baseline curves (AISC Guide 11 Figure 2-1)."
        },
        {
          title: "Low Frequency Response (fn <= 9 Hz):",
          body: "Uses a resonant model for walking activity. Formula: ap = FRF_Max * alpha * Q * rho. This incorporates the dynamic coefficient (alpha), step weight (Q), and resonance factor (rho) for damping correction."
        },
        {
          title: "High Frequency Response (fn > 9 Hz):",
          body: "Uses the Effective Peak Acceleration (ESPA) strategy. This determines the floor's peak transient response to individual impulses that occur during repetitive human motion."
        },
        {
          title: "Limit Computation:",
          body: "Thresholds are frequency-dependent. The baseline acceleration (0.005g at 4-8Hz) is interpolated log-linearly across the spectrum and scaled by occupancy-specific multipliers (M=10 for Offices, M=30 for Shopping Malls)."
        }
      ];

      methodologySections.forEach(section => {
        const bodyLines = doc.splitTextToSize(section.body, contentWidth - 10);
        const blockHeight = 6 + (bodyLines.length * 5) + 6;

        if (y + blockHeight > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('Helvetica', 'bold');
        doc.text(section.title, margin + 5, y);
        y += 6;

        doc.setFont('Helvetica', 'normal');
        bodyLines.forEach((line: string) => {
          doc.text(line, margin + 10, y);
          y += 5;
        });
        y += 6; // space between sections
      });

      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('© 2026 Eng. Raed Saad Eldin Mohamed – Structural Design Engineer. All rights reserved.', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      doc.save(`Vibration_Report_${inputs.checkType.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF. Please try again.');
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
                  <Waves className="w-4 h-4" /> Low Frequency (fn ≤ 9 Hz)
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
              <strong>Acceptability Status:</strong> Checks use frequency-dependent ISO thresholds (Fig 2-1). The limit adjusts for each case based on the frequency to ensure rigorous compliance.
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
                <h4 className="font-bold text-slate-900 mb-2">Low Frequency Floors (fn ≤ 9 Hz)</h4>
                <p>
                  For floors where the natural frequency is within the first few harmonics of walking (typically ≤ 9 Hz), the response is dominated by resonance. The peak acceleration is calculated using the established AISC Guide 11 Chapter 7 FEA-based formula <strong>ap = FRF_Max * α * Q * ρ</strong>, where α is the dynamic coefficient and ρ is the resonance build-up factor.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2">High Frequency Floors (fn > 9 Hz)</h4>
                <p>
                  Floors with higher stiffness and frequency are sensitive to individual impulses. The response is calculated using an Effective Peak Acceleration (ESPA) strategy adapted for repetitive loading. The methodology determines the peak transient response from individual footsteps, accounting for damping and frequency-specific decay.
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
