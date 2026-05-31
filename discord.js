#!/usr/bin/env rterminal-node
local http = require("http")
local ws = require("ws")

local API_VERSION = 10
local DEFAULT_API = "https://discord.com/api/v10"
local GATEWAY = "wss://gateway.discord.gg/?v=10&encoding=json"

local Events = {
  ClientReady = "ready",
  MessageCreate = "messageCreate",
  MessageUpdate = "messageUpdate",
  MessageDelete = "messageDelete",
  MessageReactionAdd = "messageReactionAdd",
  MessageReactionRemove = "messageReactionRemove",
  InteractionCreate = "interactionCreate",
  GuildCreate = "guildCreate",
  GuildDelete = "guildDelete",
  GuildMemberAdd = "guildMemberAdd",
  GuildMemberUpdate = "guildMemberUpdate",
  GuildMemberRemove = "guildMemberRemove",
  GuildRoleCreate = "roleCreate",
  GuildRoleUpdate = "roleUpdate",
  GuildRoleDelete = "roleDelete",
  ChannelCreate = "channelCreate",
  ChannelUpdate = "channelUpdate",
  ChannelDelete = "channelDelete",
  ThreadCreate = "threadCreate",
  ThreadUpdate = "threadUpdate",
  ThreadDelete = "threadDelete",
  PresenceUpdate = "presenceUpdate",
  VoiceStateUpdate = "voiceStateUpdate",
  TypingStart = "typingStart",
  WebhooksUpdate = "webhooksUpdate",
  Raw = "raw",
  Error = "error",
  Debug = "debug",
  Close = "close",
}

local GatewayIntentBits = {
  Guilds = 1,
  GuildMembers = 2,
  GuildModeration = 4,
  GuildEmojisAndStickers = 8,
  GuildIntegrations = 16,
  GuildWebhooks = 32,
  GuildInvites = 64,
  GuildVoiceStates = 128,
  GuildPresences = 256,
  GuildMessages = 512,
  GuildMessageReactions = 1024,
  GuildMessageTyping = 2048,
  DirectMessages = 4096,
  DirectMessageReactions = 8192,
  DirectMessageTyping = 16384,
  MessageContent = 32768,
  GuildScheduledEvents = 65536,
  AutoModerationConfiguration = 1048576,
  AutoModerationExecution = 2097152,
}

local Partials = {
  User = 1,
  Channel = 2,
  GuildMember = 3,
  Message = 4,
  Reaction = 5,
  GuildScheduledEvent = 6,
  ThreadMember = 7,
}

local ChannelType = {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildAnnouncement = 5,
  AnnouncementThread = 10,
  PublicThread = 11,
  PrivateThread = 12,
  GuildStageVoice = 13,
  GuildDirectory = 14,
  GuildForum = 15,
  GuildMedia = 16,
}

local MessageFlags = {
  Crossposted = 1,
  IsCrosspost = 2,
  SuppressEmbeds = 4,
  SourceMessageDeleted = 8,
  Urgent = 16,
  HasThread = 32,
  Ephemeral = 64,
  Loading = 128,
  FailedToMentionSomeRolesInThread = 256,
  SuppressNotifications = 4096,
  IsVoiceMessage = 8192,
}

local ComponentType = {
  ActionRow = 1,
  Button = 2,
  StringSelect = 3,
  TextInput = 4,
  UserSelect = 5,
  RoleSelect = 6,
  MentionableSelect = 7,
  ChannelSelect = 8,
}

local ButtonStyle = {
  Primary = 1,
  Secondary = 2,
  Success = 3,
  Danger = 4,
  Link = 5,
}

local TextInputStyle = {
  Short = 1,
  Paragraph = 2,
}

local PermissionFlagsBits = {
  CreateInstantInvite = 1,
  KickMembers = 2,
  BanMembers = 4,
  Administrator = 8,
  ManageChannels = 16,
  ManageGuild = 32,
  AddReactions = 64,
  ViewAuditLog = 128,
  PrioritySpeaker = 256,
  Stream = 512,
  ViewChannel = 1024,
  SendMessages = 2048,
  SendTTSMessages = 4096,
  ManageMessages = 8192,
  EmbedLinks = 16384,
  AttachFiles = 32768,
  ReadMessageHistory = 65536,
  MentionEveryone = 131072,
  UseExternalEmojis = 262144,
  ViewGuildInsights = 524288,
  Connect = 1048576,
  Speak = 2097152,
  MuteMembers = 4194304,
  DeafenMembers = 8388608,
  MoveMembers = 16777216,
  UseVAD = 33554432,
  ChangeNickname = 67108864,
  ManageNicknames = 134217728,
  ManageRoles = 268435456,
  ManageWebhooks = 536870912,
  ManageGuildExpressions = 1073741824,
  UseApplicationCommands = 2147483648,
}

local ApplicationCommandType = {
  ChatInput = 1,
  User = 2,
  Message = 3,
}

local ApplicationCommandOptionType = {
  Subcommand = 1,
  SubcommandGroup = 2,
  String = 3,
  Integer = 4,
  Boolean = 5,
  User = 6,
  Channel = 7,
  Role = 8,
  Mentionable = 9,
  Number = 10,
  Attachment = 11,
}

local InteractionResponseType = {
  Pong = 1,
  ChannelMessageWithSource = 4,
  DeferredChannelMessageWithSource = 5,
  DeferredUpdateMessage = 6,
  UpdateMessage = 7,
  ApplicationCommandAutocompleteResult = 8,
  Modal = 9,
}

local PermissionOverwriteType = {
  Role = 0,
  Member = 1,
}

local function encode(value)
  value = tostring(value or "")
  value = string.gsub(value, "([^%w%-_%.~])", function(char)
    return string.format("%%%02X", string.byte(char))
  end)
  return value
end

local function merge(target, source)
  target = target or {}
  for key, value in pairs(source or {}) do
    target[key] = value
  end
  return target
end

