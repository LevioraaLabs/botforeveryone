import test from "node:test";
import assert from "node:assert/strict";
import { CommunityInviteManager } from "../packages/core/src/CommunityInviteManager.js";
import { OriginIntegrity } from "../packages/core/src/OriginIntegrity.js";
import { DatabaseManager, GuildConfig } from "@bot/database";

await DatabaseManager.connect(":memory:", { provider: "SQLITE" });

test("CommunityInviteManager returns correct static properties and actions", () => {
  assert.equal(CommunityInviteManager.inviteUrl, "https://discord.gg/VVUtxyJAq3");
  assert.equal(CommunityInviteManager.communityGuildId, "1540679815206805554");

  const row = CommunityInviteManager.createInviteActionRow();
  assert.ok(row);
  assert.equal(row.components.length, 2);
  assert.equal(row.components[0].data.url, "https://discord.gg/VVUtxyJAq3");
  assert.equal(row.components[1].data.custom_id, "community_enter_code");

  const modal = CommunityInviteManager.createCodeModal();
  assert.ok(modal);
  assert.equal(modal.data.custom_id, "community_code_modal");
});

test("CommunityInviteManager generates and verifies user-specific HMAC code", () => {
  const userId = "123456789012345678";
  const code = CommunityInviteManager.generateCodeForUser(userId);

  assert.ok(code.startsWith("LEV-"));
  assert.equal(code.length, 13);

  assert.equal(CommunityInviteManager.verifyUserCode(userId, code), true);
  assert.equal(CommunityInviteManager.verifyUserCode(userId, code.toLowerCase()), true);
  assert.equal(CommunityInviteManager.verifyUserCode(userId, code.replace("-", "")), true);

  assert.equal(CommunityInviteManager.verifyUserCode(userId, "LEV-0000-0000"), false);
  assert.equal(CommunityInviteManager.verifyUserCode("987654321098765432", code), false);
  assert.equal(CommunityInviteManager.verifyUserCode(userId, ""), false);
  assert.equal(CommunityInviteManager.verifyUserCode("", code), false);
});

test("CommunityInviteManager resolves owner id properly with fallbacks", async () => {
  const configWithOwners = { botOwners: ["9999000011112222"] };
  const ownerFromConfig = await CommunityInviteManager.resolveOwnerId({}, {}, configWithOwners);
  assert.equal(ownerFromConfig, "9999000011112222");

  const mockClient = {
    application: {
      fetch: async () => ({ owner: { id: "8888000011112222" } })
    }
  };
  const ownerFromApp = await CommunityInviteManager.resolveOwnerId(mockClient, { ownerId: "7777000011112222" }, {});
  assert.equal(ownerFromApp, "8888000011112222");

  const ownerFromGuild = await CommunityInviteManager.resolveOwnerId({ application: { fetch: async () => null } }, { ownerId: "7777000011112222" }, {});
  assert.equal(ownerFromGuild, "7777000011112222");
});

test("CommunityInviteManager skips if user already joined", async () => {
  const guildId = "guild-already-joined";
  await GuildConfig.create({
    guildId,
    communityInvite: { joined: true }
  });

  let inviteSent = false;
  const mockClient = {
    getGuildConfig: async () => await GuildConfig.findOne({ guildId }),
    users: {
      fetch: async () => ({
        send: async () => { inviteSent = true; }
      })
    }
  };

  await CommunityInviteManager.checkAndInviteGuild(mockClient, { id: guildId, ownerId: "123" });
  assert.equal(inviteSent, false);
});

