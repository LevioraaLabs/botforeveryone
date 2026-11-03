import { UtilityUI } from "../services/UtilityUI.js";

export default {
  name: "yardim",
  aliases: ["yardım", "help", "komutlar", "h"],
  async execute({ client, message, args = [], config }) {
    const rawCat = (args[0] || "main").toLowerCase();
    const map = {
      genel: "genel",
      utility: "genel",
      mod: "moderasyon",
      moderasyon: "moderasyon",
      ceza: "moderasyon",
      kayit: "kayit",
      kayıt: "kayit",
      register: "kayit",
      stat: "stat",
      istatistik: "stat",
      seviye: "stat",
      level: "stat",
      ekonomi: "ekonomi",
      eco: "ekonomi",
      casino: "ekonomi",
      guard: "guard",
      koruma: "guard",
      guvenlik: "guard"
    };
    const selected = map[rawCat] || "main";
    const payload = UtilityUI.formatHelpPayload({ config, selectedCategory: selected });
    return message.reply(payload);
  }
};
