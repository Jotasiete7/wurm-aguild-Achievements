package wurm.tracker;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.*;

public class AchievementHook {

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

    private static final Map<String, Entry> achievements = new ConcurrentHashMap<>();
    private static final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private static ScheduledFuture<?> saveTask = null;
    private static String cachedPlayerName = null;

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
        saveTask = scheduler.schedule(new Runnable() {
            @Override
            public void run() {
                saveAll();
            }
        }, 1, TimeUnit.SECONDS);
    }

    public static String detectPlayerName() {
        if (cachedPlayerName != null) return cachedPlayerName;

        try {
            File gamedata = new File("gamedata");
            if (!gamedata.exists()) {
                gamedata = new File("D:\\SteamLibrary\\steamapps\\common\\Wurm Online\\gamedata");
            }
            if (gamedata.exists() && gamedata.isDirectory()) {
                File[] consoleLogs = gamedata.listFiles(new FilenameFilter() {
                    @Override
                    public boolean accept(File dir, String name) {
                        return name.startsWith("console.") && name.endsWith(".log") && !name.contains("apenasrecrutoum");
                    }
                });
                if (consoleLogs != null && consoleLogs.length > 0) {
                    Arrays.sort(consoleLogs, new Comparator<File>() {
                        @Override
                        public int compare(File f1, File f2) {
                            return Long.compare(f2.lastModified(), f1.lastModified());
                        }
                    });
                    String fname = consoleLogs[0].getName();
                    String nick = fname.substring("console.".length(), fname.length() - ".log".length());
                    if (!nick.isEmpty()) {
                        cachedPlayerName = nick;
                        return nick;
                    }
                }
            }
        } catch (Throwable ignored) {}

        cachedPlayerName = "jotasiete";
        return cachedPlayerName;
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

    public static synchronized void saveAll() {
        String player = detectPlayerName();
        System.out.println("[WurmTracker] Saving " + achievements.size() + " achievements for player: " + player);

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        sdf.setTimeZone(TimeZone.getDefault());

        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("  \"player\": \"").append(escapeJson(player)).append("\",\n");
        sb.append("  \"last_updated\": \"").append(sdf.format(new Date())).append("\",\n");
        sb.append("  \"total\": ").append(achievements.size()).append(",\n");
        sb.append("  \"achievements\": [\n");

        List<Entry> list = new ArrayList<>(achievements.values());
        Collections.sort(list, new Comparator<Entry>() {
            @Override
            public int compare(Entry a, Entry b) {
                return Integer.compare(b.counter, a.counter);
            }
        });

        for (int i = 0; i < list.size(); i++) {
            Entry e = list.get(i);
            sb.append("    {\n");
            sb.append("      \"name\": \"").append(escapeJson(e.name)).append("\",\n");
            sb.append("      \"description\": \"").append(escapeJson(e.description)).append("\",\n");
            sb.append("      \"rarity_id\": ").append(e.rarity).append(",\n");
            sb.append("      \"rarity\": \"").append(getRarityName(e.rarity)).append("\",\n");
            sb.append("      \"counter\": ").append(e.counter).append(",\n");
            sb.append("      \"timestamp\": ").append(e.timestamp).append(",\n");
            sb.append("      \"date\": \"").append(e.timestamp > 0 ? sdf.format(new Date(e.timestamp)) : "").append("\"\n");
            sb.append("    }").append(i < list.size() - 1 ? ",\n" : "\n");
        }
        sb.append("  ]\n");
        sb.append("}\n");

        String json = sb.toString();

        File dest1 = new File("C:\\Users\\Metalgear\\Documents\\antigravity\\fervent-lovelace\\achievements_" + player + ".json");
        writeFile(dest1, json);

        File destLatest = new File("C:\\Users\\Metalgear\\Documents\\antigravity\\fervent-lovelace\\achievements_latest.json");
        writeFile(destLatest, json);

        File dest2 = new File("D:\\SteamLibrary\\steamapps\\common\\Wurm Online\\gamedata\\players\\" + player + "\\achievements_" + player + ".json");
        writeFile(dest2, json);

        System.out.println("[WurmTracker] Achievements successfully written to " + dest1.getAbsolutePath());
    }

    private static void writeFile(File f, String content) {
        try {
            if (f.getParentFile() != null) f.getParentFile().mkdirs();
            try (OutputStreamWriter w = new OutputStreamWriter(new FileOutputStream(f), StandardCharsets.UTF_8)) {
                w.write(content);
            }
        } catch (Throwable t) {
            System.err.println("[WurmTracker] Failed to write to " + f + ": " + t.getMessage());
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
