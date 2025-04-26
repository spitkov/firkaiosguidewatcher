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

const regex =
  /(?=.*(ios[^\s]*|iphone[^\s]*))(?=.*(hogy[^\s]*|letöltés[^\s]*))/i;

client.once("ready", () => {
  console.log("kész");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (regex.test(message.content)) {
    const embed = new EmbedBuilder()
      .setColor("#121212")
      .setTitle("Firka iOS Sideload Guide")
      .setDescription(
        "Itt van a guide: https://github.com/QwIT-Development/app-legacy/blob/master/ipa-sideloading.md\nTovábbi információk: <#1365805545478426754>"
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
          "https://github.com/QwIT-Development/app-legacy/blob/master/ipa-sideloading.md"
        )
    );

    await message.reply({ embeds: [embed], components: [row] });
  }
});

client.login("TOKEN");
