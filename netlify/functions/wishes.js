const { getStore } = require("@netlify/blobs");

const STORE_NAME = "ira-yusup-wishes";
const WISHES_KEY = "wishes.json";
const MAX_WISHES = 500;
const MAX_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 600;

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

async function getWishesStore() {
  return getStore(STORE_NAME);
}

async function readWishes(store) {
  const stored = await store.get(WISHES_KEY, { type: "json", consistency: "strong" });
  return Array.isArray(stored) ? stored : [];
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json({});
  }

  try {
    const store = await getWishesStore();

    if (event.httpMethod === "GET") {
      const wishes = await readWishes(store);
      return json({ wishes });
    }

    if (event.httpMethod !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const payload = JSON.parse(event.body || "{}");
    const name = cleanText(payload.name, MAX_NAME_LENGTH);
    const message = cleanText(payload.message, MAX_MESSAGE_LENGTH);

    if (!name || !message) {
      return json({ error: "Nama dan ucapan wajib diisi." }, 400);
    }

    const wishes = await readWishes(store);
    const wish = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      message,
      time: formatTime(),
      createdAt: new Date().toISOString(),
    };
    const nextWishes = [wish, ...wishes].slice(0, MAX_WISHES);

    await store.setJSON(WISHES_KEY, nextWishes);

    return json({ wish, wishes: nextWishes }, 201);
  } catch (error) {
    console.error(error);
    return json({ error: "Ucapan belum bisa diproses." }, 500);
  }
};
