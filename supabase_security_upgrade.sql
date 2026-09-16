-- ==============================================================================
-- Wurm Online Codex & A Guilda Achievements: Upgrade de Segurança & Performance
-- Execute este script no SQL Editor do seu Dashboard no Supabase:
-- https://supabase.com/dashboard/project/gzhvqprdrtudyokhgxlj/sql
-- ==============================================================================

-- 1. ADICIONAR COLUNAS NECESSÁRIAS
ALTER TABLE public.player_achievements 
  ADD COLUMN IF NOT EXISTS claim_token TEXT,
  ADD COLUMN IF NOT EXISTS score INT DEFAULT 0;

-- 2. ÍNDICES DE ALTA PERFORMANCE PARA O LEADERBOARD
CREATE INDEX IF NOT EXISTS idx_player_achievements_score ON public.player_achievements (score DESC);
CREATE INDEX IF NOT EXISTS idx_player_achievements_updated ON public.player_achievements (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_achievements_name ON public.player_achievements (player_name);

-- 3. FUNÇÃO DO TRIGGER: RECÁLCULO SERVER-SIDE, SEGURANÇA E PROTEÇÃO DE POSSE (CLAIM TOKEN)
CREATE OR REPLACE FUNCTION public.handle_player_achievements_security_and_stats()
RETURNS TRIGGER AS $$
DECLARE
  calc_score INT := 0;
  calc_total INT := 0;
  calc_golds INT := 0;
  calc_diamonds INT := 0;
  calc_silvers INT := 0;
  calc_bronzes INT := 0;
  calc_max INT := 0;
  calc_top TEXT := '';
  ach_elem JSONB;
  r TEXT;
  cnt INT;
  nam TEXT;
BEGIN
  -- A. PROTEÇÃO CONTRA SPAM / PAYLOAD GIGANTE
  IF NEW.achievements IS NOT NULL AND jsonb_array_length(NEW.achievements) > 1500 THEN
    RAISE EXCEPTION 'Payload de conquistas excede o limite máximo permitido (1500 itens).';
  END IF;

  -- B. PROTEÇÃO DE POSSE DO NICK (CLAIM TOKEN)
  -- Se o registro já existe (UPDATE) e possui um claim_token definido:
  IF TG_OP = 'UPDATE' THEN
    IF OLD.claim_token IS NOT NULL AND OLD.claim_token <> '' THEN
      -- Se a atualização tentar trocar ou não enviar o mesmo claim_token, bloquear:
      IF NEW.claim_token IS NULL OR NEW.claim_token <> OLD.claim_token THEN
        RAISE EXCEPTION 'Acesso negado: claim_token inválido para o personagem %.', OLD.player_name;
      END IF;
    ELSE
      -- Se o registro antigo ainda não tinha claim_token (legado), aceitar e fixar o token que veio agora:
      IF NEW.claim_token IS NULL OR NEW.claim_token = '' THEN
        NEW.claim_token := OLD.claim_token;
      END IF;
    END IF;
  END IF;

  -- C. RECÁLCULO SEGURO NO SERVIDOR A PARTIR DO ARRAY REAL DE CONQUISTAS
  -- Impede que um usuário forje "score" ou "total_count" enviando números adulterados
  IF NEW.achievements IS NOT NULL AND jsonb_array_length(NEW.achievements) > 0 THEN
    FOR ach_elem IN SELECT * FROM jsonb_array_elements(NEW.achievements) LOOP
      calc_total := calc_total + 1;
      r := lower(COALESCE(ach_elem->>'rarity', ''));
      cnt := COALESCE((ach_elem->>'counter')::INT, 1);
      nam := COALESCE(ach_elem->>'name', '');

      IF r = 'diamond' THEN
        calc_score := calc_score + 50;
        calc_diamonds := calc_diamonds + 1;
      ELSIF r = 'gold' THEN
        calc_score := calc_score + 25;
        calc_golds := calc_golds + 1;
      ELSIF r = 'silver' THEN
        calc_score := calc_score + 10;
        calc_silvers := calc_silvers + 1;
      ELSIF r = 'bronze' THEN
        calc_score := calc_score + 5;
        calc_bronzes := calc_bronzes + 1;
      ELSE
        calc_score := calc_score + 1;
      END IF;

      IF cnt > calc_max THEN
        calc_max := cnt;
        calc_top := nam;
      END IF;
    END LOOP;

    -- Atribuir os valores recalculados com segurança
    NEW.total_count := calc_total;
    NEW.gold_count := calc_golds;
    NEW.score := calc_score;
    NEW.max_counter := calc_max;
    NEW.top_achievement := calc_top;
  ELSE
    -- Se estiver cadastrando ou sem conquistas ainda
    IF NEW.total_count IS NULL THEN NEW.total_count := 0; END IF;
    IF NEW.gold_count IS NULL THEN NEW.gold_count := 0; END IF;
    IF NEW.score IS NULL THEN NEW.score := 0; END IF;
    IF NEW.max_counter IS NULL THEN NEW.max_counter := 0; END IF;
    IF NEW.top_achievement IS NULL THEN NEW.top_achievement := ''; END IF;
  END IF;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. APLICAR O TRIGGER NA TABELA
DROP TRIGGER IF EXISTS trg_player_achievements_security ON public.player_achievements;
CREATE TRIGGER trg_player_achievements_security
BEFORE INSERT OR UPDATE ON public.player_achievements
FOR EACH ROW
EXECUTE FUNCTION public.handle_player_achievements_security_and_stats();

-- 5. RECALCULAR PONTUAÇÃO E ESTATÍSTICAS DOS JOGADORES JÁ CADASTRADOS
UPDATE public.player_achievements 
SET updated_at = NOW() 
WHERE achievements IS NOT NULL;

-- Confirmação
SELECT player_name, total_count, gold_count, score, max_counter, top_achievement, updated_at 
FROM public.player_achievements 
ORDER BY score DESC;
