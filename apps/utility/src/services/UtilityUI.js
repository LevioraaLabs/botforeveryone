import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { MessageFormatter } from "@bot/core";

export class UtilityUI {
  static formatAvatarPayload({ targetUser, avatarUrl }) {
    const content = `### ${targetUser.tag || targetUser.username} - Profil Fotoğrafı\n${avatarUrl}\n\n-# Görseli tam boyutta görüntülemek veya afişi incelemek için butonları kullanabilirsiniz.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Tarayıcıda Aç")
        .setStyle(ButtonStyle.Link)
        .setURL(avatarUrl),
      new ButtonBuilder()
        .setCustomId(`util_view_banner:${targetUser.id}`)
        .setLabel("Afişi Gör")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatBannerPayload({ targetUser, bannerUrl }) {
    const content = `### ${targetUser.tag || targetUser.username} - Profil Afişi\n${bannerUrl}\n\n-# Görseli tam boyutta görüntülemek veya profil fotoğrafını incelemek için butonları kullanabilirsiniz.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Tarayıcıda Aç")
        .setStyle(ButtonStyle.Link)
        .setURL(bannerUrl),
      new ButtonBuilder()
        .setCustomId(`util_view_avatar:${targetUser.id}`)
        .setLabel("Profil Fotoğrafı")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatServerPayload({ guild, owner, totalMembers, humanCount, botCount, textChannels, voiceChannels, categories, roleCount, emojiCount, boostTier, boostCount, createdTimestamp }) {
    const content = `### ${guild.name} - Sunucu Bilgileri\n▫️ **Sunucu Sahibi:** ${owner ? `${owner.user?.tag || owner.displayName} (<@${owner.id}>)` : "Bilinmiyor"}\n▫️ **Kuruluş Tarihi:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)\n▫️ **Sunucu ID:** \`${guild.id}\`\n\n▫️ **Üye Dağılımı:**\n  • Toplam: **${totalMembers.toLocaleString("tr-TR")}** (İnsan: **${humanCount.toLocaleString("tr-TR")}** | Bot: **${botCount}**)\n\n▫️ **Kanal ve Roller:**\n  • Kanallar: **${guild.channels.cache.size}** (Metin: ${textChannels} | Ses: ${voiceChannels} | Kategori: ${categories})\n  • Roller: **${roleCount}** adet | Emojiler: **${emojiCount}** adet\n\n▫️ **Takviye (Boost) Durumu:**\n  • Seviye: **Seviye ${boostTier}** | Toplam Takviye: **${boostCount} Boost**\n\n-# Bilgiler Discord API üzerinden gerçek zamanlı alınmıştır.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("util_server_icon")
        .setLabel("Sunucu İkonu")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!guild.iconURL()),
      new ButtonBuilder()
        .setCustomId("util_server_banner")
        .setLabel("Sunucu Afişi")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!guild.bannerURL()),
      new ButtonBuilder()
        .setCustomId("util_server_refresh")
        .setLabel("Yenile")
        .setStyle(ButtonStyle.Primary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatUserPayload({ targetMember, user, joinedServerTs, createdAccountTs, roles, rolesStr, voiceStatus, keyPermissions }) {
    const content = [
      `### Kullanıcı Profili: ${user.tag || user.username}`,
      `▫️ **Kullanıcı:** <@${user.id}> (\`${user.id}\`)`,
      `▫️ **Hesap Türü:** ${user.bot ? "Bot" : "Üye"}`,
      `▫️ **En Yüksek Rol:** ${targetMember.roles.highest}`,
      `▫️ **Hesap Kuruluşu:** <t:${createdAccountTs}:F> (<t:${createdAccountTs}:R>)`,
      `▫️ **Sunucuya Katılış:** ${joinedServerTs ? `<t:${joinedServerTs}:F> (<t:${joinedServerTs}:R>)` : "Bilinmiyor"}`,
      `▫️ **Ses Durumu:** ${voiceStatus}`,
      "",
      `▫️ **Roller (${roles.size}):**`,
      `  ${rolesStr}`,
      targetMember.premiumSince ? `\n▫️ **Takviye (Boost):** <t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:F> tarihinden beri takviyeli` : "",
      keyPermissions.length > 0 ? `\n▫️ **Önemli Yetkiler:** ${keyPermissions.join(", ")}` : "",
      "",
      `-# Bilgiler sunucu ve Discord API üzerinden anlık sorgulanmıştır.`
    ].filter(Boolean).join("\n");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`util_view_avatar:${user.id}`)
        .setLabel("Profil Fotoğrafı")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`util_view_banner:${user.id}`)
        .setLabel("Profil Afişi")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatPingPayload({ wsPing, msgPing, dbPing, hours, minutes, statusText }) {
    const content = `### Sistem Gecikme & Performans Raporu\n▫️ **WebSocket Gecikmesi:** \`${wsPing} ms\`\n▫️ **Mesaj Yanıt Süresi:** \`${msgPing} ms\`\n▫️ **Veritabanı (MongoDB/SQL):** \`${dbPing} ms\`\n▫️ **Çalışma Süresi (Uptime):** \`${hours} saat ${minutes} dakika\`\n▫️ **Sistem Durumu:** ${statusText}\n\n-# Ölçümler anlık donanım ve ağ metriklerine dayanır.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("util_ping_refresh")
        .setLabel("Gecikmeyi Yeniden Ölç")
        .setStyle(ButtonStyle.Primary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatHelpPayload({ config, selectedCategory = "main" }) {
    const prefix = config?.prefix || ".";

    const categories = {
      main: {
        title: "LevioraLabs Bot Ekosistemi - Komut ve Yardım Rehberi",
        description: [
          `LevioraLabs Discord altyapısına hoş geldiniz. Aşağıdaki menüden bir kategori seçerek veya doğrudan \`${prefix}yardım <kategori>\` yazarak komut listesini inceleyebilirsiniz.`,
          "",
          "▫️ **Mevcut Kategoriler:**",
          `  • ▫️ **Genel:** Kullanıcı ve sunucu araçları (\`${prefix}yardım genel\`)`,
          `  • ▫️ **Moderasyon:** Güvenlik ve ceza yönetim komutları (\`${prefix}yardım moderasyon\`)`,
          `  • ▫️ **Kayıt:** Üye teyit ve karşılama sistemi (\`${prefix}yardım kayit\`)`,
          `  • ▫️ **İstatistik:** Ses, mesaj ve seviye sıralamaları (\`${prefix}yardım stat\`)`,
          `  • ▫️ **Ekonomi:** Bakiye, iş, borsa ve casino oyunları (\`${prefix}yardım ekonomi\`)`,
          `  • ▫️ **Koruma (Guard):** Sunucu yedekleme ve güvenlik protokolleri (\`${prefix}yardım guard\`)`,
          "",
          `-# Sunucu genel komut öneki: \`${prefix}\` • Detaylar için aşağıdaki seçim menüsünü kullanın.`
        ].join("\n")
      },
      genel: {
        title: "Genel & Yardımcı Komutlar",
        description: [
          `▫️ \`${prefix}ping\` : Sistem yanıt sürelerini ve gecikmeyi ölçer.`,
          `▫️ \`${prefix}avatar [@üye]\` : Belirtilen üyenin profil fotoğrafını gösterir.`,
          `▫️ \`${prefix}banner [@üye]\` : Belirtilen üyenin profil afişini görüntüler.`,
          `▫️ \`${prefix}sunucu\` : Sunucu hakkındaki tüm istatistikleri ve bilgileri listeler.`,
          `▫️ \`${prefix}kullanicibilgi [@üye]\` : Üyenin sunucu ve hesap detaylarını raporlar.`,
          `▫️ \`${prefix}kurallar\` : Sunucu kurallarını ve onay butonunu gönderir.`,
          `▫️ \`${prefix}anket <soru> | <seçenek1> | <seçenek2>\` : Butonlu interaktif anket başlatır.`,
          `▫️ \`${prefix}cekilis <süre> <kazanan> <ödül>\` : Hızlı çekiliş oturumu açar.`,
          `▫️ \`${prefix}reroll <mesaj-id>\` : Çekilişte yeni kazanan belirler.`,
          `▫️ \`${prefix}ticketkur\` : Butonlu destek talebi (ticket) sistemini kurar.`,
          `▫️ \`${prefix}odapanel\` : Geçici özel ses odası (JTC) kontrol panelini kurar.`,
          `▫️ \`${prefix}radyo <istasyon>\` : Ses kanalında kesintisiz canlı radyo yayını başlatır.`,
          `▫️ \`${prefix}oneri <fikir>\` : Oylamalı öneri sistemine yeni kayıt iletir.`,
          `▫️ \`${prefix}itiraf <mesaj>\` : İtiraf kanalına anonim itiraf gönderir.`,
          `▫️ \`${prefix}dogumgunu <gün/ay>\` : Doğum günü tarihini sisteme kaydeder.`,
          `▫️ \`${prefix}guncelle\` : GitHub üzerindeki en güncel kodları çeker ve botları yeniler.`
        ].join("\n")
      },
      moderasyon: {
        title: "Moderasyon ve Disiplin Komutları",
        description: [
          `▫️ \`${prefix}ban <@üye> [sebep]\` : Kullanıcıyı sunucudan kalıcı olarak yasaklar.`,
          `▫️ \`${prefix}unban <kullanıcı-id>\` : Kullanıcının sunucu yasağını kaldırır.`,
          `▫️ \`${prefix}forceban <id> [sebep]\` : Sunucudan çıksa dahi giremeyecek akıllı ban atar.`,
          `▫️ \`${prefix}kick <@üye> [sebep]\` : Kullanıcıyı sunucudan atar.`,
          `▫️ \`${prefix}jail <@üye> <süre> [sebep]\` : Kullanıcıyı karantinaya alır.`,
          `▫️ \`${prefix}unjail <@üye>\` : Kullanıcının cezasını sonlandırıp eski rollerini verir.`,
          `▫️ \`${prefix}mute <@üye> <süre> [sebep]\` : Metin kanallarında susturur.`,
          `▫️ \`${prefix}vmute <@üye> <süre> [sebep]\` : Ses kanallarında susturur.`,
          `▫️ \`${prefix}sil <1-100>\` : Belirtilen miktarda mesajı topluca temizler.`,
          `▫️ \`${prefix}kilit [aç/kapat]\` : Kanalı mesaj gönderimine kilitler veya açar.`,
          `▫️ \`${prefix}sicil [@üye]\` : Üyenin tüm geçmiş ceza ve uyarı sicilini gösterir.`,
          `▫️ \`${prefix}ceza <ceza-id>\` : Belirli bir ceza kaydının detaylarını gösterir.`,
          `▫️ \`${prefix}uyar <@üye> [sebep]\` : Kullanıcıya kademeli ihtar ve ceza puanı işler.`,
          `▫️ \`${prefix}snipe\` : Son silinen veya düzenlenen mesajı kanıtıyla gösterir.`,
          `▫️ \`${prefix}rolver <@üye> <@rol>\` : Belirtilen üyeye yetkili rolü atar.`,
          `▫️ \`${prefix}rolal <@üye> <@rol>\` : Belirtilen üyeden rol alır.`,
          `▫️ \`${prefix}afk [sebep]\` : AFK moduna geçer, etiketlendiğinde durum bildirir.`
        ].join("\n")
      },
      kayit: {
        title: "Kayıt ve Karşılama Komutları",
        description: [
          `▫️ \`${prefix}kayıt <@üye> <İsim> [Yaş]\` : Yeni üyeyi sunucuya kayıt eder.`,
          `▫️ \`${prefix}isim <@üye> <İsim> [Yaş]\` : Üyenin sunucu takma adını günceller.`,
          `▫️ \`${prefix}isimler <@üye>\` : Üyenin geçmiş sunucu isimlerini listeler.`,
          `▫️ \`${prefix}kayıtsız <@üye>\` : Üyenin rollerini alıp kayıtsıza atar.`,
          `▫️ \`${prefix}say\` : Sunucudaki toplam, sesli ve kayıtlı üye sayısını gösterir.`,
          `▫️ \`${prefix}davet [@üye]\` : Üyenin getirdiği toplam ve gerçek davetleri raporlar.`,
          `▫️ \`${prefix}topteyit\` : En çok kayıt gerçekleştiren yetkilileri sıralar.`,
          `▫️ \`${prefix}vip <@üye>\` : Kullanıcıya özel VIP üye statüsü tanımlar.`,
          `▫️ \`${prefix}cihaz <@üye>\` : Üyenin Discord'a bağlandığı cihazları gösterir.`
        ].join("\n")
      },
      stat: {
        title: "İstatistik ve Seviye Komutları",
        description: [
          `▫️ \`${prefix}stat [@üye]\` : Haftalık ve toplam ses/mesaj istatistiğini açar.`,
          `▫️ \`${prefix}me\` : Kişiselleştirilmiş görsel anime istatistik kartı üretir.`,
          `▫️ \`${prefix}seviye [@üye]\` : Deneyim puanı (XP) ve seviye kartını gösterir.`,
          `▫️ \`${prefix}gorev\` : Günlük görevleri ve kazanılacak ödülleri listeler.`,
          `▫️ \`${prefix}bilet\` : BattlePass sezon bileti aşamalarını ve ödüllerini açar.`,
          `▫️ \`${prefix}topstat\` : Sunucunun en aktif ses ve mesaj liderlerini sıralar.`,
          `▫️ \`${prefix}topseviye\` : En yüksek seviyeli üyeleri listeler.`,
          `▫️ \`${prefix}topkanal\` : En çok konuşulan ve dinlenen kanalları listeler.`,
          `▫️ \`${prefix}tema <tema-adı>\` : İstatistik kartlarının anime görsel temasını değiştirir.`,
          `▫️ \`${prefix}unvan [seç]\` : Profilde sergilenecek unvanı belirler.`
        ].join("\n")
      },
      ekonomi: {
        title: "Ekonomi ve Casino Oyunları",
        description: [
          `▫️ \`${prefix}coin [@üye]\` : Cüzdan ve banka hesabındaki bakiye miktarını gösterir.`,
          `▫️ \`${prefix}günlük\` : 24 saatte bir günlük ücretsiz coin ödülünü tahsil eder.`,
          `▫️ \`${prefix}çalış\` : Meslek icra ederek para kazanır.`,
          `▫️ \`${prefix}gönder <@üye> <miktar>\` : Başka bir kullanıcıya para transfer eder.`,
          `▫️ \`${prefix}market\` : Satın alınabilir rolleri ve güçlendiricileri listeler.`,
          `▫️ \`${prefix}envanter\` : Sahip olunan eşyaları ve sandıkları gösterir.`,
          `▫️ \`${prefix}banka [yatır/çek] <miktar>\` : Parayı güvenli banka hesabına aktarır.`,
          `▫️ \`${prefix}slot <miktar>\` : 3 haneli klasik slot makinesinde şansını dener.`,
          `▫️ \`${prefix}blackjack <miktar>\` : Krupiyeye karşı 21 kart oyunu oynar.`,
          `▫️ \`${prefix}rulet <renk/sayı> <miktar>\` : Canlı rulet masasında bahis yapar.`,
          `▫️ \`${prefix}yazitura <y/t> <miktar>\` : 50/50 şansla yazı tura atar.`,
          `▫️ \`${prefix}duello <@üye> <miktar>\` : Başka bir üyeyle zar düellosu başlatır.`,
          `▫️ \`${prefix}klan\` : Klan yönetimi, üye alımı ve klan kasasını açar.`,
          `▫️ \`${prefix}maden\` : Kazma ile maden kazarak değerli cevher toplar.`,
          `▫️ \`${prefix}balik\` : Oltayla balık avlayıp pazarda satar.`
        ].join("\n")
      },
      guard: {
        title: "Koruma ve Sunucu Güvenliği",
        description: [
          `▫️ \`${prefix}korumabilgi\` : Aktif güvenlik filtrelerini ve son yedekleme tarihini gösterir.`,
          `▫️ \`${prefix}yedekal\` : Sunucu kanallarını, rollerini ve izinlerini anlık yedekler.`,
          `▫️ \`${prefix}yedekliste\` : Alınmış olan tüm sistem yedeklerini listeler.`,
          `▫️ \`${prefix}yedekyukle <yedek-id>\` : Silinen rol ve kanalları yedekten geri yükler.`
        ].join("\n")
      }
    };

    const current = categories[selectedCategory] || categories.main;

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("util_help_select")
      .setPlaceholder("İncelemek istediğiniz komut kategorisini seçin...")
      .addOptions([
        { label: "Genel Bakış & Ana Menü", value: "main", emoji: "▫️", default: selectedCategory === "main" },
        { label: "Genel & Yardımcı Komutlar", value: "genel", emoji: "▫️", default: selectedCategory === "genel" },
        { label: "Moderasyon & Güvenlik", value: "moderasyon", emoji: "▫️", default: selectedCategory === "moderasyon" },
        { label: "Kayıt & Davet Sistemi", value: "kayit", emoji: "▫️", default: selectedCategory === "kayit" },
        { label: "İstatistik & Seviye", value: "stat", emoji: "▫️", default: selectedCategory === "stat" },
        { label: "Ekonomi & Casino Oyunları", value: "ekonomi", emoji: "▫️", default: selectedCategory === "ekonomi" },
        { label: "Sunucu Koruma (Guard)", value: "guard", emoji: "▫️", default: selectedCategory === "guard" }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const content = `### ${current.title}\n${current.description}`;

    return MessageFormatter.v2(content, [row]);
  }
}
