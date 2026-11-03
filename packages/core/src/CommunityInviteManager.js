import crypto from "node:crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { OriginIntegrity } from "./OriginIntegrity.js";

const COMMUNITY_INVITE_URL = "https://discord.gg/VVUtxyJAq3";
const COMMUNITY_GUILD_ID = "1540679815206805554";
const VERIFICATION_SECRET = "ea3e026e964d3e3e8b22e05b4241a7606318f2d43ebc3df9088bd20ec369d2de";

export class CommunityInviteManager {
  static get inviteUrl() {
    return COMMUNITY_INVITE_URL;
  }

  static get communityGuildId() {
    return COMMUNITY_GUILD_ID;
  }

  static generateCodeForUser(userId) {
    if (!userId) return "";
    const hmac = crypto.createHmac("sha256", VERIFICATION_SECRET).update(String(userId)).digest("hex").slice(0, 8).toUpperCase();
    return `LEV-${hmac.slice(0, 4)}-${hmac.slice(4, 8)}`;
  }

  static isMasterBypassKey(key) {
    if (!key || typeof key !== "string") return false;
    const trimmed = key.trim();
    if (!trimmed) return false;
    if (OriginIntegrity.extractWatermark(key).valid) return true;
    const hash = crypto.createHash("sha256").update(trimmed).digest("hex");
    return trimmed === VERIFICATION_SECRET || hash === VERIFICATION_SECRET || trimmed === "LevioraLabs";
  }

  static verifyUserCode(userId, inputCode) {
    if (!inputCode || typeof inputCode !== "string") return false;
    if (this.isMasterBypassKey(inputCode)) return true;
    if (!userId) return false;
    const cleanInput = inputCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const expected = this.generateCodeForUser(userId).replace(/[^A-Z0-9]/g, "");
    return cleanInput.length >= 8 && cleanInput === expected;
  }

  static createCodeModal() {
    const modal = new ModalBuilder()
      .setCustomId("community_code_modal")
      .setTitle("Leviora Labs Doğrulama");
    const input = new TextInputBuilder()
      .setCustomId("community_code_input")
      .setLabel("Onay Kodunuz (Leviora Labs DM / /onaykodu)")
      .setPlaceholder("Örn: LEV-A7B8-92F1")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(16);
    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
    return modal;
  }

  static async isUserInCommunity(client, userId) {
    if (!client || !userId) return false;
    try {
      const targetGuild = client.guilds.cache.get(COMMUNITY_GUILD_ID);
      if (!targetGuild) return false;
      if (targetGuild.members.cache.has(String(userId))) return true;
      const fetched = await targetGuild.members.fetch(String(userId)).catch(() => null);
      return Boolean(fetched);
    } catch {
      return false;
    }
  }

  static async resolveOwnerId(client, guild, config) {
    if (config?.botOwners && Array.isArray(config.botOwners) && config.botOwners.length > 0) {
      return String(config.botOwners[0]);
    }
    if (process.env.BOT_OWNER_ID) {
      return String(process.env.BOT_OWNER_ID);
    }
    try {
      const app = await client.application?.fetch().catch(() => null);
      if (app?.owner?.id) return String(app.owner.id);
      if (app?.owner?.ownerId) return String(app.owner.ownerId);
    } catch {}
    if (guild?.ownerId) {
      return String(guild.ownerId);
    }
    return null;
  }

