import { AttachmentBuilder } from "discord.js";
import { Stat, Economy } from "@bot/database";
import { VisualCard, MessageFormatter } from "@bot/core";

export default {
  name: "tema",
  aliases: ["theme", "karttema", "temalar"],
  async execute({ client, message, args, config }) {
    const themes = VisualCard.getThemesList();
    const stat = await Stat.findOne({ guildId: message.guild.id, userId: message.author.id });
    const eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    const currentTheme = stat?.cardTheme || "sakura";

    const ownedItemIds = (eco?.inventory || []).map(i => i.itemId.replace(/^tema_/, ""));
    ownedItemIds.push("sakura");

    if (!args[0]) {
      const themeLines = themes.map(t => {
        const isCurrent = t.id === currentTheme ? " [Seçili]" : "";
        const isOwned = ownedItemIds.includes(t.id) ? " [Sahipsiniz]" : ` [Fiyat: ${t.price.toLocaleString("tr-TR")} Coin]`;
        return `▫️ \`${t.id}\` : **${t.name}**${isOwned}${isCurrent}`;
      }).join("\n");

      return message.reply(MessageFormatter.v2(
        `### Kart Temaları\n\nMevcut temanız: **${currentTheme.toUpperCase()}**\n\nKullanabileceğiniz temalar:\n\n${themeLines}\n\n▫️ Temanızı seçmek için: \`.tema <tema-adı>\`\n▫️ Önizlemek için: \`.tema onizle <tema-adı>\`\n▫️ Yeni tema satın almak için: \`.satınal tema_<tema-adı>\``,
        []
      ));
    }

    const isPreview = args.some(a => ["onizle", "önizle", "preview"].includes(a.toLowerCase()));
    const isVideo = args.some(a => ["video", "hareketli", "anim", "mp4"].includes(a.toLowerCase()));
    const format = args.some(a => a.toLowerCase() === "mp4") ? "mp4" : "gif";

    if (args[0]?.toLowerCase() === "video" && !args[1]) {
      const nextState = !Boolean(stat?.cardAnimated);
      await Stat.findOneAndUpdate(
        { guildId: message.guild.id, userId: message.author.id },
        { $set: { cardAnimated: nextState } },
        { upsert: true }
      );
      return message.reply(MessageFormatter.v2(
        `**Hareketli Kart Modu ${nextState ? "Açıldı" : "Kapatıldı"}**\n\n▫️ **Kullanıcı:** <@${message.author.id}>\n▫️ **Mevcut Tema:** \`${currentTheme.toUpperCase()}\`\n▫️ **Kart Durumu:** ${nextState ? "Hareketli Görsel" : "Statik Görsel"}`
      ));
    }

    if (args.some(a => ["kapat", "statik", "durdur"].includes(a.toLowerCase()))) {
      await Stat.findOneAndUpdate(
        { guildId: message.guild.id, userId: message.author.id },
        { $set: { cardAnimated: false } },
        { upsert: true }
      );
      return message.reply(MessageFormatter.v2(
        `**Hareketli Kart Modu Kapatıldı**\n\n▫️ **Kullanıcı:** <@${message.author.id}>\n▫️ **Kart Durumu:** Statik Görsel Modu Aktif`
      ));
    }

    const cleanArgs = args.filter(a => !["onizle", "önizle", "preview", "video", "hareketli", "anim", "gif", "mp4", "sec", "seç", "ayarla"].includes(a.toLowerCase()));
    const targetKey = (cleanArgs[0] || currentTheme).toLowerCase().trim().replace(/^tema_/, "");
    const targetTheme = themes.find(t => t.id.toLowerCase() === targetKey);

    if (!targetTheme) {
      const validNames = themes.map(t => `\`${t.id}\``).join(", ");
      return message.reply(MessageFormatter.warn(
        "Geçersiz Tema Adı",
        `Belirttiğiniz tema bulunamadı: \`${targetKey}\`\n\nGeçerli temalar:\n${validNames}`
      ));
    }

    const hours = Math.round((stat?.totalVoiceMs || 0) / (1000 * 60 * 60));

    if (isPreview) {
      if (isVideo) {
        const waitMsg = await message.reply(`▫️ **${targetTheme.name}** teması hazırlanıyor...`);
        const animBuffer = await VisualCard.renderAnimatedUserStatCard({
          user: message.author,
          periodText: "Önizleme",
          voiceHours: hours,
          messageCount: stat?.totalMessages || 0,
          level: stat?.level || 1,
          rank: 1,
          theme: targetTheme.id,
          format
        });
        const ext = format === "mp4" ? "mp4" : "gif";
        const attachment = new AttachmentBuilder(animBuffer, { name: `theme-preview.${ext}` });
        await waitMsg.delete().catch(() => null);
        return message.reply({
          content: `▫️ **${targetTheme.name}** Önizleme\n▫️ Fiyat: **${targetTheme.price.toLocaleString("tr-TR")} Coin**\n▫️ Satın Al: \`.satınal tema_${targetTheme.id}\``,
          files: [attachment]
        });
      }

      const cardBuffer = await VisualCard.renderUserStatCard({
        user: message.author,
        periodText: "Önizleme",
        voiceHours: hours,
        messageCount: stat?.totalMessages || 0,
        level: stat?.level || 1,
        rank: 1,
        theme: targetTheme.id
      });
      const attachment = new AttachmentBuilder(cardBuffer, { name: "theme-preview.png" });
      return message.reply({
        content: `▫️ **${targetTheme.name}** Görsel Önizleme\n▫️ Fiyat: **${targetTheme.price.toLocaleString("tr-TR")} Coin**\n▫️ Satın Al: \`.satınal tema_${targetTheme.id}\``,
        files: [attachment]
      });
    }

    if (targetTheme.id !== "sakura" && !ownedItemIds.includes(targetTheme.id)) {
      return message.reply(MessageFormatter.warn(
        "Temaya Sahip Değilsiniz",
        `**${targetTheme.name}** temasına henüz sahip değilsiniz.\n\n▫️ Fiyat: **${targetTheme.price.toLocaleString("tr-TR")} Coin**\n▫️ Önizle: \`.tema onizle ${targetTheme.id}\`\n▫️ Satın Al: \`.satınal tema_${targetTheme.id}\``
      ));
    }

    const setAnimated = isVideo ? true : Boolean(stat?.cardAnimated);
    await Stat.findOneAndUpdate(
      { guildId: message.guild.id, userId: message.author.id },
      { $set: { cardTheme: targetTheme.id, cardAnimated: setAnimated, cardFormat: format } },
      { upsert: true, new: true }
    );

    let attachment = null;
    if (setAnimated) {
      const waitMsg = await message.reply(`▫️ **${targetTheme.name}** kartınız hazırlanıyor...`);
      const animBuffer = await VisualCard.renderAnimatedUserStatCard({
        user: message.author,
        periodText: "Genel",
        voiceHours: hours,
        messageCount: stat?.totalMessages || 0,
        level: stat?.level || 1,
        rank: 1,
        theme: targetTheme.id,
        format
      });
      const ext = format === "mp4" ? "mp4" : "gif";
      attachment = new AttachmentBuilder(animBuffer, { name: `theme-activated.${ext}` });
      await waitMsg.delete().catch(() => null);
    } else {
      const cardBuffer = await VisualCard.renderUserStatCard({
        user: message.author,
        periodText: "Genel",
        voiceHours: hours,
        messageCount: stat?.totalMessages || 0,
        level: stat?.level || 1,
        rank: 1,
        theme: targetTheme.id
      });
      attachment = new AttachmentBuilder(cardBuffer, { name: "theme-activated.png" });
    }

    return message.reply({
      content: `▫️ **Kart Temanız Güncellendi:** **${targetTheme.name}**`,
      files: attachment ? [attachment] : []
    });
  }
};
