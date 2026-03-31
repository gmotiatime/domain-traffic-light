import { getDatabase } from "../server/db-manager.mjs";
import { standardHeaders } from "../server/openrouter-proxy.mjs";

export default async function handler(req, res) {
  const headers = standardHeaders();

  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const { host, verdict, score, reportText } = body;

    if (!host || !reportText) {
      res.status(400).json({ error: "Поля host и reportText обязательны." });
      return;
    }

    const db = getDatabase();
    const record = db.addReport(host, {
      text: reportText,
      verdict,
      score,
    });

    if (!record) {
      res.status(404).json({ error: "Запись для этого домена не найдена." });
      return;
    }

    res.status(200).json({
      ok: true,
      message: "Жалоба успешно отправлена.",
      host: record.host,
      reportsCount: record.reports?.length || 0,
    });
  } catch (error) {
    console.error("[API] Report error:", error);
    res.status(500).json({ error: "Ошибка при сохранении жалобы." });
  }
}