local function json(value)
  return JSON.stringify(value)
end

local function toJSON(value)
  if type(value) == "table" and type(value.toJSON) == "function" then
    return value:toJSON()
  end
  return value
end

local function arrayToJSON(values)
  local output = {}
  for _, value in ipairs(values or {}) do
    table.insert(output, toJSON(value))
  end
  return output
end

local function normalizePayload(payload)
  local body = type(payload) == "table" and merge({}, payload) or { content = tostring(payload or "") }
  if body.embeds then
    body.embeds = arrayToJSON(body.embeds)
  end
  if body.components then
    body.components = arrayToJSON(body.components)
  end
  if body.embed then
    body.embeds = { toJSON(body.embed) }
    body.embed = nil
  end
  return body
end

local function list(...)
  local output = {}
  for index = 1, select("#", ...) do
    table.insert(output, select(index, ...))
  end
  return output
end

local function Intents(...)
  return list(...)
end

local function userIds(users)
  local ids = {}
  for _, user in ipairs(users or {}) do
    if user and user.id then
      table.insert(ids, tostring(user.id))
    end
  end
  return ids
end

local function mentionText(users)
  local mentions = {}
  for _, id in ipairs(userIds(users)) do
    table.insert(mentions, "<@" .. tostring(id) .. ">")
  end
  return table.concat(mentions, " ")
end

local function joinText(...)
  local parts = {}
  for index = 1, select("#", ...) do
    local value = tostring(select(index, ...) or "")
    if value ~= "" then
      table.insert(parts, value)
    end
  end
  return table.concat(parts, " ")
end

local function pickNonBotUsersFromMessages(messages, limit)
  local picked = {}
  local seen = {}
  for _, message in ipairs(messages or {}) do
    local author = message.author
    if author and author.id and not author.bot and not seen[author.id] then
      seen[author.id] = true
      table.insert(picked, author)
    end
    if #picked >= (tonumber(limit) or 2) then
      break
    end
  end
  return picked
end

local function pickNonBotUsers(client, channel, limit)
  limit = tonumber(limit) or 2
  local picked = {}
  local seen = {}

  local function addUser(user)
    if user and user.id and not user.bot and not seen[user.id] then
      seen[user.id] = true
      table.insert(picked, user)
    end
  end

  local okMessages, messages = pcall(function()
    return channel:messages():fetch()
  end)
  if okMessages then
    for _, message in ipairs(messages or {}) do
      addUser(message.author)
      if #picked >= limit then
        return picked
      end
    end
  end

  local guildId = channel and channel.raw and channel.raw.guild_id
  if guildId and client then
    local okMembers, members = pcall(function()
      return client:fetchGuild(guildId):fetchMembers(100)
    end)
    if okMembers then
      for _, member in ipairs(members or {}) do
        addUser(member.user)
        if #picked >= limit then
          return picked
        end
      end
    end
  end

  return picked
end

local function parse(value)
  if value == nil or tostring(value) == "" then
    return nil
  end
  return JSON.parse(tostring(value))
end

local EventEmitter = {}
EventEmitter.__index = EventEmitter

function EventEmitter.new()
  return setmetatable({ listeners = {} }, EventEmitter)
end

function EventEmitter:on(name, callback)
  self.listeners[name] = self.listeners[name] or {}
  table.insert(self.listeners[name], callback)
  return self
end

function EventEmitter:once(name, callback)
  local wrapper
  wrapper = function(...)
    self:off(name, wrapper)
    callback(...)
  end
  return self:on(name, wrapper)
end

function EventEmitter:off(name, callback)
  local list = self.listeners[name] or {}
  for index = #list, 1, -1 do
    if list[index] == callback then
      table.remove(list, index)
    end
  end
  return self
end

function EventEmitter:emit(name, ...)
  for _, callback in ipairs(self.listeners[name] or {}) do
    local ok, err = pcall(callback, ...)
    if not ok and name ~= Events.Error then
      self:emit(Events.Error, err)
    end
  end
  return true
end

local Collection = {}
Collection.__index = Collection

function Collection.new()
  return setmetatable({ map = {} }, Collection)
end

function Collection:set(key, value)
  self.map[tostring(key)] = value
  return self
end

function Collection:get(key)
  return self.map[tostring(key)]
end

function Collection:has(key)
  return self.map[tostring(key)] ~= nil
end

function Collection:delete(key)
  self.map[tostring(key)] = nil
  return true
end

function Collection:values()
  local output = {}
  for _, value in pairs(self.map) do
    table.insert(output, value)
  end
  return output
end

local function bindMethods(instance, prototype, names)
  for _, name in ipairs(names or {}) do
    instance[name] = function(first, ...)
      if first == instance then
        return prototype[name](instance, ...)
      end
      return prototype[name](instance, first, ...)
    end
  end
  return instance
end

