import React, { useState, useEffect } from "react";
import { 
  Briefcase, CheckSquare, Clock, XSquare, MessageSquare, Download,
  Phone, Mail, Calendar, Settings, Database, RefreshCw, Trash2, ArrowLeft, ExternalLink, HelpCircle,
  Image as ImageIcon
} from "lucide-react";
import { Order, STATUS_TRANSLATIONS } from "../types";

export const AdminPanel: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Integration status state
  const [configStatus, setConfigStatus] = useState({
    email: { configured: false, userSet: false, passSet: false, receiverSet: false },
    telegram: { configured: false, tokenSet: false, chatIdSet: false }
  });

  // Fetch orders and integration status
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const pin = localStorage.getItem("manager_pin") || "";
      const [ordersRes, configRes] = await Promise.all([
        fetch("/api/orders", {
          headers: { "X-Admin-Pin": pin }
        }),
        fetch("/api/config-status", {
          headers: { "X-Admin-Pin": pin }
        })
      ]);

      if (ordersRes.status === 401 || configRes.status === 401) {
        localStorage.removeItem("manager_pin");
        throw new Error("Неавторизований доступ. Неправильний PIN-код або термін дії сесії закінчився.");
      }

      if (!ordersRes.ok || !configRes.ok) {
        throw new Error("Не вдалося завантажити дані з сервера");
      }

      const ordersData = await ordersRes.json();
      const configData = await configRes.json();

      setOrders(ordersData);
      setConfigStatus({
        email: configData.email || { configured: false, userSet: false, passSet: false, receiverSet: false },
        telegram: configData.telegram || { configured: false, tokenSet: false, chatIdSet: false }
      });
    } catch (err: any) {
      setError(err.message || "Помилка зв'язку з сервером");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle status update
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const pin = localStorage.getItem("manager_pin") || "";
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Pin": pin
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.status === 401) {
        localStorage.removeItem("manager_pin");
        throw new Error("Сесія закінчилась. Будь ласка, увійдіть знову.");
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Не вдалося оновити статус");
      }

      const result = await res.json();
      if (result.success) {
        // Update local orders list
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: result.order.status } : o))
        );
        // Update selected order view if currently viewing
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: result.order.status as any });
        }
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Ви впевнені, що хочете видалити це замовлення?")) return;
    
    try {
      const pin = localStorage.getItem("manager_pin") || "";
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Pin": pin
        }
      });

      if (res.status === 401) {
        localStorage.removeItem("manager_pin");
        throw new Error("Сесія закінчилась. Будь ласка, увійдіть знову.");
      }

      if (!res.ok) throw new Error("Не вдалося видалити замовлення");

      const result = await res.json();
      if (result.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "all") return true;
    return o.status === statusFilter;
  });

  // Calculate quick statistics
  const totalCount = orders.length;
  const newCount = orders.filter((o) => o.status === "new").length;
  const processingCount = orders.filter((o) => o.status === "processing").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  // Helper to trigger direct local download of uploaded images
  const handleDownloadImage = (fileBase64: string, fileName: string, fileMime: string) => {
    const link = document.createElement("a");
    link.href = `data:${fileMime};base64,${fileBase64}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get raw digits for links
  const getRawPhone = (phone: string) => {
    return phone.replace(/\D/g, "");
  };

  return (
    <div className="space-y-6" id="admin-workspace">
      {/* Error block for unauthorized/connection issues */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Помилка:</span>
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchData} 
            className="px-3 py-1 bg-rose-100 dark:bg-rose-900 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 font-bold rounded-lg transition cursor-pointer"
          >
            Спробувати знову
          </button>
        </div>
      )}

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Усі замовлення</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-800 dark:text-zinc-100">{totalCount}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">всього</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Нові</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{newCount}</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">В роботі</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-500 dark:text-amber-400">{processingCount}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">активні</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Виконано</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-500 dark:text-emerald-400">{completedCount}</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">архів</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ORDERS LIST COLUMN */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-950/40">
            <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              Список замовлень
            </h3>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg transition disabled:opacity-50 cursor-pointer"
              title="Оновити список"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="p-2 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/20 dark:bg-zinc-950/20 flex gap-1 overflow-x-auto">
            {[
              { id: "all", label: "Усі" },
              { id: "new", label: "Нові" },
              { id: "processing", label: "В роботі" },
              { id: "completed", label: "Виконано" },
              { id: "cancelled", label: "Скасовані" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition cursor-pointer ${statusFilter === tab.id ? "bg-slate-800 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Orders Scroll Container */}
          <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
            {isLoading && orders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-zinc-500 text-xs">Завантаження замовлень...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-zinc-500 text-xs">Замовлень не знайдено</div>
            ) : (
              filteredOrders.map((order) => {
                const trans = STATUS_TRANSLATIONS[order.status] || { label: order.status, color: "text-slate-700", bg: "bg-slate-50" };
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedOrder(null);
                      } else {
                        setSelectedOrder(order);
                      }
                    }}
                    className={`p-4 text-left transition cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 ${isSelected ? "bg-blue-50/40 dark:bg-zinc-950/20 border-l-4 border-blue-500" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">{order.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${trans.bg} ${trans.color} font-bold`}>
                        {trans.label}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 mt-1.5">
                      {order.fullName}
                    </p>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleDateString("uk-UA")}
                      </span>
                      <span>
                        {order.ceramicShape === "other" 
                          ? "Інша форма" 
                          : order.ceramicShape === "oval" 
                            ? "Овал" 
                            : order.ceramicShape === "rectangle" 
                              ? "Прямокутник" 
                              : order.ceramicShape === "arch" 
                                ? "Арка" 
                                : order.ceramicShape}
                        {order.ceramicBevel && ` (${order.ceramicBevel === "with_bevel" ? "з фаскою" : "без фаски"})`} • {order.ceramicSize === "custom" && order.ceramicSizeCustom ? order.ceramicSizeCustom : order.ceramicSize}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ORDER DETAIL WORKSPACE */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
          {selectedOrder ? (
            <div className="p-6 space-y-6 animate-fade-in" id="order-details">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-zinc-500">ДЕТАЛІ ЗАМОВЛЕННЯ</span>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{selectedOrder.id}</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Створено: {new Date(selectedOrder.createdAt).toLocaleString("uk-UA")}
                  </p>
                </div>

                {/* Status action toggle dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Статус:</span>
                  <select
                    value={selectedOrder.status}
                    disabled={isUpdating}
                    onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                    className="text-xs font-bold border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 outline-hidden cursor-pointer"
                  >
                    <option value="new">Нове</option>
                    <option value="processing">В роботі</option>
                    <option value="completed">Виконано</option>
                    <option value="cancelled">Скасовано</option>
                  </select>
                </div>
              </div>

              {/* Client Info segment */}
              <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-4 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">👤 Дані Замовника</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 dark:text-zinc-500 block">ПІБ Клієнта:</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {selectedOrder.fullName}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 dark:text-zinc-500 block">Електронна пошта:</span>
                    {selectedOrder.email ? (
                      <a href={`mailto:${selectedOrder.email}`} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1">
                        {selectedOrder.email} <Mail className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-500">не вказано</span>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/50 dark:border-zinc-800/50 space-y-2">
                  <span className="text-xs text-slate-400 dark:text-zinc-500 block font-semibold">
                    📞 Контакт для зв'язку в месенджерах:
                  </span>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 border border-slate-100 dark:border-zinc-800 rounded-lg">
                    <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-blue-600" />
                      {selectedOrder.phoneMessenger}
                    </span>
                    
                    {/* One-click chat action triggers */}
                    <div className="flex gap-2">
                      <a
                        href={`viber://chat?number=${getRawPhone(selectedOrder.phoneMessenger)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold text-xs rounded-lg transition flex items-center gap-1"
                        title="Відкрити чат у Viber"
                      >
                        <span className="font-bold">Viber</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={`https://t.me/${getRawPhone(selectedOrder.phoneMessenger).startsWith("38") ? "+" + getRawPhone(selectedOrder.phoneMessenger) : getRawPhone(selectedOrder.phoneMessenger)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-400 font-bold text-xs rounded-lg transition flex items-center gap-1"
                        title="Відкрити чат у Telegram"
                      >
                        <span className="font-bold">Telegram</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {selectedOrder.phoneBackup && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 border border-slate-100 dark:border-zinc-800 rounded-lg">
                      <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-500" />
                        {selectedOrder.phoneBackup} <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">(резервний)</span>
                      </span>
                      
                      {/* One-click chat action triggers for backup phone */}
                      <div className="flex gap-2">
                        <a
                          href={`viber://chat?number=${getRawPhone(selectedOrder.phoneBackup)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold text-xs rounded-lg transition flex items-center gap-1"
                          title="Відкрити чат у Viber"
                        >
                          <span className="font-bold">Viber</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                          href={`https://t.me/${getRawPhone(selectedOrder.phoneBackup).startsWith("38") ? "+" + getRawPhone(selectedOrder.phoneBackup) : getRawPhone(selectedOrder.phoneBackup)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-400 font-bold text-xs rounded-lg transition flex items-center gap-1"
                          title="Відкрити чат у Telegram"
                        >
                          <span className="font-bold">Telegram</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Product details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 dark:text-zinc-500 block">Форма заготовки:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    {selectedOrder.ceramicShape === "other" 
                      ? "Інша форма" 
                      : selectedOrder.ceramicShape === "oval" 
                        ? "Овал" 
                        : selectedOrder.ceramicShape === "rectangle" 
                          ? "Прямокутник" 
                          : selectedOrder.ceramicShape === "arch" 
                            ? "Арка" 
                            : selectedOrder.ceramicShape}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 dark:text-zinc-500 block">Тип заготовки (фаска):</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    {selectedOrder.ceramicBevel === "with_bevel" 
                      ? "З фаскою (скруглена)" 
                      : selectedOrder.ceramicBevel === "no_bevel" 
                        ? "Без фаски (пряма)" 
                        : "Не вказано"}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 dark:text-zinc-500 block">Розмір заготовки:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200 capitalize">
                    {selectedOrder.ceramicSize === "custom" && selectedOrder.ceramicSizeCustom 
                      ? `Індивідуальний: "${selectedOrder.ceramicSizeCustom}"` 
                      : selectedOrder.ceramicSize}
                  </span>
                </div>
              </div>

              {/* Background requirements description text */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 dark:text-zinc-500 block font-bold">🎨 Вимоги щодо фону портрета:</span>
                <div className="p-3.5 bg-blue-50/30 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/30 rounded-lg text-sm text-slate-700 dark:text-zinc-300 font-semibold whitespace-pre-line leading-relaxed">
                  {selectedOrder.backgroundRequirements}
                </div>
              </div>

              {/* Retouch Requirements text box */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 dark:text-zinc-500 block font-bold">📝 Вимоги до ретушування обличчя та одягу:</span>
                <div className="p-3.5 bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 rounded-lg text-sm text-slate-700 dark:text-zinc-300 font-medium italic whitespace-pre-line leading-relaxed">
                  {selectedOrder.retouchRequirements || "Особливих вимог до ретушування не вказано. Обробка за розсудом дизайнера."}
                </div>
              </div>

              {/* UPLOADED PHOTO FOR DESIGNER */}
              <div className="space-y-4 border-t border-slate-100 dark:border-zinc-800 pt-4">
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">📸 Завантажене Фото для ретушування</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Portrait photo preview & download */}
                  <div className="border border-slate-100 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-950/50 flex flex-col justify-between gap-3">
                    <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">Головний портрет клієнта:</span>
                    <div className="aspect-[3/4] max-w-[150px] rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mx-auto relative group shadow-xs">
                      <img
                        src={`data:${selectedOrder.photoFile.type};base64,${selectedOrder.photoFile.base64}`}
                        alt="Portrait file"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <button
                      onClick={() => handleDownloadImage(selectedOrder.photoFile.base64, selectedOrder.photoFile.name, selectedOrder.photoFile.type)}
                      className="w-full py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Завантажити файл ({selectedOrder.photoFile.name.split(".").pop()?.toUpperCase()})</span>
                    </button>
                  </div>

                  <div className="border border-slate-100 dark:border-zinc-800 rounded-xl p-5 bg-slate-50/30 dark:bg-zinc-950/20 flex flex-col items-center justify-center text-center gap-2">
                    <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Оригінальне photo успішно завантажено</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                        Для ретушування та заміни фону скористайтесь графічним редактором, завантаживши вихідний файл ліворуч.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger zone delete button */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Видалити це замовлення</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 dark:text-zinc-500 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-zinc-950/40 flex items-center justify-center text-slate-400 dark:text-zinc-500 border border-slate-100 dark:border-zinc-800">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600 dark:text-zinc-300">Замовлення не обрано</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Виберіть замовлення зі списку ліворуч, щоб переглянути деталі.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SYSTEM SETUP STATUS SECTION */}
      <div className="bg-zinc-900 dark:bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <Settings className="w-5 h-5 text-blue-400" />
          <div>
            <h4 className="text-base font-bold text-white">Статус каналів сповіщень</h4>
            <p className="text-xs text-zinc-400 mt-0.5">Інформація щодо автоматичного дублювання замовлень на Email та Telegram</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Status Channel */}
          <div className="bg-zinc-950/60 dark:bg-zinc-900/40 p-5 rounded-xl border border-zinc-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-400 flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  Email SMTP Канал
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${configStatus.email.configured ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                  {configStatus.email.configured ? "АКТИВНО" : "НЕ НАЛАШТОВАНО"}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Коли SMTP канал налаштований, кожне нове замовлення буде дублюватися на пошту дизайнера з текстовим звітом, контактами Viber/Telegram та прикріпленим вихідним файлом зображення у вигляді вкладення.
              </p>
            </div>

            <div className="space-y-1.5 text-xs grid grid-cols-1 gap-1.5 pt-4 border-t border-zinc-800/60">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${configStatus.email.userSet ? "bg-emerald-400" : "bg-zinc-700"}`} />
                <span className="text-zinc-300 font-medium">EMAIL_USER (відправник)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${configStatus.email.passSet ? "bg-emerald-400" : "bg-zinc-700"}`} />
                <span className="text-zinc-300 font-medium">EMAIL_PASS (пароль SMTP)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${configStatus.email.receiverSet ? "bg-emerald-400" : "bg-zinc-700"}`} />
                <span className="text-zinc-300 font-medium">EMAIL_RECEIVER (скринька дизайнера)</span>
              </div>
            </div>
          </div>

          {/* Telegram Status Channel */}
          <div className="bg-zinc-950/60 dark:bg-zinc-900/40 p-5 rounded-xl border border-zinc-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  Telegram Bot Канал
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${configStatus.telegram.configured ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                  {configStatus.telegram.configured ? "АКТИВНО" : "НЕ НАЛАШТОВАНО"}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Коли Telegram сповіщення налаштовані, бот автоматично надсилатиме миттєві картки нових замовлень з повними даними клієнта та вихідним фото прямо у ваш робочий чат або групу.
              </p>
            </div>

            <div className="space-y-1.5 text-xs grid grid-cols-1 gap-1.5 pt-4 border-t border-zinc-800/60">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${configStatus.telegram.tokenSet ? "bg-emerald-400" : "bg-zinc-700"}`} />
                <span className="text-zinc-300 font-medium">TELEGRAM_BOT_TOKEN</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${configStatus.telegram.chatIdSet ? "bg-emerald-400" : "bg-zinc-700"}`} />
                <span className="text-zinc-300 font-medium">TELEGRAM_CHAT_ID</span>
              </div>
            </div>
          </div>
        </div>

        {/* Integration step by step instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="p-5 bg-zinc-950 dark:bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-3">
            <span className="font-bold text-white flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              Як підключити розсилку на Пошту (SMTP)?
            </span>
            <p className="leading-relaxed">
              Додайте наступні змінні середовища (secrets) в налаштуваннях проекту в панелі Google AI Studio (меню <strong>Settings → Secrets</strong>):
            </p>
            <div className="bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg font-mono text-[10px] text-zinc-400 leading-relaxed space-y-1">
              <p># Змінні SMTP-пошти для розсилки</p>
              <p className="text-white">EMAIL_USER="photoceramic@ukr.net"</p>
              <p className="text-white">EMAIL_PASS="..."</p>
              <p className="text-white">EMAIL_RECEIVER="taras.yavorskyy@i.ua"</p>
            </div>
          </div>

          <div className="p-5 bg-zinc-950 dark:bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-3">
            <span className="font-bold text-white flex items-center gap-1">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              Як підключити Telegram сповіщення?
            </span>
            <p className="leading-relaxed">
              Створіть бота через <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">@BotFather</a> та додайте змінні середовища (secrets) в налаштуваннях проекту в панелі Google AI Studio:
            </p>
            <div className="bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg font-mono text-[10px] text-zinc-400 leading-relaxed space-y-1">
              <p># Токен та ID чату Telegram</p>
              <p className="text-white">TELEGRAM_BOT_TOKEN="8954707770:AAFf..."</p>
              <p className="text-white">TELEGRAM_CHAT_ID="7650687799"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
