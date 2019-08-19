import Koa from "koa";
import KoaRouter from "koa-router";
import request from "supertest";
import { LogLevel } from "@timberio/types";

import KoaTimber from "./koa";

// Mock out a KoaTimber + Koa instance
function getServer(): [KoaTimber, Koa] {
  // Init new Koa Timber instance
  const timber = new KoaTimber("test", "someSource", {
    // Override `batchInterval` to test logs faster
    batchInterval: 1
  });

  // Create a new Koa instance
  const koa = new Koa();

  // Attach Koa Timber middleware
  timber.attach(koa);

  // Create a new router, with test routes
  const router = new KoaRouter()
    .get("/ping", async ctx => {
      ctx.body = "pong";
    })
    .get("/unauthorized", ctx => {
      ctx.status = 401;
      ctx.body = "Unauthorized";
    })
    .get("/internal_error", ctx => {
      ctx.status = 500;
      ctx.body = "Internal server error";
    });

  // Attach router to Koa
  koa.use(router.allowedMethods()).use(router.routes());

  // Return both Timber + Koa
  return [timber, koa];
}

describe("Koa Timber tests", () => {
  it("should log successfully in Koa middleware", async done => {
    const [timber, koa] = getServer();

    // Mock out the sync method
    timber.setSync(async logs => {
      // Should be 1 log
      expect(logs.length).toBe(1);

      // Should have a '200' response
      expect(logs[0].message).toBe("Koa HTTP request: 200");

      // Should be 'info' level
      expect(logs[0].level).toBe(LogLevel.Info);

      // Finish task
      await done();

      return logs;
    });

    await request(koa.callback())
      .get("/ping")
      .expect(200);
  });

  it("should log at 'warn' level when status is 401", async done => {
    const [timber, koa] = getServer();

    // Mock out the sync method
    timber.setSync(async logs => {
      // Should be 1 log
      expect(logs.length).toBe(1);

      // Should have a '401' response
      expect(logs[0].message).toBe("Koa HTTP request: 401");

      // Should be 'warn' level
      expect(logs[0].level).toBe(LogLevel.Warn);

      // Finish task
      await done();

      return logs;
    });

    await request(koa.callback())
      .get("/unauthorized")
      .expect(401);
  });

  it("should log at 'warn' level when status is 404", async done => {
    const [timber, koa] = getServer();

    // Mock out the sync method
    timber.setSync(async logs => {
      // Should be 1 log
      expect(logs.length).toBe(1);

      // Should have a '404' response
      expect(logs[0].message).toBe("Koa HTTP request: 404");

      // Should be 'warn' level
      expect(logs[0].level).toBe(LogLevel.Warn);

      // Finish task
      await done();

      return logs;
    });

    await request(koa.callback())
      .get("/not_found")
      .expect(404);
  });

  it("should log at 'error' level when status is 500", async done => {
    const [timber, koa] = getServer();

    // Mock out the sync method
    timber.setSync(async logs => {
      // Should be 1 log
      expect(logs.length).toBe(1);

      // Should have a '500' response
      expect(logs[0].message).toBe("Koa HTTP request: 500");

      // Should be 'error' level
      expect(logs[0].level).toBe(LogLevel.Error);

      // Finish task
      await done();

      return logs;
    });

    await request(koa.callback())
      .get("/internal_error")
      .expect(500);
  });

  it("should log at 'error' level when Koa middleware throws", async done => {
    const [timber, koa] = getServer();

    // Error to throw
    const error = "Error from middleware";

    // Simulate error being thrown in middleware
    koa.use(async () => {
      throw new Error(error);
    });

    // Mock out the sync method
    timber.setSync(async logs => {
      // Should be 1 log
      expect(logs.length).toBe(1);

      // Should show an error
      expect(logs[0].message).toContain(error);

      // Should be 'error' level
      expect(logs[0].level).toBe(LogLevel.Error);

      // Finish task
      await done();

      return logs;
    });

    await request(koa.callback())
      .get("/throw")
      .expect(404);
  });
});