local Routes = {
  channel = function(channelId)
    return "/channels/" .. encode(channelId)
  end,
  channelMessages = function(channelId)
    return "/channels/" .. encode(channelId) .. "/messages"
  end,
  channelTyping = function(channelId)
    return "/channels/" .. encode(channelId) .. "/typing"
  end,
  channelMessageReaction = function(channelId, messageId, emoji)
    return "/channels/" .. encode(channelId) .. "/messages/" .. encode(messageId) .. "/reactions/" .. encode(emoji) .. "/@me"
  end,
  channelMessage = function(channelId, messageId)
    return "/channels/" .. encode(channelId) .. "/messages/" .. encode(messageId)
  end,
  guild = function(guildId)
    return "/guilds/" .. encode(guildId)
  end,
  guildChannels = function(guildId)
    return "/guilds/" .. encode(guildId) .. "/channels"
  end,
  guildMember = function(guildId, userId)
    return "/guilds/" .. encode(guildId) .. "/members/" .. encode(userId)
  end,
  guildMembers = function(guildId)
    return "/guilds/" .. encode(guildId) .. "/members"
  end,
  guildRoles = function(guildId)
    return "/guilds/" .. encode(guildId) .. "/roles"
  end,
  guildRole = function(guildId, roleId)
    return "/guilds/" .. encode(guildId) .. "/roles/" .. encode(roleId)
  end,
  guildBan = function(guildId, userId)
    return "/guilds/" .. encode(guildId) .. "/bans/" .. encode(userId)
  end,
  channelWebhooks = function(channelId)
    return "/channels/" .. encode(channelId) .. "/webhooks"
  end,
  guildWebhooks = function(guildId)
    return "/guilds/" .. encode(guildId) .. "/webhooks"
  end,
  threads = function(channelId)
    return "/channels/" .. encode(channelId) .. "/threads"
  end,
  threadMember = function(channelId, userId)
    return "/channels/" .. encode(channelId) .. "/thread-members/" .. encode(userId or "@me")
  end,
  applicationCommands = function(applicationId)
    return "/applications/" .. encode(applicationId) .. "/commands"
  end,
  applicationCommand = function(applicationId, commandId)
    return "/applications/" .. encode(applicationId) .. "/commands/" .. encode(commandId)
  end,
  applicationGuildCommands = function(applicationId, guildId)
    return "/applications/" .. encode(applicationId) .. "/guilds/" .. encode(guildId) .. "/commands"
  end,
  applicationGuildCommand = function(applicationId, guildId, commandId)
    return "/applications/" .. encode(applicationId) .. "/guilds/" .. encode(guildId) .. "/commands/" .. encode(commandId)
  end,
  interactionCallback = function(interactionId, token)
    return "/interactions/" .. encode(interactionId) .. "/" .. encode(token) .. "/callback"
  end,
  webhook = function(webhookId, token)
    return "/webhooks/" .. encode(webhookId) .. "/" .. encode(token)
  end,
  webhookMessage = function(applicationId, token, messageId)
    return "/webhooks/" .. encode(applicationId) .. "/" .. encode(token) .. "/messages/" .. encode(messageId or "@original")
  end,
  gatewayBot = function()
    return "/gateway/bot"
  end,
}

local REST = {}
REST.__index = REST

function REST.new(options)
  return setmetatable({
    token = options and options.token or nil,
    baseUrl = options and options.baseUrl or DEFAULT_API,
    headers = options and options.headers or {},
  }, REST)
end

function REST:setToken(token)
  self.token = token
  return self
end

function REST:request(method, route, options)
  options = options or {}
  local headers = merge({
    ["Content-Type"] = "application/json",
    ["User-Agent"] = "RTerminalDiscordJS (Roblox, " .. tostring(API_VERSION) .. ")",
  }, self.headers)
  if self.token then
    headers.Authorization = "Bot " .. tostring(self.token)
  end
  if options.headers then
    headers = merge(headers, options.headers)
  end

  local url = tostring(route or "")
  if string.sub(url, 1, 4) ~= "http" then
    url = tostring(self.baseUrl or DEFAULT_API) .. url
  end

  local body = options.body
  if options.json ~= nil then
    body = json(options.json)
  end

  local response = http.request({
    Url = url,
    Method = method,
    Headers = headers,
    Body = body,
  })
  local text = response.text()
  local data = nil
  local ok = pcall(function()
    data = parse(text)
  end)
  if not ok then
    data = text
  end
  if not response.ok then
    error("Discord REST " .. tostring(response.statusCode) .. ": " .. tostring(text), 2)
  end
  return data
end

function REST:get(route, options)
  return self:request("GET", route, options)
end

function REST:post(route, options)
  return self:request("POST", route, options)
end

function REST:patch(route, options)
  return self:request("PATCH", route, options)
end

function REST:put(route, options)
  return self:request("PUT", route, options)
end

function REST:delete(route, options)
  return self:request("DELETE", route, options)
end

local TextChannel
local Guild
local GuildMember
local Role

local User = {}
User.__index = User

function User.new(client, data)
  data = data or {}
  local self = setmetatable({
    client = client,
    id = data.id,
    username = data.username,
    discriminator = data.discriminator,
    globalName = data.global_name,
    bot = data.bot == true,
    raw = data,
  }, User)
  return bindMethods(self, User, { "send" })
end

function User:send(payload)
  local dm = self.client.rest:post("/users/@me/channels", { json = { recipient_id = self.id } })
  return self.client.rest:post(Routes.channelMessages(dm.id), { json = normalizePayload(payload) })
end

local Message = {}
Message.__index = Message

function Message.new(client, data)
  data = data or {}
  local channel = nil
  if data.channel_id then
    channel = client.channels:get(data.channel_id) or TextChannel.new(client, { id = data.channel_id })
    client.channels:set(data.channel_id, channel)
  end
  local self = setmetatable({
    client = client,
    id = data.id,
    channelId = data.channel_id,
    guildId = data.guild_id,
    author = data.author and User.new(client, data.author) or nil,
    content = data.content,
    embeds = data.embeds or {},
    components = data.components or {},
    raw = data,
    channel = channel,
  }, Message)
  return bindMethods(self, Message, { "reply", "edit", "delete", "react" })
end

function Message:reply(payload)
  local body = normalizePayload(payload)
  body.message_reference = body.message_reference or {
    message_id = self.id,
    channel_id = self.channelId,
    guild_id = self.guildId,
    fail_if_not_exists = false,
  }
  return self.client.rest:post(Routes.channelMessages(self.channelId), { json = body })
end

function Message:edit(payload)
  return self.client.rest:patch(Routes.channelMessage(self.channelId, self.id), { json = normalizePayload(payload) })
end

function Message:delete()
  return self.client.rest:delete(Routes.channelMessage(self.channelId, self.id))
end

function Message:react(emoji)
  return self.client.rest:put(Routes.channelMessageReaction(self.channelId, self.id, emoji))
end

TextChannel = {}
TextChannel.__index = TextChannel

