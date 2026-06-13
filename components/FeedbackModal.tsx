import React, { useState } from 'react';
import { X, Send, Lightbulb, Bug, MessageSquare, HelpCircle } from 'lucide-react';
import { sendFeedbackToTelegram, FeedbackType } from '../services/telegramService';
import { Language } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  language: Language;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, userEmail, language }) => {
  const [type, setType] = useState<FeedbackType>('idea');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    const success = await sendFeedbackToTelegram({ type, message, email });
    setIsSubmitting(false);

    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setMessage('');
        onClose();
      }, 3000);
    } else {
      alert(language === 'uk' ? 'Помилка при відправці. Спробуйте пізніше.' : 'Wystąpił błąd podczas wysyłania. Spróbuj ponownie później.');
    }
  };

  const types: { id: FeedbackType; icon: React.ReactNode; label: Record<string, string> }[] = [
    { id: 'idea', icon: <Lightbulb size={18} />, label: { uk: 'Ідея', pl: 'Pomysł', en: 'Idea' } },
    { id: 'bug', icon: <Bug size={18} />, label: { uk: 'Помилка', pl: 'Błąd', en: 'Bug' } },
    { id: 'review', icon: <MessageSquare size={18} />, label: { uk: 'Відгук', pl: 'Opinia', en: 'Review' } },
    { id: 'question', icon: <HelpCircle size={18} />, label: { uk: 'Питання', pl: 'Pytanie', en: 'Question' } },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1A1A24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-purple-400" />
            {language === 'uk' ? "Зворотний зв'язок" : language === 'en' ? 'Feedback' : 'Zgłoś opinię'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <Send size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {language === 'uk' ? 'Дякуємо!' : language === 'en' ? 'Thank you!' : 'Dziękujemy!'}
              </h3>
              <p className="text-slate-400">
                {language === 'uk' ? 'Ваше повідомлення успішно надіслано розробникам.' : language === 'en' ? 'Your message has been sent to the developers.' : 'Twoja wiadomość została pomyślnie wysłana do programistów.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Type Selector */}
              <div className="grid grid-cols-2 gap-2">
                {types.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      type === t.id 
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' 
                        : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {t.icon}
                    <span className="font-medium text-sm">{t.label[language] || t.label.en}</span>
                  </button>
                ))}
              </div>

              {/* Email Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                   {language === 'uk' ? "Ваш Email (необов'язково)" : language === 'en' ? 'Your Email (optional)' : 'Twój Email (opcjonalnie)'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all"
                  placeholder="name@example.com"
                />
              </div>

              {/* Message Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                   {language === 'uk' ? 'Повідомлення' : language === 'en' ? 'Message' : 'Wiadomość'}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all resize-none"
                  placeholder={language === 'uk' ? 'Напишіть ваші ідеї або опишіть проблему...' : language === 'en' ? 'Write your ideas or describe the issue...' : 'Napisz swoje pomysły lub opisz problem...'}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-900/20 border border-purple-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    {language === 'uk' ? 'Відправити' : language === 'en' ? 'Send' : 'Wyślij'}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
