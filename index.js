// Firka iOS Guide Autoreplyer - Improved Version
// This Discord bot automatically replies with an iOS sideload guide if someone asks (in Hungarian or English) about installing, downloading, or sideloading the Firka app on iOS.
// It uses both keyword logic and an AI classifier for high accuracy and spam prevention.

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

// --- Environment variable validation ---
if (!process.env.DISCORD_TOKEN) {
  console.error("❌ Missing required DISCORD_TOKEN environment variable");
  console.error("Make sure you have a .env file with DISCORD_TOKEN=your_token");
  process.exit(1);
}

const token = process.env.DISCORD_TOKEN;
if (typeof token !== 'string' || token.trim() === '') {
  console.error("❌ DISCORD_TOKEN is empty or invalid");
  process.exit(1);
}

if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ Missing OPENROUTER_API_KEY environment variable");
  console.error("Add OPENROUTER_API_KEY=your_api_key to .env file");
  process.exit(1);
}

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

// --- Discord client setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- Cooldown and analytics ---
const COOLDOWN_TIME_MS = 30 * 1000; // 30 seconds per server
const serverCooldowns = new Map(); // Tracks last reply time per server
const countersFile = path.join(__dirname, "counters.json");
let serverCounters = {}; // Tracks how many times the guide was sent per server

// --- Load counter data from file (persistent analytics) ---
try {
  if (fs.existsSync(countersFile)) {
    const data = fs.readFileSync(countersFile, 'utf8');
    serverCounters = JSON.parse(data);
  }
} catch (error) {
  console.error(`[ERROR] Error loading counter data: ${error.message}`);
}

// --- Save counter data to file ---
function saveCounters() {
  try {
    fs.writeFileSync(countersFile, JSON.stringify(serverCounters, null, 2));
  } catch (error) {
    console.error(`[ERROR] Error saving counter data: ${error.message}`);
  }
}

// --- Increment the per-server counter and persist ---
function incrementCounter(guildId) {
  if (!serverCounters[guildId]) {
    serverCounters[guildId] = 0;
  }
  serverCounters[guildId]++;
  saveCounters();
  return serverCounters[guildId];
}

