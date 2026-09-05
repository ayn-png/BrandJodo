package com.marketplace.util;

import java.util.*;

/**
 * Minimal hand-rolled JSON reader/writer.
 *
 * In a normal environment this project would use Spring Boot + Jackson
 * (see backend/README.md for the equivalent Spring Boot code). This sandbox
 * has no network access, so Maven/Spring artifacts cannot be downloaded.
 * This class fills that gap using only the JDK so the service still speaks
 * real JSON over HTTP.
 */
public final class Json {

    private Json() {}

    // ---------- Writing ----------

    public static String write(Object o) {
        StringBuilder sb = new StringBuilder();
        writeValue(o, sb);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private static void writeValue(Object o, StringBuilder sb) {
        if (o == null) {
            sb.append("null");
        } else if (o instanceof String s) {
            writeString(s, sb);
        } else if (o instanceof Number || o instanceof Boolean) {
            sb.append(o.toString());
        } else if (o instanceof Map<?, ?> map) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> e : map.entrySet()) {
                if (!first) sb.append(',');
                first = false;
                writeString(String.valueOf(e.getKey()), sb);
                sb.append(':');
                writeValue(e.getValue(), sb);
            }
            sb.append('}');
        } else if (o instanceof Iterable<?> list) {
            sb.append('[');
            boolean first = true;
            for (Object item : list) {
                if (!first) sb.append(',');
                first = false;
                writeValue(item, sb);
            }
            sb.append(']');
        } else {
            // Fallback: unknown object -> toString as a JSON string
            writeString(o.toString(), sb);
        }
    }

    private static void writeString(String s, StringBuilder sb) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        sb.append('"');
    }

    // ---------- Reading ----------

    public static Object parse(String text) {
        Parser p = new Parser(text);
        Object v = p.parseValue();
        p.skipWhitespace();
        return v;
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> parseObject(String text) {
        if (text == null || text.isBlank()) return new LinkedHashMap<>();
        Object v = parse(text);
        if (v instanceof Map) return (Map<String, Object>) v;
        throw new IllegalArgumentException("Expected a JSON object body");
    }

    private static final class Parser {
        private final String s;
        private int i = 0;

        Parser(String s) { this.s = s; }

        void skipWhitespace() {
            while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++;
        }

        char peek() { return s.charAt(i); }

        Object parseValue() {
            skipWhitespace();
            char c = peek();
            return switch (c) {
                case '{' -> parseObj();
                case '[' -> parseArr();
                case '"' -> parseStr();
                case 't', 'f' -> parseBool();
                case 'n' -> parseNull();
                default -> parseNum();
            };
        }

        Map<String, Object> parseObj() {
            Map<String, Object> map = new LinkedHashMap<>();
            i++; // {
            skipWhitespace();
            if (peek() == '}') { i++; return map; }
            while (true) {
                skipWhitespace();
                String key = parseStr();
                skipWhitespace();
                if (peek() != ':') throw new IllegalArgumentException("Expected ':' at " + i);
                i++;
                Object val = parseValue();
                map.put(key, val);
                skipWhitespace();
                char c = peek();
                if (c == ',') { i++; continue; }
                if (c == '}') { i++; break; }
                throw new IllegalArgumentException("Expected ',' or '}' at " + i);
            }
            return map;
        }

        List<Object> parseArr() {
            List<Object> list = new ArrayList<>();
            i++; // [
            skipWhitespace();
            if (peek() == ']') { i++; return list; }
            while (true) {
                Object val = parseValue();
                list.add(val);
                skipWhitespace();
                char c = peek();
                if (c == ',') { i++; continue; }
                if (c == ']') { i++; break; }
                throw new IllegalArgumentException("Expected ',' or ']' at " + i);
            }
            return list;
        }

        String parseStr() {
            if (peek() != '"') throw new IllegalArgumentException("Expected string at " + i);
            i++;
            StringBuilder sb = new StringBuilder();
            while (peek() != '"') {
                char c = s.charAt(i++);
                if (c == '\\') {
                    char n = s.charAt(i++);
                    switch (n) {
                        case '"' -> sb.append('"');
                        case '\\' -> sb.append('\\');
                        case '/' -> sb.append('/');
                        case 'n' -> sb.append('\n');
                        case 't' -> sb.append('\t');
                        case 'r' -> sb.append('\r');
                        case 'u' -> {
                            String hex = s.substring(i, i + 4);
                            sb.append((char) Integer.parseInt(hex, 16));
                            i += 4;
                        }
                        default -> sb.append(n);
                    }
                } else {
                    sb.append(c);
                }
            }
            i++; // closing quote
            return sb.toString();
        }

        Boolean parseBool() {
            if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
            if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
            throw new IllegalArgumentException("Expected boolean at " + i);
        }

        Object parseNull() {
            if (s.startsWith("null", i)) { i += 4; return null; }
            throw new IllegalArgumentException("Expected null at " + i);
        }

        Object parseNum() {
            int start = i;
            while (i < s.length() && (Character.isDigit(s.charAt(i)) || "+-.eE".indexOf(s.charAt(i)) >= 0)) i++;
            String num = s.substring(start, i);
            if (num.contains(".") || num.contains("e") || num.contains("E")) return Double.parseDouble(num);
            try {
                return Long.parseLong(num);
            } catch (NumberFormatException e) {
                return Double.parseDouble(num);
            }
        }
    }
}
