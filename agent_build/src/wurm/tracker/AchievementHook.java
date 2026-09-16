package wurm.tracker;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.*;

public class AchievementHook {

    private static final String SUPABASE_URL = "https://gzhvqprdrtudyokhgxlj.supabase.co/rest/v1/player_achievements";
    private static final String SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aHZxcHJkcnR1ZHlva2hneGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTQ2MTUsImV4cCI6MjA4MzMzMDYxNX0.aSJIhfViQsb0dBjb5bOup49GCrQBt93uSkZySZAXcNo";

    public static class Entry {
        public String name;
        public String description;
        public byte rarity;
        public long timestamp;
        public int counter;

        public Entry(String name, String description, byte rarity, long timestamp, int counter) {
            this.name = name;
            this.description = description;
            this.rarity = rarity;
            this.timestamp = timestamp;
            this.counter = counter;
        }
    }

    public static class EntryComparator implements Comparator<Entry> {
        @Override
        public int compare(Entry a, Entry b) {
            return Integer.compare(b.counter, a.counter);
        }
    }

    public static class SaveRunner implements Runnable {
        @Override
        public void run() {
            try {
                saveAll();
            } catch (Throwable t) {
                log("Error in scheduled saveAll: " + t.getMessage());
            }
        }
    }

    public static class LogFilter implements FilenameFilter {
        @Override
        public boolean accept(File dir, String name) {
            return name.startsWith("console.") && name.endsWith(".log") && !name.contains("apenasrecrutoum");
        }
    }

    public static class FileModifiedComparator implements Comparator<File> {
        @Override
        public int compare(File f1, File f2) {
            return Long.compare(f2.lastModified(), f1.lastModified());
        }
    }

    public static class PlayerFilter implements FileFilter {
        @Override
        public boolean accept(File f) {
            return f.isDirectory() && !f.getName().equalsIgnoreCase("configs");
        }
    }

    public static class SupabaseSender implements Runnable {
        private final String player;
        private final String arrayJson;
        private final int total;
        private final int goldCount;
        private final int diamondCount;
        private final int score;
        private final String topName;
        private final int maxCounter;
        private final String claimToken;

        public SupabaseSender(String player, String arrayJson, int total, int goldCount, int diamondCount, int score, String topName, int maxCounter, String claimToken) {
            this.player = player;
            this.arrayJson = arrayJson;
            this.total = total;
            this.goldCount = goldCount;
            this.diamondCount = diamondCount;
            this.score = score;
            this.topName = topName;
            this.maxCounter = maxCounter;
            this.claimToken = claimToken;
        }

        @Override
        public void run() {
            try {
                log("Sending " + total + " achievements for player '" + player + "' (Score: " + score + ", Golds: " + goldCount + ") to Supabase Cloud...");

                SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
                iso.setTimeZone(TimeZone.getTimeZone("UTC"));

                StringBuilder body = new StringBuilder();
                body.append("[{\n");
                body.append("  \"player_name\": \"").append(escapeJson(player)).append("\",\n");
                if (claimToken != null && !claimToken.isEmpty()) {
                    body.append("  \"claim_token\": \"").append(escapeJson(claimToken)).append("\",\n");
                }
                body.append("  \"achievements\": ").append(arrayJson).append(",\n");
                body.append("  \"total_count\": ").append(total).append(",\n");
                body.append("  \"gold_count\": ").append(goldCount).append(",\n");
                body.append("  \"score\": ").append(score).append(",\n");
                body.append("  \"max_counter\": ").append(maxCounter).append(",\n");
                body.append("  \"top_achievement\": \"").append(escapeJson(topName)).append("\",\n");
                body.append("  \"updated_at\": \"").append(iso.format(new Date())).append("\"\n");
                body.append("}]");

                int code = postJson(SUPABASE_URL, body.toString());
                if (code == 400 && (claimToken != null || score > 0)) {
                    // Fallback retrocompativel caso a coluna nao exista ainda
                    StringBuilder legacyBody = new StringBuilder();
                    legacyBody.append("[{\n");
                    legacyBody.append("  \"player_name\": \"").append(escapeJson(player)).append("\",\n");
                    legacyBody.append("  \"achievements\": ").append(arrayJson).append(",\n");
                    legacyBody.append("  \"total_count\": ").append(total).append(",\n");
                    legacyBody.append("  \"gold_count\": ").append(goldCount).append(",\n");
                    legacyBody.append("  \"max_counter\": ").append(maxCounter).append(",\n");
                    legacyBody.append("  \"top_achievement\": \"").append(escapeJson(topName)).append("\",\n");
                    legacyBody.append("  \"updated_at\": \"").append(iso.format(new Date())).append("\"\n");
                    legacyBody.append("}]");
                    code = postJson(SUPABASE_URL, legacyBody.toString());
                }

                if (code >= 200 && code < 300) {
                    log("Supabase auto-sync SUCCESS: HTTP " + code + " (Achievements published to Cloud Ranking!)");
                } else {
                    log("Supabase auto-sync returned HTTP status: " + code);
                }
            } catch (Throwable t) {
                log("Supabase auto-sync error: " + t.getMessage());
            }
        }
    }

