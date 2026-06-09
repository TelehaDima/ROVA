import React, { useRef, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';
import { Camera, Image as ImageIcon, UploadCloud } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string, previewUrl: string) => void;
  isLoading: boolean;
  language: Language;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, isLoading, language }) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0);
    setIsMobile(checkMobile);
  }, []);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        onImageSelected(base64, result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-3xl p-8 lg:p-12 flex flex-col items-center justify-center transition-all duration-300 ease-out
          ${dragActive ? 'border-purple-500 bg-purple-500/10 scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.3)]' : 'border-white/20 hover:border-purple-400/50 hover:bg-white/5 hover:scale-[1.01]'}
          ${isLoading ? 'opacity-50 pointer-events-none grayscale' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          ref={galleryInputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleChange} 
        />
        {isMobile && (
          <input 
            ref={cameraInputRef}
            type="file" 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={handleChange} 
          />
        )}
        
        {isLoading ? (
          <div className="flex flex-col items-center text-purple-400 animate-pulse py-8">
            <div className="relative w-16 h-16 mb-4">
               <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="font-bold text-xl text-white">{t.analyzing}</p>
            <p className="text-sm text-slate-400 mt-2">{t.analyzingSub}</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-inner">
               <UploadCloud className="w-10 h-10 text-purple-300" />
            </div>
            <h3 className="text-3xl font-serif font-bold text-white mb-3 text-center">{t.uploadTitle}</h3>
            <p className="text-slate-400 text-center mb-10 max-w-sm leading-relaxed">
              {t.uploadDesc}
            </p>

            <div className={`grid gap-6 w-full max-w-lg ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
              {isMobile && (
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl hover:brightness-110 transition-all duration-300 shadow-lg shadow-purple-900/20 active:scale-95 border border-white/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-bold text-lg">{t.photoBtn}</span>
                  <span className="text-xs text-purple-200 mt-1 opacity-80">{t.photoDesc}</span>
                </button>
              )}
              
              <button 
                onClick={() => galleryInputRef.current?.click()}
                className="group flex flex-col items-center justify-center p-6 bg-white/5 text-white border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 shadow-lg active:scale-95 backdrop-blur-md"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                  <ImageIcon className="w-6 h-6 text-slate-300 group-hover:text-white" />
                </div>
                <span className="font-bold text-lg">{t.galleryBtn}</span>
                <span className="text-xs text-slate-400 mt-1 group-hover:text-slate-300">{t.galleryDesc}</span>
              </button>
            </div>
            
            <p className="mt-8 text-xs text-slate-500 font-medium uppercase tracking-widest opacity-60">
              {t.dragDrop}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
