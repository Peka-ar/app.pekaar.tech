type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const configuredLevel: Level =
  (process.env.LOG_LEVEL as Level | undefined) ?? "info";

const activeRank = LEVEL_RANK[configuredLevel];

type Meta = Record<string, unknown>;

function write(level: Level, message: string, meta?: Meta) {
  if (LEVEL_RANK[level] < activeRank) return;
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    msg: message,
    ...meta,
  });
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

function sanitizeMeta(meta?: Meta): Meta | undefined {
  if (!meta) return undefined;
  const out: Meta = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v instanceof Error) {
      out[k] = { name: v.name, message: v.message, stack: v.stack };
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const logger = {
  debug(message: string, meta?: Meta) {
    write("debug", message, sanitizeMeta(meta));
  },
  info(message: string, meta?: Meta) {
    write("info", message, sanitizeMeta(meta));
  },
  warn(message: string, meta?: Meta) {
    write("warn", message, sanitizeMeta(meta));
  },
  error(message: string, meta?: Meta) {
    write("error", message, sanitizeMeta(meta));
  },
  child(base: Meta) {
    return {
      debug: (message: string, meta?: Meta) => logger.debug(message, { ...base, ...meta }),
      info: (message: string, meta?: Meta) => logger.info(message, { ...base, ...meta }),
      warn: (message: string, meta?: Meta) => logger.warn(message, { ...base, ...meta }),
      error: (message: string, meta?: Meta) => logger.error(message, { ...base, ...meta }),
    };
  },
};
