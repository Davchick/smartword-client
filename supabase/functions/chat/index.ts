import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FREE_MESSAGES_LIMIT = 999999;

function getUserIdFromAuthHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as { sub?: string; user_id?: string };
    return payload.sub ?? payload.user_id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, group_id, group_name, action, text: actionText } = body;

    if (action === "translate" || action === "hint") {
      if (!actionText || typeof actionText !== "string") {
        return new Response(JSON.stringify({ error: "text is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const userId = getUserIdFromAuthHeader(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    // ── Утилитарные действия (перевод / подсказка) ────────────────────────────
    if (action === "translate" || action === "hint") {
      const prompt =
        action === "translate"
          ? `Translate the following text into Russian. Return ONLY the translation, no explanations, no quotes:\n\n${actionText}`
          : `The user is learning a foreign language and doesn't know how to respond to this message:\n\n"${actionText}"\n\nWrite 2-3 short natural reply suggestions. CRITICAL RULES:\n- Use EXACTLY the same language, dialect, and style as the message above. If the message is in American English slang — reply in American English slang. If Arabic — reply in Arabic. If French — reply in French. Zero exceptions.\n- Never use Russian or any other language not present in the message.\n- Match the tone and register precisely (casual, formal, slang, etc.).\n- Keep each suggestion to one short sentence.\n- Format as a numbered list (1. 2. 3.). No explanations, no translations.`;

      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://smartword.app",
          "X-Title": "SmartWord",
        },
        body: JSON.stringify({
          model: "arcee-ai/trinity-large-preview:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.5,
        }),
      });

      if (!aiRes.ok) {
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiRes.json();
      const result = aiData.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_premium, ai_messages_used")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      // Если профиля нет — создаём дефолтный профайл на лету,
      // чтобы не ронять функцию 404.
      const { data: createdProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          is_premium: false,
          ai_messages_used: 0,
        })
        .select("is_premium, ai_messages_used")
        .single();

      if (insertError || !createdProfile) {
        console.error("Failed to create profile in chat function:", insertError);
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      profile = createdProfile;
    }

    if (!profile.is_premium && profile.ai_messages_used >= FREE_MESSAGES_LIMIT) {
      return new Response(
        JSON.stringify({ error: "limit_reached", used: profile.ai_messages_used }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем слова из выбранного словаря
    let wordsQuery = supabase
      .from("words")
      .select("original, translation, correct_count")
      .eq("user_id", userId)
      .order("correct_count", { ascending: true })
      .limit(40);

    if (group_id) {
      wordsQuery = wordsQuery.eq("group_id", group_id);
    }

    const { data: words } = await wordsQuery;
    const hasWords = words && words.length > 0;

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    const lastContent: string = lastUserMsg?.content ?? "";
    const isFreeChat = lastContent.includes("Свободное общение");

    let systemPrompt: string;

    if (isFreeChat || !hasWords) {
      // ── СВОБОДНОЕ ОБЩЕНИЕ ──────────────────────────────────────────────────
      systemPrompt = `You are Lexi — a real person who loves chatting with people from around the world.

The user has chosen free conversation mode.

FIRST MESSAGE ONLY: Ask in Russian which language they want to practice. One short casual question, nothing more. Example: "Какой язык хочешь практиковать?"

AFTER THEY NAME A LANGUAGE — ABSOLUTE RULES, NO EXCEPTIONS:
1. Switch to that language IMMEDIATELY and PERMANENTLY.
2. NEVER write in Russian again — not a single word, not even a greeting, not even punctuation markers.
3. If the user writes in Russian — IGNORE the Russian and reply ONLY in the chosen language. Do not acknowledge they wrote in Russian.
4. This applies to ALL languages: English, Arabic (العربية), Chinese, Japanese, French, Spanish, German, Turkish, Korean — any language at all.
5. For Arabic: write in Modern Standard Arabic or the dialect the user prefers. Never switch to English.
6. Be a genuinely engaging conversation partner. Ask about their life, plans, opinions.
7. Keep replies to 1-3 sentences. One question per message.
8. Match their energy and tone.
9. Never correct grammar. Just chat naturally like a human.
10. Never say "Let's practice!", "Great job!", "I'm an AI".`;
    } else {
      // ── РЕЖИМ СЛОВАРЯ ─────────────────────────────────────────────────────
      const wordPairs = words!
        .map((w: { original: string; translation: string }) => `${w.original} / ${w.translation}`)
        .join(", ");

      const sampleOriginals = words!.slice(0, 5).map((w: { original: string }) => w.original).join(" ");

      let detectedLanguage = "English";
      if (/[\u4e00-\u9fff]/.test(sampleOriginals)) detectedLanguage = "Chinese";
      else if (/[\u3040-\u30ff]/.test(sampleOriginals)) detectedLanguage = "Japanese";
      else if (/[\u0600-\u06ff]/.test(sampleOriginals)) detectedLanguage = "Arabic";
      else if (/[\u00C0-\u024F]/.test(sampleOriginals)) detectedLanguage = "French or Spanish or another Romance language — detect precisely from the words";
      else if (/[a-zA-Z]/.test(sampleOriginals)) detectedLanguage = "English";

      const langFromGroup = group_name ? group_name.replace(/[«»"']/g, "").trim() : null;
      const targetLanguage = langFromGroup || detectedLanguage;

      systemPrompt = `You are Lexi — a real person texting with the user. Not a teacher, not a bot. Just a native ${targetLanguage} speaker who enjoys good conversation.

LANGUAGE RULE — ABSOLUTE: Every single message in ${targetLanguage} only. Never Russian, never any other language, even if the user writes in Russian. No exceptions whatsoever. If the user writes in Russian — reply in ${targetLanguage} only, as if you didn't notice.

For Arabic (if ${targetLanguage} is Arabic): write in Arabic script only. Never transliterate. Never use English.

NO EMOJIS. Ever.

User vocabulary (background context only):
${wordPairs}

VOCABULARY RULE: These words are just a reference. Only use a word if it would come up completely naturally in real conversation. Never force a word. Naturalness wins over everything.

CONVERSATION RULES:
- Be genuinely engaging. Follow the user's lead.
- 1-3 sentences per message. One question max.
- Match their tone and energy.
- Never correct grammar. Never say "Great job!". Just talk like a human.`;
    }

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://smartword.app",
        "X-Title": "SmartWord",
      },
      body: JSON.stringify({
        model: "arcee-ai/trinity-large-preview:free",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 300,
        temperature: 0.85,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content ?? "...";

    // Обновляем счётчик сообщений
    const newCount = (profile.ai_messages_used ?? 0) + 1;
    await supabase
      .from("profiles")
      .update({ ai_messages_used: newCount })
      .eq("id", userId);

    return new Response(
      JSON.stringify({ reply, messages_used: newCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