function TextChannel.new(client, data)
  data = data or {}
  local self = setmetatable({
    client = client,
    id = data.id,
    name = data.name,
    raw = data,
  }, TextChannel)
  return bindMethods(self, TextChannel, { "send", "bulkSend", "sendTyping", "createWebhook", "createThread", "joinThread", "leaveThread", "messages" })
end

function TextChannel:send(payload)
  local body = normalizePayload(payload)
  return self.client.rest:post(Routes.channelMessages(self.id), { json = body })
end

function TextChannel:bulkSend(messages)
  local sent = {}
  for _, message in ipairs(messages or {}) do
    table.insert(sent, self:send(message))
  end
  return sent
end

function TextChannel:sendTyping()
  return self.client.rest:post(Routes.channelTyping(self.id), { json = {} })
end

function TextChannel:createWebhook(options)
  return self.client.rest:post(Routes.channelWebhooks(self.id), { json = options or {} })
end

function TextChannel:createThread(options)
  return TextChannel.new(self.client, self.client.rest:post(Routes.threads(self.id), { json = options or {} }))
end

function TextChannel:joinThread()
  return self.client.rest:put(Routes.threadMember(self.id, "@me"))
end

function TextChannel:leaveThread()
  return self.client.rest:delete(Routes.threadMember(self.id, "@me"))
end

function TextChannel:messages()
  local channel = self
  return {
    fetch = function(_, messageId)
      if messageId then
        return Message.new(channel.client, channel.client.rest:get(Routes.channelMessage(channel.id, messageId)))
      end
      local raw = channel.client.rest:get(Routes.channelMessages(channel.id))
      local rows = {}
      for _, item in ipairs(raw or {}) do
        table.insert(rows, Message.new(channel.client, item))
      end
      return rows
    end,
    edit = function(_, messageId, payload)
      return channel.client.rest:patch(Routes.channelMessage(channel.id, messageId), { json = normalizePayload(payload) })
    end,
    delete = function(_, messageId)
      return channel.client.rest:delete(Routes.channelMessage(channel.id, messageId))
    end,
  }
end

local EmbedBuilder = {}
EmbedBuilder.__index = EmbedBuilder

function EmbedBuilder.new(data)
  local self = setmetatable({ data = data or {} }, EmbedBuilder)
  return bindMethods(self, EmbedBuilder, { "setTitle", "setDescription", "setColor", "setURL", "setTimestamp", "setAuthor", "setFooter", "setImage", "setThumbnail", "addFields", "toJSON" })
end

function EmbedBuilder:setTitle(value)
  self.data.title = value
  return self
end

function EmbedBuilder:setDescription(value)
  self.data.description = value
  return self
end

function EmbedBuilder:setColor(value)
  self.data.color = value
  return self
end

function EmbedBuilder:setURL(value)
  self.data.url = value
  return self
end

function EmbedBuilder:setTimestamp(value)
  self.data.timestamp = value or os.date("!%Y-%m-%dT%H:%M:%SZ")
  return self
end

function EmbedBuilder:setAuthor(value)
  self.data.author = value
  return self
end

function EmbedBuilder:setFooter(value)
  self.data.footer = value
  return self
end

function EmbedBuilder:setImage(value)
  self.data.image = { url = value }
  return self
end

function EmbedBuilder:setThumbnail(value)
  self.data.thumbnail = { url = value }
  return self
end

function EmbedBuilder:addFields(...)
  self.data.fields = self.data.fields or {}
  for index = 1, select("#", ...) do
    table.insert(self.data.fields, select(index, ...))
  end
  return self
end

function EmbedBuilder:toJSON()
  return self.data
end

local AttachmentBuilder = {}
AttachmentBuilder.__index = AttachmentBuilder

function AttachmentBuilder.new(urlOrData, options)
  options = options or {}
  local self = setmetatable({
    data = {
      attachment = urlOrData,
      name = options.name,
      description = options.description,
    },
  }, AttachmentBuilder)
  return bindMethods(self, AttachmentBuilder, { "setName", "setDescription", "toJSON" })
end

function AttachmentBuilder:setName(value)
  self.data.name = value
  return self
end

function AttachmentBuilder:setDescription(value)
  self.data.description = value
  return self
end

function AttachmentBuilder:toJSON()
  return self.data
end

local ButtonBuilder = {}
ButtonBuilder.__index = ButtonBuilder

function ButtonBuilder.new(data)
  data = data or {}
  data.type = ComponentType.Button
  local self = setmetatable({ data = data }, ButtonBuilder)
  return bindMethods(self, ButtonBuilder, { "setCustomId", "setLabel", "setStyle", "setURL", "setDisabled", "setEmoji", "toJSON" })
end

function ButtonBuilder:setCustomId(value)
  self.data.custom_id = value
  return self
end

function ButtonBuilder:setLabel(value)
  self.data.label = value
  return self
end

function ButtonBuilder:setStyle(value)
  self.data.style = value
  return self
end

function ButtonBuilder:setURL(value)
  self.data.url = value
  self.data.style = ButtonStyle.Link
  return self
end

function ButtonBuilder:setDisabled(value)
  self.data.disabled = value ~= false
  return self
end

function ButtonBuilder:setEmoji(value)
  self.data.emoji = value
  return self
end

function ButtonBuilder:toJSON()
  return self.data
end

local StringSelectMenuBuilder = {}
StringSelectMenuBuilder.__index = StringSelectMenuBuilder

function StringSelectMenuBuilder.new(data)
  data = data or {}
  data.type = ComponentType.StringSelect
  data.options = data.options or {}
  local self = setmetatable({ data = data }, StringSelectMenuBuilder)
  return bindMethods(self, StringSelectMenuBuilder, { "setCustomId", "setPlaceholder", "setMinValues", "setMaxValues", "addOptions", "toJSON" })
end

function StringSelectMenuBuilder:setCustomId(value)
  self.data.custom_id = value
  return self
end

function StringSelectMenuBuilder:setPlaceholder(value)
  self.data.placeholder = value
  return self
