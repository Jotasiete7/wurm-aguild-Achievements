package wurm.tracker;

import javassist.ClassPool;
import javassist.CtClass;
import javassist.CtMethod;
import java.io.*;

public class InspectClass {
    public static void main(String[] args) throws Exception {
        ClassPool cp = new ClassPool();
        cp.appendSystemPath();
        cp.appendClassPath("D:/SteamLibrary/steamapps/common/Wurm Online/client_live.jar");
        CtClass cc = cp.get("com.wurmonline.client.renderer.gui.i4ndLy7Opx");
        for (CtMethod m : cc.getDeclaredMethods()) {
            System.out.println("Method: " + m.getName() + " sig: " + m.getSignature());
        }
    }
}