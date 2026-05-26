import { getStore } from "@netlify/blobs";

const STORE_NAME = "ira-yusup-wishes";
const WISHES_KEY = "wishes.json";
const MAX_WISHES = 500;
const MAX_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 600;

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
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

function getWishesStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

async function readWishes(store) {
  const stored = await store.get(WISHES_KEY, {
    type: "json",
    consistency: "strong",
  });
  return Array.isArray(stored) ? stored : [];
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    return json({});
  }

  try {
    const store = getWishesStore();

    if (request.method === "GET") {
      const wishes = await readWishes(store);
      return json({ wishes });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const payload = await request.json().catch(() => ({}));
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
    return json(
      {
        error: "Ucapan belum bisa diproses.",
        detail: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
};
