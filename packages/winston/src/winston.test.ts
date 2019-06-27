import winston, { LogEntry } from "winston";
import { Timber } from "@timberio/node";
import { LogLevel, ITimberLog } from "@timberio/types";

import { TimberTransport } from "./winston";

// Sample log message
const message = "Something to do with something";

/**
 * Test a Winston level vs. Timber level
 * @param level - Winston log level
 * @param logLevel LogLevel - Timber log level
 */
async function testLevel(level: string, logLevel: LogLevel) {
  // Sample log
  const log: LogEntry = {
    level,
    message,
  };

  // Timber fixtures
  const timber = new Timber("test", "someSource");
  const logged = new Promise<ITimberLog[]>(resolve => {
    timber.setSync(async logs => {
      resolve(logs);
      return logs;
    });
  });

  // Create a Winston logger
  const logger = winston.createLogger({
    level,
    transports: [new TimberTransport(timber)],
  });

  // Log it!
  logger.log(log);

  const logs = await logged;

  // Should be exactly one log
  expect(logs.length).toBe(1);

  // Message should match
  expect(logs[0].message).toBe(log.message);

  // Log level should be 'info'
  expect(logs[0].level).toBe(logLevel);
}

describe("Winston logging tests", () => {
  it("should log at the 'debug' level", async () => {
    return testLevel("debug", LogLevel.Debug);
  });

  it("should log at the 'info' level", async () => {
    return testLevel("info", LogLevel.Info);
  });

  it("should log at the 'warn' level", async () => {
    return testLevel("warn", LogLevel.Warn);
  });

  it("should log at the 'error' level", async () => {
    return testLevel("error", LogLevel.Error);
  });

  it("should default to 'info' level when using custom logging", async () => {
    return testLevel("silly", LogLevel.Info);
  });

  it("should sync multiple logs", async done => {
    // Create multiple log entries
    const entries: LogEntry[] = [
      {
        level: "info",
        message: `${message} 1`,
      },
      {
        level: "debug",
        message: `${message} 2`,
      },
      {
        level: "warn",
        message: `${message} 3`,
      },
      {
        level: "error",
        message: `${message} 4`,
      },
    ];

    // Fixtures
    const timber = new Timber("test", "someSource", {
      batchInterval: 1000, // <-- shouldn't be exceeded
      batchSize: entries.length,
    });

    timber.setSync(async logs => {
      expect(logs.length).toBe(entries.length);

      // Logs should be identical
      const isIdentical = logs.every(
        log =>
          entries.findIndex(entry => {
            return entry.message == log.message;
          }) > -1,
      );
      expect(isIdentical).toBe(true);

      // Test completion
      done();

      return logs;
    });

    // Create a Winston logger
    const logger = winston.createLogger({
      level: "debug", // <-- debug and above
      transports: [new TimberTransport(timber)],
    });

    entries.forEach(entry => logger.log(entry.level, entry.message));
  });

  it("should log metadata with the message and level", async () => {
    const timber = new Timber("test", "someSource");
    const logged = new Promise<ITimberLog[]>(resolve => {
      timber.setSync(async logs => {
        resolve(logs);
        return logs;
      });
    });

    // Create a Winston logger
    const logger = winston.createLogger({
      level: LogLevel.Info,
      transports: [new TimberTransport(timber)],
    });

    // Log it!
    logger.log(LogLevel.Info, "a test message", { request_id: 123 });

    const logs = await logged;

    // Should be exactly one log
    expect(logs.length).toBe(1);

    // Message should match
    expect(logs[0].message).toBe("a test message");

    // Log level should be 'info'
    expect(logs[0].level).toBe(LogLevel.Info);

    expect(logs[0]["request_id"]).toBe(123);
  });

  it("should log defaultMetadata with the message and level", async () => {
    const timber = new Timber("test", "someSource");
    const logged = new Promise<ITimberLog[]>(resolve => {
      timber.setSync(async logs => {
        resolve(logs);
        return logs;
      });
    });

    // Create a Winston logger
    const logger = winston.createLogger({
      level: LogLevel.Info,
      transports: [new TimberTransport(timber)],
      defaultMeta: {
        component: "server",
      },
    });

    // Log it!
    logger.log(LogLevel.Info, "a test message", { request_id: 123 });

    const logs = await logged;

    // Should be exactly one log
    expect(logs.length).toBe(1);

    // Message should match
    expect(logs[0].message).toBe("a test message");

    // Log level should be 'info'
    expect(logs[0].level).toBe(LogLevel.Info);

    expect(logs[0]["request_id"]).toBe(123);
    expect(logs[0]["component"]).toBe("server");
  });
});
