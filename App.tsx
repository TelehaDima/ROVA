
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  History, 
  MessageSquare, 
  Settings, 
  ChevronRight, 
  Save, 
  RefreshCw, 
  LayoutDashboard,
  Languages,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import AnalysisDisplay from './components/AnalysisDisplay';
import Calculator from './components/Calculator';
import ChatAssistant from './components/ChatAssistant';
import ProjectHistory from './components/ProjectHistory';
import { RestorationReport, Language } from './types';
import { analyzeRestorationImage, translateReport } from './services/geminiService';
import { getProjects, saveProject, deleteProject } from './services/storageService';
import { TRANSLATIONS } from './constants';
import Auth from './components/Auth';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { logUserAction } from './services/analyticsService';

type ViewState = 'home' | 'upload' | 'report' | 'history' | 'chat';
type TabState = 'analysis' | 'calculator' | 'chat';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [image, setImage] = useState<string | null>(null);
  const [report, setReport] = useState<RestorationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const additionalPhotoRef = useRef<HTMLInputElement>(null);
  const additionalCameraRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabState>('analysis');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('uk');
  const [isMobile, setIsMobile] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0);
    setIsMobile(checkMobile);
  }, []);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle Translation
  useEffect(() => {
    const handleTranslation = async () => {
      if (report && report.language && report.language !== language) {
        setIsTranslating(true);
        try {
          const translated = await translateReport(report, language);
          setReport(translated);
          
          // Optionally update history if it was saved
          const projects = await getProjects();
          const exists = projects.find(p => p.id === translated.id);
          if (exists) {
            await saveProject(translated);
            setHistoryProjects(await getProjects());
          }
          await logUserAction('translate_report', { from: report.language, to: language, project_id: report.id });
        } catch (err: any) {
          console.error("Translation error", err);
          const errorStr = String(err);
          let msg = t.error;
          if (errorStr.includes('RATE_LIMIT')) msg = t.errRateLimit;
          else if (errorStr.includes('SERVER_BUSY')) msg = t.errServerBusy;
          else msg = `${t.error}: ${err.message || errorStr}`;
          setNotification({ msg, type: 'error' });
        } finally {
          setIsTranslating(false);
        }
      }
    };
    handleTranslation();
  }, [language, report, t.error]);

  const handleImageSelected = async (base64: string, previewUrl: string) => {
    setImage(previewUrl);
    setLoading(true);
    setError(null);
    setReport(null);
    setView('report');

    try {
      const pastProjects = await getProjects();
      await logUserAction('upload_image');
      const result = await analyzeRestorationImage(base64, language, pastProjects);
      await logUserAction('analysis_complete');
      
      // Tag components with the primary image
      result.components = result.components.map(c => ({ ...c, sourceImage: previewUrl }));
      
      setReport({ ...result, imageBase64: previewUrl, additionalImages: [] });
    } catch (err: any) {
      const errorStr = String(err);
      if (errorStr.includes('RATE_LIMIT')) {
        setError('RATE_LIMIT');
      } else if (errorStr.includes('SERVER_BUSY')) {
        setError('SERVER_BUSY');
      } else {
        setError(err.message || t.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (image) {
      const base64 = image.split(',')[1];
      if (base64) {
        handleImageSelected(base64, image);
        return;
      }
    }
    setView('home');
  };

  const handleAdditionalPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !report) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        
        setIsAddingPhoto(true);
        try {
          const pastProjects = await getProjects();
          const newAnalysis = await analyzeRestorationImage(base64, language, pastProjects);
          
          // Tag new components with the additional image
          const taggedComponents = newAnalysis.components.map(c => ({ ...c, sourceImage: result }));
          
          setReport(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              components: [...prev.components, ...taggedComponents],
              additionalImages: [...(prev.additionalImages || []), result]
            };
          });
          await logUserAction('add_additional_photo', { project_id: report.id });
          setNotification({ msg: t.msgElementAdded, type: 'success' });
        } catch (err: any) {
          setNotification({ msg: err.message || t.error, type: 'error' });
        } finally {
          setIsAddingPhoto(false);
          if (additionalPhotoRef.current) additionalPhotoRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (report) {
      const result = await saveProject(report);
      if (result.success) {
        setNotification({ msg: t.msgProjectSaved, type: 'success' });
      } else {
        setNotification({ msg: result.error || t.error, type: 'error' });
      }
    }
  };

  const handleLoadProject = (project: RestorationReport) => {
    setReport(project);
    setImage(project.imageBase64 || null);
    setView('report');
    setActiveTab('analysis');
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    const projects = await getProjects();
    setHistoryProjects(projects);
    setNotification({ msg: t.msgProjectDeleted, type: 'success' });
  };

  const handleReset = () => {
    setImage(null);
    setReport(null);
    setError(null);
    setView('home');
    setActiveTab('analysis');
  };

  const [historyProjects, setHistoryProjects] = useState<RestorationReport[]>([]);
  useEffect(() => {
    const loadProjects = async () => {
      if (view === 'history') {
        const projects = await getProjects();
        setHistoryProjects(projects);
      }
    };
    loadProjects();
  }, [view]);

  const deleteProjectWrapper = async (id: string) => {
    await handleDeleteProject(id);
    // setHistoryProjects is called inside handleDeleteProject after fetching new list
  };

  // Background Animation Components
  const BackgroundBlobs = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full mix-blend-multiply filter blur-[128px] animate-blob opacity-70"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-2000 opacity-70"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-pink-600/30 rounded-full mix-blend-multiply filter blur-[128px] animate-blob animation-delay-4000 opacity-70"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-purple-500 selection:text-white relative overflow-x-hidden">
      <BackgroundBlobs />
      
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10 text-white font-medium
              ${notification.type === 'success' ? 'bg-emerald-500/80' : 'bg-red-500/80'}
            `}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 transition-all duration-300">
        <div className="mx-auto px-6 py-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between shadow-lg">
            <div 
              className="flex items-center gap-4 cursor-pointer group"
              onClick={handleReset}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg transform transition-transform group-hover:scale-105 group-active:scale-95">
                 <LayoutDashboard size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-serif font-bold text-white leading-none tracking-tight">{t.appTitle}</h1>
                <p className="text-[10px] md:text-xs text-slate-400 font-medium tracking-widest uppercase mt-1 opacity-80 group-hover:opacity-100 transition-opacity">{t.subtitle}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               {/* Language Switcher */}
               <div className="flex bg-black/20 rounded-xl p-1 backdrop-blur-md border border-white/5">
                  <button 
                    onClick={() => setLanguage('uk')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${language === 'uk' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    UK
                  </button>
                  <button 
                    onClick={() => setLanguage('pl')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${language === 'pl' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    PL
                  </button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${language === 'en' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    EN
                  </button>
               </div>

               {view !== 'home' && (
                 <button 
                   onClick={() => setView('home')}
                   className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-slate-300 hover:text-white"
                 >
                   <ArrowLeft size={20} />
                 </button>
               )}
               {session && (
                 <button 
                   onClick={() => supabase.auth.signOut()}
                   className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all text-red-400 hover:text-red-300"
                   title="Sign Out"
                 >
                   <LogOut size={20} />
                 </button>
               )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-32 md:pt-44 pb-12 relative z-10">
        {!session || isRecovery ? (
          <Auth language={language} isRecoveryMode={isRecovery} onRecoveryComplete={() => setIsRecovery(false)} />
        ) : (
          <AnimatePresence mode="wait">
          
          {/* VIEW: HOME */}
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="text-center mb-16 max-w-3xl">
                <h2 className="text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-6 drop-shadow-sm">
                  {t.appTitle}
                </h2>
                <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                  {t.homeDesc}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                {/* Card 1: New Analysis */}
                <motion.div 
                  whileHover={{ y: -10, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('upload')}
                  className="group relative overflow-hidden rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 p-8 cursor-pointer shadow-2xl hover:shadow-purple-500/20 transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 flex flex-col items-start h-full">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg group-hover:shadow-purple-500/40 transition-shadow">
                      <Upload className="text-white w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{t.newProject}</h3>
                    <p className="text-slate-400 mb-8 flex-grow">
                      {t.homeNewDesc}
                    </p>
                    <div className="flex items-center text-purple-400 font-semibold group-hover:translate-x-2 transition-transform">
                      <span>{t.actionStart}</span>
                      <ChevronRight size={20} className="ml-1" />
                    </div>
                  </div>
                </motion.div>

                {/* Card 2: History */}
                <motion.div 
                  whileHover={{ y: -10, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('history')}
                  className="group relative overflow-hidden rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 p-8 cursor-pointer shadow-2xl hover:shadow-blue-500/20 transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 flex flex-col items-start h-full">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-6 shadow-lg group-hover:shadow-blue-500/40 transition-shadow">
                      <History className="text-white w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{t.history}</h3>
                    <p className="text-slate-400 mb-8 flex-grow">
                      {t.homeHistDesc}
                    </p>
                    <div className="flex items-center text-blue-400 font-semibold group-hover:translate-x-2 transition-transform">
                      <span>{t.actionOpen}</span>
                      <ChevronRight size={20} className="ml-1" />
                    </div>
                  </div>
                </motion.div>

                {/* Card 3: Chat Assistant */}
                <motion.div 
                  whileHover={{ y: -10, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('chat')}
                  className="group relative overflow-hidden rounded-[2rem] bg-white/5 backdrop-blur-2xl border border-white/10 p-8 cursor-pointer shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 flex flex-col items-start h-full">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg group-hover:shadow-emerald-500/40 transition-shadow">
                      <MessageSquare className="text-white w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{t.tabChat}</h3>
                    <p className="text-slate-400 mb-8 flex-grow">
                      {t.homeChatDesc}
                    </p>
                    <div className="flex items-center text-emerald-400 font-semibold group-hover:translate-x-2 transition-transform">
                      <span>{t.actionChat}</span>
                      <ChevronRight size={20} className="ml-1" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* VIEW: UPLOAD */}
          {view === 'upload' && (
             <motion.div 
               key="upload"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="max-w-3xl mx-auto"
             >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                   <h2 className="text-3xl font-serif font-bold text-white mb-8 text-center">{t.newProject}</h2>
                   <ImageUploader onImageSelected={handleImageSelected} isLoading={loading} language={language} />
                </div>
             </motion.div>
          )}

          {/* VIEW: CHAT (Standalone) */}
          {view === 'chat' && (
             <motion.div 
               key="chat"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="max-w-3xl mx-auto h-[70vh]"
             >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-1 shadow-2xl h-full overflow-hidden flex flex-col">
                   <ChatAssistant language={language} />
                </div>
             </motion.div>
          )}

          {/* VIEW: HISTORY */}
          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <ProjectHistory 
                  projects={historyProjects} 
                  onLoad={handleLoadProject} 
                  onDelete={deleteProjectWrapper}
                  onClose={() => setView('home')}
                  language={language}
                />
              </div>
            </motion.div>
          )}

          {/* VIEW: REPORT (Active Analysis) */}
          {view === 'report' && (
            <motion.div 
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-12 gap-8"
            >
              {/* Sidebar / Image Preview */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                  <h3 className="font-bold text-slate-300 mb-4 text-sm uppercase tracking-wider">Original Photo</h3>
                  <div className="relative rounded-2xl overflow-hidden bg-black/40 aspect-[3/4] group shadow-inner border border-white/5 mb-4">
                     {image && <img src={image} alt="Restoration Object" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />}
                     {loading && (
                       <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                          <div className="text-center">
                            <RefreshCw className="animate-spin text-purple-500 w-12 h-12 mb-4 mx-auto" />
                            <p className="text-sm font-semibold text-slate-300">{t.identifying}</p>
                          </div>
                       </div>
                     )}
                  </div>
                  
                  {/* Additional Images Gallery */}
                  {report?.additionalImages && report.additionalImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {report.additionalImages.map((img, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden aspect-square bg-black/40 border border-white/10">
                          <img src={img} alt={`Additional ${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Additional Photo Button */}
                  {report && !loading && (
                    <>
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={additionalPhotoRef}
                        className="hidden"
                        onChange={handleAdditionalPhotoSelected}
                      />
                      {isMobile && (
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          ref={additionalCameraRef}
                          className="hidden"
                          onChange={handleAdditionalPhotoSelected}
                        />
                      )}
                      <div className={`grid gap-3 mt-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {isMobile && (
                          <button 
                            onClick={() => additionalCameraRef.current?.click()}
                            disabled={isAddingPhoto}
                            className={`w-full py-3 px-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/30 transition-all flex flex-col items-center justify-center gap-1 text-sm font-medium ${isAddingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                             <Upload className="w-5 h-5" />
                             <span className="text-[10px] md:text-xs">Камера</span>
                          </button>
                        )}
                        <button 
                          onClick={() => additionalPhotoRef.current?.click()}
                          disabled={isAddingPhoto}
                          className={`w-full py-3 px-2 bg-white/5 border border-dashed border-white/20 text-slate-300 rounded-xl hover:bg-white/10 hover:border-white/40 transition-all flex ${isMobile ? 'flex-col gap-1' : 'flex-row gap-2'} items-center justify-center text-sm font-medium ${isAddingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isAddingPhoto ? (
                            <>
                              <RefreshCw className="animate-spin w-4 h-4 md:w-5 md:h-5" />
                              <span className="text-[10px] md:text-xs text-center">{t.analyzingAdditional}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 md:w-5 md:h-5" />
                              <span className="text-[10px] md:text-xs text-center">{isMobile ? 'Галерея' : t.addAdditionalPhoto}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                {report && (
                   <button 
                    onClick={handleSave}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 font-bold text-lg transform active:scale-95"
                   >
                     <Save size={24} />
                     {t.save}
                   </button>
                )}

                {/* Status/Error Messages */}
                {!loading && !report && !error && (
                   <div className="p-4 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-2xl text-sm">
                     {t.statusLoaded}
                   </div>
                )}
                 {error && (
                   <div className="p-4 bg-red-500/10 text-red-300 border border-red-500/20 rounded-2xl text-sm">
                     <strong>{t.error}:</strong> {error === 'RATE_LIMIT' ? t.errRateLimit : error === 'SERVER_BUSY' ? t.errServerBusy : error}
                     <button onClick={handleRetry} className="block mt-2 underline hover:text-white">{t.retry}</button>
                   </div>
                )}
              </div>

              {/* Results Area */}
              <div className="lg:col-span-8">
                {report ? (
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl min-h-[600px]">
                     {/* Tabs */}
                     <div className="flex border-b border-white/10 overflow-x-auto mb-6">
                       <button
                         onClick={() => setActiveTab('analysis')}
                         className={`px-6 py-4 text-sm font-bold transition-all duration-300 border-b-2 whitespace-nowrap ${
                           activeTab === 'analysis' 
                             ? 'border-purple-500 text-purple-400' 
                             : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                         }`}
                       >
                         {t.tabAnalysis}
                       </button>
                       <button
                         onClick={() => setActiveTab('calculator')}
                         className={`px-6 py-4 text-sm font-bold transition-all duration-300 border-b-2 flex items-center gap-2 whitespace-nowrap ${
                           activeTab === 'calculator' 
                             ? 'border-purple-500 text-purple-400' 
                             : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                         }`}
                       >
                         <LayoutDashboard size={16} />
                         {t.tabCalculator}
                       </button>
                       <button
                         onClick={() => setActiveTab('chat')}
                         className={`px-6 py-4 text-sm font-bold transition-all duration-300 border-b-2 flex items-center gap-2 whitespace-nowrap ${
                           activeTab === 'chat' 
                             ? 'border-purple-500 text-purple-400' 
                             : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                         }`}
                       >
                         <MessageSquare size={16} />
                         {t.tabChat}
                       </button>
                     </div>

                     {/* Tab Content */}
                     <div className="relative">
                        {isTranslating && (
                          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm z-20 rounded-3xl">
                             <div className="text-center">
                               <Languages className="animate-bounce text-blue-500 w-12 h-12 mb-4 mx-auto" />
                               <p className="text-sm font-semibold text-slate-300">{t.translating}</p>
                             </div>
                          </div>
                        )}
                        <div key={activeTab}>
                          {activeTab === 'analysis' && (
                              <div className="text-slate-200">
                                <AnalysisDisplay 
                                  report={report} 
                                  onUpdateReport={setReport}
                                  language={language} 
                                />
                              </div>
                          )}
                          {activeTab === 'calculator' && (
                              <div className="text-slate-200">
                                <Calculator 
                                  report={report} 
                                  onUpdateReport={setReport} 
                                  language={language}
                                />
                              </div>
                          )}
                          {activeTab === 'chat' && (
                              <div className="h-[500px] flex flex-col">
                                <ChatAssistant 
                                  language={language}
                                  report={report}
                                  onUpdateReport={setReport}
                                />
                              </div>
                          )}
                        </div>
                     </div>
                  </div>
                ) : (
                  loading && (
                     <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-6">
                        <div className="w-full max-w-md space-y-4">
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 animate-[width_2s_ease-in-out_infinite]" style={{width: '30%'}}></div>
                          </div>
                          <p className="text-lg font-light tracking-wide animate-pulse">{t.identifying}</p>
                        </div>
                     </div>
                  )
                )}
              </div>
            </motion.div>
        )}
        </AnimatePresence>
        )}
      </main>
      
      <footer className="relative z-10 py-8 text-center text-slate-500 text-sm border-t border-white/5 bg-black/20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4">
            <p className="font-light">RestorerPro Assistant &copy; {new Date().getFullYear()}</p>
            <p className="text-xs mt-2 opacity-50">{t.footerDisclaimer}</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
