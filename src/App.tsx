import React, { useState, useEffect } from "react";
import { 
  CustomerForm 
} from "./components/CustomerForm";
import { 
  CeramicPreview 
} from "./components/CeramicPreview";
import { 
  AdminPanel 
} from "./components/AdminPanel";
import { 
  CeramicShape 
} from "./types";
import { 
  Brush, ShieldAlert, Sparkles, Phone, ShieldCheck, Mail, MapPin, 
  Settings, CheckCircle, Info, FileSpreadsheet, Lock, Sun, Moon, Monitor
} from "lucide-react";

type Theme = "light" | "dark" | "system";

export default function App() {
  const [activeTab, setActiveTab] = useState<"order" | "admin">("order");
  
  // Theme state with localStorage persistence
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    return saved || "system";
  });

  // Track and apply dark mode class
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    const applyTheme = () => {
      let systemTheme: "light" | "dark" = "light";
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        systemTheme = "dark";
      }

      const activeTheme = theme === "system" ? systemTheme : theme;
      root.classList.add(activeTheme);
      
      // Sync dark mode color to page background to avoid flickering
      if (activeTheme === "dark") {
        document.body.style.backgroundColor = "#18181b"; // Zinc 950 (dark gray)
      } else {
        document.body.style.backgroundColor = "#f8fafc"; // Slate 50
      }
    };

    applyTheme();
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme();
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [theme]);
  
  // Interactive preview state bound to form events
  const [preview, setPreview] = useState<{
    shape: CeramicShape;
    shapeCustom?: string;
    size: string;
    photoBase64: string | null;
  }>({
    shape: "",
    shapeCustom: "",
    size: "",
    photoBase64: null,
  });

  // Admin lock PIN state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Validate admin PIN code via secure backend API
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    setIsVerifying(true);
    setPinError(false);
    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput })
      });

      if (res.ok) {
        localStorage.setItem("manager_pin", pinInput);
        setPinError(false);
        setShowPinModal(false);
        setActiveTab("admin");
        setPinInput("");
      } else {
        setPinError(true);
        setPinInput("");
      }
    } catch (err) {
      console.error("Помилка авторизації:", err);
      setPinError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAdminClick = () => {
    if (activeTab === "admin") {
      setActiveTab("order");
    } else {
      const storedPin = localStorage.getItem("manager_pin");
      if (storedPin) {
        setActiveTab("admin");
      } else {
        setShowPinModal(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col font-sans transition-colors duration-300 text-slate-800 dark:text-zinc-100" id="app-root">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 shadow-xs transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo and Branding Title */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shrink-0">
              <Brush className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-xs sm:text-base font-black text-slate-800 dark:text-zinc-100 tracking-tight font-display flex items-center gap-1">
                <span className="hidden min-[350px]:inline">КерамоРетуш</span>
                <span className="inline min-[350px]:hidden">КР</span>
                <span className="text-[10px] font-semibold bg-blue-50 dark:bg-zinc-900/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-zinc-800/40 px-1.5 py-0.2 rounded-md hidden xs:inline-block">ПОРТАЛ</span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 hidden sm:block font-medium">Замовлення фотокераміки з автоматичною відправкою</p>
            </div>
          </div>

          {/* Theme Switcher & Tab / View Control Mode Switcher */}
          <div className="flex items-center gap-1.5 xs:gap-2.5 sm:gap-4">
            {/* Segmented Theme Switcher */}
            <div className="flex bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-zinc-700 shrink-0">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-1 sm:p-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${theme === "light" ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"}`}
                title="Світла тема"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-1 sm:p-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${theme === "dark" ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"}`}
                title="Темна тема"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`p-1 sm:p-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${theme === "system" ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold" : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"}`}
                title="Системна тема"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-zinc-700 hidden xs:block" />

            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <button
                onClick={() => setActiveTab("order")}
                className={`px-2 py-1.5 xs:px-3 xs:py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 ${activeTab === "order" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"}`}
              >
                <span className="text-xs">🛒</span>
                <span className="hidden sm:inline">Створити</span>
              </button>
              
              <button
                onClick={handleAdminClick}
                className={`px-2 py-1.5 xs:px-3 xs:py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0 ${activeTab === "admin" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700"}`}
              >
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Кабінет</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* PORTAL MAIN AREA */}
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        
        {activeTab === "order" ? (
          /* CUSTOMER VIEW: SPLIT GRID FORM & LIVE PREVIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left side: Form steps (7 of 12 columns) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Informative introductory block */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/30 to-white dark:from-zinc-900/40 dark:via-zinc-900/20 dark:to-zinc-950 border border-blue-100/60 dark:border-zinc-800/50 p-5 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100/80 dark:bg-zinc-800/80 rounded-full flex items-center justify-center text-blue-600 dark:text-zinc-300 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Художня ретуш та виготовлення фотокераміки</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Заповніть форму нижче для замовлення професійної ретуші. Виберіть форму, потрібні розміри заготовки, завантажте фотографію і вкажіть побажання. Ваше замовлення буде автоматично надіслано менеджеру на розгляд.
                  </p>
                </div>
              </div>

              {/* Form implementation */}
              <CustomerForm onFormChange={(previewData) => setPreview(previewData)} />
            </div>

            {/* Right side: Sticky Live Interactive Preview (5 of 12 columns) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
              
              {/* Product Visualizer Plaque container */}
              <CeramicPreview
                shape={preview.shape}
                shapeCustom={preview.shapeCustom}
                size={preview.size}
                photoBase64={preview.photoBase64}
              />

              {/* Informative helper sidebar cards */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 p-5 rounded-2xl space-y-3.5 shadow-xs">
                <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block w-fit">Довідка</span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">📋 Пам'ятка щодо вимог до оригіналів фото:</h4>
                <ul className="space-y-2 text-xs text-slate-500 dark:text-zinc-400 list-disc list-inside">
                  <li>Краще використовувати скановані зображення з високою роздільною здатністю.</li>
                  <li>Обличчя на фотографії повинно бути чітким та добре освітленим.</li>
                  <li>Якщо вам потрібен монтаж (заміна одягу, заміна фону, ретушування зморшок), обов'язково опишіть це у полі <strong>"Вимоги до ретушування"</strong>.</li>
                  <li>Наш спеціаліст узгодить готовий ретушований макет перед нанесенням на кераміку.</li>
                </ul>
              </div>

            </div>

          </div>
        ) : (
          /* ADMIN VIEW: ORDERS DASHBOARD */
          <div className="animate-fade-in">
            <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Панель Менеджера (Адміністратор)
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Керування вхідними замовленнями, перегляд вимог та завантаження файлів для ретушування</p>
              </div>

              <button
                onClick={() => setActiveTab("order")}
                className="px-4 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                ← Повернутись до замовлень
              </button>
            </div>

            <AdminPanel />
          </div>
        )}

      </main>

      {/* FOOTER SECTION */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 py-8 mt-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">© 2026 Портал КерамоРетуш. Усі права захищено.</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 leading-relaxed">
                Автоматизований інструмент підготовки та оформлення замовлень фотокераміки з ретушуванням.
              </p>
            </div>

            {/* Quick helper info */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" /> Україна
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" /> support@photoceramics.ua
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ADMIN PASSCODE OVERLAY MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl max-w-sm w-full space-y-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">Вхід у кабінет менеджера</h3>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Введіть PIN-код для перегляду замовлень</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                  Введіть PIN-код доступу
                </label>
                <input
                  type="password"
                  value={pinInput}
                  disabled={isVerifying}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  autoFocus
                  placeholder="•••••••••••"
                  className={`w-full px-3 py-2 border ${pinError ? "border-rose-400 bg-rose-50/30 dark:bg-rose-950/10 text-rose-800 dark:text-rose-400 focus:ring-rose-200" : "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 focus:ring-blue-100 dark:focus:ring-blue-900"} rounded-lg text-center font-mono tracking-widest text-base font-black focus:outline-hidden focus:ring-4 transition`}
                />
                {pinError && <p className="text-rose-500 text-[11px] mt-1.5 text-center font-medium">Неправильний PIN-код! Перевірте правильність вводу.</p>}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput("");
                    setPinError(false);
                  }}
                  className="w-1/2 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 disabled:bg-slate-400 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                >
                  {isVerifying ? "Перевірка..." : "Підтвердити"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
