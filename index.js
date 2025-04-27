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
const fs = require("fs");
const path = require("path");
const axios = require("axios");

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

if (!process.env.GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY environment variable");
  console.error("Add GROQ_API_KEY=your_api_key to .env file");
  process.exit(1);
}

const groqApiKey = process.env.GROQ_API_KEY;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const serverCooldowns = new Map();
const cooldownTime = 60 * 1000;

const countersFile = path.join(__dirname, "counters.json");
let serverCounters = {};

try {
  if (fs.existsSync(countersFile)) {
    const data = fs.readFileSync(countersFile, 'utf8');
    serverCounters = JSON.parse(data);
  }
} catch (error) {
  console.error(`[ERROR] Error loading counter data: ${error.message}`);
}

function saveCounters() {
  try {
    fs.writeFileSync(countersFile, JSON.stringify(serverCounters, null, 2));
  } catch (error) {
    console.error(`[ERROR] Error saving counter data: ${error.message}`);
  }
}

function incrementCounter(guildId) {
  if (!serverCounters[guildId]) {
    serverCounters[guildId] = 0;
  }
  serverCounters[guildId]++;
  saveCounters();
  return serverCounters[guildId];
}

function createIosGuideResponse(guildId) {
  const count = guildId ? serverCounters[guildId] || 0 : 0;
  
  const embed = new EmbedBuilder()
    .setColor("#121212")
    .setTitle("Firka iOS Sideload Guide")
    .setDescription(
      "Itt van a guide: https://docs.qwit.org/Firka/ipa_telepites.html\nTovábbi információk: <#1365805545478426754>"
    )
    .setFooter({
      text: `Firka iOS Guide Autoreplyer | Triggered ${count} times in this server`,
      iconURL: "https://files.catbox.moe/4uchq0.gif",
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("📚 Megnyitás")
      .setStyle(ButtonStyle.Link)
      .setURL(
        "https://docs.qwit.org/Firka/ipa_telepites.html"
      )
  );

  return { embeds: [embed], components: [row] };
}

async function isAskingAboutIosGuide(message) {
  const lowerMessage = message.toLowerCase();
  
  const hasFirka = /firk/i.test(lowerMessage);
  const hasIos = /ios/i.test(lowerMessage);
  const hasIphone = /iphon/i.test(lowerMessage);
  const hasBasicKeywords = hasFirka && (hasIos || hasIphone);
  
  console.log(`[KEYWORD CHECK] Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
  console.log(`[KEYWORD CHECK] Contains firka: ${hasFirka}, ios: ${hasIos}, iphone: ${hasIphone}`);
  console.log(`[KEYWORD CHECK] Passes basic keywords check: ${hasBasicKeywords}`);
  
  if (!hasBasicKeywords) {
    console.log(`[DECISION] Skipping - basic keywords not found`);
    return false;
  }
  
  // Quick check if the message is just sharing a link
  const containsUrl = /(https?:\/\/[^\s]+)/g.test(message);
  if (containsUrl && message.length < 100) {
    console.log(`[DECISION] Skipping - message appears to be just sharing a link`);
    return false;
  }
  
  console.log(`[AI CHECK] Keywords found, using AI to validate`);
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "You are a classifier that determines if someone is ASKING FOR HELP about installing, downloading, or sideloading the Firka app on iOS devices. Only respond with 'true' if the message is asking a question or requesting help. Respond with 'false' for statements, link sharing, or mentions that aren't explicitly asking for assistance. Your response must be strictly 'true' or 'false' only."
          },
          {
            role: "user",
            content: `Analyze this message and determine if the person is ASKING a question or seeking help about how to install, download, or sideload the Firka app on iOS/iPhone. Respond with 'false' if they are just sharing information or links rather than asking for help.\n\nMessage: "${message}"\n\nIs this person asking for help with Firka on iOS? (true/false)`
          }
        ],
        temperature: 0
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.choices[0].message.content.trim().toLowerCase();
    console.log(`[AI RESPONSE] For message: "${message.substring(0, 30)}..." AI returned: ${result}`);
    console.log(`[DECISION] ${result === 'true' ? 'Sending guide' : 'Not sending guide'} based on AI response`);
    return result === 'true';
  } catch (error) {
    console.error(`[ERROR] Error calling Groq API: ${error.message}`);
    console.log(`[FALLBACK] Using keyword match result: ${hasBasicKeywords}`);
    return hasBasicKeywords;
  }
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
    const guildId = interaction.guildId;
    incrementCounter(guildId);
    await interaction.reply(createIosGuideResponse(guildId));
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) {
    console.log(`[MESSAGE] Ignored bot message from ${message.author.tag}`);
    return;
  }

  console.log(`[MESSAGE] User ${message.author.tag} in ${message.guild.name} (${message.guild.id}): "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`);

  const guildId = message.guild.id;
  const now = Date.now();

  if (serverCooldowns.has(guildId)) {
    const lastMessageTime = serverCooldowns.get(guildId);
    if (now - lastMessageTime < cooldownTime) {
      console.log(`[COOLDOWN] Server ${message.guild.name} (${guildId}) is on cooldown. Skipping.`);
      return;
    }
  }

  console.log(`[PROCESSING] Checking if message is relevant...`);
  const isRelevant = await isAskingAboutIosGuide(message.content);
  
  if (isRelevant) {
    console.log(`[ACTION] Sending iOS guide to ${message.author.tag} in ${message.guild.name}`);
    serverCooldowns.set(guildId, now);
    incrementCounter(guildId);
    await message.reply(createIosGuideResponse(guildId));
  } else {
    console.log(`[ACTION] Not sending guide - message not relevant`);
  }
});

client.login(token);
