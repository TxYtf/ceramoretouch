import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { eq, desc } from "drizzle-orm";
import { db } from "./src/db/index";
import { orders as ordersTable } from "./src/db/schema";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON body limits to support base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Normalize request URLs for Vercel Serverless Function rewrites
app.use((req, res, next) => {
  // If Vercel rewrites /api/... to /api/index, handle x-forwarded-uri or req.url
  const forwardedUri = req.headers["x-forwarded-uri"] as string;
  if (forwardedUri && forwardedUri.startsWith("/api")) {
    req.url = forwardedUri;
  } else if (req.url.startsWith("/api/index")) {
    req.url = req.url.replace(/^\/api\/index/, "/api");
    if (req.url === "") req.url = "/api";
  }
  next();
});

const ORDERS_FILE = process.env.VERCEL === "1"
  ? path.join("/tmp", "orders.json")
  : path.join(process.cwd(), "orders.json");

// Helper to read orders
function readOrders(): any[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Помилка читання файлу orders.json:", error);
  }
  return [];
}

// Helper to write orders
function writeOrders(orders: any[]) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
  } catch (error) {
    console.error("Помилка запису файлу orders.json:", error);
  }
}

// Helper to safely get cleaned MANAGER_PIN
function getManagerPin(): string {
  const rawPin = process.env.MANAGER_PIN;
  const isEnvSet = Boolean(rawPin);
  const pin = rawPin || "1234";
  const cleaned = pin.replace(/^['"]|['"]$/g, "").trim();
  return cleaned;
}

// Middleware to authorize manager requests using custom header X-Admin-Pin
function checkManagerAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const headerPin = req.headers["x-admin-pin"];
  const correctPin = getManagerPin();
  const inputPin = typeof headerPin === "string" ? headerPin.trim().replace(/^['"]|['"]$/g, "") : "";
  
  if (!headerPin || inputPin !== correctPin) {
    console.warn(`[AUTH FAIL] checkManagerAuth path=${req.path}: env.MANAGER_PIN_exists=${Boolean(process.env.MANAGER_PIN)}, expected_length=${correctPin.length}, received_length=${inputPin.length}`);
    return res.status(401).json({ error: "Неавторизований доступ. Неправильний PIN-код або термін дії сесії закінчився." });
  }
  next();
}

// API endpoint to verify manager PIN code
app.post("/api/admin/verify-pin", (req, res) => {
  const { pin } = req.body;
  const rawEnvPin = process.env.MANAGER_PIN;
  const correctPin = getManagerPin();
  const inputPin = typeof pin === "string" ? pin.trim().replace(/^['"]|['"]$/g, "") : "";

  console.log(`[VERIFY PIN] Attempt:`, {
    isEnvVarDefined: Boolean(rawEnvPin),
    expectedPinLength: correctPin.length,
    inputPinType: typeof pin,
    inputPinLength: inputPin.length,
    matchSuccess: inputPin === correctPin,
  });

  if (pin && inputPin === correctPin) {
    return res.json({ success: true });
  }
  
  return res.status(401).json({ 
    error: "Неправильний PIN-код",
    debug: {
      isEnvVarDefined: Boolean(rawEnvPin),
      expectedLength: correctPin.length,
      receivedLength: inputPin.length
    }
  });
});

// Database Query Layer Helpers
async function getAllOrdersDb() {
  if (process.env.SQL_HOST && process.env.SQL_USER) {
    try {
      return await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    } catch (error) {
      console.error("Database query (getAllOrders) failed, falling back to local storage:", error);
    }
  }
  return readOrders();
}

async function insertOrderDb(order: any) {
  // Always save in file storage backup
  const currentOrders = readOrders();
  const existingIdx = currentOrders.findIndex((o) => o.id === order.id);
  if (existingIdx >= 0) {
    currentOrders[existingIdx] = order;
  } else {
    currentOrders.unshift(order);
  }
  writeOrders(currentOrders);

  if (process.env.SQL_HOST && process.env.SQL_USER) {
    try {
      await db.insert(ordersTable).values({
        id: order.id,
        createdAt: new Date(order.createdAt),
        status: order.status,
        fullName: order.fullName,
        phoneMessenger: order.phoneMessenger,
        phoneBackup: order.phoneBackup || null,
        email: order.email || null,
        retouchRequirements: order.retouchRequirements || null,
        ceramicShape: order.ceramicShape,
        ceramicShapeCustom: order.ceramicShapeCustom || null,
        ceramicBevel: order.ceramicBevel || null,
        ceramicSize: order.ceramicSize,
        ceramicSizeCustom: order.ceramicSizeCustom || null,
        backgroundRequirements: order.backgroundRequirements,
        photoFile: order.photoFile,
      });
    } catch (error) {
      console.error("Database insert failed, order saved in local fallback:", error);
    }
  }
}

async function updateOrderStatusDb(id: string, status: string) {
  const currentOrders = readOrders();
  const order = currentOrders.find((o) => o.id === id);
  if (order) {
    order.status = status;
    writeOrders(currentOrders);
  }

  if (process.env.SQL_HOST && process.env.SQL_USER) {
    try {
      const updated = await db
        .update(ordersTable)
        .set({ status })
        .where(eq(ordersTable.id, id))
        .returning();
      if (updated.length > 0) return updated[0];
    } catch (error) {
      console.error("Database update failed, local order status updated:", error);
    }
  }

  return order || { id, status };
}

async function deleteOrderDb(id: string) {
  let currentOrders = readOrders();
  const initialLength = currentOrders.length;
  currentOrders = currentOrders.filter((o) => o.id !== id);
  writeOrders(currentOrders);

  if (process.env.SQL_HOST && process.env.SQL_USER) {
    try {
      await db.delete(ordersTable).where(eq(ordersTable.id, id));
    } catch (error) {
      console.error("Database delete failed, deleted locally:", error);
    }
  }

  return currentOrders.length < initialLength;
}

// Function to seed existing local orders on container boot to avoid data loss
async function seedLocalOrdersToDb() {
  try {
    const localOrders = readOrders();
    if (localOrders.length === 0) return;
    
    console.log(`Checking if ${localOrders.length} local orders need seeding to Cloud SQL...`);
    for (const order of localOrders) {
      const existing = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).limit(1);
      if (existing.length === 0) {
        console.log(`Seeding order ${order.id} to PostgreSQL...`);
        await insertOrderDb(order);
      }
    }
    console.log("Seeding check completed successfully!");
  } catch (error) {
    console.error("Помилка міграції локальних замовлень до бази даних:", error);
  }
}

// 1. Get all orders (Authorized only)
app.get("/api/orders", checkManagerAuth, async (req, res) => {
  try {
    const sortedOrders = await getAllOrdersDb();
    res.json(sortedOrders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Submit new order (Public - no authorization needed)
app.post("/api/orders", async (req, res) => {
  try {
    const orderData = req.body;

    // Validate required fields
    if (!orderData.fullName || !orderData.phoneMessenger || !orderData.photoFile) {
      return res.status(400).json({ error: "ПІБ замовника, телефон для зв'язку та фотографія є обов'язковими для заповнення" });
    }

    if (!orderData.ceramicShape) {
      return res.status(400).json({ error: "Будь ласка, оберіть форму заготовки" });
    }

    if (orderData.ceramicShape === "other" && !orderData.ceramicShapeCustom?.trim()) {
      return res.status(400).json({ error: "Будь ласка, вкажіть вашу форму заготовки" });
    }

    if (!orderData.ceramicSize) {
      return res.status(400).json({ error: "Будь ласка, оберіть розмір заготовки" });
    }

    if (orderData.ceramicSize === "custom" && !orderData.ceramicSizeCustom?.trim()) {
      return res.status(400).json({ error: "Будь ласка, вкажіть бажаний розмір" });
    }

    if (!orderData.backgroundRequirements) {
      return res.status(400).json({ error: "Вимоги щодо фону портрета є обов'язковими" });
    }

    const newOrder = {
      id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
      status: "new", // 'new' | 'processing' | 'completed' | 'cancelled'
      ...orderData,
    };

    // Save to PostgreSQL database
    await insertOrderDb(newOrder);

    // Prepare notifications in background (non-blocking)
    const emailResult = await sendEmailNotification(newOrder);
    const telegramResult = await sendTelegramNotification(newOrder);

    res.status(201).json({
      success: true,
      order: {
        id: newOrder.id,
        status: newOrder.status,
        createdAt: newOrder.createdAt,
      },
      notifications: {
        email: emailResult,
        telegram: telegramResult,
      }
    });
  } catch (err: any) {
    console.error("Помилка обробки замовлення:", err);
    res.status(500).json({ error: "Внутрішня помилка сервера при збереженні замовлення: " + err.message });
  }
});

// 3. Update order status (Authorized only)
app.patch("/api/orders/:id", checkManagerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["new", "processing", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Некоректний статус замовлення" });
    }

    const updatedOrder = await updateOrderStatusDb(id, status);
    if (!updatedOrder) {
      return res.status(404).json({ error: "Замовлення не знайдено" });
    }

    res.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete order (Authorized only)
app.delete("/api/orders/:id", checkManagerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteOrderDb(id);
    if (!success) {
      return res.status(404).json({ error: "Замовлення не знайдено" });
    }
    res.json({ success: true, message: "Замовлення успішно видалено" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Check email & Telegram configuration status (Authorized only)
app.get("/api/config-status", checkManagerAuth, (req, res) => {
  res.json({
    email: {
      configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_RECEIVER),
      userSet: !!process.env.EMAIL_USER,
      passSet: !!process.env.EMAIL_PASS,
      receiverSet: !!process.env.EMAIL_RECEIVER,
    },
    telegram: {
      configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      tokenSet: !!process.env.TELEGRAM_BOT_TOKEN,
      chatIdSet: !!process.env.TELEGRAM_CHAT_ID,
    }
  });
});

// Nodemailer Email Notification Handler
async function sendEmailNotification(order: any): Promise<{ sent: boolean; message?: string }> {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const receiver = process.env.EMAIL_RECEIVER;

  if (!user || !pass || !receiver) {
    console.warn("Email сповіщення не надіслано: EMAIL_USER, EMAIL_PASS або EMAIL_RECEIVER не налаштовані в .env");
    return { sent: false, message: "Не налаштовані змінні середовища" };
  }

  try {
    const formattedDate = new Date(order.createdAt).toLocaleString("uk-UA");

    const shapeTranslate: Record<string, string> = {
      oval: "Овал",
      rectangle: "Прямокутник",
      arch: "Арка",
      other: "Інша форма"
    };

    const displayShape = shapeTranslate[order.ceramicShape] || order.ceramicShape;

    const bevelTranslate: Record<string, string> = {
      with_bevel: "З фаскою (скруглені кути)",
      no_bevel: "Без фаски (прямокутні кути)"
    };
    const displayBevel = bevelTranslate[order.ceramicBevel] || order.ceramicBevel || "Не вказано";

    const displaySize = order.ceramicSize === "custom" && order.ceramicSizeCustom
      ? `Індивідуальний розмір ("${order.ceramicSizeCustom}")`
      : order.ceramicSize;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true", // true for 465, false for 587
      auth: { user, pass },
    });

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-top: 0;">✨ НОВЕ ЗАМОВЛЕННЯ № ${order.id}</h2>
        <p style="color: #64748b; font-size: 14px;"><strong>Дата замовлення:</strong> ${formattedDate}</p>
        
        <h3 style="color: #1e293b; margin-top: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">👤 Інформація про замовника</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>ПІБ Клієнта:</strong></td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${order.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;"><strong>Viber / Telegram:</strong></td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${order.phoneMessenger}</td>
          </tr>
          ${order.phoneBackup ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b;"><strong>Резервний телефон:</strong></td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${order.phoneBackup}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 6px 0; color: #64748b;"><strong>Email замовника:</strong></td>
            <td style="padding: 6px 0; color: #0f172a;">${order.email || "не вказано"}</td>
          </tr>
        </table>

        <h3 style="color: #1e293b; margin-top: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">📐 Характеристики фотокераміки</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Форма заготовки:</strong></td>
            <td style="padding: 6px 0; color: #0f172a;"><strong>${displayShape}</strong></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Тип заготовки:</strong></td>
            <td style="padding: 6px 0; color: #0f172a;"><strong>${displayBevel}</strong></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;"><strong>Розмір заготовки:</strong></td>
            <td style="padding: 6px 0; color: #0f172a;"><strong>${displaySize}</strong></td>
          </tr>
        </table>

        <h3 style="color: #1e293b; margin-top: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">🎨 Вимоги щодо фону портрета</h3>
        <div style="background-color: #eff6ff; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6; font-size: 14px; line-height: 1.5; color: #1e3a8a; font-weight: bold;">
          ${order.backgroundRequirements.replace(/\n/g, "<br>")}
        </div>

        <h3 style="color: #1e293b; margin-top: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">📝 Вимоги до ретушування обличчя та одягу</h3>
        <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #64748b; font-size: 14px; line-height: 1.5; color: #334155; font-style: italic;">
          ${order.retouchRequirements ? order.retouchRequirements.replace(/\n/g, "<br>") : "Вимоги до ретушування обличчя та одягу відсутні."}
        </div>

        <p style="margin-top: 24px; font-size: 13px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
          Це автоматичне повідомлення від системи замовлень фотокераміки КерамоРетуш. Оригінал фото клієнта прикріплено до цього листа.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"КерамоРетуш Портал" <${user}>`,
      to: receiver,
      subject: `✨ Нове замовлення №${order.id} - ${order.fullName}`,
      html: emailHtml,
      attachments: [
        {
          filename: order.photoFile.name,
          content: Buffer.from(order.photoFile.base64, "base64"),
          contentType: order.photoFile.type,
        }
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email сповіщення для замовлення ${order.id} успішно надіслано!`);
    return { sent: true };
  } catch (error: any) {
    console.error(`Помилка відправки Email для замовлення ${order.id}:`, error);
    return { sent: false, message: error.message };
  }
}

// Helper to escape HTML characters for secure Telegram HTML formatting
function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Telegram Bot API Notification Handler
async function sendTelegramNotification(order: any): Promise<{ sent: boolean; message?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram сповіщення не надіслано: TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID не налаштовані в .env");
    return { sent: false, message: "Не налаштовані змінні середовища" };
  }

  try {
    const formattedDate = new Date(order.createdAt).toLocaleString("uk-UA");

    const shapeTranslate: Record<string, string> = {
      oval: "Овал",
      rectangle: "Прямокутник",
      arch: "Арка",
      other: "Інша форма"
    };

    const displayShape = shapeTranslate[order.ceramicShape] || order.ceramicShape;

    const tBevelTranslate: Record<string, string> = {
      with_bevel: "З фаскою (скруглені кути)",
      no_bevel: "Без фаски (прямокутні кути)"
    };
    const tDisplayBevel = tBevelTranslate[order.ceramicBevel] || order.ceramicBevel || "Не вказано";

    const displaySize = order.ceramicSize === "custom" && order.ceramicSizeCustom
      ? `Індивідуальний розмір ("${order.ceramicSizeCustom}")`
      : order.ceramicSize;

    const safeId = escapeHtml(order.id);
    const safeName = escapeHtml(order.fullName);
    const safePhone = escapeHtml(order.phoneMessenger);
    const safePhoneBackup = escapeHtml(order.phoneBackup || "");
    const safeEmail = escapeHtml(order.email || "не вказано");
    const safeShape = escapeHtml(displayShape);
    const safeBevel = escapeHtml(tDisplayBevel);
    const safeSize = escapeHtml(displaySize);
    const safeBg = escapeHtml(order.backgroundRequirements || "немає");
    const safeRetouch = escapeHtml(order.retouchRequirements || "відсутні");

    const htmlText = `✨ <b>НОВЕ ЗАМОВЛЕННЯ № ${safeId}</b>\n\n` +
      `👤 <b>Клієнт:</b> ${safeName}\n` +
      `📞 <b>Телефон (Viber / Telegram):</b> ${safePhone}\n` +
      (safePhoneBackup ? `📞 <b>Резервний телефон:</b> ${safePhoneBackup}\n` : "") +
      `📧 <b>Email:</b> ${safeEmail}\n\n` +
      `📐 <b>Параметри фотокераміки:</b>\n` +
      `• Форма: <b>${safeShape}</b>\n` +
      `• Тип заготовки: <b>${safeBevel}</b>\n` +
      `• Розмір: <b>${safeSize}</b>\n\n` +
      `🎨 <b>Вимоги до фону портрета:</b>\n<i>${safeBg}</i>\n\n` +
      `📝 <b>Вимоги до ретушування:</b>\n<i>${safeRetouch}</i>\n\n` +
      `📅 <b>Дата:</b> ${escapeHtml(formattedDate)}`;

    // Send text notification
    const messageUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const msgResponse = await fetch(messageUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: "HTML",
      }),
    });

    if (!msgResponse.ok) {
      const errText = await msgResponse.text();
      throw new Error(`Telegram API Error: ${errText}`);
    }

    // Attempt to send photo as well if base64 is present
    if (order.photoFile && order.photoFile.base64) {
      try {
        const photoUrl = `https://api.telegram.org/bot${token}/sendPhoto`;
        const buffer = Buffer.from(order.photoFile.base64, "base64");
        
        const formData = new FormData();
        formData.append("chat_id", chatId);
        
        const blob = new Blob([buffer], { type: order.photoFile.type });
        formData.append("photo", blob, order.photoFile.name);
        formData.append("caption", `📷 Оригінальне фото клієнта до замовлення № ${order.id}`);

        await fetch(photoUrl, {
          method: "POST",
          body: formData,
        });
      } catch (imgError: any) {
        console.warn(`Попередження: Не вдалося надіслати фото в Telegram для замовлення ${order.id}:`, imgError.message);
      }
    }

    console.log(`Telegram сповіщення для замовлення ${order.id} успішно надіслано!`);
    return { sent: true };
  } catch (error: any) {
    console.error(`Помилка відправки Telegram для замовлення ${order.id}:`, error);
    return { sent: false, message: error.message };
  }
}

// Vite and Express serving logic
async function startServer() {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Сервер працює на порту ${PORT}`);
    if (process.env.SQL_HOST && process.env.SQL_USER) {
      await seedLocalOrdersToDb();
    }
  });
}

// Global Express Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Express Error Handler:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || "Внутрішня помилка сервера" });
  }
});

if (process.env.VERCEL !== "1") {
  startServer();
}

export default app;
