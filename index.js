const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const dotenv = require("dotenv");

dotenv.config();

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing required DISCORD_TOKEN environment variable");
  console.error("Make sure you have a .env file with DISCORD_TOKEN=your_token");
  process.exit(1);
}

const token = process.env.DISCORD_TOKEN;
if (typeof token !== 'string' || token.trim() === '') {
  console.error("DISCORD_TOKEN is empty or invalid");
  process.exit(1);
}

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

function createIosGuideResponse() {
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

  return { embeds: [embed], components: [row] };
}

const commands = [
  new SlashCommandBuilder()
    .setName('iosguide')
    .setDescription('Shows the iOS sideload guide')
];

const rest = new REST({ version: '10' }).setToken(token);

client.once("ready", async () => {
  console.log("Bot is ready");
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'iosguide') {
    await interaction.reply(createIosGuideResponse());
  }
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
    await message.reply(createIosGuideResponse());
  }
});

client.login(token);
