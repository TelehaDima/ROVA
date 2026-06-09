
import React from 'react';
import { RestorationReport, calculateGrandTotal, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { History, Trash2, ExternalLink, Calendar, ImageOff } from 'lucide-react';

interface ProjectHistoryProps {
  projects: RestorationReport[];
  onLoad: (project: RestorationReport) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  language: Language;
}

const ProjectHistory: React.FC<ProjectHistoryProps> = ({ projects, onLoad, onDelete, onClose, language }) => {
  const t = TRANSLATIONS[language];
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <h2 className="text-4xl font-serif font-bold text-white tracking-tight">{t.histTitle}</h2>
        <button 
          onClick={onClose}
          className="px-6 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 rounded-xl transition-colors border border-transparent hover:border-white/10 hover:text-white"
        >
          {t.back}
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-32 bg-white/5 rounded-3xl border border-dashed border-white/10 animate-scale-in backdrop-blur-sm">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
             <History className="w-10 h-10 text-slate-500" />
          </div>
          <p className="text-slate-400 text-lg font-medium">{t.histEmpty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => {
            const total = calculateGrandTotal(project);
            const date = new Date(project.createdAt).toLocaleDateString(t.dateLocale, {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            return (
              <div 
                key={project.id} 
                className="group bg-white/5 rounded-3xl shadow-lg border border-white/10 overflow-hidden hover:shadow-purple-500/20 hover:border-purple-500/30 transition-all duration-500 flex flex-col animate-slide-up hover:-translate-y-2 backdrop-blur-md cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => onLoad(project)}
              >
                <div className="h-48 bg-black/40 relative overflow-hidden">
                  {project.imageBase64 ? (
                    <img 
                      src={project.imageBase64} 
                      alt={project.objectName} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 bg-white/5">
                      <ImageOff className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                     <span className="text-white font-bold text-sm flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                        <ExternalLink size={14} /> {t.histOpen}
                     </span>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-white mb-2 line-clamp-1 group-hover:text-purple-400 transition-colors">{project.objectName}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 font-mono">
                       <Calendar size={12} />
                       {date}
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 mb-6 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{project.generalCondition}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-auto">
                    <span className="font-bold text-emerald-400 text-xl tracking-tight">{total.toLocaleString('pl-PL')} zł</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                      className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-500/10 group/delete"
                      title="Delete"
                    >
                      <Trash2 size={18} className="group-hover/delete:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectHistory;