end

function StringSelectMenuBuilder:setMinValues(value)
  self.data.min_values = value
  return self
end

function StringSelectMenuBuilder:setMaxValues(value)
  self.data.max_values = value
  return self
end

function StringSelectMenuBuilder:addOptions(...)
  for index = 1, select("#", ...) do
    table.insert(self.data.options, toJSON(select(index, ...)))
  end
  return self
end

function StringSelectMenuBuilder:toJSON()
  return self.data
end

local TextInputBuilder = {}
TextInputBuilder.__index = TextInputBuilder

function TextInputBuilder.new(data)
  data = data or {}
  data.type = ComponentType.TextInput
  local self = setmetatable({ data = data }, TextInputBuilder)
  return bindMethods(self, TextInputBuilder, { "setCustomId", "setLabel", "setStyle", "setRequired", "setPlaceholder", "setValue", "toJSON" })
end

function TextInputBuilder:setCustomId(value)
  self.data.custom_id = value
  return self
end

function TextInputBuilder:setLabel(value)
  self.data.label = value
  return self
end

function TextInputBuilder:setStyle(value)
  self.data.style = value
  return self
end

function TextInputBuilder:setRequired(value)
  self.data.required = value ~= false
  return self
end

function TextInputBuilder:setPlaceholder(value)
  self.data.placeholder = value
  return self
end

function TextInputBuilder:setValue(value)
  self.data.value = value
  return self
end

function TextInputBuilder:toJSON()
  return self.data
end

local ActionRowBuilder = {}
ActionRowBuilder.__index = ActionRowBuilder

function ActionRowBuilder.new(data)
  data = data or {}
  data.type = ComponentType.ActionRow
  data.components = data.components or {}
  local self = setmetatable({ data = data }, ActionRowBuilder)
  return bindMethods(self, ActionRowBuilder, { "addComponents", "toJSON" })
end

function ActionRowBuilder:addComponents(...)
  self.data.components = self.data.components or {}
  for index = 1, select("#", ...) do
    table.insert(self.data.components, toJSON(select(index, ...)))
  end
  return self
end

function ActionRowBuilder:toJSON()
  return self.data
end

local ModalBuilder = {}
ModalBuilder.__index = ModalBuilder

function ModalBuilder.new(data)
  data = data or {}
  data.components = data.components or {}
  local self = setmetatable({ data = data }, ModalBuilder)
  return bindMethods(self, ModalBuilder, { "setCustomId", "setTitle", "addComponents", "toJSON" })
end

function ModalBuilder:setCustomId(value)
  self.data.custom_id = value
  return self
end

function ModalBuilder:setTitle(value)
  self.data.title = value
  return self
end

function ModalBuilder:addComponents(...)
  self.data.components = self.data.components or {}
  for index = 1, select("#", ...) do
    table.insert(self.data.components, toJSON(select(index, ...)))
  end
  return self
end

function ModalBuilder:toJSON()
  return self.data
end

local SlashCommandBuilder = {}
SlashCommandBuilder.__index = SlashCommandBuilder

function SlashCommandBuilder.new(data)
  data = data or {}
  data.type = data.type or ApplicationCommandType.ChatInput
  data.options = data.options or {}
  local self = setmetatable({ data = data }, SlashCommandBuilder)
  return bindMethods(self, SlashCommandBuilder, { "setName", "setDescription", "addStringOption", "addIntegerOption", "addBooleanOption", "addNumberOption", "addUserOption", "addChannelOption", "addRoleOption", "setDefaultMemberPermissions", "setDMPermission", "toJSON" })
end

function SlashCommandBuilder:setName(value)
  self.data.name = value
  return self
end

function SlashCommandBuilder:setDescription(value)
  self.data.description = value
  return self
end

function SlashCommandBuilder:addStringOption(configure)
  local option = { type = ApplicationCommandOptionType.String }
  if type(configure) == "function" then
    configure(option)
  elseif type(configure) == "table" then
    option = merge(option, configure)
  end
  table.insert(self.data.options, option)
  return self
end

function SlashCommandBuilder:addIntegerOption(configure)
  local option = { type = ApplicationCommandOptionType.Integer }
  if type(configure) == "function" then
    configure(option)
  elseif type(configure) == "table" then
    option = merge(option, configure)
  end
  table.insert(self.data.options, option)
  return self
end

function SlashCommandBuilder:addBooleanOption(configure)
  local option = { type = ApplicationCommandOptionType.Boolean }
  if type(configure) == "function" then
    configure(option)
  elseif type(configure) == "table" then
    option = merge(option, configure)
  end
  table.insert(self.data.options, option)
  return self
end

function SlashCommandBuilder:addNumberOption(configure)
  local option = { type = ApplicationCommandOptionType.Number }
  if type(configure) == "function" then
    configure(option)
  elseif type(configure) == "table" then
    option = merge(option, configure)
  end
  table.insert(self.data.options, option)
  return self
end

function SlashCommandBuilder:addUserOption(configure)
  local option = { type = ApplicationCommandOptionType.User }
  if type(configure) == "function" then
    configure(option)
  elseif type(configure) == "table" then
    option = merge(option, configure)
  end
  table.insert(self.data.options, option)
  return self
end

function SlashCommandBuilder:addChannelOption(configure)
  local option = { type = ApplicationCommandOptionType.Channel }
  if type(configure) == "function" then
    configure(option)
  elseif type(configure) == "table" then
    option = merge(option, configure)
  end
  table.insert(self.data.options, option)
  return self
end

function SlashCommandBuilder:addRoleOption(configure)
  local option = { type = ApplicationCommandOptionType.Role }
  if type(configure) == "function" then
    configure(option)
  elseif type(configure) == "table" then
    option = merge(option, configure)
  end
  table.insert(self.data.options, option)
  return self
end

function SlashCommandBuilder:setDefaultMemberPermissions(value)
  self.data.default_member_permissions = tostring(value)
  return self
