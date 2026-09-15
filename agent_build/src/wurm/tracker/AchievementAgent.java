package wurm.tracker;

import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;
import java.io.ByteArrayInputStream;
import javassist.ClassPool;
import javassist.CtClass;
import javassist.CtMethod;

public class AchievementAgent {

    public static void premain(String agentArgs, Instrumentation inst) {
        System.out.println("[WurmTracker] =================================================");
        System.out.println("[WurmTracker] Wurm Online Achievement Tracker Agent initialized!");
        System.out.println("[WurmTracker] =================================================");

        inst.addTransformer(new ClassFileTransformer() {
            @Override
            public byte[] transform(ClassLoader loader, String className, Class<?> classBeingRedefined,
                                    ProtectionDomain protectionDomain, byte[] classfileBuffer) {
                if (className != null && className.equals("com/wurmonline/client/renderer/gui/i4ndLy7Opx")) {
                    try {
                        System.out.println("[WurmTracker] Found Achievement Window class: " + className + ". Instrumenting...");
                        ClassPool cp = new ClassPool();
                        cp.appendSystemPath();
                        if (loader != null) {
                            cp.appendClassPath(new javassist.LoaderClassPath(loader));
                        }
                        CtClass cc = cp.makeClass(new ByteArrayInputStream(classfileBuffer));

                        CtMethod[] methods = cc.getDeclaredMethods("BCRMM7EbTa");
                        boolean hooked5 = false;
                        boolean hooked2 = false;

                        for (CtMethod m : methods) {
                            CtClass[] params = m.getParameterTypes();
                            if (params.length == 5 &&
                                params[0].getName().equals("java.lang.String") &&
                                params[1].getName().equals("java.lang.String") &&
                                params[2] == CtClass.byteType &&
                                params[3] == CtClass.longType &&
                                params[4] == CtClass.intType) {
                                m.insertBefore("wurm.tracker.AchievementHook.record($1, $2, $3, $4, $5);");
                                hooked5 = true;
                                System.out.println("[WurmTracker] Hooked BCRMM7EbTa(name, desc, rarity, time, counter) successfully!");
                            } else if (params.length == 2 &&
                                params[0].getName().equals("java.lang.String") &&
                                params[1] == CtClass.intType) {
                                m.insertBefore("wurm.tracker.AchievementHook.updateCounter($1, $2);");
                                hooked2 = true;
                                System.out.println("[WurmTracker] Hooked BCRMM7EbTa(name, counter) successfully!");
                            }
                        }

                        if (hooked5 || hooked2) {
                            byte[] byteCode = cc.toBytecode();
                            cc.detach();
                            System.out.println("[WurmTracker] Instrumentation complete! Achievements will be tracked automatically.");
                            return byteCode;
                        }
                    } catch (Throwable t) {
                        System.err.println("[WurmTracker] Error during bytecode instrumentation: " + t.getMessage());
                        t.printStackTrace();
                    }
                }
                return null;
            }
        });
    }
}
