import React, { useState } from "react";
import { CeramicShape, TEMPLATE_BACKGROUNDS } from "../types";

interface CeramicPreviewProps {
  shape: CeramicShape;
  shapeCustom?: string;
  size: string;
  photoBase64: string | null;
}

export const CeramicPreview: React.FC<CeramicPreviewProps> = ({
  shape,
  shapeCustom,
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
        // Custom decorative badge style for other shapes
        return "rounded-3xl aspect-[3/4] border-8 border-dashed border-amber-200/80 shadow-[inset_0_4px_12px_rgba(255,255,255,0.6),0_15px_30px_rgba(0,0,0,0.15)]";
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
    if (shape === "other") return shapeCustom ? `Форма: "${shapeCustom}"` : "Інша форма";
    return "Заготовка";
  };

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
      <div className="text-center mb-4">
        <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40">
          3D-Стилізована Візуалізація
        </span>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">
          {currentShapeLabel()} {size ? ` • ${size}` : ""}
        </h4>
      </div>

      {/* Ceramic Plaque Body */}
      <div className="w-56 max-w-full relative group transition-transform duration-500 hover:scale-[1.02] my-3">
        {/* Porcelain Depth shadow backing */}
        <div className="absolute inset-0 bg-slate-900/10 rounded-[inherit] blur-md translate-y-3 pointer-events-none" />
        
        {/* Plaque border outer container */}
        <div className={`${getShapeClasses()} overflow-hidden bg-white dark:bg-slate-800 relative border-slate-100 dark:border-slate-800`}>
          {renderPlaqueContent()}
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
    </div>
  );
};
