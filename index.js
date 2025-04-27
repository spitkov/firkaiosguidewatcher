const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const regex = /(?=.*(ios[^\s]*|iphone[^\s]*|tutorial[^\s]*))(?=.*(hogy[^\s]*|letöltés[^\s]*))/i;
const serverCooldowns = new Map();
const cooldownTime = 60 * 1000;

client.once("ready", () => {
  console.log("kész");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const guildId = message.guild.id;
  const now = Date.now();

  if (serverCooldowns.has(guildId)) {
    const lastMessageTime = serverCooldowns.get(guildId);
    if (now - lastMessageTime < cooldownTime) return;
  }

  serverCooldowns.set(guildId, now);

  if (regex.test(message.content)) {
    const embed = new EmbedBuilder()
      .setColor("#121212")
      .setTitle("Firka iOS Sideload Guide")
      .setDescription(
        "Itt van a guide: https://github.com/spitkov/app-legacy/blob/patch-3/ipa-sideloading.md\nTovábbi információk: <#1365805545478426754>"
      )
      .setFooter({
        text: "Firka iOS Guide Autoreplyer",
        iconURL: "https://files.catbox.moe/4uchq0.gif",
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("📚 Megnyitás")
        .setStyle(ButtonStyle.Link)
        .setURL(
          "https://github.com/spitkov/app-legacy/blob/patch-3/ipa-sideloading.md"
        )
    );

    await message.reply({ embeds: [embed], components: [row] });
  }
});

client.login("TOKEN");
