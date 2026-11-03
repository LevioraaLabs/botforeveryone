import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { GitUpdateManager, BotNameManager } from "@bot/core";

test("GitUpdateManager returns valid root and backup directory", () => {
  const root = GitUpdateManager.getRootPath();
  assert.ok(typeof root === "string");
  assert.ok(fs.existsSync(root));

  const backupsDir = GitUpdateManager.getBackupsDir();
  assert.ok(typeof backupsDir === "string");
  assert.ok(fs.existsSync(backupsDir));
});

test("GitUpdateManager getGitStatus returns repository information", () => {
  const status = GitUpdateManager.getGitStatus();
  assert.ok(status.success);
  assert.ok(typeof status.branch === "string");
  assert.ok(typeof status.commitHash === "string");
  assert.ok(typeof status.shortHash === "string");
  assert.ok(typeof status.isUpToDate === "boolean");
});

test("GitUpdateManager creates full backup and lists metadata", () => {
  const backup = GitUpdateManager.createFullBackup();
  assert.ok(backup.success);
  assert.ok(backup.fileCount > 0);
  assert.ok(backup.codeFiles > 0);
  assert.ok(typeof backup.dbFiles === "number");
  assert.ok(fs.existsSync(backup.backupPath));
  assert.ok(fs.existsSync(path.join(backup.backupPath, "backup-meta.json")));

  const list = GitUpdateManager.listBackups();
  assert.ok(Array.isArray(list));
  assert.ok(list.length > 0);
  const found = list.find((b) => b.backupName === backup.backupName);
  assert.ok(found);
  assert.equal(found.fileCount, backup.fileCount);

  fs.rmSync(backup.backupPath, { recursive: true, force: true });
});

test("GitUpdateManager checkDiskSpace accurately reports disk availability", () => {
  const disk = GitUpdateManager.checkDiskSpace();
  assert.ok(typeof disk.sufficient === "boolean");
  assert.ok(Number(disk.freeMB) >= 0);
  assert.ok(Number(disk.requiredMB) > 0);
  assert.ok(Number(disk.projectSizeMB) > 0);

  const impossibleMargin = 500 * 1024 * 1024 * 1024 * 1024;
  const insufficientDisk = GitUpdateManager.checkDiskSpace(impossibleMargin);
  assert.equal(insufficientDisk.sufficient, false);
  assert.ok(Number(insufficientDisk.missingMB) > 0);
});

test("BotNameManager validates input lengths and keys", async () => {
  const missing = await BotNameManager.updateBotName({});
  assert.equal(missing.success, false);

  const tooShort = await BotNameManager.updateBotName({ serviceKey: "MODERATION", newName: "A" });
  assert.equal(tooShort.success, false);

  const tooLong = await BotNameManager.updateBotName({ serviceKey: "MODERATION", newName: "A".repeat(35) });
  assert.equal(tooLong.success, false);
});

test("GitUpdateManager restoreBackup restores files correctly", () => {
  const backup = GitUpdateManager.createFullBackup();
  assert.ok(backup.success);

  const restore = GitUpdateManager.restoreBackup(backup.backupName);
  assert.ok(restore.success);
  assert.ok(restore.restoredCount > 0);

  fs.rmSync(backup.backupPath, { recursive: true, force: true });
});

test("BaseBot isBotOwner correctly verifies user ids", async () => {
  const { BaseBot } = await import("@bot/core");
  const bot = new BaseBot({ serviceName: "TEST_BOT" });

  assert.equal(bot.isBotOwner("123", { botOwners: ["123", "456"] }), true);
  assert.equal(bot.isBotOwner("999", { botOwners: ["123", "456"] }), false);
  assert.equal(bot.isBotOwner(null, { botOwners: ["123"] }), false);
});

test("guncelle command enforces owner authorization and performs checks", async () => {
  const { default: guncelleCmd } = await import("../apps/utility/src/commands/guncelle.js");
  assert.equal(guncelleCmd.name, "guncelle");
  assert.ok(guncelleCmd.aliases.includes("update"));

  let unauthorizedReply = null;
  const mockMessageUnauthorized = {
    author: { id: "user_normal" },
    guild: { ownerId: "guild_owner" },
    reply: (payload) => {
      unauthorizedReply = payload;
      return Promise.resolve();
    }
  };

  await guncelleCmd.execute({
    client: { isBotOwner: () => false },
    message: mockMessageUnauthorized,
    args: [],
    config: {}
  });

  assert.ok(unauthorizedReply);

  let ownerReply = null;
  const mockMessageOwner = {
    author: { id: "guild_owner" },
    guild: { ownerId: "guild_owner" },
    reply: (payload) => {
      ownerReply = payload;
      return Promise.resolve();
    }
  };

  await guncelleCmd.execute({
    client: { isBotOwner: () => true },
    message: mockMessageOwner,
    args: [],
    config: {}
  });

  assert.ok(ownerReply);
});