// --- Build the Hungarian iOS guide embed ---
function createIosGuideResponse(guildId) {
  const count = guildId ? serverCounters[guildId] || 0 : 0;
  const embed = new EmbedBuilder()
    .setColor("#00BFFF")
    .setTitle("📱 Firka iOS Sideload Útmutató")
    .setDescription(
      "Szeretnéd telepíteni vagy sideloadolni a Firka alkalmazást iOS eszközödre? Itt egy lépésről lépésre útmutató, ami segít az indulásban!\n\n" +
      "**Útmutató:** [Kattints ide a Firka iOS Sideload Útmutatóhoz](https://docs.qwit.org/Firka/ipa_telepites.html)\n" +
      "**További segítség:** <#1365805545478426754>!"
    )
    .setThumbnail("https://files.catbox.moe/4uchq0.gif")
    .setFooter({
      text: `Firka iOS Guide Autoreplyer • Ebben a szerveren elküldve: ${count} alkalommal` + (count > 10 ? ' 🚀' : ''),
      iconURL: "https://files.catbox.moe/4uchq0.gif",
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("📚 Útmutató megnyitása")
      .setStyle(ButtonStyle.Link)
      .setURL("https://docs.qwit.org/Firka/ipa_telepites.html")
  );

  return { embeds: [embed], components: [row] };
}

// --- AI-based message classifier (Hungarian+English) ---
// Returns true if message is likely asking about installing/sideloading Firka on iOS
async function isAskingAboutIosGuide(message) {
  // Lowercase the message for keyword checks
  const lowerMessage = message.toLowerCase();

  // Hungarian and English keyword variants
  const firkaKeywords = /(firka|fírka|f1rka|firk4)/;
  const iosKeywords = /(ios|i\.os|i-os|apple|ipad|iphone|iph0ne|ios-re|iosra|iphonera|ipadra)/;
  const installKeywords = /(install|download|letölt|letolteni|letoltes|letöltés|telep[ií]t|sideload|ipa|get|add|setup|telepites|felrak|feltelep[ií]t|hogyan tudom|hogy tudom|hogy toltom|hogy lehet)/;

  // Check for keyword presence
  const hasFirka = firkaKeywords.test(lowerMessage);
  const hasIos = iosKeywords.test(lowerMessage);
  const hasInstall = installKeywords.test(lowerMessage);

  // Loosened logic: trigger if any two of the three are present
  const trigger = (hasFirka && hasIos) || (hasFirka && hasInstall) || (hasIos && hasInstall);

  console.log(`[KEYWORD CHECK] Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
  console.log(`[KEYWORD CHECK] firka: ${hasFirka}, ios: ${hasIos}, install: ${hasInstall}`);
  console.log(`[KEYWORD CHECK] Passes loose trigger: ${trigger}`);

  if (!trigger) {
    console.log(`[DECISION] Skipping - loose trigger not found`);
    return false;
  }

  // AI validation for ambiguous or edge cases, now with Hungarian context
  console.log(`[AI CHECK] Keywords found, using AI to validate`);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "meta-llama/llama-4-scout:free",
        messages: [
          {
            role: "system",
            content: "You are an expert Discord bot that determines if a message is asking for help with installing, downloading, getting, or sideloading the Firka app on iOS devices. The user may write in Hungarian or English, and may use slang or typos. Only respond with 'true' or 'false'."
          },
          {
            role: "user",
            content: `A következő üzenet arról érdeklődik, hogyan lehet letölteni, telepíteni vagy sideloadolni a Firka alkalmazást iOS-re, iPhone-ra vagy iPadre? Válaszolj csak "true" vagy "false" értékkel.\n\nÜzenet: "${message}"`
          }
        ],
        temperature: 0
      },
      {
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.choices[0].message.content.trim().toLowerCase();
    console.log(`[AI RESPONSE] For message: "${message.substring(0, 30)}..." AI returned: ${result}`);
    console.log(`[DECISION] ${result === 'true' ? 'Sending guide' : 'Not sending guide'} based on AI response`);
    return result === 'true';
  } catch (error) {
    // Improved error logging for AI API issues
    console.error(`[ERROR] Error calling OpenRouter API: ${error.message}`);
    if (error.response) {
      console.error(`[ERROR] OpenRouter API response:`, error.response.data);
    }
    console.log(`[FALLBACK] Using keyword match result: ${trigger}`);
    return trigger;
  }
}

// --- Slash Command Setup (Hungarian) ---
const commands = [
  new SlashCommandBuilder()
    .setName('iosguide')
    .setDescription('Megmutatja a Firka iOS sideload útmutatót')
];

const rest = new REST({ version: '10' }).setToken(token);

// --- Register slash command and set bot presence ---
client.once("ready", async () => {
  client.user.setPresence({ activities: [{ name: 'Firka iOS útmutató', type: 3 }], status: 'online' });
  console.log("✅ Bot is online and ready!");
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

// --- Handle slash command interaction ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'iosguide') {
    const guildId = interaction.guildId;
    incrementCounter(guildId);
    await interaction.reply(createIosGuideResponse(guildId));
  }
});

// --- Main message listener: triggers on relevant user messages ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) {
    console.log(`[MESSAGE] Ignored bot message from ${message.author.tag}`);
    return;
  }
  if (!message.guild) return; // Only reply in guilds
  console.log(`[MESSAGE] User ${message.author.tag} in ${message.guild.name} (${message.guild.id}): "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`);
  const guildId = message.guild.id;
  const now = Date.now();
  if (serverCooldowns.has(guildId)) {
    const lastMessageTime = serverCooldowns.get(guildId);
    if (now - lastMessageTime < COOLDOWN_TIME_MS) {
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
