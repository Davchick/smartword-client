-- ============================================================
-- SmartWord — SQL Schema для Supabase
-- Выполнить в: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. PROFILES (расширение auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium        BOOLEAN NOT NULL DEFAULT FALSE,
  ai_messages_used  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- 2. ТРИГГЕР: создать profile при регистрации
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. WORD_GROUPS (языковые группы)
-- ============================================================
CREATE TABLE public.word_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.word_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own groups"
  ON public.word_groups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. WORDS (слова)
-- ============================================================
CREATE TABLE public.words (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES public.word_groups(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original        TEXT NOT NULL,
  translation     TEXT NOT NULL,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  last_reviewed   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own words"
  ON public.words FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. ИНДЕКСЫ
-- ============================================================
CREATE INDEX idx_word_groups_user_id ON public.word_groups(user_id);
CREATE INDEX idx_words_user_id ON public.words(user_id);
CREATE INDEX idx_words_group_id ON public.words(group_id);
-- Составной индекс для алгоритма тренировки
CREATE INDEX idx_words_training ON public.words(correct_count ASC, last_reviewed ASC NULLS FIRST);
