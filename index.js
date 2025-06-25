require('dotenv').config();
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const app = express();
app.get('/', (req, res) => res.send('Бот работает!'));
app.listen(3000, () => console.log('🌐 Express сервер запущен на порту 3000'));

function formatChannelName(username) {
  return username.toLowerCase()
    .replace(/\s+/g, '_')           // пробелы → подчёркивания
    .replace(/[^a-zа-я0-9_]/gi, ''); // только латиница, кириллица, цифры, _
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, async () => {
  console.log(`✅ Бот запущен как ${client.user.tag}`);

  const channel = await client.channels.fetch(process.env.BUTTON_CHANNEL_ID);

  const button = new ButtonBuilder()
    .setCustomId('send_video')
    .setLabel('📩 Отправить видео')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  await channel.send({
    content: 'Нажми кнопку ниже, чтобы создать приватный канал для отправки видео:',
    components: [row]
  });
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'send_video') return;

  const guild = interaction.guild;
  const member = interaction.member;

  // Формируем дату (например, (24.06))
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const formattedDate = `(${day}.${month})`;

  // Формируем имя канала — без "откат-", только username + дата
  const channelName = `${formatChannelName(member.user.username)}${formattedDate}`;

  // Проверяем, есть ли уже канал с таким именем
  const existingChannel = guild.channels.cache.find(c => c.name === channelName);
  if (existingChannel) {
    return interaction.reply({
      content: `📂 У тебя уже есть приватный канал: ${existingChannel}`,
      ephemeral: true
    });
  }

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: member.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    }
  ];

  if (process.env.STAFF_ROLE_ID_1) overwrites.push({ id: process.env.STAFF_ROLE_ID_1, allow: [PermissionsBitField.Flags.ViewChannel] });
  if (process.env.STAFF_ROLE_ID_2) overwrites.push({ id: process.env.STAFF_ROLE_ID_2, allow: [PermissionsBitField.Flags.ViewChannel] });
  if (process.env.STAFF_ROLE_ID_3) overwrites.push({ id: process.env.STAFF_ROLE_ID_3, allow: [PermissionsBitField.Flags.ViewChannel] });

  try {
    const privateChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: process.env.CATEGORY_ID,
      permissionOverwrites: overwrites
    });

    await privateChannel.send({
      content: `👋 Привет, ${interaction.user}, отправь сюда своё откат с МП. Только ты и модераторы видят этот канал.\n\n` +
               `<@&${process.env.STAFF_ROLE_ID_1}> <@&${process.env.STAFF_ROLE_ID_2}> <@&${process.env.STAFF_ROLE_ID_3}>`
    });

    await interaction.reply({ content: '📩 Приватный канал создан!', ephemeral: true });
  } catch (error) {
    console.error('Ошибка при создании канала:', error);
    await interaction.reply({ content: '❌ Не удалось создать канал, попробуйте позже.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
