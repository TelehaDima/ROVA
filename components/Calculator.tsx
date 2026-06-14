import React, { useState } from 'react';
import { RestorationReport, calculateWorkTotal, calculateMaterialTotal, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Calculator as CalcIcon, Hammer, Package, DollarSign, Percent, RefreshCw, Sparkles } from 'lucide-react';
import { recalculateReport } from '../services/geminiService';

interface CalculatorProps {
  report: RestorationReport;
  onUpdateReport: (updatedReport: RestorationReport) => void;
  language: Language;
}

const AutoResizeTextarea = ({ value, onChange, className }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className: string }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  
  React.useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={`resize-none overflow-hidden ${className}`}
      value={value}
      onChange={onChange}
      rows={1}
    />
  );
};

const Calculator: React.FC<CalculatorProps> = ({ report, onUpdateReport, language }) => {
  const t = TRANSLATIONS[language];
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setRecalcError(null);
    try {
      const updated = await recalculateReport(report, language);
      onUpdateReport(updated);
    } catch (err) {
      console.error(err);
      setRecalcError("Error recalculating. Please try again.");
    } finally {
      setIsRecalculating(false);
    }
  };

  // Helper to update works immutably
  const updateWork = (componentIndex: number, workIndex: number, field: 'unitPrice' | 'quantity' | 'description' | 'unit', value: number | string) => {
    const newComponents = report.components.map((comp, cIdx) => {
      if (cIdx !== componentIndex) return comp;
      
      const newWorks = comp.suggestedWorks.map((work, wIdx) => {
        if (wIdx !== workIndex) return work;
        return { ...work, [field]: value };
      });
      
      return { ...comp, suggestedWorks: newWorks };
    });
    
    onUpdateReport({ ...report, components: newComponents });
  };

  // Helper to update materials immutably
  const updateMaterial = (componentIndex: number, materialIndex: number, field: 'unitPrice' | 'quantity' | 'unit' | 'name', value: number | string) => {
    const newComponents = report.components.map((comp, cIdx) => {
      if (cIdx !== componentIndex) return comp;
      
      const newMaterials = comp.requiredMaterials.map((mat, mIdx) => {
        if (mIdx !== materialIndex) return mat;
        return { ...mat, [field]: value };
      });
      
      return { ...comp, requiredMaterials: newMaterials };
    });
    
    onUpdateReport({ ...report, components: newComponents });
  };
  
  const handleOverheadChange = (val: number) => {
    onUpdateReport({ ...report, overheadPercentage: val });
  };

  const totalWorksCost = report.components.reduce((acc, comp) => acc + calculateWorkTotal(comp.suggestedWorks), 0);
  const totalMaterialsCost = report.components.reduce((acc, comp) => acc + calculateMaterialTotal(comp.requiredMaterials), 0);
  const subTotal = totalWorksCost + totalMaterialsCost;
  const overheadCost = (subTotal * report.overheadPercentage) / 100;
  const grandTotal = subTotal + overheadCost;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
  };

  return (
    <div className="space-y-8">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 p-6 rounded-2xl shadow-lg border border-white/10 animate-slide-up backdrop-blur-md hover:bg-white/10 transition-colors flex flex-col justify-center">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
             <Hammer size={14} className="shrink-0" /> {t.summaryWorks}
          </p>
          <p className="text-lg xl:text-xl font-bold text-white break-words">{formatCurrency(totalWorksCost)}</p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl shadow-lg border border-white/10 animate-slide-up delay-75 backdrop-blur-md hover:bg-white/10 transition-colors flex flex-col justify-center">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
             <Package size={14} className="shrink-0" /> {t.summaryMaterials}
          </p>
          <p className="text-lg xl:text-xl font-bold text-white break-words">{formatCurrency(totalMaterialsCost)}</p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl shadow-lg border border-white/10 animate-slide-up delay-150 backdrop-blur-md hover:bg-white/10 transition-colors flex flex-col justify-center">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
             <Percent size={14} className="shrink-0" /> {t.summaryOverhead} ({report.overheadPercentage}%)
          </p>
          <p className="text-lg xl:text-xl font-bold text-amber-400 break-words">{formatCurrency(overheadCost)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl shadow-lg shadow-purple-900/40 text-white animate-slide-up delay-200 hover:scale-105 transition-transform border border-white/10 flex flex-col justify-center">
          <p className="text-xs text-purple-200 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
             <DollarSign size={14} className="shrink-0" /> {t.summaryTotal}
          </p>
          <p className="text-xl xl:text-2xl font-bold break-words">{formatCurrency(grandTotal)}</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-slide-up delay-300 backdrop-blur-xl">
         <div className="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
             <div className="flex flex-col">
                 <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                    <CalcIcon className="text-purple-400" /> {t.calcTitle}
                 </h3>
                 <p className="text-xs text-slate-400 mt-1 max-w-md">
                   * {language === 'uk' ? 'Ціни згенеровані ШІ на основі середніх ринкових даних і можуть бути відредаговані вручну.' : language === 'pl' ? 'Ceny są generowane przez AI na podstawie średnich danych rynkowych i mogą być edytowane ręcznie.' : 'Prices are AI-generated based on market averages and can be edited manually.'}
                 </p>
             </div>
             <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                 <button 
                   onClick={handleRecalculate}
                   disabled={isRecalculating}
                   className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl hover:bg-emerald-500/30 transition-all text-sm font-bold no-print ${isRecalculating ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                 >
                   {isRecalculating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                   {isRecalculating ? '...' : (t as any).recalculateAI || "AI Recalculate"}
                 </button>
                 <div className="flex items-center gap-3">
                     <label className="text-sm text-slate-300 font-medium whitespace-nowrap">{t.overheadLabel} (%):</label>
                 <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={report.overheadPercentage}
                    onChange={(e) => handleOverheadChange(parseFloat(e.target.value) || 0)}
                    className="w-20 p-2 bg-black/20 border border-white/10 rounded-lg text-center text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all font-mono"
                 />
                 </div>
             </div>
         </div>

         <div className="divide-y divide-white/5">
             {report.components.map((comp, compIndex) => (
                 <div key={comp.id} className="p-8">
                     <h4 className="font-bold text-lg text-white mb-6 flex items-center">
                         <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></span>
                         {comp.name}
                         <span className="ml-auto text-sm font-normal text-slate-400 font-mono bg-white/5 px-3 py-1 rounded-lg border border-white/5">{t.dimensions}: {comp.dimensions}</span>
                     </h4>

                     <div className="grid xl:grid-cols-2 gap-10">
                         {/* Works Table */}
                         <div className="min-w-0">
                             <h5 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Hammer size={12} /> {t.summaryWorks}
                             </h5>
                             <div className="overflow-x-auto rounded-xl border border-white/5">
                                 <table className="w-full min-w-[650px] text-sm text-left">
                                     <thead className="text-xs text-slate-400 bg-white/5 uppercase">
                                         <tr>
                                             <th className="px-4 py-3 font-medium">{t.tableDesc}</th>
                                             <th className="px-4 py-3 font-medium w-40">{t.tableQty}</th>
                                             <th className="px-4 py-3 w-32 font-medium">{t.tablePrice}</th>
                                             <th className="px-4 py-3 w-32 text-right font-medium">{t.tableSum}</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-white/5">
                                         {comp.suggestedWorks.map((work, wIndex) => (
                                             <tr key={work.id} className="hover:bg-white/5 transition-colors group">
                                                 <td className="px-4 py-3">
                                                     <AutoResizeTextarea 
                                                        className="w-full p-1.5 bg-transparent border border-transparent rounded-lg text-slate-300 hover:bg-black/20 focus:bg-black/40 focus:border-purple-500/50 outline-none transition-all"
                                                        value={work.description}
                                                        onChange={(e) => updateWork(compIndex, wIndex, 'description', e.target.value)}
                                                     />
                                                 </td>
                                                 <td className="px-4 py-3 whitespace-nowrap">
                                                     <div className="flex items-center gap-2">
                                                         <input 
                                                            type="number" 
                                                            min="0"
                                                            step="0.01"
                                                            onKeyDown={(e) => {
                                                              if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                            }}
                                                            className="w-20 p-1.5 bg-black/20 border border-white/10 rounded-lg text-right text-white focus:border-purple-500 outline-none text-xs transition-colors"
                                                            value={work.quantity === 0 ? '' : work.quantity}
                                                            placeholder="0"
                                                            onChange={(e) => {
                                                              const val = parseFloat(e.target.value);
                                                              updateWork(compIndex, wIndex, 'quantity', isNaN(val) ? 0 : Math.max(0, val));
                                                            }}
                                                         />
                                                         <input 
                                                            type="text" 
                                                            className={`w-12 p-1.5 bg-transparent border rounded-lg text-slate-400 hover:bg-black/20 focus:bg-black/40 focus:border-purple-500/50 outline-none text-xs transition-colors text-center ${!work.unit.trim() ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-transparent'}`}
                                                            value={work.unit}
                                                            onChange={(e) => updateWork(compIndex, wIndex, 'unit', e.target.value)}
                                                            title={!work.unit.trim() ? t.error : undefined}
                                                         />
                                                     </div>
                                                 </td>
                                                 <td className="px-4 py-3">
                                                     <input 
                                                        type="number" 
                                                        min="0"
                                                        step="0.01"
                                                        onKeyDown={(e) => {
                                                          if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                        }}
                                                        className="w-full p-1.5 bg-black/20 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-sm"
                                                        value={work.unitPrice === 0 ? '' : work.unitPrice}
                                                        placeholder="0"
                                                        onChange={(e) => {
                                                          const val = parseFloat(e.target.value);
                                                          updateWork(compIndex, wIndex, 'unitPrice', isNaN(val) ? 0 : Math.max(0, val));
                                                        }}
                                                     />
                                                 </td>
                                                 <td className="px-4 py-3 text-right font-medium text-emerald-400 font-mono">
                                                     {(work.quantity * work.unitPrice).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         </div>

                         {/* Materials Table */}
                         <div className="min-w-0">
                             <h5 className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Package size={12} /> {t.summaryMaterials}
                             </h5>
                             <div className="overflow-x-auto rounded-xl border border-white/5">
                                 <table className="w-full min-w-[650px] text-sm text-left">
                                     <thead className="text-xs text-slate-400 bg-white/5 uppercase">
                                         <tr>
                                             <th className="px-4 py-3 font-medium">{t.tableName}</th>
                                             <th className="px-4 py-3 font-medium w-40">{t.tableRate}</th>
                                             <th className="px-4 py-3 w-32 font-medium">{t.tablePrice}</th>
                                             <th className="px-4 py-3 w-32 text-right font-medium">{t.tableSum}</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-white/5">
                                         {comp.requiredMaterials.map((mat, mIndex) => (
                                             <tr key={mat.id} className="hover:bg-white/5 transition-colors group">
                                                 <td className="px-4 py-3">
                                                     <AutoResizeTextarea 
                                                        className="w-full font-medium p-1.5 bg-transparent border border-transparent rounded-lg text-slate-200 hover:bg-black/20 focus:bg-black/40 focus:border-blue-500/50 outline-none transition-all"
                                                        value={mat.name}
                                                        onChange={(e) => updateMaterial(compIndex, mIndex, 'name', e.target.value)}
                                                     />
                                                 </td>
                                                 <td className="px-4 py-3">
                                                     <div className="flex gap-2">
                                                         <input 
                                                            type="number" 
                                                            min="0"
                                                            step="0.01"
                                                            onKeyDown={(e) => {
                                                              if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                            }}
                                                            className="w-16 p-1.5 bg-black/20 border border-white/10 rounded-lg text-right text-white focus:border-blue-500 outline-none text-xs transition-colors"
                                                            value={mat.quantity === 0 ? '' : mat.quantity}
                                                            placeholder="0"
                                                            onChange={(e) => {
                                                              const val = parseFloat(e.target.value);
                                                              updateMaterial(compIndex, mIndex, 'quantity', isNaN(val) ? 0 : Math.max(0, val));
                                                            }}
                                                         />
                                                         <input 
                                                            type="text" 
                                                            className={`w-12 p-1.5 bg-transparent border rounded-lg text-slate-400 hover:bg-black/20 focus:bg-black/40 focus:border-blue-500/50 outline-none text-xs transition-colors text-center ${!mat.unit.trim() ? 'border-red-500/50 ring-1 ring-red-500/30' : 'border-transparent'}`}
                                                            value={mat.unit}
                                                            onChange={(e) => updateMaterial(compIndex, mIndex, 'unit', e.target.value)}
                                                            title={!mat.unit.trim() ? t.error : undefined}
                                                         />
                                                     </div>
                                                 </td>
                                                 <td className="px-4 py-3">
                                                     <input 
                                                        type="number" 
                                                        min="0"
                                                        step="0.01"
                                                        onKeyDown={(e) => {
                                                          if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                        }}
                                                        className="w-full p-1.5 bg-black/20 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                                                        value={mat.unitPrice === 0 ? '' : mat.unitPrice}
                                                        placeholder="0"
                                                        onChange={(e) => {
                                                          const val = parseFloat(e.target.value);
                                                          updateMaterial(compIndex, mIndex, 'unitPrice', isNaN(val) ? 0 : Math.max(0, val));
                                                        }}
                                                     />
                                                 </td>
                                                 <td className="px-4 py-3 text-right font-medium text-emerald-400 font-mono">
                                                     {(mat.quantity * mat.unitPrice).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                 </td>
                                             </tr>
                                         ))}
                                         {comp.requiredMaterials.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-6 text-center text-slate-500 italic bg-white/5">
                                                    {t.noMaterials}
                                                </td>
                                            </tr>
                                         )}
                                     </tbody>
                                 </table>
                             </div>
                         </div>
                     </div>
                 </div>
             ))}
         </div>
      </div>
    </div>
  );
};

export default Calculator;