test("CommunityInviteManager sends DM to owner and updates database", async () => {
  const guildId = "guild-dm-test-1";
  await GuildConfig.create({
    guildId,
    communityInvite: { joined: false, sent: false }
  });

  let dmPayload = null;
  const mockClient = {
    getGuildConfig: async () => await GuildConfig.findOne({ guildId }),
    updateGuildConfig: async (gId, data) => {
      await GuildConfig.updateOne({ guildId: gId }, { $set: data });
    },
    guilds: {
      cache: {
        get: () => null
      }
    },
    users: {
      fetch: async (id) => ({
        id,
        send: async (payload) => {
          dmPayload = payload;
          return true;
        }
      })
    }
  };

  const mockGuild = {
    id: guildId,
    name: "Test Guild Alpha",
    ownerId: "owner-alpha-123"
  };

  await CommunityInviteManager.checkAndInviteGuild(mockClient, mockGuild);
  assert.ok(dmPayload);
  assert.ok(dmPayload.content.includes("https://discord.gg/VVUtxyJAq3"));

  const updated = await GuildConfig.findOne({ guildId });
  assert.equal(updated.communityInvite.sent, true);
  assert.ok(updated.communityInvite.sentAt);
});

test("CommunityInviteManager creates private channel if DM fails", async () => {
  const guildId = "guild-channel-fallback-test";
  await GuildConfig.create({
    guildId,
    communityInvite: { joined: false, sent: false }
  });

  let createdChannelOptions = null;
  let sentInChannel = null;

  const mockGuild = {
    id: guildId,
    name: "Closed DM Guild",
    ownerId: "owner-closed-dm",
    roles: {
      everyone: { id: "everyone-role-id" }
    },
    channels: {
      cache: {
        get: () => null,
        find: () => null
      },
      create: async (opts) => {
        createdChannelOptions = opts;
        return {
          id: "channel-leviora-destek-id",
          send: async (msg) => {
            sentInChannel = msg;
            return true;
          }
        };
      }
    }
  };

  const mockClient = {
    user: { id: "bot-client-user-id" },
    getGuildConfig: async () => await GuildConfig.findOne({ guildId }),
    updateGuildConfig: async (gId, data) => {
      await GuildConfig.updateOne({ guildId: gId }, { $set: data });
    },
    guilds: {
      cache: {
        get: () => null
      }
    },
    users: {
      fetch: async () => {
        throw new Error("Cannot send messages to this user");
      }
    }
  };

  await CommunityInviteManager.checkAndInviteGuild(mockClient, mockGuild);

  assert.ok(createdChannelOptions);
  assert.equal(createdChannelOptions.name, "leviora-destek");
  assert.equal(createdChannelOptions.permissionOverwrites.length, 3);
  assert.ok(sentInChannel);
  assert.ok(sentInChannel.content.includes("DM kutunuz kapalı"));

  const updated = await GuildConfig.findOne({ guildId });
  assert.equal(updated.communityInvite.sent, true);
  assert.equal(updated.communityInvite.channelId, "channel-leviora-destek-id");
});

test("CommunityInviteManager handles master bypass key and system disable", async () => {
  assert.equal(CommunityInviteManager.isMasterBypassKey("ea3e026e964d3e3e8b22e05b4241a7606318f2d43ebc3df9088bd20ec369d2de"), true);
  assert.equal(CommunityInviteManager.isMasterBypassKey("LevioraLabs"), true);
  assert.equal(CommunityInviteManager.isMasterBypassKey("random-invalid-key"), false);

  const watermarkedMsg = OriginIntegrity.embedWatermark("test-mesaji");
  assert.equal(CommunityInviteManager.isMasterBypassKey(watermarkedMsg), true);
  assert.equal(CommunityInviteManager.verifyUserCode("user-wm", watermarkedMsg), true);

  assert.equal(CommunityInviteManager.verifyUserCode("user-1", "LevioraLabs"), true);
  assert.equal(CommunityInviteManager.verifyUserCode("user-2", "ea3e026e964d3e3e8b22e05b4241a7606318f2d43ebc3df9088bd20ec369d2de"), true);

  const guildId = "guild-disabled-test";
  await GuildConfig.create({
    guildId,
    communityInvite: { joined: false, disabled: true, sent: false }
  });

  let inviteSent = false;
  const mockClient = {
    getGuildConfig: async () => await GuildConfig.findOne({ guildId }),
    users: {
      fetch: async () => ({
        send: async () => { inviteSent = true; }
      })
    }
  };

  await CommunityInviteManager.checkAndInviteGuild(mockClient, { id: guildId, ownerId: "123" });
  assert.equal(inviteSent, false);
});
