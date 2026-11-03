import { Stat } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "topkanal",
  aliases: ["topkanallar", "enaktifkanallar", "kanalsıralama", "kanalsiralama"],
  async execute({ client, message, args, config }) {
    const stats = await Stat.find({ guildId: message.guild.id });
    if (!stats || stats.length === 0) {
      return message.reply(MessageFormatter.info("Veri Bulunamadı", "Sunucuda henüz kanal aktivite verisi kaydedilmemiş."));
    }

    const textTotals = new Map();
    const voiceTotals = new Map();

    for (const s of stats) {
      if (s.channelMessages) {
        const msgEntries = s.channelMessages instanceof Map ? s.channelMessages.entries() : Object.entries(s.channelMessages);
        for (const [chId, count] of msgEntries) {
          textTotals.set(chId, (textTotals.get(chId) || 0) + Number(count || 0));
        }
      }
      if (s.channelVoiceMs) {
        const voiceEntries = s.channelVoiceMs instanceof Map ? s.channelVoiceMs.entries() : Object.entries(s.channelVoiceMs);
        for (const [chId, ms] of voiceEntries) {
          voiceTotals.set(chId, (voiceTotals.get(chId) || 0) + Number(ms || 0));
        }
      }
    }

    const sortedText = Array.from(textTotals.entries())
      .filter(([chId]) => message.guild.channels.cache.has(chId))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const sortedVoice = Array.from(voiceTotals.entries())
      .filter(([chId]) => message.guild.channels.cache.has(chId))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const textRows = sortedText.length > 0
      ? sortedText.map(([chId, count], idx) => `  • **${idx + 1}.** <#${chId}>: **${count.toLocaleString("tr-TR")}** mesaj`).join("\n")
      : "  • Henüz metin kanalı aktivitesi yok.";

    const voiceRows = sortedVoice.length > 0
      ? sortedVoice.map(([chId, ms], idx) => {
          const mins = Math.floor(ms / 60000);
          const hrs = Math.floor(mins / 60);
          const timeStr = hrs > 0 ? `${hrs} sa ${mins % 60} dk` : `${mins} dk`;
          return `  • **${idx + 1}.** <#${chId}>: **${timeStr}**`;
        }).join("\n")
      : "  • Henüz ses kanalı aktivitesi yok.";

    const content = [
      `### 📊 ${message.guild.name} - Kanal Aktivite Sıralaması`,
      `▫️ **En Aktif Metin Kanalları:**`,
      textRows,
      "",
      `▫️ **En Aktif Ses Kanalları:**`,
      voiceRows,
      "",
      `-# Kanal aktivite verileri botun sunucuda aktif olduğu sürece toplanmaktadır.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