end

function SlashCommandBuilder:setDMPermission(value)
  self.data.dm_permission = value ~= false
  return self
end

function SlashCommandBuilder:toJSON()
  return self.data
end

local Interaction = {}
Interaction.__index = Interaction

function Interaction.new(client, data)
  data = data or {}
  local self = setmetatable({
    client = client,
    id = data.id,
    token = data.token,
    applicationId = data.application_id,
    commandName = data.data and data.data.name or nil,
    customId = data.data and data.data.custom_id or nil,
    user = data.user or (data.member and data.member.user),
    raw = data,
  }, Interaction)
  return bindMethods(self, Interaction, { "reply", "deferReply", "update", "editReply", "deleteReply", "showModal" })
end

function Interaction:reply(payload)
  return self.client.rest:post(Routes.interactionCallback(self.id, self.token), {
    json = {
      type = InteractionResponseType.ChannelMessageWithSource,
      data = normalizePayload(payload),
    },
  })
end

function Interaction:deferReply(ephemeral)
  return self.client.rest:post(Routes.interactionCallback(self.id, self.token), {
    json = {
      type = InteractionResponseType.DeferredChannelMessageWithSource,
      data = ephemeral and { flags = MessageFlags.Ephemeral } or {},
    },
  })
end

function Interaction:update(payload)
  return self.client.rest:post(Routes.interactionCallback(self.id, self.token), {
    json = {
      type = InteractionResponseType.UpdateMessage,
      data = normalizePayload(payload),
    },
  })
end

function Interaction:editReply(payload)
  return self.client.rest:patch(Routes.webhookMessage(self.applicationId, self.token, "@original"), { json = normalizePayload(payload) })
end

function Interaction:deleteReply()
  return self.client.rest:delete(Routes.webhookMessage(self.applicationId, self.token, "@original"))
end

function Interaction:showModal(modal)
  return self.client.rest:post(Routes.interactionCallback(self.id, self.token), {
    json = {
      type = InteractionResponseType.Modal,
      data = toJSON(modal),
    },
  })
end

Role = {}
Role.__index = Role

function Role.new(client, guildId, data)
  data = data or {}
  local self = setmetatable({
    client = client,
    guildId = guildId,
    id = data.id,
    name = data.name,
    color = data.color,
    permissions = data.permissions,
    raw = data,
  }, Role)
  return bindMethods(self, Role, { "edit", "delete" })
end

function Role:edit(payload)
  return Role.new(self.client, self.guildId, self.client.rest:patch(Routes.guildRole(self.guildId, self.id), { json = payload or {} }))
end

function Role:delete()
  return self.client.rest:delete(Routes.guildRole(self.guildId, self.id))
end

GuildMember = {}
GuildMember.__index = GuildMember

function GuildMember.new(client, guildId, data)
  data = data or {}
  local self = setmetatable({
    client = client,
    guildId = guildId,
    id = data.user and data.user.id or data.id,
    user = data.user and User.new(client, data.user) or nil,
    nick = data.nick,
    roles = data.roles or {},
    raw = data,
  }, GuildMember)
  return bindMethods(self, GuildMember, { "edit", "kick", "ban", "addRole", "removeRole" })
end

function GuildMember:edit(payload)
  return GuildMember.new(self.client, self.guildId, self.client.rest:patch(Routes.guildMember(self.guildId, self.id), { json = payload or {} }))
end

function GuildMember:kick(reason)
  local headers = reason and { ["X-Audit-Log-Reason"] = reason } or nil
  return self.client.rest:delete(Routes.guildMember(self.guildId, self.id), { headers = headers })
end

function GuildMember:ban(options)
  return self.client.rest:put(Routes.guildBan(self.guildId, self.id), { json = options or {} })
end

function GuildMember:addRole(roleId)
  return self.client.rest:put(Routes.guildMember(self.guildId, self.id) .. "/roles/" .. encode(roleId))
end

function GuildMember:removeRole(roleId)
  return self.client.rest:delete(Routes.guildMember(self.guildId, self.id) .. "/roles/" .. encode(roleId))
end

Guild = {}
Guild.__index = Guild

function Guild.new(client, data)
  data = data or {}
  local self = setmetatable({
    client = client,
    id = data.id,
    name = data.name,
    raw = data,
    channels = Collection.new(),
    roles = Collection.new(),
    members = Collection.new(),
  }, Guild)
  return bindMethods(self, Guild, { "fetch", "fetchChannels", "createChannel", "fetchMember", "fetchMembers", "fetchRoles", "createRole", "fetchWebhooks" })
end

function Guild:fetch()
  local data = self.client.rest:get(Routes.guild(self.id))
  self.raw = data
  self.name = data.name
  return self
end

function Guild:fetchChannels()
  local raw = self.client.rest:get(Routes.guildChannels(self.id))
  local rows = {}
  for _, item in ipairs(raw or {}) do
    local channel = TextChannel.new(self.client, item)
    self.channels:set(channel.id, channel)
    self.client.channels:set(channel.id, channel)
    table.insert(rows, channel)
  end
  return rows
end

function Guild:createChannel(payload)
  local channel = TextChannel.new(self.client, self.client.rest:post(Routes.guildChannels(self.id), { json = payload or {} }))
  self.channels:set(channel.id, channel)
  self.client.channels:set(channel.id, channel)
  return channel
end

function Guild:fetchMember(userId)
  local member = GuildMember.new(self.client, self.id, self.client.rest:get(Routes.guildMember(self.id, userId)))
  self.members:set(member.id, member)
  return member
end

function Guild:fetchMembers(limit)
  local raw = self.client.rest:get(Routes.guildMembers(self.id) .. "?limit=" .. tostring(limit or 100))
  local rows = {}
  for _, item in ipairs(raw or {}) do
    local member = GuildMember.new(self.client, self.id, item)
    self.members:set(member.id, member)
    table.insert(rows, member)
  end
  return rows
end

