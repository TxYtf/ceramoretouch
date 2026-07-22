import React, { useState, useRef } from "react";
import { 
  User, Phone, Mail, FileText, Image as ImageIcon, CheckCircle2, 
  AlertCircle, Upload, HelpCircle, Layers, Maximize2, Trash2, ArrowRight
} from "lucide-react";
import { 
  CeramicShape, SHAPE_OPTIONS, OrderFormData, AttachedFile 
} from "../types";

interface CustomerFormProps {
  onFormChange: (data: {
    shape: CeramicShape;
    shapeCustom?: string;
    size: string;
    photoBase64: string | null;
  }) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onFormChange }) => {
  // 1. Form state with updated fields
  const [formData, setFormData] = useState<OrderFormData>({
    fullName: "",
    phoneMessenger: "",
    phoneBackup: "",
    email: "",
    retouchRequirements: "",
    ceramicShape: "",
    ceramicShapeCustom: "",
    ceramicSize: "",
    ceramicSizeCustom: "",
    backgroundRequirements: "",
    photoFile: null,
  });

  // 2. Interactive States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ id: string } | null>(null);
  const [dragActivePhoto, setDragActivePhoto] = useState(false);

  // File input ref
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Notify parent about preview-relevant changes
  const notifyParent = (updatedData: Partial<OrderFormData>) => {
    const merged = { ...formData, ...updatedData };
    
    // Determine actual size representation to display on preview card
    const finalSize = merged.ceramicSize === "custom"
      ? (merged.ceramicSizeCustom || "Не вказано")
      : merged.ceramicSize;

    onFormChange({
      shape: merged.ceramicShape,
      shapeCustom: merged.ceramicShapeCustom,
      size: finalSize,
      photoBase64: merged.photoFile ? `data:${merged.photoFile.type};base64,${merged.photoFile.base64}` : null,
    });
  };

  // Handle standard input/select/textarea changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updated: Record<string, any> = { [name]: value };

    // Reset custom fields when shape or size changes
    if (name === "ceramicShape" && value !== "other") {
      updated.ceramicShapeCustom = "";
    }
    if (name === "ceramicSize" && value !== "custom") {
      updated.ceramicSizeCustom = "";
    }

    const nextState = { ...formData, ...updated };
    setFormData(nextState);
    notifyParent(updated);
    
    // Clear validation error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  // Helper to convert File to custom AttachedFile format
  const processFile = (file: File): Promise<AttachedFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          base64: base64,
        });
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Handle Photo upload
  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, photoFile: "Будь ласка, завантажте зображення (JPG, PNG)" }));
      return;
    }
    try {
      const attached = await processFile(file);
      setFormData((prev) => ({ ...prev, photoFile: attached }));
      notifyParent({ photoFile: attached });
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy["photoFile"];
        return copy;
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Drag-and-drop events
  const handleDrag = (e: React.DragEvent, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivePhoto(active);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivePhoto(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoUpload(e.dataTransfer.files[0]);
    }
  };

  // Validate Form
  const validateForm = (): { isValid: boolean; tempErrors: Record<string, string> } => {
    const tempErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      tempErrors.fullName = "ПІБ є обов'язковим для заповнення";
    }
    if (!formData.phoneMessenger.trim()) {
      tempErrors.phoneMessenger = "Контактний номер телефону є обов'язковим";
    } else {
      const cleanedPhone = formData.phoneMessenger.replace(/\D/g, "");
      let operatorCode = "";
      let isValidLength = false;

      if (cleanedPhone.length === 12 && cleanedPhone.startsWith("380")) {
        operatorCode = cleanedPhone.substring(3, 5);
        isValidLength = true;
      } else if (cleanedPhone.length === 10 && cleanedPhone.startsWith("0")) {
        operatorCode = cleanedPhone.substring(1, 3);
        isValidLength = true;
      } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith("80")) {
        operatorCode = cleanedPhone.substring(2, 4);
        isValidLength = true;
      } else if (cleanedPhone.length === 9) {
        operatorCode = cleanedPhone.substring(0, 2);
        isValidLength = true;
      }

      const ukrainianCodes = ["50", "63", "66", "67", "68", "73", "91", "92", "93", "94", "95", "96", "97", "98", "99"];

      if (!isValidLength) {
        tempErrors.phoneMessenger = "Некоректний формат телефону. Номер має містити 10 цифр (наприклад, 0501234567)";
      } else if (!ukrainianCodes.includes(operatorCode)) {
        tempErrors.phoneMessenger = `Некоректний код оператора (${operatorCode}). Дозволені мобільні коди України: 50, 63, 66, 67, 68, 73, 91-99`;
      }
    }
    
    // Validate ceramicShape and ceramicSize
    if (!formData.ceramicShape) {
      tempErrors.ceramicShape = "Будь ласка, оберіть форму заготовки";
    }
    if (!formData.ceramicSize) {
      tempErrors.ceramicSize = "Будь ласка, оберіть розмір заготовки";
    } else if (formData.ceramicSize === "custom" && !formData.ceramicSizeCustom?.trim()) {
      tempErrors.ceramicSizeCustom = "Будь ласка, вкажіть бажаний розмір";
    }

    if (!formData.backgroundRequirements.trim()) {
      tempErrors.backgroundRequirements = "Будь ласка, опишіть ваші вимоги щодо фону";
    }
    if (!formData.photoFile) {
      tempErrors.photoFile = "Будь ласка, завантажте фотографію для ретушування";
    }

    setErrors(tempErrors);
    return { isValid: Object.keys(tempErrors).length === 0, tempErrors };
  };

  // Submit Order Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, tempErrors } = validateForm();
    if (!isValid) {
      // Focus on first error element if possible
      const firstError = Object.keys(tempErrors)[0] || "fullName";
      document.getElementById(firstError)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Помилка при збереженні замовлення");
      }

      const result = await response.json();
      if (result.success) {
        setSubmitSuccess({ id: result.order.id });
      }
    } catch (err: any) {
      setErrors({ apiError: err.message || "Помилка зв'язку з сервером" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form for a new order
  const handleReset = () => {
    const defaultData: OrderFormData = {
      fullName: "",
      phoneMessenger: "",
      phoneBackup: "",
      email: "",
      retouchRequirements: "",
      ceramicShape: "",
      ceramicShapeCustom: "",
      ceramicSize: "",
      ceramicSizeCustom: "",
      backgroundRequirements: "",
      photoFile: null,
    };
    setFormData(defaultData);
    setSubmitSuccess(null);
    setErrors({});
    notifyParent(defaultData);
  };

  // Define standard sizes
  const standardSizes = ["13х18 см", "18х24 см", "24х30 см", "30х40 см", "40х60 см"];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xs" id="order-form">
      {errors.apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Помилка відправки:</p>
            <p className="mt-0.5">{errors.apiError}</p>
          </div>
        </div>
      )}

      {/* STEP 1: CONTACT DETAILS */}
      <div className="space-y-4" id="fullName">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-zinc-300 text-xs font-bold flex items-center justify-center">1</span>
          <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-base flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-500" />
            Контактна інформація замовника
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Combined ПІБ Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              Прізвище, Ім'я, По батькові (ПІБ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Наприклад, Шевченко Тарас Григорович"
                className={`w-full px-3 py-2.5 pl-9 bg-slate-50 dark:bg-zinc-950 border ${errors.fullName ? "border-rose-400 focus:ring-rose-200 dark:focus:ring-zinc-900 bg-rose-50/10" : "border-slate-200 dark:border-zinc-800 focus:ring-blue-100 dark:focus:ring-zinc-800"} rounded-lg text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-4 transition`}
              />
              <User className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-3.5" />
            </div>
            {errors.fullName && <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" /> {errors.fullName}</p>}
          </div>

          {/* Combined Messenger Phone Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex justify-between items-center">
              <span>Телефон (Viber / Telegram) <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-zinc-900/40 px-1.5 py-0.2 rounded-sm font-semibold">Для зв'язку</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                name="phoneMessenger"
                value={formData.phoneMessenger}
                onChange={handleChange}
                placeholder="Наприклад, +380 97 123 4567"
                className={`w-full px-3 py-2.5 pl-9 bg-slate-50 dark:bg-zinc-950 border ${errors.phoneMessenger ? "border-rose-400 focus:ring-rose-200 dark:focus:ring-zinc-900 bg-rose-50/10" : "border-slate-200 dark:border-zinc-800 focus:ring-blue-100 dark:focus:ring-zinc-800"} rounded-lg text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-4 transition`}
              />
              <Phone className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-3.5" />
            </div>
            {errors.phoneMessenger && <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" /> {errors.phoneMessenger}</p>}
          </div>

          {/* Backup Phone Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex justify-between items-center">
              <span>Резервний телефон</span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded-sm">Необов'язково</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                name="phoneBackup"
                value={formData.phoneBackup}
                onChange={handleChange}
                placeholder="Наприклад, +380 50 123 4567"
                className="w-full px-3 py-2.5 pl-9 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:ring-blue-100 dark:focus:ring-zinc-800 rounded-lg text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-4 transition"
              />
              <Phone className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-3.5" />
            </div>
          </div>
        </div>

        {/* Email Field (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">
            Електронна пошта (Email) <span className="text-slate-400 dark:text-zinc-500 font-normal text-[10px]">(необов'язково)</span>
          </label>
          <div className="relative">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
              className="w-full px-3 py-2 pl-9 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-4 focus:ring-blue-100 dark:focus:ring-zinc-800 transition"
            />
            <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-3" />
          </div>
        </div>
      </div>

      {/* STEP 2: CERAMICS GEOMETRY & BACKGROUND REQUIREMENTS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-zinc-300 text-xs font-bold flex items-center justify-center">2</span>
          <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-base flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-500" />
            Вибір заготовки (Форма та Розмір)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ceramic Shape Selection */}
          <div id="ceramicShape">
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2.5">
              Форма заготовки <span className="text-rose-500">*</span>
            </label>
            <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border ${errors.ceramicShape ? "border-rose-200 dark:border-rose-900/30 bg-rose-50/10" : "border-transparent"}`}>
              {SHAPE_OPTIONS.map((shapeOpt) => (
                <button
                  type="button"
                  key={shapeOpt.id}
                  onClick={() => {
                    setFormData((prev) => ({ 
                      ...prev, 
                      ceramicShape: shapeOpt.id, 
                      ceramicShapeCustom: "" 
                    }));
                    notifyParent({ ceramicShape: shapeOpt.id, ceramicShapeCustom: "" });
                    if (errors.ceramicShape) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy["ceramicShape"];
                        return copy;
                      });
                    }
                  }}
                  className={`p-3 border text-left rounded-xl transition cursor-pointer flex flex-col justify-between h-full ${formData.ceramicShape === shapeOpt.id ? "bg-blue-50/60 dark:bg-zinc-800/40 border-blue-500 text-blue-900 dark:text-zinc-300 shadow-xs font-semibold" : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900"}`}
                >
                  <span className="font-bold text-xs">{shapeOpt.name}</span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 leading-tight">{shapeOpt.description}</span>
                </button>
              ))}
            </div>
            {errors.ceramicShape && <p className="text-rose-500 text-[11px] mt-1.5 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" /> {errors.ceramicShape}</p>}

            {/* If shape is other, show customized text field */}
            {formData.ceramicShape === "other" && (
              <div className="mt-3 animate-fade-in" id="ceramicShapeCustom">
                <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-400 mb-1">
                  Вкажіть форму заготовки <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="ceramicShapeCustom"
                  value={formData.ceramicShapeCustom || ""}
                  onChange={handleChange}
                  placeholder="Наприклад: серце, кругла тощо"
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border ${errors.ceramicShapeCustom ? "border-rose-400 focus:ring-rose-200 dark:focus:ring-zinc-900 bg-rose-50/10" : "border-slate-200 dark:border-zinc-800 focus:ring-blue-100 dark:focus:ring-zinc-800"} rounded-lg text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-4 transition`}
                />
                {errors.ceramicShapeCustom && <p className="text-rose-500 text-[10px] mt-1 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" /> {errors.ceramicShapeCustom}</p>}
              </div>
            )}
          </div>

          {/* Size Selection */}
          <div id="ceramicSize">
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2.5">
              Розмір заготовки <span className="text-rose-500">*</span>
            </label>
            <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border ${errors.ceramicSize ? "border-rose-200 dark:border-rose-900/30 bg-rose-50/10" : "border-transparent"}`}>
              {standardSizes.map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, ceramicSize: size, ceramicSizeCustom: "" }));
                    notifyParent({ ceramicSize: size, ceramicSizeCustom: "" });
                    if (errors.ceramicSize) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy["ceramicSize"];
                        return copy;
                      });
                    }
                  }}
                  className={`py-2.5 px-3 border rounded-lg text-xs font-bold text-center transition cursor-pointer ${formData.ceramicSize === size ? "bg-blue-600 text-white border-blue-600 shadow-xs" : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-900"}`}
                >
                  {size}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, ceramicSize: "custom" }));
                  notifyParent({ ceramicSize: "custom" });
                  if (errors.ceramicSize) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy["ceramicSize"];
                      return copy;
                    });
                  }
                }}
                className={`py-2.5 px-3 border rounded-lg text-xs font-bold text-center transition cursor-pointer ${formData.ceramicSize === "custom" ? "bg-blue-600 text-white border-blue-600 shadow-xs" : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-900"}`}
              >
                Задати розмір...
              </button>
            </div>
            {errors.ceramicSize && <p className="text-rose-500 text-[11px] mt-1.5 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" /> {errors.ceramicSize}</p>}

            {/* If size is custom, show customized text field */}
            {formData.ceramicSize === "custom" && (
              <div className="mt-3 animate-fade-in" id="ceramicSizeCustom">
                <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-400 mb-1">
                  Задати розмір заготовки <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="ceramicSizeCustom"
                  value={formData.ceramicSizeCustom || ""}
                  onChange={handleChange}
                  placeholder="Вкажіть потрібний розмір, наприклад: 50х70 см"
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border ${errors.ceramicSizeCustom ? "border-rose-400 focus:ring-rose-200 dark:focus:ring-zinc-900 bg-rose-50/10" : "border-slate-200 dark:border-zinc-800 focus:ring-blue-100 dark:focus:ring-zinc-800"} rounded-lg text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-4 transition`}
                />
                {errors.ceramicSizeCustom && <p className="text-rose-500 text-[10px] mt-1 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" /> {errors.ceramicSizeCustom}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Text Field for Background Requirements */}
        <div className="pt-2" id="backgroundRequirements">
          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
            Вимоги щодо фону портрета <span className="text-rose-500">*</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" title="Опишіть, яким має бути фон готового портрета" />
          </label>
          <textarea
            name="backgroundRequirements"
            rows={3}
            value={formData.backgroundRequirements}
            onChange={handleChange}
            placeholder="Опишіть детально ваші вимоги щодо фону. Наприклад: 'хочу однотонний світло-сірий фон з плавним градієнтом', 'голубе небо та легкі білі хмаринки', 'темний художній фон', 'залишити оригінальний фон, лише прибрати зайві деталі' тощо..."
            className={`w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border ${errors.backgroundRequirements ? "border-rose-400 focus:ring-rose-200 dark:focus:ring-zinc-900 bg-rose-50/10" : "border-slate-200 dark:border-zinc-800 focus:ring-blue-100 dark:focus:ring-zinc-800"} rounded-lg text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-4 transition resize-y`}
          />
          {errors.backgroundRequirements && <p className="text-rose-500 text-[11px] mt-1 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" /> {errors.backgroundRequirements}</p>}
        </div>
      </div>

      {/* STEP 3: FILE ATTACHMENT */}
      <div className="space-y-4" id="photoFile">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-zinc-300 text-xs font-bold flex items-center justify-center">3</span>
          <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-base flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-slate-500" />
            Завантаження фотографії
          </h3>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
            Фотографія клієнта для ретушування <span className="text-rose-500">*</span>
          </label>
          <input
            type="file"
            ref={photoInputRef}
            onChange={(e) => e.target.files && handlePhotoUpload(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          
          {formData.photoFile ? (
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 bg-slate-50 dark:bg-zinc-950/50 flex items-center gap-4 relative animate-fade-in">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
                <img
                  src={`data:${formData.photoFile.type};base64,${formData.photoFile.base64}`}
                  alt="Портрет"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="overflow-hidden grow">
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 truncate">{formData.photoFile.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{(formData.photoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full font-bold mt-1.5 border border-emerald-100 dark:border-emerald-900/40">
                  Успішно прикріплено
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, photoFile: null }));
                  notifyParent({ photoFile: null });
                }}
                className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                title="Видалити фото"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${dragActivePhoto ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20" : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/30 dark:bg-zinc-900/10"}`}
              onClick={() => photoInputRef.current?.click()}
            >
              <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-slate-500 dark:text-zinc-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Перетягніть файл сюди або натисніть для вибору</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Формати JPG, JPEG, PNG. До 15 МБ.</p>
              </div>
            </div>
          )}
          {errors.photoFile && <p className="text-rose-500 text-[11px] mt-1.5 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3" /> {errors.photoFile}</p>}
        </div>
      </div>

      {/* STEP 4: RETOUCH REQUIREMENTS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-zinc-300 text-xs font-bold flex items-center justify-center">4</span>
          <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-base flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-500" />
            Вимоги до ретушування фото <span className="text-slate-400 dark:text-zinc-500 font-normal text-[10px]">(необов'язково)</span>
          </h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 flex items-center gap-1">
            Опис побажань щодо обробки обличчя та одягу
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" title="Наприклад: одягнути у костюм, поправити зачіску, прибрати дефекти шкіри, зробити обличчя чіткішим" />
          </label>
          <textarea
            name="retouchRequirements"
            rows={3}
            value={formData.retouchRequirements}
            onChange={handleChange}
            placeholder="Вкажіть побажання: наприклад, заміна одягу на костюм або вишиванку, виправлення дефектів, ретушування обличчя, освітлення, додавання золотого обідка, напис з ПІБ та датами тощо..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-4 focus:ring-blue-100 dark:focus:ring-zinc-800 transition resize-y"
          />
        </div>
      </div>

      {/* Form Submit Footer */}
      <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="text-[11px] text-slate-400 dark:text-zinc-500 text-center sm:text-left leading-relaxed max-w-md">
          Натискаючи кнопку "Надіслати замовлення", ви підтверджуєте згоду на зв'язок за вказаним номером телефону у месенджерах Viber чи Telegram.
        </span>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 ${isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Надсилання...</span>
            </>
          ) : (
            <>
              <span>Надіслати замовлення</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
