import React, { useState, useEffect } from 'react';
import { RestorationReport, Language, Damage } from '../types';
import { TRANSLATIONS } from '../constants';
import { Plus, X, AlertTriangle, Box, Ruler, Layers } from 'lucide-react';

interface AnalysisDisplayProps {
  report: RestorationReport;
  onUpdateReport: (report: RestorationReport) => void;
  language: Language;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ report, onUpdateReport, language }) => {
  const t = TRANSLATIONS[language];
  const [activeComponentId, setActiveComponentId] = useState<string | 'ALL'>('ALL');

  // Reset filter when report changes (e.g. new project loaded)
  useEffect(() => {
    setActiveComponentId('ALL');
  }, [report.id]);

  const parseDimensions = (dimString: string) => {
    if (!dimString) return { w: '', h: '' };
    const nums = dimString.match(/(\d+[\.,]?\d*)/g);
    return {
      w: nums && nums.length > 0 ? nums[0] : '',
      h: nums && nums.length > 1 ? nums[1] : ''
    };
  };

  const updateComponent = (compIndex: number, field: string, val: string) => {
    const newComponents = [...report.components];
    newComponents[compIndex] = { ...newComponents[compIndex], [field]: val };
    onUpdateReport({ ...report, components: newComponents });
  };

  const updateDamage = (compIndex: number, damageIndex: number, field: keyof Damage, val: string) => {
    const newComponents = [...report.components];
    const newDamages = [...newComponents[compIndex].damages];
    newDamages[damageIndex] = { ...newDamages[damageIndex], [field]: val };
    newComponents[compIndex] = { ...newComponents[compIndex], damages: newDamages };
    onUpdateReport({ ...report, components: newComponents });
  };

  const addDamage = (compIndex: number) => {
    const newComponents = [...report.components];
    const newDamage: Damage = { category: 'General', description: '', severity: 'Medium' };
    const newComponentsData = { 
        ...newComponents[compIndex], 
        damages: [...newComponents[compIndex].damages, newDamage] 
    };
    newComponents[compIndex] = newComponentsData;
    onUpdateReport({ ...report, components: newComponents });
  };
  
  const removeDamage = (compIndex: number, damageIndex: number) => {
     const newComponents = [...report.components];
     const newDamages = newComponents[compIndex].damages.filter((_, i) => i !== damageIndex);
     newComponents[compIndex] = { ...newComponents[compIndex], damages: newDamages };
     onUpdateReport({ ...report, components: newComponents });
  };

  const conditionMap: Record<Language, Record<string, string>> = {
    uk: { Good: 'Хороше', Fair: 'Задовільне', Poor: 'Погане', Critical: 'Критичне' },
    pl: { Good: 'Dobry', Fair: 'Dostateczny', Poor: 'Zły', Critical: 'Krytyczny' },
    en: { Good: 'Good', Fair: 'Fair', Poor: 'Poor', Critical: 'Critical' }
  };

  const severityMap: Record<Language, Record<string, string>> = {
    uk: { 'Very Low': 'Дуже низька', Low: 'Низька', Medium: 'Середня', High: 'Висока', 'Very High': 'Дуже висока', Minor: 'Незначна', Moderate: 'Помірна', Severe: 'Серйозна', Critical: 'Критична' },
    pl: { 'Very Low': 'Bardzo niski', Low: 'Niski', Medium: 'Średni', High: 'Wysoki', 'Very High': 'Bardzo wysoki', Minor: 'Drobny', Moderate: 'Umiarkowany', Severe: 'Poważny', Critical: 'Krytyczny' },
    en: { 'Very Low': 'Very Low', Low: 'Low', Medium: 'Medium', High: 'High', 'Very High': 'Very High', Minor: 'Minor', Moderate: 'Moderate', Severe: 'Severe', Critical: 'Critical' }
  };

  const categoryMap: Record<Language, Record<string, string>> = {
    uk: { SURFACE: 'Поверхня', STRUCTURAL: 'Структура', BIOLOGICAL: 'Біологічні', CHEMICAL: 'Хімічні', MECHANICAL: 'Механічні', OTHER: 'Інше', GENERAL: 'Загальні' },
    pl: { SURFACE: 'Powierzchnia', STRUCTURAL: 'Strukturalne', BIOLOGICAL: 'Biologiczne', CHEMICAL: 'Chemiczne', MECHANICAL: 'Mechaniczne', OTHER: 'Inne', GENERAL: 'Ogólne' },
    en: { SURFACE: 'Surface', STRUCTURAL: 'Structural', BIOLOGICAL: 'Biological', CHEMICAL: 'Chemical', MECHANICAL: 'Mechanical', OTHER: 'Other', GENERAL: 'General' }
  };

  return (
    <div className="space-y-8">
      {/* General Report */}
      <div className="bg-amber-500/10 p-4 md:p-8 rounded-3xl border border-amber-500/20 animate-slide-up backdrop-blur-sm shadow-lg shadow-amber-900/10">
        <h3 className="font-serif text-2xl font-bold text-amber-200 mb-4 flex items-center gap-3">
           <AlertTriangle className="text-amber-400" />
           {report.objectName}
        </h3>
        <p className="text-amber-100/80 leading-relaxed text-lg font-light">
          {conditionMap[language]?.[report.generalCondition] || report.generalCondition}
        </p>
      </div>


      {/* Component Tabs */}
      {report.components.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => setActiveComponentId('ALL')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap font-medium transition-all text-sm ${
              activeComponentId === 'ALL'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            {language === 'uk' ? 'Всі предмети' : language === 'pl' ? 'Wszystkie elementy' : 'All Items'}
          </button>
          {report.components.map((comp) => (
            <button
              key={comp.id}
              onClick={() => setActiveComponentId(comp.id)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-all text-sm flex items-center gap-2 ${
                activeComponentId === comp.id
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
              }`}
            >
              {comp.sourceImage && (
                <img src={comp.sourceImage} alt="" className="w-6 h-6 rounded-md object-cover shadow-sm" />
              )}
              {comp.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {report.components
          .filter(comp => activeComponentId === 'ALL' || comp.id === activeComponentId)
          .map((comp, compIndex) => (
          <div 
            key={comp.id} 
            className="bg-white/5 p-4 md:p-6 rounded-3xl border border-white/10 shadow-lg hover:shadow-purple-500/10 transition-all duration-300 animate-slide-up backdrop-blur-md hover:bg-white/10"
            style={{ animationDelay: `${(compIndex + 1) * 100}ms` }}
          >
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
              <div className="flex items-center gap-4 min-w-[200px] flex-1">
                {comp.sourceImage && (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-inner">
                    <img src={comp.sourceImage} alt="Element" className="w-full h-full object-cover" />
                  </div>
                )}
                <h4 className="font-bold text-xl text-white flex items-center gap-2">
                   <Box size={20} className="text-purple-400" />
                   {comp.name}
                </h4>
              </div>
              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                comp.condition === 'Good' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                comp.condition === 'Fair' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                comp.condition === 'Poor' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {conditionMap[language][comp.condition] || comp.condition}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-x-8 gap-y-4 text-sm mb-6 pb-6 border-b border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto flex-1">
                <span className="text-slate-400 flex items-center gap-2 shrink-0"><Layers size={14} /> {t.material}:</span>
                <input 
                  type="text"
                  value={comp.material}
                  onChange={(e) => updateComponent(compIndex, 'material', e.target.value)}
                  className="font-medium text-slate-200 bg-black/20 hover:bg-black/40 focus:bg-black/60 border border-transparent hover:border-white/10 focus:border-purple-500/50 rounded-lg px-3 py-1.5 outline-none transition-all w-full min-w-[200px]"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto flex-1">
                <span className="text-slate-400 flex items-center gap-2 shrink-0"><Ruler size={14} /> {t.dimensions}:</span>
                <div className="flex items-center gap-2 w-full">
                  <input 
                    type="number"
                    value={parseDimensions(comp.dimensions).w}
                    onChange={(e) => updateComponent(compIndex, 'dimensions', `${e.target.value} x ${parseDimensions(comp.dimensions).h} cm`)}
                    placeholder="Ширина"
                    className="font-medium text-center text-slate-200 bg-black/20 hover:bg-black/40 focus:bg-black/60 border border-transparent hover:border-white/10 focus:border-purple-500/50 rounded-lg px-2 py-1.5 outline-none transition-all w-full min-w-[80px]"
                  />
                  <span className="text-slate-500 text-sm">x</span>
                  <input 
                    type="number"
                    value={parseDimensions(comp.dimensions).h}
                    onChange={(e) => updateComponent(compIndex, 'dimensions', `${parseDimensions(comp.dimensions).w} x ${e.target.value} cm`)}
                    placeholder="Висота"
                    className="font-medium text-center text-slate-200 bg-black/20 hover:bg-black/40 focus:bg-black/60 border border-transparent hover:border-white/10 focus:border-purple-500/50 rounded-lg px-2 py-1.5 outline-none transition-all w-full min-w-[80px]"
                  />
                  <span className="text-slate-400 text-sm shrink-0">cm</span>
                </div>
              </div>
            </div>
              
            <div className="pt-2">
              <span className="text-slate-400 block mb-3 font-medium uppercase tracking-wider text-xs">{t.damages}:</span>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                {comp.damages.map((damage, idx) => (
                  <div key={idx} className="relative group animate-scale-in bg-black/20 p-3 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-colors flex flex-col h-full">
                     <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-start mb-3">
                        <span className="text-[10px] font-bold text-red-300 uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 whitespace-nowrap mt-0.5">{categoryMap[language][damage.category?.trim().toUpperCase()] || damage.category}</span>
                        <div className="flex justify-center min-w-0">
                           <select
                               value={damage.severity}
                               onChange={(e) => updateDamage(compIndex, idx, 'severity', e.target.value)}
                               className={`text-[10px] font-bold px-2 py-0.5 rounded border appearance-none outline-none cursor-pointer text-center max-w-full text-ellipsis overflow-hidden ${
                                   (damage.severity === 'High' || damage.severity === 'Severe' || damage.severity === 'Critical' || damage.severity === 'Very High') ? 'text-red-400 border-red-500/30 bg-red-500/10' : 
                                   (damage.severity === 'Medium' || damage.severity === 'Moderate') ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                               }`}
                           >
                               {['Very Low', 'Low', 'Medium', 'High', 'Very High'].map(sev => (
                                 <option key={sev} value={sev} className="bg-slate-800 text-white">{severityMap[language][sev] || sev}</option>
                               ))}
                               {!['Very Low', 'Low', 'Medium', 'High', 'Very High'].includes(damage.severity) && (
                                 <option value={damage.severity} className="bg-slate-800 text-white">{severityMap[language][damage.severity] || damage.severity}</option>
                               )}
                           </select>
                        </div>
                        <button 
                          onClick={() => removeDamage(compIndex, idx)}
                          className="p-1 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-full border border-red-500/20 backdrop-blur-sm transition-all shadow-sm opacity-80 hover:opacity-100 mt-0.5 shrink-0"
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                     </div>
                     <textarea 
                        value={damage.description}
                        onChange={(e) => updateDamage(compIndex, idx, 'description', e.target.value)}
                        rows={4}
                        className="w-full flex-grow p-2 text-sm text-slate-200 bg-black/20 border border-red-500/10 focus:border-red-500/30 rounded-lg outline-none resize-y min-h-[80px] placeholder-slate-500 leading-relaxed transition-colors"
                        placeholder="Wpisz notatkę lub opis uszkodzenia..."
                     />
                     {damage.technique && (
                       <div className="mt-2 pt-2 border-t border-red-500/10">
                         <span className="text-[10px] font-bold text-purple-300 uppercase block mb-1">{t.techRec}</span>
                         <textarea 
                            value={damage.technique}
                            onChange={(e) => updateDamage(compIndex, idx, 'technique', e.target.value)}
                            rows={3}
                            className="w-full p-2 text-sm text-purple-200 bg-black/20 border border-purple-500/10 focus:border-purple-500/30 rounded-lg outline-none resize-y min-h-[70px] placeholder-purple-900/50 leading-relaxed transition-colors"
                            placeholder="..."
                         />
                       </div>
                     )}
                  </div>
                ))}
                {comp.damages.length === 0 && <p className="italic text-slate-500 text-sm mb-2 text-center col-span-full">{t.noDamages}</p>}
                
                <div className="col-span-full mt-2">
                  <button 
                    onClick={() => addDamage(compIndex)}
                    className="w-full py-3 border border-dashed border-red-500/30 text-red-400/80 rounded-xl hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300 transition-all text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Plus size={14} />
                    {t.addDamage}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisDisplay;