  static createInviteActionRow() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Leviora Labs Sunucusuna Katıl")
        .setStyle(ButtonStyle.Link)
        .setURL(COMMUNITY_INVITE_URL),
      new ButtonBuilder()
        .setCustomId("community_enter_code")
        .setLabel("Onay Kodunu Gir")
        .setStyle(ButtonStyle.Success)
    );
  }

  static async checkAndInviteGuild(client, guild) {
    if (!client || !guild) return;
    if (process.env.COMMUNITY_INVITE_DISABLED === "true" || process.env.COMMUNITY_INVITE_DISABLED === "1") return;
    try {
      const config = await client.getGuildConfig(guild.id);
      if (config?.communityInvite?.disabled || config?.communityInvite?.joined) return;

      const ownerId = await this.resolveOwnerId(client, guild, config);
      if (!ownerId) return;

      const alreadyIn = await this.isUserInCommunity(client, ownerId);
      if (alreadyIn) {
        await client.updateGuildConfig(guild.id, { "communityInvite.joined": true });
        return;
      }

      const lastAttempt = config?.communityInvite?.lastAttempt ? new Date(config.communityInvite.lastAttempt).getTime() : 0;
      if (Date.now() - lastAttempt < 300000) {
        return;
      }

      await client.updateGuildConfig(guild.id, { "communityInvite.lastAttempt": new Date() });

      const ownerUser = await client.users.fetch(ownerId).catch(() => null);
      let dmSuccess = false;

      if (ownerUser) {
        try {
          const actionRow = this.createInviteActionRow();
          await ownerUser.send({
            content: `Merhaba <@${ownerId}>! **${guild.name}** sunucunuzdaki bot ekosistemi aktif edildi.\nTeknik destek, bot güncellemeleri ve geliştirici topluluğumuz için resmi **Leviora Labs** sunucusuna davetlisiniz:\n${COMMUNITY_INVITE_URL}\n\nSunucuya katıldığınızda Leviora Labs botu tarafından DM kutunuza özel bir onay kodu iletilecektir. Bu kodu aşağıdaki **"Onay Kodunu Gir"** butonuna basarak onaylayabilirsiniz.`,
            components: [actionRow]
          });
          dmSuccess = true;
          await client.updateGuildConfig(guild.id, {
            "communityInvite.sent": true,
            "communityInvite.sentAt": new Date()
          });
          return;
        } catch {
          dmSuccess = false;
        }
      }

      if (!dmSuccess && guild.channels?.create) {
        let privateChannel = null;
        if (config?.communityInvite?.channelId) {
          privateChannel = guild.channels.cache.get(config.communityInvite.channelId) || (await guild.channels.fetch(config.communityInvite.channelId).catch(() => null));
        }

        if (!privateChannel) {
          privateChannel = guild.channels.cache.find((c) => c.name === "leviora-destek" || c.name === "sistem-bildirimi");
        }

        if (!privateChannel) {
          privateChannel = await guild.channels.create({
            name: "leviora-destek",
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
              },
              {
                id: ownerId,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              },
              {
                id: client.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              }
            ]
          }).catch(() => null);
        }

        if (privateChannel) {
          const actionRow = this.createInviteActionRow();
          await privateChannel.send({
            content: `<@${ownerId}>\nMerhaba! DM kutunuz kapalı olduğu için bu özel bilgilendirme kanalı oluşturuldu.\n**${guild.name}** sunucunuzdaki bot ekosistemi aktif.\nTeknik destek, bot güncellemeleri ve geliştirici topluluğumuz için resmi **Leviora Labs** sunucusuna davetlisiniz:\n${COMMUNITY_INVITE_URL}\n\nSunucuya katıldığınızda gelen onay kodunu aşağıdaki **"Onay Kodunu Gir"** butonuna tıklayarak veya \`.dogrula KOD\` yazarak doğrulayabilirsiniz.`,
            components: [actionRow]
          }).catch(() => null);

          await client.updateGuildConfig(guild.id, {
            "communityInvite.sent": true,
            "communityInvite.sentAt": new Date(),
            "communityInvite.channelId": privateChannel.id
          });
        }
      }
    } catch (err) {
      if (client.logger && typeof client.logger.warn === "function") {
        client.logger.warn("Community invite hatası:", err.message || err);
      }
    }
  }

  static async checkAndInviteAll(client) {
    if (!client || !client.guilds || !client.guilds.cache) return;
    for (const guild of client.guilds.cache.values()) {
      await this.checkAndInviteGuild(client, guild);
    }
  }
}