function Guild:fetchRoles()
  local raw = self.client.rest:get(Routes.guildRoles(self.id))
  local rows = {}
  for _, item in ipairs(raw or {}) do
    local role = Role.new(self.client, self.id, item)
    self.roles:set(role.id, role)
    table.insert(rows, role)
  end
  return rows
end

function Guild:createRole(payload)
  local role = Role.new(self.client, self.id, self.client.rest:post(Routes.guildRoles(self.id), { json = payload or {} }))
  self.roles:set(role.id, role)
  return role
end

function Guild:fetchWebhooks()
  return self.client.rest:get(Routes.guildWebhooks(self.id))
end

local Client = {}
Client.__index = Client
Client.on = EventEmitter.on
Client.once = EventEmitter.once
Client.off = EventEmitter.off
Client.emit = EventEmitter.emit

function Client.new(options)
  options = options or {}
  local emitter = EventEmitter.new()
  local self = setmetatable(emitter, Client)
  self.options = options
  self.intents = options.intents or { GatewayIntentBits.Guilds }
  self.token = options.token
  self.rest = REST.new({ token = options.token })
  self.user = nil
  self.readyAt = nil
  self.ws = nil
  self.seq = nil
  self.sessionId = nil
  self.heartbeatCancel = nil
  self.channels = Collection.new()
  self.guilds = Collection.new()
  return bindMethods(self, Client, { "on", "once", "off", "emit", "login", "destroy", "fetchChannel", "send", "fetchGuild", "fetchUser", "registerGlobalCommands", "registerGuildCommands", "debug", "intentsValue" })
end

local WebhookClient = {}
WebhookClient.__index = WebhookClient

function WebhookClient.new(options)
  options = options or {}
  local self = setmetatable({
    id = options.id,
    token = options.token,
    url = options.url,
    rest = REST.new({ token = options.botToken }),
  }, WebhookClient)
  return bindMethods(self, WebhookClient, { "route", "send", "editMessage", "deleteMessage" })
end

function WebhookClient:route(messageId)
  if self.url then
    if messageId then
      return self.url .. "/messages/" .. encode(messageId)
    end
    return self.url
  end
  if messageId then
    return Routes.webhookMessage(self.id, self.token, messageId)
  end
  return Routes.webhook(self.id, self.token)
end

function WebhookClient:send(payload)
  return self.rest:post(self:route(), { json = normalizePayload(payload) })
end

function WebhookClient:editMessage(messageId, payload)
  return self.rest:patch(self:route(messageId or "@original"), { json = normalizePayload(payload) })
end

function WebhookClient:deleteMessage(messageId)
  return self.rest:delete(self:route(messageId or "@original"))
end

function Client:intentsValue()
  local value = 0
  for _, intent in ipairs(self.intents or {}) do
    value = value + (tonumber(intent) or 0)
  end
  return value
end

function Client:debug(message)
  self:emit(Events.Debug, message)
end

function Client:sendGateway(op, data)
  if not self.ws then
    error("Discord gateway is not connected", 2)
  end
  self.ws:send(json({ op = op, d = data }))
end

function Client:identify()
  self:sendGateway(2, {
    token = self.token,
    intents = self:intentsValue(),
    properties = {
      os = "roblox",
      browser = "rterminal",
      device = "rterminal",
    },
  })
end

function Client:startHeartbeat(interval)
  if self.heartbeatCancel then
    self.heartbeatCancel()
  end
  self.heartbeatCancel = setInterval(function()
    if self.ws then
      self:sendGateway(1, self.seq)
    end
  end, interval)
end

function Client:handleDispatch(name, data)
  self:emit(Events.Raw, name, data)
  if name == "READY" then
    self.user = data.user
    self.readyAt = Date.now()
    self.sessionId = data.session_id
    self:emit(Events.ClientReady, self)
    self:emit("ready", self)
  elseif name == "MESSAGE_CREATE" then
    if data.channel_id and not self.channels:has(data.channel_id) then
      self.channels:set(data.channel_id, TextChannel.new(self, { id = data.channel_id }))
    end
    local message = Message.new(self, data)
    self:emit(Events.MessageCreate, message)
    self:emit("message", message)
  elseif name == "MESSAGE_UPDATE" then
    self:emit(Events.MessageUpdate, Message.new(self, data))
  elseif name == "MESSAGE_DELETE" then
    self:emit(Events.MessageDelete, data)
  elseif name == "INTERACTION_CREATE" then
    self:emit(Events.InteractionCreate, Interaction.new(self, data))
  elseif name == "GUILD_CREATE" then
    local guild = Guild.new(self, data)
    self.guilds:set(data.id, guild)
    self:emit(Events.GuildCreate, guild)
  elseif name == "GUILD_DELETE" then
    if data.id then
      self.guilds:delete(data.id)
    end
    self:emit(Events.GuildDelete, data)
  elseif name == "GUILD_MEMBER_ADD" then
    self:emit(Events.GuildMemberAdd, GuildMember.new(self, data.guild_id, data))
  elseif name == "GUILD_MEMBER_UPDATE" then
    self:emit(Events.GuildMemberUpdate, GuildMember.new(self, data.guild_id, data))
  elseif name == "GUILD_MEMBER_REMOVE" then
    self:emit(Events.GuildMemberRemove, data)
  elseif name == "GUILD_ROLE_CREATE" then
    self:emit(Events.GuildRoleCreate, Role.new(self, data.guild_id, data.role))
  elseif name == "GUILD_ROLE_UPDATE" then
    self:emit(Events.GuildRoleUpdate, Role.new(self, data.guild_id, data.role))
  elseif name == "GUILD_ROLE_DELETE" then
    self:emit(Events.GuildRoleDelete, data)
  elseif name == "CHANNEL_CREATE" then
    if data.id then
      self.channels:set(data.id, TextChannel.new(self, data))
    end
    self:emit(Events.ChannelCreate, data)
  elseif name == "CHANNEL_UPDATE" then
    if data.id then
      self.channels:set(data.id, TextChannel.new(self, data))
    end
    self:emit(Events.ChannelUpdate, data)
  elseif name == "CHANNEL_DELETE" then
    if data.id then
      self.channels:delete(data.id)
    end
    self:emit(Events.ChannelDelete, data)
  elseif name == "WEBHOOKS_UPDATE" then
    self:emit(Events.WebhooksUpdate, data)
  elseif name == "THREAD_CREATE" then
    self:emit(Events.ThreadCreate, TextChannel.new(self, data))
  elseif name == "THREAD_UPDATE" then
    self:emit(Events.ThreadUpdate, TextChannel.new(self, data))
  elseif name == "THREAD_DELETE" then
    self:emit(Events.ThreadDelete, data)
  elseif name == "MESSAGE_REACTION_ADD" then
    self:emit(Events.MessageReactionAdd, data)
  elseif name == "MESSAGE_REACTION_REMOVE" then
    self:emit(Events.MessageReactionRemove, data)
  elseif name == "PRESENCE_UPDATE" then
    self:emit(Events.PresenceUpdate, data)
  elseif name == "VOICE_STATE_UPDATE" then
    self:emit(Events.VoiceStateUpdate, data)
  elseif name == "TYPING_START" then
    self:emit(Events.TypingStart, data)
  end
