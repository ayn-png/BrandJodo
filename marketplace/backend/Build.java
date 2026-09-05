import javax.tools.*;
import java.io.File;
import java.nio.file.*;
import java.util.*;
import java.util.stream.*;

public class Build {
    public static void main(String[] args) throws Exception {
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            System.err.println("No system Java compiler available.");
            System.exit(1);
        }
        Path srcRoot = Paths.get("src/main/java");
        Path outDir = Paths.get("out");
        Files.createDirectories(outDir);

        List<String> sources = Files.walk(srcRoot)
                .filter(p -> p.toString().endsWith(".java"))
                .map(Path::toString)
                .collect(Collectors.toList());

        List<String> options = List.of("-d", outDir.toString());
        List<String> fullArgs = new ArrayList<>(options);
        fullArgs.addAll(sources);

        StringWriterOut out = new StringWriterOut();
        int result = compiler.run(null, System.out, System.err, fullArgs.toArray(new String[0]));
        System.out.println(result == 0 ? "BUILD SUCCESS" : "BUILD FAILED");
        System.exit(result);
    }

    static class StringWriterOut {}
}
