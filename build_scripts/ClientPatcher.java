package wurm.tracker;

import javassist.ClassPool;
import javassist.CtClass;
import javassist.CtMethod;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

public class ClientPatcher {
    public static void main(String[] args) {
        try {
            File wurmDir = (args.length > 0) ? new File(args[0]) : new File(".");
            File clientJar = new File(wurmDir, "client_live.jar");
            File backupJar = new File(wurmDir, "client_live_backup.jar");
            File oldBackupJar = new File(wurmDir, "client_live.jar.original");

            // Garantir que temos um backup com extensao .jar para o Javassist reconhecer
            if (!backupJar.exists()) {
                if (oldBackupJar.exists()) {
                    Files.copy(oldBackupJar.toPath(), backupJar.toPath(), StandardCopyOption.REPLACE_EXISTING);
                    System.out.println("Migrated backup to: " + backupJar);
                } else if (clientJar.exists()) {
                    Files.copy(clientJar.toPath(), backupJar.toPath(), StandardCopyOption.REPLACE_EXISTING);
                    System.out.println("Backup created: " + backupJar);
                } else {
                    System.err.println("client_live.jar not found in: " + wurmDir.getAbsolutePath());
                    System.exit(1);
                }
            }

            ClassPool cp = new ClassPool();
            cp.appendSystemPath();
            // O caminho DEVE terminar com .jar para o Javassist tratar como JAR e nao como diretorio
            cp.appendClassPath(backupJar.getAbsolutePath());

            CtClass cc = cp.get("com.wurmonline.client.renderer.gui.i4ndLy7Opx");
            CtMethod[] methods = cc.getDeclaredMethods("BCRMM7EbTa");
            boolean hooked5 = false;
            boolean hooked2 = false;

            for (CtMethod m : methods) {
                if (m.getSignature().equals("(Ljava/lang/String;Ljava/lang/String;BJI)V")) {
                    m.insertBefore("wurm.tracker.AchievementHook.record($1, $2, $3, $4, $5);");
                    hooked5 = true;
                    System.out.println("Hooked BCRMM7EbTa (5 params)!");
                } else if (m.getSignature().equals("(Ljava/lang/String;I)V")) {
                    m.insertBefore("wurm.tracker.AchievementHook.updateCounter($1, $2);");
                    hooked2 = true;
                    System.out.println("Hooked BCRMM7EbTa (2 params)!");
                }
            }

            if (!hooked5 || !hooked2) {
                System.err.println("Failed to find hook target methods!");
                System.exit(1);
            }

            byte[] patchedClass = cc.toBytecode();
            System.out.println("Instrumented class successfully! Size: " + patchedClass.length);

            Map<String, byte[]> newEntries = new HashMap<>();
            newEntries.put("com/wurmonline/client/renderer/gui/i4ndLy7Opx.class", patchedClass);

            // 1. Inspecionar dinamicamente o JAR que esta executando o ClientPatcher
            try {
                java.security.CodeSource cs = ClientPatcher.class.getProtectionDomain().getCodeSource();
                if (cs != null && cs.getLocation() != null) {
                    File selfJar = new File(cs.getLocation().toURI());
                    if (selfJar.isFile() && selfJar.getName().endsWith(".jar")) {
                        try (ZipFile selfZip = new ZipFile(selfJar)) {
                            Enumeration<? extends ZipEntry> se = selfZip.entries();
                            while (se.hasMoreElements()) {
                                ZipEntry entry = se.nextElement();
                                String name = entry.getName();
                                if (name.startsWith("wurm/tracker/") && name.endsWith(".class") && !name.contains("ClientPatcher")) {
                                    try (InputStream is = selfZip.getInputStream(entry)) {
                                        byte[] bytes = is.readAllBytes();
                                        newEntries.put(name, bytes);
                                        System.out.println("Discovered tracker class: " + name + " (" + bytes.length + " bytes)");
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Throwable t) {
                System.err.println("Dynamic self-discovery note: " + t.getMessage());
            }

            // 2. Lista exaustiva de seguranca caso nao esteja rodando de um JAR direto
            String[] trackerClasses = {
                "wurm/tracker/AchievementHook.class",
                "wurm/tracker/AchievementHook$Entry.class",
                "wurm/tracker/AchievementHook$EntryComparator.class",
                "wurm/tracker/AchievementHook$SaveRunner.class",
                "wurm/tracker/AchievementHook$LogFilter.class",
                "wurm/tracker/AchievementHook$FileModifiedComparator.class",
                "wurm/tracker/AchievementHook$PlayerFilter.class",
                "wurm/tracker/AchievementHook$SupabaseSender.class"
            };

            for (String tc : trackerClasses) {
                if (!newEntries.containsKey(tc)) {
                    try (InputStream is = ClientPatcher.class.getResourceAsStream("/" + tc)) {
                        if (is != null) {
                            byte[] bytes = is.readAllBytes();
                            newEntries.put(tc, bytes);
                            System.out.println("Loaded fallback resource: " + tc + " (" + bytes.length + " bytes)");
                        }
                    }
                }
            }

            File tempJar = new File(wurmDir, "client_live.tmp.jar");
            try (ZipFile zipIn = new ZipFile(backupJar);
                 ZipOutputStream zipOut = new ZipOutputStream(new FileOutputStream(tempJar))) {

                Enumeration<? extends ZipEntry> entries = zipIn.entries();
                while (entries.hasMoreElements()) {
                    ZipEntry entry = entries.nextElement();
                    String name = entry.getName();

                    if (newEntries.containsKey(name)) {
                        continue;
                    }

                    zipOut.putNextEntry(new ZipEntry(name));
                    try (InputStream is = zipIn.getInputStream(entry)) {
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = is.read(buf)) > 0) {
                            zipOut.write(buf, 0, n);
                        }
                    }
                    zipOut.closeEntry();
                }

                for (Map.Entry<String, byte[]> pair : newEntries.entrySet()) {
                    ZipEntry ze = new ZipEntry(pair.getKey());
                    zipOut.putNextEntry(ze);
                    zipOut.write(pair.getValue());
                    zipOut.closeEntry();
                    System.out.println("Injected into client: " + pair.getKey());
                }
            }

            Files.move(tempJar.toPath(), clientJar.toPath(), StandardCopyOption.REPLACE_EXISTING);
            System.out.println("client_live.jar successfully patched! (" + newEntries.size() + " classes injected)");
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}