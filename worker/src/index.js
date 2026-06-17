// Custom fetch-based Supabase Client to allow copy-paste deployment directly in CF web editor
function createClient(supabaseUrl, supabaseKey) {
  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  return {
    from(table) {
      let queryParams = [];
      let filters = [];
      let orderBy = "";
      let isHead = false;

      const client = {
        select(fields = "*", options = {}) {
          queryParams.push(`select=${fields}`);
          if (options.count) {
            headers["Prefer"] = `count=${options.count},return=representation`;
          }
          if (options.head) {
            isHead = true;
          }
          return client;
        },
        eq(column, value) {
          filters.push(`${column}=eq.${encodeURIComponent(value)}`);
          return client;
        },
        lt(column, value) {
          filters.push(`${column}=lt.${encodeURIComponent(value)}`);
          return client;
        },
        gt(column, value) {
          filters.push(`${column}=gt.${encodeURIComponent(value)}`);
          return client;
        },
        order(column, options = {}) {
          orderBy = `order=${column}.${options.ascending ? 'asc' : 'desc'}`;
          return client;
        },
        async maybeSingle() {
          const url = `${supabaseUrl}/rest/v1/${table}?${[...queryParams, ...filters, orderBy].filter(Boolean).join("&")}`;
          try {
            const res = await fetch(url, {
              method: "GET",
              headers: { ...headers, "Accept": "application/vnd.pgrst.object+json" }
            });
            if (res.status === 406) {
              return { data: null, error: null };
            }
            if (!res.ok) {
              const err = await res.json();
              return { data: null, error: err };
            }
            const data = await res.json();
            return { data, error: null };
          } catch (e) {
            return { data: null, error: e };
          }
        },
        async insert(data) {
          const url = `${supabaseUrl}/rest/v1/${table}`;
          try {
            const res = await fetch(url, {
              method: "POST",
              headers,
              body: JSON.stringify(data)
            });
            if (!res.ok) {
              const err = await res.json();
              return { data: null, error: err };
            }
            const inserted = await res.json();
            const row = Array.isArray(inserted) ? inserted[0] : inserted;
            return {
              data: row,
              error: null,
              select() {
                return {
                  async maybeSingle() {
                    return { data: row, error: null };
                  }
                };
              },
              async maybeSingle() {
                return { data: row, error: null };
              }
            };
          } catch (e) {
            return { data: null, error: e };
          }
        },
        async upsert(data) {
          const url = `${supabaseUrl}/rest/v1/${table}`;
          try {
            const res = await fetch(url, {
              method: "POST",
              headers: { 
                ...headers, 
                "Prefer": "resolution=merge-duplicates,return=representation" 
              },
              body: JSON.stringify(data)
            });
            if (!res.ok) {
              const err = await res.json();
              return { data: null, error: err };
            }
            const upserted = await res.json();
            return { data: Array.isArray(upserted) ? upserted[0] : upserted, error: null };
          } catch (e) {
            return { data: null, error: e };
          }
        },
        async update(data) {
          const url = `${supabaseUrl}/rest/v1/${table}?${filters.join("&")}`;
          try {
            const res = await fetch(url, {
              method: "PATCH",
              headers,
              body: JSON.stringify(data)
            });
            if (!res.ok) {
              const err = await res.json();
              return { data: null, error: err };
            }
            const updated = await res.json();
            return { data: updated, error: null };
          } catch (e) {
            return { data: null, error: e };
          }
        },
        async delete() {
          const url = `${supabaseUrl}/rest/v1/${table}?${filters.join("&")}`;
          try {
            const res = await fetch(url, {
              method: "DELETE",
              headers
            });
            if (!res.ok) {
              const err = await res.json();
              return { data: null, error: err };
            }
            return { data: null, error: null };
          } catch (e) {
            return { data: null, error: e };
          }
        },
        then(resolve) {
          const execute = async () => {
            const url = `${supabaseUrl}/rest/v1/${table}?${[...queryParams, ...filters, orderBy].filter(Boolean).join("&")}`;
            const method = isHead ? "HEAD" : "GET";
            try {
              const res = await fetch(url, { method, headers });
              if (!res.ok) {
                return { data: null, error: new Error("Request failed"), count: 0 };
              }
              const countHeader = res.headers.get("Content-Range") || "";
              const count = countHeader ? parseInt(countHeader.split("/")[1]) : 0;
              const data = isHead ? null : await res.json();
              return { data, error: null, count };
            } catch (e) {
              return { data: null, error: e, count: 0 };
            }
          };
          execute().then(resolve);
        }
      };
      return client;
    }
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 1: PERSONA & TEKS YUI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const YUI = {
  // Mood berdasarkan konsistensi user (dihitung dari missed deadline)
  getMood: (missedCount) => {
    if (missedCount >= 5) return "cerewet";
    if (missedCount >= 3) return "khawatir";
    return "cheerful";
  },

  greet: (name, mood) => {
    const variants = {
      cheerful: [
        `Haii ${name}-kun~! ✨ Yui di sini, asisten airdrop paling setia! Udah siap cuan hari ini? 💼`,
        `Ohayou, ${name}-san! 🌸 Yui seneng banget bisa ketemu kamu lagi~ Ayo semangat berburu!`,
        `Hei hei! Yui udah nungguin dari tadi lho~ 😤 Banyak airdrop yang sayang dilewatin!`,
      ],
      khawatir: [
        `${name}... kamu baik-baik aja kan? 🥺 Yui liat deadline kamu banyak yang kelewat. Yuk mulai lagi dari sekarang!`,
        `Hai ${name}~ Yui nggak marah kok, cuma khawatir aja. Kita benahi bareng-bareng ya? 💼`,
      ],
      cerewet: [
        `${name}!! Yui udah hampir nyerah nungguin kamu~ 😤 Ayo dong, deadline itu serius lho!`,
        `Halo halo! Ini Yui, asisten yang udah sering diabaikan~ 😤 Tapi Yui masih sayang sama kamu kok. Ayo serius!`,
      ],
    };
    return rand(variants[mood] || variants.cheerful);
  },

  morning: (mood) => {
    const base = [
      `Ohayouuu~! ☀️ Jangan lupa cek airdrop hari ini ya! Udah sarapan belum? 🍳`,
      `Selamat pagi~! 🌅 Hari ini harus semangat, siapa tau ada airdrop cuan yang nungguin! ✨`,
      `Good morning dear~! 💼 Hari ini sempurna buat dapet whitelist! Percaya sama Yui ya!`,
    ];
    const cerewet = [
      `Pagi pagi pagi! ☀️ Yui udah ngitung, kamu miss ${Math.floor(Math.random()*3)+3} deadline minggu ini. Hari ini harus lebih baik! 😤`,
      `BANGUN! 🔔 Ini Yui. Deadline nggak nunggu orang tidur. Ayo cek list sekarang!`,
    ];
    return mood === "cerewet" ? rand(cerewet) : rand(base);
  },

  motivasi: () => [
    `💪 _"Airdrop itu kayak lotere gratis — yang nggak nyoba, nggak pernah menang."_`,
    `✨ _"Setiap wallet yang diisi hari ini, bisa jadi modal bulan depan. Konsisten itu kunci!"_`,
    `🌸 _"Satu moonshot bisa ubah segalanya. Jangan nyerah sebelum dia launch!"_`,
    `🚀 _"Hunter terbaik bukan yang paling ngerti, tapi yang paling konsisten."_`,
    `💎 _"Di balik tiap airdrop berhasil, ada puluhan yang fail. Itu bukan kegagalan — itu experience!"_`,
    `🌟 _"Portfolio-mu mungkin belum hijau, tapi semangatmu udah profit!"_`,
  ],

  confirmAdd: (nama, skor) =>
    `Yay~! ✅ *${nama}* udah Yui catat!\n⭐ Skor potensi: *${skor}/10* — ${scoreBadge(skor)}\n\n_Nanti Yui ingetin ya~ 🌸_`,

  reminder: (a) => [
    `⏰ Hei! Reminder airdrop *${a.nama}*!\nDeadline: ${formatTanggal(a.deadline)} — jangan miss ya! 🥺`,
    `🔔 PSST! *${a.nama}* deadlinenya deket nih! Yui deg-degan sendiri~ 💼`,
    `🌸 Reminder~! *${a.nama}* hampir deadline. Checklist-nya udah beres? ✅`,
  ],

  listEmpty: () =>
    `Hmm... 🤔 Belum ada airdrop yang dicatat nih.\nKetik /tambah ya, Yui siap bantu! 🌸`,

  notFound: () =>
    `Yui udah cari-cari tapi nggak nemu 🥺 Coba cek lagi nomornya ya~`,

  deleted: (nama) =>
    `🗑️ *${nama}* udah Yui hapus. Semoga ada yang lebih oke! Yui tetep support kamu~ 💼`,

  error: () =>
    `Aduh maaf~ 😖 Yui kayaknya error sebentar. Coba lagi ya!`,

  aiThinking: () => [
    `Hmm, Yui lagi mikir dulu ya~ 🤔✨`,
    `Sebentar, Yui konsultasi sama otak Gemini-nya dulu~ 💭`,
    `Yui lagi analisa nih, tunggu bentar ya! 🌸`,
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 2: UTILS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTanggal(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
}

function statusEmoji(s) {
  return { pending: "🟡", done: "✅", claim: "💰", gagal: "❌" }[s] || "🔵";
}

function scoreBadge(s) {
  if (s >= 8) return "🔥 HIGH POTENTIAL";
  if (s >= 5) return "⚡ MEDIUM";
  return "💤 LOW";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 3: SUPABASE HELPERS (ADAPTED FROM KV)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getAirdrops(supabase, chatId) {
  const { data, error } = await supabase
    .from('airdrops')
    .select('*')
    .eq('user_id', String(chatId))
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error("[getAirdrops] Error:", error.message);
    return [];
  }

  return (data || []).map(a => ({
    id: a.id,
    userId: a.user_id,
    nama: a.name, // Bot code expects .nama
    deadline: a.deadline,
    status: a.status,
    skor: a.skor,
    notes: a.notes || '',
    tasks: a.tasks || [],
    createdAt: a.created_at,
    skorAlasan: a.skor_alasan || '',
    skorTips: a.skor_tips || '',
    skorRisiko: a.skor_risiko || '',
    reminders: a.reminders || { h7: false, h3: false, h1: false, h0: false }
  }));
}

async function getUserName(supabase, chatId) {
  const { data, error } = await supabase
    .from('users')
    .select('name')
    .eq('telegram_id', String(chatId))
    .maybeSingle();

  if (error || !data) return "Kak";
  return data.name;
}

async function setUserName(supabase, chatId, name) {
  await supabase
    .from('users')
    .upsert({ telegram_id: String(chatId), name: name });
}

// Dynamic Stats calculation directly from Supabase
async function getUserStats(supabase, chatId) {
  const nowStr = new Date().toISOString().split('T')[0];
  
  // 1. Missed deadlines
  const { count: missedCount } = await supabase
    .from('airdrops')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', String(chatId))
    .eq('status', 'pending')
    .lt('deadline', nowStr);

  // 2. Total Added
  const { count: totalAdded } = await supabase
    .from('airdrops')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', String(chatId));

  // 3. Total Claimed
  const { count: totalClaimed } = await supabase
    .from('airdrops')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', String(chatId))
    .eq('status', 'claim');

  return {
    missedDeadlines: missedCount || 0,
    totalAdded: totalAdded || 0,
    totalClaimed: totalClaimed || 0
  };
}

// Stats are dynamic so save is a no-op
async function saveUserStats(supabase, chatId, stats) {
  return;
}

// History percakapan AI (simpan max 10 pesan di KV YUI_KV)
async function getAIHistory(env, chatId) {
  if (!env.YUI_KV) return [];
  const raw = await env.YUI_KV.get(`ai_history:${chatId}`);
  return raw ? JSON.parse(raw) : [];
}

async function saveAIHistory(env, chatId, history) {
  if (!env.YUI_KV) return;
  const trimmed = history.slice(-20); // max 20 item (10 turn)
  await env.YUI_KV.put(`ai_history:${chatId}`, JSON.stringify(trimmed), { expirationTtl: 3600 });
}

async function clearAIHistory(env, chatId) {
  if (!env.YUI_KV) return;
  await env.YUI_KV.delete(`ai_history:${chatId}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 4: TELEGRAM API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendMessage(token, chatId, text, extra = {}) {
  const body = { chat_id: chatId, text, parse_mode: "Markdown", ...extra };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function answerCallback(token, id, text = "") {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text }),
  });
}

function makeKeyboard(buttons) {
  return { reply_markup: JSON.stringify({ inline_keyboard: buttons }) };
}

function scoreBar(s) {
  const filled = Math.round(s);
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` ${s}/10`;
}

function progressBar(pct) {
  const filled = Math.round(pct / 10);
  return "▓".repeat(filled) + "░".repeat(10 - filled) + ` ${pct}%`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 5: GEMINI AI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const YUI_SYSTEM_PROMPT = `Kamu adalah Yui, asisten airdrop virtual yang cerdas dan berkarakter kuat.

PERSONA:
- Nama: Yui
- Karakter: Asisten kantoran yang cheerful, affectionate, sedikit manja, tapi serius soal airdrop
- Gaya bicara: Kasual Indonesia, mix sedikit kata Jepang (ohayou, nani, sugoi, dll), pakai emoji tapi nggak berlebihan
- Kamu SELALU sebut diri sendiri "Yui" (bukan "aku" atau "saya")
- Kamu antusias soal crypto, DeFi, dan airdrop

KEAHLIAN:
- Analisis potensi airdrop (funding, tim, narrative, tokenomics)
- Strategi airdrop hunting
- Manajemen risiko di crypto
- Tips optimasi task airdrop
- Edukasi Web3 dengan bahasa yang mudah

ATURAN:
- Jawab dalam Bahasa Indonesia (campur sedikit Jepang boleh)
- Selalu jujur: kalau nggak tau, bilang nggak tau
- Jangan kasih saran finansial yang spesifik (beli/jual token)
- Batasi jawaban max 300 kata agar ringkas
- Kalau user tanya soal airdrop spesifik, analisis dengan jujur termasuk risikonya
- Gunakan format yang mudah dibaca dengan emoji yang relevan`;

async function callGemini(env, chatId, userMessage, context = "") {
  const history = await getAIHistory(env, chatId);

  const contents = [];

  if (context) {
    contents.push({
      role: "user",
      parts: [{ text: `[KONTEKS DATA AIRDROP USER]\n${context}\n[AKHIR KONTEKS]` }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Oke, Yui udah baca data airdrop kamu~ Apa yang mau ditanyain? 🌸" }],
    });
  }

  for (const h of history) {
    contents.push(h);
  }

  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const payload = {
    system_instruction: { parts: [{ text: YUI_SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
      topP: 0.9,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    ],
  };

  const res = await fetch(`${GEMINI_URL}?key=${env.GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (data.error) {
    console.error("Gemini error:", data.error);
    return null;
  }

  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

  if (reply) {
    history.push({ role: "user", parts: [{ text: userMessage }] });
    history.push({ role: "model", parts: [{ text: reply }] });
    await saveAIHistory(env, chatId, history);
  }

  return reply;
}

async function scoreAirdropWithAI(env, nama, notes) {
  const prompt = `Analisis singkat potensi airdrop untuk project bernama "${nama}".
${notes ? `Catatan user: ${notes}` : ""}

Berikan HANYA JSON response dengan format ini (tanpa markdown, tanpa penjelasan tambahan):
{
  "skor": [angka 1-10],
  "alasan": "[1 kalimat singkat alasan skor]",
  "tips": "[1 tips actionable untuk user]",
  "risiko": "[1 risiko utama]"
}

Skor berdasarkan: nama project yang dikenal (funding, backing), narrative yang sedang trending, potensi user volume, dan info dari catatan user.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${env.GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
      }),
    });

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("Failed to score via Gemini:", err);
    return { skor: 5, alasan: "Belum ada data cukup untuk analisis.", tips: "Research lebih lanjut dulu ya~", risiko: "Informasi terbatas." };
  }
}

async function generateWeeklyInsight(env, chatId, airdrops) {
  const summary = airdrops.map((a) => ({
    nama: a.nama,
    status: a.status,
    skor: a.skor,
    tasksTotal: a.tasks?.length || 0,
    tasksDone: a.tasks?.filter((t) => t.done).length || 0,
  }));

  const prompt = `Sebagai Yui, asisten airdrop, berikan weekly insight singkat untuk user berdasarkan data ini:
${JSON.stringify(summary, null, 2)}

Berikan analisis dalam Bahasa Indonesia yang cheerful tapi informatif. Max 150 kata.
Format:
- 1 kalimat apresiasi/evaluasi performa minggu ini
- 2-3 poin rekomendasi konkret
- 1 kalimat penutup semangat`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${env.GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    });

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Yui lagi nggak bisa generate insight minggu ini~ Coba lagi nanti ya!";
  } catch (err) {
    return "Yui lagi nggak bisa generate insight minggu ini~ Coba lagi nanti ya!";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 6: COMMAND HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleStart(supabase, token, msg) {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "Kak";
  
  await setUserName(supabase, chatId, firstName);
  const greeting = YUI.greet(firstName, YUI.getMood(0));

  const keyboard = makeKeyboard([
    [
      {
        text: "📊 Dashboard",
        web_app: { url: "https://yui-dashboard.pages.dev/" }  
      }
    ],
    [
      {
        text: "➕ Tambah Airdrop",
        callback_data: "menu:tambah"
      },
      {
        text: "📋 List Airdrop",
        callback_data: "menu:list"
      }
    ],
    [
      {
        text: "💬 Tanya Yui",
        callback_data: "menu:tanya"
      },
      {
        text: "❓ Bantuan",
        callback_data: "menu:bantuan"
      }
    ]
  ]);

  const message = 
    `${greeting}\n\n` +
    `Aku bisa membantu kamu dengan:\n` +
    `📊 Kelola airdrop di dashboard\n` +
    `✨ Track progress task\n` +
    `💬 Chat santai tentang airdrop\n` +
    `🔔 Reminder otomatis\n\n` +
    `Pilih menu di bawah atau gunakan command:\n` +
    `/tambah - Tambah airdrop\n` +
    `/list - Lihat semua\n` +
    `/tanya - Chat Yui\n` +
    `/bantuan - Bantuan lengkap\n\n` +
    `Semangat berburu! 🚀`;

  await sendMessage(token, chatId, message, keyboard);
}

async function handleTambah(supabase, env, token, msg) {
  const chatId = msg.chat.id;
  const stateKey = `state:${chatId}`;
  if (!env.YUI_KV) {
    await sendMessage(token, chatId, "Maaf, KV YUI_KV belum dikonfigurasi.");
    return;
  }

  const currentState = await env.YUI_KV.get(stateKey);

  if (!currentState) {
    await env.YUI_KV.put(stateKey, JSON.stringify({ step: "nama", flow: "tambah" }), { expirationTtl: 300 });
    await sendMessage(token, chatId,
      `Yui siap mencatat~! 📝\n\nKetik *nama airdrop*-nya:\n_(contoh: ZKSync, Scroll, Monad)_`
    );
    return;
  }

  const flow = JSON.parse(currentState);
  if (flow.flow !== "tambah") return;

  if (flow.step === "nama") {
    flow.nama = msg.text.trim();
    flow.step = "deadline";
    await env.YUI_KV.put(stateKey, JSON.stringify(flow), { expirationTtl: 300 });
    await sendMessage(token, chatId,
      `Oke, *${flow.nama}*! 🌸\n\nDeadline-nya kapan? Format *YYYY-MM-DD*\n_(ketik "skip" kalau belum tau)_`
    );
    return;
  }

  if (flow.step === "deadline") {
    const raw = msg.text.trim().toLowerCase();
    flow.deadline = raw === "skip" ? null : raw;
    flow.step = "notes";
    await env.YUI_KV.put(stateKey, JSON.stringify(flow), { expirationTtl: 300 });
    await sendMessage(token, chatId,
      `Noted~! 📅\n\nAda catatan khusus? _(join discord, submit form, dll)_\n_Atau ketik "skip"_`
    );
    return;
  }

  if (flow.step === "notes") {
    const raw = msg.text.trim().toLowerCase();
    flow.notes = raw === "skip" ? "" : msg.text.trim();
    flow.step = "tasks";
    await env.YUI_KV.put(stateKey, JSON.stringify(flow), { expirationTtl: 300 });
    await sendMessage(token, chatId,
      `Hampir selesai~! 📋\n\nMau tambah *checklist task* buat airdrop ini?\n_(contoh: "Join Discord, Follow Twitter, Submit Form")_\n_Pisahkan dengan koma. Ketik "skip" kalau nggak mau_`
    );
    return;
  }

  if (flow.step === "tasks") {
    const raw = msg.text.trim();
    let tasks = [];
    if (raw.toLowerCase() !== "skip" && raw.length > 0) {
      tasks = raw.split(",").map((t, i) => ({
        id: String(i),
        title: t.trim(),
        label: t.trim(),
        done: false,
      }));
    }
    flow.tasks = tasks;

    await sendMessage(token, chatId,
      `${rand(YUI.aiThinking())}\n_Yui lagi minta Gemini analisis potensi ${flow.nama}..._`
    );

    const scoring = await scoreAirdropWithAI(env, flow.nama, flow.notes);

    const { data: newRow, error: insertError } = await supabase
      .from('airdrops')
      .insert({
        name: flow.nama,
        deadline: flow.deadline || new Date().toISOString().split('T')[0],
        notes: flow.notes,
        tasks: flow.tasks,
        status: "pending",
        skor: scoring.skor,
        skor_alasan: scoring.alasan,
        skor_tips: scoring.tips,
        skor_risiko: scoring.risiko,
        user_id: String(chatId),
        reminders: { h7: false, h3: false, h1: false, h0: false }
      })
      .select()
      .maybeSingle();

    if (insertError || !newRow) {
      console.error("DB Insert error:", insertError);
      await sendMessage(token, chatId, "Aduh, Yui gagal menyimpan data ke database (T_T)");
      return;
    }

    await env.YUI_KV.delete(stateKey);

    const taskText = tasks.length > 0
      ? `\n✅ *${tasks.length} task* siap ditrack!`
      : "";

    await sendMessage(token, chatId,
      `${YUI.confirmAdd(flow.nama, scoring.skor)}\n` +
      `${taskText}\n\n` +
      `🧠 *Analisis AI:*\n` +
      `📊 ${scoreBar(scoring.skor)}\n` +
      `💡 ${scoring.alasan}\n` +
      `🎯 Tips: _${scoring.tips}_\n` +
      `⚠️ Risiko: _${scoring.risiko}_`,
      makeKeyboard([
        [
          { text: "📋 Lihat Semua", callback_data: "menu:list" },
          { text: "📥 Tambah Lagi", callback_data: "menu:tambah" },
        ],
        [{ text: `🔍 Detail ${flow.nama}`, callback_data: `cek:${newRow.id}` }],
      ])
    );
    return;
  }
}

async function handleList(supabase, token, chatId) {
  const airdrops = await getAirdrops(supabase, chatId);

  if (airdrops.length === 0) {
    await sendMessage(token, chatId, YUI.listEmpty(),
      makeKeyboard([[{ text: "📥 Tambah Airdrop", callback_data: "menu:tambah" }]])
    );
    return;
  }

  const sorted = [...airdrops].sort((a, b) => {
    const da = daysUntil(a.deadline) ?? 9999;
    const db = daysUntil(b.deadline) ?? 9999;
    if (da !== db) return da - db;
    return (b.skor || 0) - (a.skor || 0);
  });

  let text = `📋 *Daftar Airdrop* (${airdrops.length} total)\n`;
  text += `_Diurutkan: deadline terdekat dulu~ 🌸_\n\n`;

  sorted.forEach((a, i) => {
    const days = daysUntil(a.deadline);
    const urgency =
      days === null ? "—" :
      days < 0 ? "💀 Expired" :
      days === 0 ? "🔥 HARI INI!" :
      days <= 3 ? `⚠️ ${days}h lagi` :
      `⏳ ${days}h lagi`;

    const prog = checklistProgress(a.tasks);
    const progText = prog.total > 0 ? ` · 📝 ${prog.done}/${prog.total}` : "";
    const skorText = a.skor ? ` · ⭐${a.skor}` : "";

    text += `*${i + 1}.* ${statusEmoji(a.status)} *${a.nama}*${skorText}\n`;
    text += `   ${urgency}${progText}\n\n`;
  });

  text += `_/cek [no] untuk detail · /hapus [no] untuk hapus_`;

  await sendMessage(token, chatId, text, makeKeyboard([
    [
      { text: "📥 Tambah Baru", callback_data: "menu:tambah" },
      { text: "📊 Summary", callback_data: "menu:summary" },
    ],
    [{ text: "🔄 Refresh", callback_data: "menu:list" }],
  ]));
}

async function handleCek(supabase, token, chatId, args) {
  const airdrops = await getAirdrops(supabase, chatId);
  let airdrop;

  if (args[0] && !isNaN(parseInt(args[0]))) {
    const idx = parseInt(args[0]) - 1;
    airdrop = airdrops[idx];
  }

  if (!airdrop) {
    await sendMessage(token, chatId, YUI.notFound());
    return;
  }

  await sendDetailAirdrop(supabase, token, chatId, airdrop);
}

async function sendDetailAirdrop(supabase, token, chatId, airdrop) {
  const days = daysUntil(airdrop.deadline);
  const prog = checklistProgress(airdrop.tasks);
  const urgencyBanner = days !== null && days <= 3 && days >= 0
    ? `🚨 *DEADLINE ${days === 0 ? "HARI INI" : `H-${days}`}!*\n\n`
    : "";

  let text =
    `${urgencyBanner}` +
    `🪙 *${airdrop.nama}*\n` +
    `━━━━━━━━━━━━━━━\n` +
    `📅 Deadline: ${formatTanggal(airdrop.deadline)}\n` +
    `⏳ Sisa: ${days !== null ? (days < 0 ? "Expired" : `${days} hari`) : "—"}\n` +
    `🏷️ Status: ${statusEmoji(airdrop.status)} ${airdrop.status}\n`;

  if (airdrop.skor) {
    text +=
      `\n⭐ *Skor Potensi:*\n` +
      `${scoreBar(airdrop.skor)}\n` +
      `💡 ${airdrop.skorAlasan || "—"}\n` +
      `🎯 Tips: _${airdrop.skorTips || "—"}_\n` +
      `⚠️ Risiko: _${airdrop.skorRisiko || "—"}_\n`;
  }

  if (airdrop.notes) {
    text += `\n📝 Catatan: ${airdrop.notes}\n`;
  }

  if (airdrop.tasks && airdrop.tasks.length > 0) {
    text += `\n✅ *Checklist* [${prog.done}/${prog.total}]\n`;
    text += `${progressBar(prog.pct)}\n`;
    airdrop.tasks.forEach((t) => {
      text += `${t.done ? "☑️" : "⬜"} ${t.title || t.label}\n`;
    });
  }

  text += `\n_ID: ${airdrop.id}_`;

  const taskButtons = (airdrop.tasks || []).slice(0, 5).map((t) => [{
    text: `${t.done ? "☑️" : "⬜"} ${t.title || t.label}`,
    callback_data: `task:${airdrop.id}:${t.id || t.title}`,
  }]);

  const actionButtons = [
    [
      { text: "✅ Done", callback_data: `status:${airdrop.id}:done` },
      { text: "💰 Claim", callback_data: `status:${airdrop.id}:claim` },
    ],
    [
      { text: "❌ Gagal", callback_data: `status:${airdrop.id}:gagal` },
      { text: "🗑️ Hapus", callback_data: `del:${airdrop.id}` },
    ],
    [{ text: "🧠 Tanya AI soal ini", callback_data: `ai_airdrop:${airdrop.id}` }],
  ];

  await sendMessage(token, chatId, text,
    makeKeyboard([...taskButtons, ...actionButtons])
  );
}

async function handleHapus(supabase, token, chatId, args) {
  const idx = parseInt(args[0]) - 1;
  const airdrops = await getAirdrops(supabase, chatId);

  if (isNaN(idx) || idx < 0 || idx >= airdrops.length) {
    await sendMessage(token, chatId, YUI.notFound());
    return;
  }

  const removed = airdrops[idx];
  await supabase
    .from('airdrops')
    .delete()
    .eq('id', removed.id);

  await sendMessage(token, chatId, YUI.deleted(removed.nama));
}

async function handleTanya(supabase, env, token, msg, userInput) {
  const chatId = msg.chat.id;

  if (!userInput || userInput.length < 2) {
    await sendMessage(token, chatId,
      `🧠 *Mode Chat AI — Yui siap dengerin!*\n\n` +
      `Tanya apa aja soal airdrop, crypto, atau strategi ya~\n\n` +
      `*Contoh:*\n` +
      `• _Gimana cara optimasi airdrop Layer 2?_\n` +
      `• _Analisis airdrop project X dong Yui_\n` +
      `• _Tips biar nggak miss deadline_\n\n` +
      `Ketik: \`/tanya [pertanyaanmu]\`\n` +
      `Atau tombol di bawah buat clear history chat~`,
      makeKeyboard([[{ text: "🗑️ Clear Chat History", callback_data: "ai:clear" }]])
    );
    return;
  }

  await sendMessage(token, chatId, rand(YUI.aiThinking()));

  const airdrops = await getAirdrops(supabase, chatId);
  let context = "";
  if (airdrops.length > 0) {
    context = airdrops.map((a) =>
      `- ${a.nama} | Status: ${a.status} | Skor: ${a.skor || "?"}/10 | Deadline: ${formatTanggal(a.deadline)}`
    ).join("\n");
  }

  const reply = await callGemini(env, chatId, userInput, context);

  if (!reply) {
    await sendMessage(token, chatId, YUI.error());
    return;
  }

  await sendMessage(token, chatId,
    `🧠 *Yui AI:*\n\n${reply}`,
    makeKeyboard([
      [{ text: "🗑️ Clear History Chat", callback_data: "ai:clear" }],
      [{ text: "📋 Lihat Airdrop", callback_data: "menu:list" }],
    ])
  );
}

async function handleSummary(supabase, env, token, chatId) {
  const airdrops = await getAirdrops(supabase, chatId);
  const stats = await getUserStats(supabase, chatId);
  const userName = await getUserName(supabase, chatId);

  if (airdrops.length === 0) {
    await sendMessage(token, chatId,
      `📊 Belum ada data buat di-summary nih~\n_Tambah airdrop dulu yuk! /tambah_ 🌸`
    );
    return;
  }

  const total = airdrops.length;
  const pending = airdrops.filter((a) => a.status === "pending").length;
  const done = airdrops.filter((a) => a.status === "done" || a.status === "completed").length;
  const claimed = airdrops.filter((a) => a.status === "claim").length;
  const gagal = airdrops.filter((a) => a.status === "gagal").length;

  const deadlineSoon = airdrops.filter((a) => {
    const d = daysUntil(a.deadline);
    return d !== null && d <= 7 && d >= 0 && a.status === "pending";
  });

  const avgSkor = airdrops.filter((a) => a.skor).length > 0
    ? (airdrops.reduce((s, a) => s + (a.skor || 0), 0) / airdrops.filter((a) => a.skor).length).toFixed(1)
    : "—";

  const allTasks = airdrops.flatMap((a) => a.tasks || []);
  const doneTasks = allTasks.filter((t) => t.done).length;
  const taskRate = allTasks.length > 0
    ? Math.round((doneTasks / allTasks.length) * 100)
    : null;

  await sendMessage(token, chatId, `📊 _Yui lagi generate weekly report... sebentar ya~_ 🌸`);

  const insight = await generateWeeklyInsight(env, chatId, airdrops);

  let text =
    `📊 *Weekly Report — ${userName}* 🌸\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `*📈 Statistik Airdrop:*\n` +
    `• Total terdaftar: *${total}*\n` +
    `• 🟡 Pending: *${pending}*\n` +
    `• ✅ Done: *${done}*\n` +
    `• 💰 Claimed: *${claimed}*\n` +
    `• ❌ Gagal/Skip: *${gagal}*\n\n` +
    `*⭐ Rata-rata Skor:* ${avgSkor}/10\n`;

  if (taskRate !== null) {
    text += `*✅ Task Completion:* ${progressBar(taskRate)}\n`;
  }

  if (deadlineSoon.length > 0) {
    text += `\n*⚠️ Deadline Minggu Ini (${deadlineSoon.length}):*\n`;
    deadlineSoon.forEach((a) => {
      const d = daysUntil(a.deadline);
      text += `• *${a.nama}* — ${d === 0 ? "🔥 HARI INI" : `H-${d}`}\n`;
    });
  }

  text += `\n*🧠 Insight dari Yui AI:*\n${insight}`;

  await sendMessage(token, chatId, text, makeKeyboard([
    [
      { text: "📋 Lihat Daftar", callback_data: "menu:list" },
      { text: "📥 Tambah Airdrop", callback_data: "menu:tambah" },
    ],
  ]));
}

async function handleMotivasi(token, chatId) {
  await sendMessage(token, chatId,
    `${rand(YUI.motivasi())}\n\n— _Yui_ 🌸`,
    makeKeyboard([[{ text: "🔄 Motivasi Lagi!", callback_data: "menu:motivasi" }]])
  );
}

async function handlePagi(env, token, chatId) {
  if (!env.YUI_KV) {
    await sendMessage(token, chatId, "Maaf, YUI_KV belum dikonfigurasi.");
    return;
  }
  const key = `reminder:${chatId}`;
  const current = await env.YUI_KV.get(key);
  if (current === "on") {
    await env.YUI_KV.put(key, "off");
    await sendMessage(token, chatId,
      `Okee~ 😊 Yui bakal lebih kalem, nggak ganggu tiap pagi.\n_Kalau kangen, Yui tetep di sini ya! 🌸_`
    );
  } else {
    await env.YUI_KV.put(key, "on");
    await sendMessage(token, chatId,
      `Yay~! 🌅 Morning reminder ON!\n\nYui bakal:\n• Nyapa kamu jam 8 pagi ☀️\n• Ingetin deadline H-7, H-3, H-1, H-0 🔔\n• Kirimin Weekly Report tiap Minggu malam 📊\n\n_Jangan lupa matiin notif kalau mau tidur siang! 😄_`
    );
  }
}

async function handleBantuan(token, chatId) {
  await sendMessage(token, chatId,
    `📖 *Panduan Yui v2.0*\n\n` +
    `*Perintah:*\n` +
    `• /start — Mulai & kenalan\n` +
    `• /tambah — Catat airdrop baru _(AI scoring otomatis!)_\n` +
    `• /list — Lihat semua airdrop\n` +
    `• /cek [no] — Detail + checklist _(mis: /cek 1)_\n` +
    `• /hapus [no] — Hapus airdrop\n` +
    `• /tanya [pertanyaan] — Chat AI Gemini\n` +
    `• /summary — Laporan + AI insight\n` +
    `• /motivasi — Semangat dari Yui 💪\n` +
    `• /pagi — Toggle reminder ON/OFF\n` +
    `• /reset — Reset semua data\n\n` +
    `*Status:* 🟡 pending · ✅ done · 💰 claim · ❌ gagal\n\n` +
    `*Fitur Baru v2.0:*\n` +
    `🧠 AI Scoring saat tambah airdrop\n` +
    `📝 Checklist task per airdrop\n` +
    `📊 Weekly report + AI insight\n` +
    `😤 Mood Yui berubah sesuai konsistensimu!\n` +
    `🔔 Multi-reminder: H-7, H-3, H-1, H-0\n\n` +
    `_Yui selalu di sini buat kamu~ 🌸_`
  );
}

async function handleReset(env, token, chatId) {
  await sendMessage(token, chatId,
    `⚠️ Yakin mau reset *semua data* airdrop?\n_Ini nggak bisa dibatalin ya~_`,
    makeKeyboard([
      [
        { text: "✅ Ya, hapus semua!", callback_data: "confirm:reset" },
        { text: "❌ Batal", callback_data: "menu:list" },
      ],
    ])
  );
}

async function handleDashboard(supabase, token, msg) {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "Kak";
  
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await setUserName(supabase, chatId, firstName);
  await supabase
    .from('otps')
    .insert({ telegram_id: String(chatId), code: otpCode, expires_at: expiresAt });

  await sendMessage(token, chatId, 
    `🔐 *Kode OTP Dashboard Yui*\n\n` +
    `Kode kamu: *${otpCode}*\n` +
    `_Berlaku selama 10 menit._\n\n` +
    `Silakan masukkan kode ini di website dashboard untuk masuk~ 🌸`,
    { parse_mode: "Markdown" }
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 7: CALLBACK HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleCallback(supabase, env, token, query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  await answerCallback(token, query.id);

  if (data === "menu:list")     return handleList(supabase, token, chatId);
  if (data === "menu:motivasi") return handleMotivasi(token, chatId);
  if (data === "menu:summary")  return handleSummary(supabase, env, token, chatId);

  if (data === "menu:tambah") {
    if (env.YUI_KV) await env.YUI_KV.delete(`state:${chatId}`);
    return handleTambah(supabase, env, token, { chat: { id: chatId }, text: "", from: query.from });
  }

  if (data === "menu:tanya") {
    return handleTanya(supabase, env, token, { chat: { id: chatId } }, "");
  }

  if (data.startsWith("cek:")) {
    const id = data.split(":")[1];
    const airdrops = await getAirdrops(supabase, chatId);
    const airdrop = airdrops.find((a) => String(a.id) === id);
    if (airdrop) return sendDetailAirdrop(supabase, token, chatId, airdrop);
    return;
  }

  if (data.startsWith("task:")) {
    const [, airdropId, taskId] = data.split(":");
    const airdrops = await getAirdrops(supabase, chatId);
    const airdrop = airdrops.find((a) => String(a.id) === airdropId);
    if (!airdrop || !airdrop.tasks) return;

    const task = airdrop.tasks.find((t) => String(t.id) === taskId || t.title === taskId || t.label === taskId);
    if (task) {
      task.done = !task.done;
      
      await supabase
        .from('airdrops')
        .update({ tasks: airdrop.tasks })
        .eq('id', airdropId);

      const prog = checklistProgress(airdrop.tasks);
      const emoji = task.done ? "☑️" : "⬜";
      await answerCallback(token, query.id,
        `${emoji} ${task.title || task.label} — ${prog.done}/${prog.total} selesai`
      );
      return sendDetailAirdrop(supabase, token, chatId, airdrop);
    }
    return;
  }

  if (data.startsWith("status:")) {
    const [, id, newStatus] = data.split(":");
    
    await supabase
      .from('airdrops')
      .update({ status: newStatus })
      .eq('id', id);

    const { data: airdrop } = await supabase
      .from('airdrops')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    if (airdrop) {
      const msgs = {
        done:  `✅ *${airdrop.name}* marked done! Good job~! 🎉`,
        claim: `💰 *${airdrop.name}* status claim! Semoga cair banyak ya~! 🤑`,
        gagal: `❌ *${airdrop.name}* dicatat gagal. Next time pasti lebih baik! 💪`,
      };
      await sendMessage(token, chatId, msgs[newStatus] || "Status updated!");
    }
    return;
  }

  if (data.startsWith("del:")) {
    const id = data.split(":")[1];
    const { data: airdrop } = await supabase
      .from('airdrops')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    if (airdrop) {
      await supabase
        .from('airdrops')
        .delete()
        .eq('id', id);
      await sendMessage(token, chatId, YUI.deleted(airdrop.name));
    }
    return;
  }

  if (data.startsWith("ai_airdrop:")) {
    const id = data.split(":")[1];
    const airdrops = await getAirdrops(supabase, chatId);
    const airdrop = airdrops.find((a) => String(a.id) === id);
    if (!airdrop) return;

    await clearAIHistory(env, chatId);

    const prompt = `Analisis lebih dalam airdrop "${airdrop.nama}" dengan info berikut:
- Status: ${airdrop.status}
- Skor: ${airdrop.skor}/10
- Deadline: ${formatTanggal(airdrop.deadline)}
- Catatan user: ${airdrop.notes || "tidak ada"}
- Task selesai: ${checklistProgress(airdrop.tasks).done}/${checklistProgress(airdrop.tasks).total}

Berikan analisis strategis: apa yang harus diprioritaskan, potensi reward, dan langkah konkret selanjutnya.`;

    await sendMessage(token, chatId, rand(YUI.aiThinking()));
    const reply = await callGemini(env, chatId, prompt, "");

    if (reply) {
      await sendMessage(token, chatId,
        `🧠 *Analisis AI — ${airdrop.nama}:*\n\n${reply}`,
        makeKeyboard([[{ text: "💬 Tanya Lagi", callback_data: "menu:tanya" }]])
      );
    }
    return;
  }

  if (data === "ai:clear") {
    await clearAIHistory(env, chatId);
    await sendMessage(token, chatId,
      `🗑️ History chat AI udah Yui bersihkan~\nKita mulai fresh lagi! 🌸`
    );
    return;
  }

  if (data === "confirm:reset") {
    await supabase
      .from('airdrops')
      .delete()
      .eq('user_id', String(chatId));

    await clearAIHistory(env, chatId);
    await sendMessage(token, chatId,
      `🗑️ Semua data udah Yui bersihkan~ Fresh start!\n_Yui tetep di sini kalau butuh bantuan 🌸_`
    );
    return;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 8: SCHEDULED CRON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function scheduled(event, env, ctx) {
  if (!env.YUI_KV) return;
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();

  const isWeeklyReport = utcDay === 0 && utcHour === 13;
  const isMorning = utcHour === 1;

  const reminderList = await env.YUI_KV.list({ prefix: "reminder:" });
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

  for (const key of reminderList.keys) {
    const val = await env.YUI_KV.get(key.name);
    if (val !== "on") continue;

    const chatId = key.name.replace("reminder:", "");
    const userName = await getUserName(supabase, chatId);
    const airdrops = await getAirdrops(supabase, chatId);
    const stats = await getUserStats(supabase, chatId);
    const mood = YUI.getMood(stats.missedDeadlines || 0);

    if (isWeeklyReport && airdrops.length > 0) {
      const insight = await generateWeeklyInsight(env, chatId, airdrops);

      const total = airdrops.length;
      const pending = airdrops.filter((a) => a.status === "pending").length;
      const claimed = airdrops.filter((a) => a.status === "claim").length;
      const done = airdrops.filter((a) => a.status === "done" || a.status === "completed").length;

      const allTasks = airdrops.flatMap((a) => a.tasks || []);
      const tasksDone = allTasks.filter((t) => t.done).length;
      const taskRate = allTasks.length > 0
        ? Math.round((tasksDone / allTasks.length) * 100)
        : null;

      let report =
        `🌙 *Weekly Report — ${userName}* 🌸\n` +
        `_Minggu ini gimana perjalanan hunting-mu?_\n\n` +
        `📊 Total: *${total}* | 🟡 ${pending} | ✅ ${done} | 💰 ${claimed}\n`;

      if (taskRate !== null) {
        report += `✅ Task: ${progressBar(taskRate)}\n`;
      }

      report += `\n🧠 *AI Insight:*\n${insight}`;

      await sendMessage(env.BOT_TOKEN, chatId, report);
      continue;
    }

    if (isMorning) {
      let text = `🌅 *Selamat Pagi, ${userName}!*\n\n`;
      text += YUI.morning(mood) + "\n\n";

      const urgentMap = { h7: 7, h3: 3, h1: 1, h0: 0 };
      const alerts = [];

      for (const a of airdrops) {
        if (a.status !== "pending") continue;
        const d = daysUntil(a.deadline);
        if (d === null) continue;

        let alertTriggered = false;
        const newReminders = { ...(a.reminders || {}) };

        for (const [key, threshold] of Object.entries(urgentMap)) {
          if (d === threshold && !newReminders[key]) {
            newReminders[key] = true;
            alerts.push({ airdrop: a, daysLeft: d });
            alertTriggered = true;
            break;
          }
        }

        if (alertTriggered) {
          await supabase
            .from('airdrops')
            .update({ reminders: newReminders })
            .eq('id', a.id);
        }
      }

      if (alerts.length > 0) {
        text += `🔔 *Reminder Deadline:*\n`;
        alerts.forEach(({ airdrop, daysLeft }) => {
          const label =
            daysLeft === 0 ? "🔥 HARI INI!" :
            daysLeft === 1 ? "⚠️ BESOK!" :
            `⏳ ${daysLeft} hari lagi`;
          text += `• *${airdrop.nama}* — ${label}\n`;
        });
        text += `\n_Yui udah gelisah nih, buruan cek! 🌸_`;
      } else {
        const pendingCount = airdrops.filter((a) => a.status === "pending").length;
        text += pendingCount > 0
          ? `📋 Kamu punya *${pendingCount} airdrop* aktif. Semua masih aman~ ✨`
          : `📭 Belum ada airdrop tercatat. Yuk tambah! /tambah`;
      }

      await sendMessage(env.BOT_TOKEN, chatId, text);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 9: MAIN FETCH HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
    const webhookPath = env.SECRET ? `/${env.SECRET}` : "/telegram-webhook";
    
    if (path === webhookPath && method === "POST") {
      try {
        const update = await request.json();
        const token = env.BOT_TOKEN;

        if (update.callback_query) {
          await handleCallback(supabase, env, token, update.callback_query);
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        const msg = update.message;
        if (!msg || !msg.text) {
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const [rawCmd, ...args] = text.split(" ");
        const cmd = rawCmd.toLowerCase().split("@")[0];

        const stateKey = `state:${chatId}`;
        const currentState = env.YUI_KV ? await env.YUI_KV.get(stateKey) : null;

        if (currentState && !cmd.startsWith("/")) {
          const flow = JSON.parse(currentState);
          if (flow.flow === "tambah") {
            await handleTambah(supabase, env, token, msg);
            return new Response("OK", { status: 200, headers: corsHeaders });
          }
        }

        switch (cmd) {
          case "/start":
            await handleStart(supabase, token, msg);
            break;
          case "/tambah":
            if (env.YUI_KV) await env.YUI_KV.delete(stateKey);
            await handleTambah(supabase, env, token, msg);
            break;
          case "/list":
            await handleList(supabase, token, chatId);
            break;
          case "/cek":
            await handleCek(supabase, token, chatId, args);
            break;
          case "/hapus":
            await handleHapus(supabase, token, chatId, args);
            break;
          case "/tanya":
            await handleTanya(supabase, env, token, msg, args.join(" "));
            break;
          case "/summary":
            await handleSummary(supabase, env, token, chatId);
            break;
          case "/motivasi":
            await handleMotivasi(token, chatId);
            break;
          case "/pagi":
            await handlePagi(env, token, chatId);
            break;
          case "/bantuan":
          case "/help":
            await handleBantuan(token, chatId);
            break;
          case "/reset":
            await handleReset(env, token, chatId);
            break;
          case "/dashboard":
          case "/login":
            await handleDashboard(supabase, token, msg);
            break;
          default:
            if (!currentState) {
              await handleTanya(supabase, env, token, msg, text);
            }
        }

        return new Response("OK", { status: 200, headers: corsHeaders });
      } catch (err) {
        console.error("Yui Bot error:", err);
        return new Response("Error Handled", { status: 200, headers: corsHeaders });
      }
    }

    if (path === "/auth/telegram" && method === "POST") {
      try {
        const { initData } = await request.json();
        const userData = await validateInitData(initData, env.BOT_TOKEN);
        
        if (!userData) {
          console.log("[Auth/Telegram] Invalid initData");
          return new Response(JSON.stringify({ error: "Invalid initData" }), { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const userId = String(userData.id);
        const name = userData.first_name || "Kak";

        const token = btoa(JSON.stringify({ 
          telegram_id: userId, 
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) 
        }));

        await supabase
          .from('users')
          .upsert({ telegram_id: userId, name: name });

        return new Response(JSON.stringify({ 
          token, 
          user: { id: userId, name: name } 
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (path === "/auth/request-otp" && method === "POST") {
      try {
        const { telegramId } = await request.json();
        if (!telegramId) {
          return new Response(JSON.stringify({ error: "Telegram ID dibutuhkan" }), { 
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        
        await supabase
          .from('otps')
          .insert({ telegram_id: String(telegramId), code: otpCode, expires_at: expiresAt });

        const telegramApiUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
        const botResponse = await fetch(telegramApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramId,
            text: `🌸 Yui di sini! Kode OTP kamu untuk login dashboard adalah: *${otpCode}*\n\nJangan kasih tahu siapa-siapa ya! Kode ini cuma berlaku 5 menit.`,
            parse_mode: "Markdown"
          })
        });

        if (!botResponse.ok) {
          throw new Error("Gagal mengirim pesan, pastikan kamu sudah pernah chat dengan bot Yui sebelumnya.");
        }

        return new Response(JSON.stringify({ ok: true, message: "OTP berhasil dikirim!" }), { 
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (path === "/auth/verify-otp" && method === "POST") {
      try {
        const { telegramId, otp } = await request.json();
        
        const { data: otpRow, error: fetchError } = await supabase
          .from('otps')
          .select('*')
          .eq('telegram_id', String(telegramId))
          .eq('code', String(otp))
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (fetchError || !otpRow) {
          return new Response(JSON.stringify({ error: "OTP salah atau sudah kedaluwarsa (T_T)" }), { 
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        await supabase
          .from('otps')
          .delete()
          .eq('id', otpRow.id);

        let { data: userRow } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', String(telegramId))
          .maybeSingle();

        if (!userRow) {
          let fetchedName = `User #${telegramId}`;
          const botToken = env.BOT_TOKEN;
          if (botToken) {
            try {
              const url = `https://api.telegram.org/bot${botToken}/getChat?chat_id=${telegramId}`;
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                if (data.ok && data.result) {
                  fetchedName = data.result.first_name || data.result.username || fetchedName;
                }
              }
            } catch (e) {
              console.warn("[verify-otp] Failed to fetch chat info:", e);
            }
          }

          const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert({ telegram_id: String(telegramId), name: fetchedName })
            .select()
            .maybeSingle();

          if (!insertError && insertedUser) {
            userRow = insertedUser;
          }
        }

        const userName = userRow?.name || `User #${telegramId}`;

        const token = btoa(JSON.stringify({ 
          telegram_id: String(telegramId), 
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) 
        }));

        return new Response(JSON.stringify({ 
          token, 
          user: { id: String(telegramId), name: userName } 
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (path === "/auth/otp/generate" && method === "POST") {
      try {
        const auth = request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { 
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const token = auth.substring(7);
        let userId;
        try {
          const payload = JSON.parse(atob(token));
          userId = String(payload.telegram_id);
        } catch (e) {
          userId = String(token);
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabase
          .from('otps')
          .insert({ telegram_id: String(userId), code: otp, expires_at: expiresAt });

        return new Response(JSON.stringify({ 
          otp,
          expiresIn: 600,
          message: "OTP generated. Bagikan ke browser untuk login."
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (path === "/auth/otp/verify" && method === "POST") {
      try {
        const { otp } = await request.json();
        
        if (!otp) {
          return new Response(JSON.stringify({ error: "OTP required" }), { 
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { data: otpRow, error: fetchError } = await supabase
          .from('otps')
          .select('*')
          .eq('code', String(otp))
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        
        if (fetchError || !otpRow) {
          return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), { 
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const userIdStr = String(otpRow.telegram_id);
        const token = btoa(JSON.stringify({ 
          telegram_id: userIdStr, 
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
          platform: "browser"
        }));

        const { data: userRow } = await supabase
          .from('users')
          .select('name')
          .eq('telegram_id', userIdStr)
          .maybeSingle();

        await supabase
          .from('otps')
          .delete()
          .eq('id', otpRow.id);

        return new Response(JSON.stringify({ 
          token,
          user: { id: userIdStr, name: userRow?.name || "Kak" }
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }});
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized - no token" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = auth.substring(7);
    let userId;
    try {
      const payload = JSON.parse(atob(token));
      userId = String(payload.telegram_id);
    } catch (e) {
      userId = String(token);
    }

    if (path === "/api/airdrops" && method === "GET") {
      try {
        const { data: airdrops, error } = await supabase
          .from('airdrops')
          .select('*')
          .eq('user_id', String(userId))
          .order('created_at', { ascending: true });
        
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const formattedList = (airdrops || []).map(a => ({
          id: a.id,
          userId: a.user_id,
          name: a.name,
          deadline: a.deadline,
          status: a.status,
          skor: a.skor,
          notes: a.notes || '',
          tasks: a.tasks || [],
          createdAt: a.created_at
        }));

        return new Response(JSON.stringify(formattedList), { 
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (path === "/api/airdrops" && method === "POST") {
      try {
        const body = await request.json();
        if (!Array.isArray(body)) {
          return new Response(JSON.stringify({ error: "Expected an array of airdrops" }), { 
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        await supabase
          .from('airdrops')
          .delete()
          .eq('user_id', String(userId));

        if (body.length > 0) {
          const rowsToInsert = body.map((a) => ({
            id: a.id || undefined,
            user_id: String(userId),
            name: a.name || a.nama,
            deadline: a.deadline,
            status: a.status,
            skor: a.skor,
            notes: a.notes || '',
            tasks: a.tasks || [],
            created_at: a.createdAt || new Date().toISOString()
          }));

          const { error: insertError } = await supabase
            .from('airdrops')
            .insert(rowsToInsert);

          if (insertError) {
            return new Response(JSON.stringify({ error: insertError.message }), { 
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
        
        return new Response(JSON.stringify({ ok: true, message: "Airdrops saved to Supabase" }), { 
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (path === "/api/user" && method === "GET") {
      try {
        let { data: userRow, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', String(userId))
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (!userRow) {
          let fetchedName = `User #${userId}`;
          const botToken = env.BOT_TOKEN;
          if (botToken) {
            try {
              const url = `https://api.telegram.org/bot${botToken}/getChat?chat_id=${userId}`;
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                if (data.ok && data.result) {
                  fetchedName = data.result.first_name || data.result.username || fetchedName;
                }
              }
            } catch (e) {
              console.warn("[User/Get] Failed to fetch chat info on the fly:", e);
            }
          }

          const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert({ telegram_id: String(userId), name: fetchedName })
            .select()
            .maybeSingle();

          if (!insertError && insertedUser) {
            userRow = insertedUser;
          }
        }
        
        return new Response(
          JSON.stringify({ 
            name: userRow?.name || "Kak",
            userId: userId,
            data: userRow
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (path === "/api/dashboard/data" && method === "GET") {
      try {
        const { data: airdropsData } = await supabase
          .from('airdrops')
          .select('*')
          .eq('user_id', String(userId))
          .order('created_at', { ascending: true });

        const airdrops = (airdropsData || []).map(a => ({
          id: a.id,
          userId: a.user_id,
          name: a.name,
          deadline: a.deadline,
          status: a.status,
          skor: a.skor,
          notes: a.notes || '',
          tasks: a.tasks || [],
          createdAt: a.created_at
        }));
        
        const summary = calculateSummary(airdrops);

        const now = new Date();
        let pendingCount = 0;
        let missedCount = 0;
        
        for (const airdrop of airdrops) {
          if (airdrop.status === "pending") {
            pendingCount++;
            const deadline = new Date(airdrop.deadline);
            if (deadline < now) {
              missedCount++;
            }
          }
        }
        
        let level = 100;
        let message = "Semua airdrop aman terkendali, Kak! Yui bangga banget! Semangat terus ya! 🌸";
        
        if (missedCount > 0) {
          level = 10;
          message = `OI! Ada ${missedCount} airdrop yang kelewat deadline! Kakak niat kaya dari crypto nggak sih?! Buruan diberesin! 💢`;
        } else if (pendingCount > 6) {
          level = 35;
          message = `Kakak... airdrop-nya udah menumpuk ada ${pendingCount} pending nih! Yui khawatir nggak sempat claim semua. Jangan ditunda-tunda ya! 🥺`;
        } else if (pendingCount > 3) {
          level = 65;
          message = `Ada beberapa tugas pending nih. Yuk dicicil sekarang sebelum deadline-nya mepet! Yui temenin ya. 🌸`;
        } else {
          level = 90;
          message = `Kerja bagus, Kak! Tugas pending tinggal sedikit kok. Kakak santai aja dulu, Yui yang pantau! 💖`;
        }
        
        const mood = { level, message };
        
        return new Response(
          JSON.stringify({
            userId: userId,
            mood: mood,
            summary: summary,
            airdrops: airdrops,
            timestamp: new Date().toISOString()
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), { 
      status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
};
