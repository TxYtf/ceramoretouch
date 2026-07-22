import React, { useState } from "react";
import { CeramicShape, TEMPLATE_BACKGROUNDS } from "../types";

interface CeramicPreviewProps {
  shape: CeramicShape;
  shapeCustom?: string;
  bevel?: "with_bevel" | "no_bevel" | "";
  size: string;
  photoBase64: string | null;
}

export const CeramicPreview: React.FC<CeramicPreviewProps> = ({
  shape,
  shapeCustom,
  bevel,
  size,
  photoBase64,
}) => {
  // Local state for simulator-only visual backdrop preview
  const [previewBgType, setPreviewBgType] = useState<"original" | "template">("original");
  const [previewTemplateId, setPreviewTemplateId] = useState<string>("sky-clouds");

  // Find current background template
  const currentTemplate = TEMPLATE_BACKGROUNDS.find((bg) => bg.id === previewTemplateId);

  // Determine background style to apply
  const getBackgroundStyle = (): React.CSSProperties => {
    if (previewBgType === "template" && currentTemplate) {
      return currentTemplate.previewStyle;
    }
    // "original" or fallback
    return {
      backgroundColor: "#f1f5f9",
    };
  };

  // Determine shape container classes
  const getShapeClasses = (): string => {
    switch (shape) {
      case "oval":
        return "rounded-[50%] aspect-[3/4] border-8 border-amber-100/90 shadow-[inset_0_4px_12px_rgba(255,255,255,0.6),0_15px_30px_rgba(0,0,0,0.15)]";
      case "arch":
        // Classic arch: rounded top, flat bottom
        return "rounded-t-[120px] rounded-b-2xl aspect-[3/4] border-8 border-amber-100/90 shadow-[inset_0_4px_12px_rgba(255,255,255,0.6),0_15px_30px_rgba(0,0,0,0.15)]";
      case "other":
        // Clean container without rounded-2xl or border-8 because clip-path and custom SVG border handles it
        return "aspect-[3/4] shadow-[inset_0_4px_12px_rgba(255,255,255,0.6)]";
      case "rectangle":
      default:
        return "rounded-2xl aspect-[3/4] border-8 border-amber-100/90 shadow-[inset_0_4px_12px_rgba(255,255,255,0.6),0_15px_30px_rgba(0,0,0,0.15)]";
    }
  };

  // Render content depending on background and photo uploads
  const renderPlaqueContent = () => {
    const bgStyle = getBackgroundStyle();

    return (
      <div
        className="w-full h-full relative overflow-hidden transition-all duration-300"
        style={bgStyle}
      >
        {photoBase64 ? (
          previewBgType === "original" ? (
            <img
              src={photoBase64}
              alt="Оригінальне фото"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            // Composite portrait over customized preview background
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="w-[82%] h-[82%] rounded-[50%] overflow-hidden border-4 border-white/95 shadow-xl relative bg-white/10 backdrop-blur-xs animate-fade-in">
                <img
                  src={photoBase64}
                  alt="Портрет у симуляторі"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <p className="text-sm font-medium">Тут з'явиться фото</p>
            <p className="text-xs mt-1">Завантажте портрет у формі ліворуч</p>
          </div>
        )}

        {/* Golden inner trim for classic ceramic style */}
        <div className="absolute inset-2 border border-yellow-500/20 rounded-[inherit] pointer-events-none" />

        {/* Glaze Highlight Overlays for realistic porcelain finish */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%) pointer-events-none transform rotate-45" />
      </div>
    );
  };

  const currentShapeLabel = (): string => {
    if (shape === "oval") return "Класичний Овал";
    if (shape === "rectangle") return "Прямокутник";
    if (shape === "arch") return "Арка";
    if (shape === "other") return "Інша форма (Індивідуальна, задана клієнтом)";
    return "Заготовка";
  };

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-2xl shadow-xs">
      <div className="text-center mb-4">
        <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40">
          Стилізована Візуалізація
        </span>
        <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mt-2 flex items-center justify-center gap-2 flex-wrap">
          <span>{currentShapeLabel()} {size ? ` • ${size}` : ""}</span>
          {bevel && (
            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-50 dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-zinc-700">
              {bevel === "with_bevel" ? "З фаскою" : "Без фаски"}
            </span>
          )}
        </h4>
      </div>

      {/* Ceramic Plaque Body */}
      <div 
        className="w-56 max-w-full relative group transition-transform duration-500 hover:scale-[1.02] my-3"
        style={shape === "other" ? { filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.18))" } : undefined}
      >
        {/* Porcelain Depth shadow backing (hidden for 'other' as drop-shadow filter handles it perfectly) */}
        {shape !== "other" && (
          <div className="absolute inset-0 bg-slate-900/10 rounded-[inherit] blur-md translate-y-3 pointer-events-none" />
        )}
        
        {/* Plaque border outer container */}
        <div 
          className={`${getShapeClasses()} overflow-hidden bg-white dark:bg-slate-800 relative border-slate-100 dark:border-slate-800`}
          style={shape === "other" ? { clipPath: "url(#trapezoid-clip)", WebkitClipPath: "url(#trapezoid-clip)" } : undefined}
        >
          {renderPlaqueContent()}

          {/* Precision custom SVG border drawn over the clipped trapezoid to avoid pixel jaggedness */}
          {shape === "other" && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Outer amber/porcelain border: strokeWidth=16 centered on path results in exactly 8px on-screen thickness (outer half is clipped) */}
              <path 
                d="M 0,95 L 0,5 Q 0,0 5,0 L 60,0 Q 80,0 80,20 L 98,92 Q 100,100 95,100 L 5,100 Q 0,100 0,95 Z" 
                stroke="#fef3c7" 
                strokeWidth="16" 
                fill="none" 
                vectorEffect="non-scaling-stroke" 
              />
              {/* Golden inner line decoration */}
              <path 
                d="M 3.5,91.5 L 3.5,8.5 Q 3.5,3.5 8.5,3.5 L 56.5,3.5 Q 73.5,3.5 73.5,18.5 L 91.5,86.5 Q 93.5,94.5 88.5,94.5 L 8.5,94.5 Q 3.5,94.5 3.5,91.5 Z" 
                stroke="rgba(234, 179, 8, 0.25)" 
                strokeWidth="1.5" 
                fill="none" 
                vectorEffect="non-scaling-stroke" 
              />
            </svg>
          )}
        </div>

        {/* Real gloss reflection glare highlight overlay */}
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-80 mix-blend-overlay" />
      </div>

      {/* Interactive simulation background toggles directly on the preview card */}
      {photoBase64 && (
        <div className="w-full mt-4 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Приміряти фон у симуляторі:</span>
            {previewBgType !== "original" && (
              <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 rounded-sm border border-blue-100 dark:border-blue-900/40">віртуальна ретуш</span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1.5 justify-center">
            <button
              type="button"
              onClick={() => setPreviewBgType("original")}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer border ${previewBgType === "original" ? "bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900 border-slate-700 dark:border-slate-300" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"}`}
            >
              Оригінал
            </button>
            {TEMPLATE_BACKGROUNDS.map((bg) => (
              <button
                type="button"
                key={bg.id}
                onClick={() => {
                  setPreviewBgType("template");
                  setPreviewTemplateId(bg.id);
                }}
                className={`w-5 h-5 rounded-full border transition cursor-pointer shrink-0 ${previewBgType === "template" && previewTemplateId === bg.id ? "ring-2 ring-blue-500 scale-110 border-white" : "border-slate-300 hover:scale-105"}`}
                style={bg.previewStyle}
                title={bg.name}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 text-center leading-relaxed">
        * Це візуальна примірка заготовки. Реальний дизайнер проведе точне ретушування, заміну чи делікатну обробку фону вручну за вашими текстовими вказівками у формі.
      </p>

      {/* Responsive objectBoundingBox clipPath definition for custom trapezoid shape */}
      <svg className="absolute w-0 h-0" width="0" height="0">
        <defs>
          <clipPath id="trapezoid-clip" clipPathUnits="objectBoundingBox">
            <path d="M 0,0.95 L 0,0.05 Q 0,0 0.05,0 L 0.60,0 Q 0.80,0 0.80,0.20 L 0.98,0.92 Q 1.00,1.00 0.95,1.00 L 0.05,1.00 Q 0,1.00 0,0.95 Z" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
};