end

function Client:handleGatewayMessage(message)
  local payload = parse(message)
  if not payload then
    return
  end
  if payload.s ~= nil then
    self.seq = payload.s
  end
  if payload.op == 10 then
    self:startHeartbeat(payload.d and payload.d.heartbeat_interval or 41250)
    self:identify()
  elseif payload.op == 0 then
    self:handleDispatch(payload.t, payload.d)
  elseif payload.op == 7 then
    self:debug("Discord requested reconnect")
    self:destroy()
    self:login(self.token)
  elseif payload.op == 9 then
    self:debug("Discord invalid session")
    task.delay(3, function()
      self:identify()
    end)
  elseif payload.op == 11 then
    self:emit("heartbeatAck")
  end
end

function Client:login(token)
  self.token = token or self.token or process.env.DISCORD_TOKEN
  if not self.token or tostring(self.token) == "" then
    error("DISCORD_TOKEN missing; pass client:login(token) or export DISCORD_TOKEN", 2)
  end
  self.rest:setToken(self.token)
  self.ws = ws.connect(GATEWAY)
  self.ws:on("open", function()
    self:debug("gateway connected")
  end)
  self.ws:on("message", function(message)
    local ok, err = pcall(function()
      self:handleGatewayMessage(message)
    end)
    if not ok then
      self:emit(Events.Error, err)
    end
  end)
  self.ws:on("close", function(...)
    self:emit(Events.Close, ...)
  end)
  self.ws:on("error", function(err)
    self:emit(Events.Error, err)
  end)
  return self.token
end

function Client:destroy()
  if self.heartbeatCancel then
    self.heartbeatCancel()
    self.heartbeatCancel = nil
  end
  if self.ws then
    self.ws:close()
    self.ws = nil
  end
  return true
end

function Client:fetchChannel(channelId)
  local data = self.rest:get(Routes.channel(channelId))
  local channel = TextChannel.new(self, data)
  self.channels:set(channelId, channel)
  return channel
end

function Client:send(channelId, payload)
  local channel = self.channels:get(channelId) or TextChannel.new(self, { id = channelId })
  self.channels:set(channelId, channel)
  return channel:send(payload)
end

function Client:fetchGuild(guildId)
  local guild = Guild.new(self, self.rest:get(Routes.guild(guildId)))
  self.guilds:set(guildId, guild)
  return guild
end

function Client:fetchUser(userId)
  return User.new(self, self.rest:get("/users/" .. encode(userId)))
end

function Client:registerGlobalCommands(applicationId, commands)
  local body = arrayToJSON(commands or {})
  return self.rest:put(Routes.applicationCommands(applicationId or (self.user and self.user.id)), { json = body })
end

function Client:registerGuildCommands(applicationId, guildId, commands)
  local body = arrayToJSON(commands or {})
  return self.rest:put(Routes.applicationGuildCommands(applicationId or (self.user and self.user.id), guildId), { json = body })
end

module.exports = {
  version = "rterminal-discord.js-0.3.0",
  API_VERSION = API_VERSION,
  list = list,
  Intents = Intents,
  userIds = userIds,
  mentionText = mentionText,
  joinText = joinText,
  pickNonBotUsersFromMessages = pickNonBotUsersFromMessages,
  pickNonBotUsers = pickNonBotUsers,
  Client = Client,
  Collection = Collection,
  REST = REST,
  Routes = Routes,
  Events = Events,
  GatewayIntentBits = GatewayIntentBits,
  Partials = Partials,
  ChannelType = ChannelType,
  MessageFlags = MessageFlags,
  ComponentType = ComponentType,
  ButtonStyle = ButtonStyle,
  TextInputStyle = TextInputStyle,
  PermissionFlagsBits = PermissionFlagsBits,
  PermissionOverwriteType = PermissionOverwriteType,
  ApplicationCommandType = ApplicationCommandType,
  ApplicationCommandOptionType = ApplicationCommandOptionType,
  InteractionResponseType = InteractionResponseType,
  EmbedBuilder = EmbedBuilder,
  ButtonBuilder = ButtonBuilder,
  ActionRowBuilder = ActionRowBuilder,
  StringSelectMenuBuilder = StringSelectMenuBuilder,
  TextInputBuilder = TextInputBuilder,
  ModalBuilder = ModalBuilder,
  SlashCommandBuilder = SlashCommandBuilder,
  AttachmentBuilder = AttachmentBuilder,
  WebhookClient = WebhookClient,
  User = User,
  Guild = Guild,
  GuildMember = GuildMember,
  Role = Role,
  Message = Message,
  Interaction = Interaction,
  TextChannel = TextChannel,
}