    private static final Map<String, Entry> achievements = new ConcurrentHashMap<>();
    private static final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private static ScheduledFuture<?> saveTask = null;
    private static String cachedPlayerName = null;
    private static String cachedClaimToken = null;

    public static synchronized void log(String msg) {
        System.out.println("[WurmTracker] " + msg);
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            String line = "[" + sdf.format(new Date()) + "] " + msg + "\r\n";
            appendFile(new File("gamedata/wurm_tracker.log"), line);
            appendFile(new File("wurm_tracker.log"), line);
        } catch (Throwable ignored) {}
    }

    private static void appendFile(File f, String text) {
        try {
            if (f.getParentFile() != null) f.getParentFile().mkdirs();
            try (FileOutputStream fos = new FileOutputStream(f, true);
                 OutputStreamWriter osw = new OutputStreamWriter(fos, StandardCharsets.UTF_8)) {
                osw.write(text);
            }
        } catch (Throwable ignored) {}
    }

    public static void record(String name, String description, byte rarity, long timestamp, int counter) {
        if (name == null || name.isEmpty()) return;
        Entry e = achievements.get(name);
        if (e == null) {
            e = new Entry(name, description, rarity, timestamp, counter);
            achievements.put(name, e);
        } else {
            e.counter = counter;
            if (timestamp > 0) e.timestamp = timestamp;
            if (description != null && !description.isEmpty()) e.description = description;
            e.rarity = rarity;
        }
        scheduleSave();
    }

    public static void updateCounter(String name, int counter) {
        if (name == null || name.isEmpty()) return;
        Entry e = achievements.get(name);
        if (e != null) {
            e.counter = counter;
        } else {
            e = new Entry(name, "", (byte) 2, System.currentTimeMillis(), counter);
            achievements.put(name, e);
        }
        scheduleSave();
    }

    private static synchronized void scheduleSave() {
        if (saveTask != null && !saveTask.isDone()) {
            saveTask.cancel(false);
        }
        saveTask = scheduler.schedule(new SaveRunner(), 1, TimeUnit.SECONDS);
    }

    public static String detectPlayerName() {
        if (cachedPlayerName != null && !cachedPlayerName.isEmpty()) return cachedPlayerName;

        // 1. Ler explicitamente de wurm_tracker.cfg se existir
        String[] configPaths = {"wurm_tracker.cfg", "gamedata/wurm_tracker.cfg", "../wurm_tracker.cfg"};
        for (String cp : configPaths) {
            File cfg = new File(cp);
            if (cfg.exists()) {
                try (BufferedReader br = new BufferedReader(new FileReader(cfg, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        line = line.trim();
                        if (line.startsWith("player_name=")) {
                            String nick = line.substring("player_name=".length()).trim();
                            if (!nick.isEmpty()) {
                                cachedPlayerName = nick;
                                log("Player name loaded from config: " + nick);
                                return nick;
                            }
                        }
                    }
                } catch (Throwable ignored) {}
            }
        }

        // 2. Procurar na pasta gamedata
        try {
            File gamedata = new File("gamedata");
            if (!gamedata.exists()) {
                gamedata = new File(System.getProperty("user.dir"), "gamedata");
            }
            if (gamedata.exists() && gamedata.isDirectory()) {
                File[] consoleLogs = gamedata.listFiles(new LogFilter());
                if (consoleLogs != null && consoleLogs.length > 0) {
                    Arrays.sort(consoleLogs, new FileModifiedComparator());
                    String fname = consoleLogs[0].getName();
                    String nick = fname.substring("console.".length(), fname.length() - ".log".length());
                    if (!nick.isEmpty()) {
                        cachedPlayerName = nick;
                        log("Player name detected from console log: " + nick);
                        return nick;
                    }
                }

                File playersDir = new File(gamedata, "players");
                if (playersDir.exists() && playersDir.isDirectory()) {
                    File[] pDirs = playersDir.listFiles(new PlayerFilter());
                    if (pDirs != null && pDirs.length > 0) {
                        Arrays.sort(pDirs, new FileModifiedComparator());
                        cachedPlayerName = pDirs[0].getName();
                        log("Player name detected from players folder: " + cachedPlayerName);
                        return cachedPlayerName;
                    }
                }
            }
        } catch (Throwable ignored) {}

        return "Desconhecido";
    }

    public static String detectClaimToken() {
        if (cachedClaimToken != null && !cachedClaimToken.isEmpty()) return cachedClaimToken;

        String[] configPaths = {"wurm_tracker.cfg", "gamedata/wurm_tracker.cfg", "../wurm_tracker.cfg"};
        for (String cp : configPaths) {
            File cfg = new File(cp);
            if (cfg.exists()) {
                try (BufferedReader br = new BufferedReader(new FileReader(cfg, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        line = line.trim();
                        if (line.startsWith("claim_token=")) {
                            String token = line.substring("claim_token=".length()).trim();
                            if (!token.isEmpty()) {
                                cachedClaimToken = token;
                                return token;
                            }
                        }
                    }
                } catch (Throwable ignored) {}
            }
        }
        return null;
    }

    private static String getRarityName(byte r) {
        switch (r) {
            case 2: return "Bronze";
            case 3: return "Silver";
            case 4: return "Gold";
            case 5: return "Diamond";
            default: return "Normal";
        }
    }

    private static int getRarityPoints(byte r) {
        switch (r) {
            case 5: return 50; // Diamond
            case 4: return 25; // Gold
            case 3: return 10; // Silver
            case 2: return 5;  // Bronze
            default: return 1; // Normal
        }
    }

    public static synchronized void saveAll() {
        try {
            String player = detectPlayerName();
            log("Saving " + achievements.size() + " achievements for player: " + player);

            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            sdf.setTimeZone(TimeZone.getDefault());

            StringBuilder sb = new StringBuilder();
            sb.append("{\n");
            sb.append("  \"player\": \"").append(escapeJson(player)).append("\",\n");
            sb.append("  \"last_updated\": \"").append(sdf.format(new Date())).append("\",\n");
            sb.append("  \"total\": ").append(achievements.size()).append(",\n");
            sb.append("  \"achievements\": [\n");

            List<Entry> list = new ArrayList<>(achievements.values());
            Collections.sort(list, new EntryComparator());

            int goldCount = 0;
            int diamondCount = 0;
            int totalScore = 0;

            for (int i = 0; i < list.size(); i++) {
                Entry e = list.get(i);
                String rName = getRarityName(e.rarity);
                if ("Gold".equals(rName)) goldCount++;
                if ("Diamond".equals(rName)) diamondCount++;
                totalScore += getRarityPoints(e.rarity);

                sb.append("    {\n");
                sb.append("      \"name\": \"").append(escapeJson(e.name)).append("\",\n");
                sb.append("      \"description\": \"").append(escapeJson(e.description)).append("\",\n");
                sb.append("      \"rarity_id\": ").append(e.rarity).append(",\n");
                sb.append("      \"rarity\": \"").append(rName).append("\",\n");
                sb.append("      \"counter\": ").append(e.counter).append(",\n");
                sb.append("      \"timestamp\": ").append(e.timestamp).append(",\n");
                sb.append("      \"date\": \"").append(e.timestamp > 0 ? sdf.format(new Date(e.timestamp)) : "").append("\"\n");
                sb.append("    }").append(i < list.size() - 1 ? ",\n" : "\n");
            }
            sb.append("  ]\n");
            String arrayJson = sb.toString().substring(sb.indexOf("[\n"));
            sb.append("}\n");

            String json = sb.toString();

            File destPlayer = new File("gamedata/players/" + player + "/achievements_" + player + ".json");
            writeFile(destPlayer, json);

            File destLatest = new File("achievements_latest.json");
            writeFile(destLatest, json);

            File destGamedataLatest = new File("gamedata/achievements_latest.json");
            writeFile(destGamedataLatest, json);

            log("Achievements saved locally (" + list.size() + " entries, score: " + totalScore + "). Triggering Supabase Cloud sync...");

            final int totalCount = list.size();
            final int finalGoldCount = goldCount;
            final int finalDiamondCount = diamondCount;
            final int finalScore = totalScore;
            final String topName = list.isEmpty() ? "" : list.get(0).name;
            final int maxCounter = list.isEmpty() ? 0 : list.get(0).counter;
            final String claimToken = detectClaimToken();

            Thread t = new Thread(new SupabaseSender(player, arrayJson, totalCount, finalGoldCount, finalDiamondCount, finalScore, topName, maxCounter, claimToken));
            t.setDaemon(true);
            t.start();
        } catch (Throwable t) {
            StringWriter sw = new StringWriter();
            t.printStackTrace(new PrintWriter(sw));
            log("FATAL ERROR in saveAll: " + sw.toString());
        }
    }

    private static int postJson(String urlStr, String jsonBody) throws IOException {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("apikey", SUPABASE_KEY);
        conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_KEY);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Prefer", "resolution=merge-duplicates");
        conn.setDoOutput(true);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(10000);

        byte[] bytes = jsonBody.getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(bytes);
        }
        return conn.getResponseCode();
    }

    private static void writeFile(File f, String content) {
        try {
            if (f.getParentFile() != null) f.getParentFile().mkdirs();
            try (OutputStreamWriter w = new OutputStreamWriter(new FileOutputStream(f), StandardCharsets.UTF_8)) {
                w.write(content);
            }
        } catch (Throwable t) {
            log("Failed to write to " + f + ": " + t.getMessage());
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c == '"') sb.append("\\\"");
            else if (c == '\\') sb.append("\\\\");
            else if (c == '\b') sb.append("\\b");
            else if (c == '\f') sb.append("\\f");
            else if (c == '\n') sb.append("\\n");
            else if (c == '\r') sb.append("\\r");
            else if (c == '\t') sb.append("\\t");
            else if (c < ' ') {
                String t = "000" + Integer.toHexString(c);
                sb.append("\\u").append(t.substring(t.length() - 4));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
