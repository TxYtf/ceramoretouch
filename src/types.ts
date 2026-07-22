export type CeramicShape = "oval" | "rectangle" | "arch" | "other" | "";

export interface ShapeOption {
  id: CeramicShape;
  name: string;
  description: string;
  sizes: string[];
}

export type BackgroundType = "original" | "custom_text";

export interface TemplateBackground {
  id: string;
  name: string;
  colorClass: string;
  previewStyle: Record<string, string>;
}

export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  base64: string;
}

export interface OrderFormData {
  fullName: string;            // ПІБ (Прізвище, Ім'я, По батькові) в одному полі
  phoneMessenger: string;      // Телефон для Viber та/або Telegram в одному полі
  phoneBackup?: string;        // Резервний номер телефону
  email: string;
  retouchRequirements: string;
  ceramicShape: CeramicShape;
  ceramicShapeCustom?: string; // Текст для опції "інше _________"
  ceramicSize: string;         // "13х18", "18х24", "24х30", "30х40", "40х60" або "custom"
  ceramicSizeCustom?: string;  // Текст для опції "задати розмір __________"
  backgroundRequirements: string; // Текстовий опис вимог щодо фону портрета
  photoFile: AttachedFile | null;
}

export interface Order extends OrderFormData {
  id: string;
  createdAt: string;
  status: "new" | "processing" | "completed" | "cancelled";
}

export const SHAPE_OPTIONS: ShapeOption[] = [
  {
    id: "oval",
    name: "Овал",
    description: "Класична витончена форма, найбільш популярна для портретів",
    sizes: ["13х18 см", "18х24 см", "24х30 см", "30х40 см", "40х60 см"],
  },
  {
    id: "rectangle",
    name: "Прямокутник",
    description: "Сувора класична форма таблички з прямими кутами",
    sizes: ["13х18 см", "18х24 см", "24х30 см", "30х40 см", "40х60 см"],
  },
  {
    id: "arch",
    name: "Арка",
    description: "Елегантна форма із закругленим верхом",
    sizes: ["13х18 см", "18х24 см", "24х30 см", "30х40 см", "40х60 см"],
  },
  {
    id: "other",
    name: "Інше",
    description: "Нестандартна форма заготовки (вказується індивідуально)",
    sizes: ["13х18 см", "18х24 см", "24х30 см", "30х40 см", "40х60 см"],
  },
];

export const TEMPLATE_BACKGROUNDS: TemplateBackground[] = [
  {
    id: "sky-clouds",
    name: "Голубе небо та хмари",
    colorClass: "from-sky-300 via-sky-100 to-sky-400",
    previewStyle: {
      background: "linear-gradient(135deg, #7dd3fc 0%, #f0f9ff 50%, #38bdf8 100%)",
    },
  },
  {
    id: "neutral-grey",
    name: "Нейтральний сірий градієнт",
    colorClass: "from-gray-300 via-gray-100 to-gray-400",
    previewStyle: {
      background: "linear-gradient(135deg, #cbd5e1 0%, #f1f5f9 50%, #94a3b8 100%)",
    },
  },

  {
    id: "marble-white",
    name: "Світлий мармур",
    colorClass: "from-stone-200 via-stone-50 to-stone-300",
    previewStyle: {
      background: "radial-gradient(circle, #f5f5f4 0%, #e7e5e4 70%, #d6d3d1 100%)",
      backgroundImage: "repeating-linear-gradient(45deg, rgba(120,113,108,0.03) 0px, rgba(120,113,108,0.03) 2px, transparent 2px, transparent 10px)",
    },
  },
  {
    id: "dark-royal",
    name: "Королівський темний",
    colorClass: "from-slate-800 via-indigo-950 to-slate-950",
    previewStyle: {
      background: "linear-gradient(135deg, #1e293b 0%, #0c1033 50%, #020617 100%)",
    },
  },
];

export const STATUS_TRANSLATIONS: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Нове", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  processing: { label: "В роботі", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  completed: { label: "Виконано", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  cancelled: { label: "Скасовано", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};
