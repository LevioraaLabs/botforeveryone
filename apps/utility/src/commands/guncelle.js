import { MessageFormatter, GitUpdateManager } from "@bot/core";

export default {
  name: "guncelle",
  aliases: ["güncelle", "update", "gitupdate", "git-update"],
  async execute({ client, message, args, config }) {
    const isGuildOwner = Boolean(message.guild?.ownerId && message.guild.ownerId === message.author.id);
    const isEnvOwner = Boolean(process.env.OWNER_ID && process.env.OWNER_ID === message.author.id);
    const isBotOwner = Boolean(typeof client.isBotOwner === "function" && client.isBotOwner(message.author.id, config));

    if (!isGuildOwner && !isEnvOwner && !isBotOwner) {
      return message.reply(MessageFormatter.error("Yetkisiz Erişim", "Bu komutu yalnızca sunucu sahibi veya ekosistem yöneticisi kullanabilir."));
    }

    const disk = GitUpdateManager.checkDiskSpace();
    if (!disk.sufficient) {
      return message.reply(MessageFormatter.error(
        "Yetersiz Depolama Alanı",
        `Sistemde tam kod ve veritabanı yedeği alabilmek için yeterli disk alanı bulunamadı.\n\n▫️ **Gereken Alan:** \`${disk.requiredMB} MB\`\n▫️ **Mevcut Boş Alan:** \`${disk.freeMB} MB\`\n▫️ **Eksik Alan:** \`${disk.missingMB} MB\`\n\nLütfen diskte yer açtıktan sonra güncellemeyi tekrar deneyiniz.`
      ));
    }

    const status = GitUpdateManager.getGitStatus();
    const isForce = (args || []).some((a) => a === "--force" || a === "-f");

    if (status.isUpToDate && status.commitsBehind === 0 && !isForce) {
      return message.reply(MessageFormatter.success(
        "Sistem Zaten Güncel",
        `Bot ekosistemi GitHub reposu ile senkronize durumdadır.\n\n▫️ **Aktif Dal:** \`${status.branch}\`\n▫️ **Son Commit:** \`${status.commitMessage}\`\n▫️ **Kullanılabilir Boş Alan:** \`${disk.freeMB} MB\`\n\nYine de zorla yeniden güncellemek isterseniz \`.guncelle --force\` komutunu kullanabilirsiniz.`
      ));
    }

    const branch = status.branch || "main";
    const pendingText = status.commitsBehind > 0 ? `${status.commitsBehind} yeni commit` : "Zorunlu güncelleme modu";

    const sent = await message.reply(MessageFormatter.info(
      "Güncelleme Başlatıldı",
      `Kodlar ve veritabanı yedekleniyor, GitHub üzerindeki son değişiklikler projeye uygulanıyor...\n\n▫️ **Hedef Dal:** \`${branch}\`\n▫️ **Durum:** \`${pendingText}\`\n▫️ **Kullanılabilir Boş Alan:** \`${disk.freeMB} MB\``
    ));

    const result = await GitUpdateManager.performSafeUpdate({ branch });

    if (!result.success) {
      return sent.edit(MessageFormatter.error(
        "Güncelleme Başarısız",
        `İşlem sırasında hata meydana geldi:\n\n\`\`\`\n${result.error || "Bilinmeyen hata"}\n\`\`\``
      ));
    }

    const updatedDisk = GitUpdateManager.checkDiskSpace();
    const backupName = result.backup?.backupName || "Bilinmiyor";
    const fileCount = result.backup?.fileCount || 0;
    const codeFiles = result.backup?.codeFiles || 0;
    const dbFiles = result.backup?.dbFiles || 0;
    const commitMsg = result.status?.commitMessage || "Güncel";

    await sent.edit(MessageFormatter.success(
      "Güncelleme Başarıyla Tamamlandı",
      `Bot ekosistemi GitHub reposundaki en güncel sürüme yükseltildi!\n\n▫️ **Yedek Bilgisi:** \`${backupName}\` (${fileCount} dosya - Kodlar: ${codeFiles}, Veritabanı: ${dbFiles})\n▫️ **Yeni Sürüm:** \`${commitMsg}\`\n▫️ **Kalan Boş Disk:** \`${updatedDisk.freeMB} MB\`\n\nBotlar yeni kodları yüklemek üzere 2 saniye içinde yeniden başlatılıyor...`
    ));

    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }
};
