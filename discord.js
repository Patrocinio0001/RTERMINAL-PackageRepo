const http = require("http")
const ws = require("ws")

const API_VERSION = 10
const DEFAULT_API = "https://discord.com/api/v10"
const GATEWAY = "wss://gateway.discord.gg/?v=10&encoding=json"

const Events = {
  ClientReady: "ready",
  MessageCreate: "messageCreate",
  MessageUpdate: "messageUpdate",
  MessageDelete: "messageDelete",
  InteractionCreate: "interactionCreate",
  GuildCreate: "guildCreate",
  Error: "error",
  Debug: "debug",
  Close: "close",
  Raw: "raw"
}

const GatewayIntentBits = {
  Guilds: 1,
  GuildMembers: 2,
  GuildMessages: 512,
  GuildMessageReactions: 1024,
  DirectMessages: 4096,
  MessageContent: 32768
}

const Partials = {
  User: 1,
  Channel: 2,
  GuildMember: 3,
  Message: 4,
  Reaction: 5,
  ThreadMember: 7
}

const ChannelType = {
  GuildText: 0,
  DM: 1,
  GuildVoice: 2,
  GuildCategory: 4,
  GuildAnnouncement: 5,
  PublicThread: 11,
  PrivateThread: 12,
  GuildForum: 15
}

const MessageFlags = {
  Ephemeral: 64,
  Loading: 128,
  SuppressEmbeds: 4,
  SuppressNotifications: 4096
}

const ComponentType = {
  ActionRow: 1,
  Button: 2,
  StringSelect: 3,
  TextInput: 4,
  UserSelect: 5,
  RoleSelect: 6,
  MentionableSelect: 7,
  ChannelSelect: 8
}

const ButtonStyle = {
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
  Link: 5
}

const TextInputStyle = {
  Short: 1,
  Paragraph: 2
}

const PermissionFlagsBits = {
  Administrator: 8,
  ManageChannels: 16,
  ManageGuild: 32,
  ViewChannel: 1024,
  SendMessages: 2048,
  EmbedLinks: 16384,
  AttachFiles: 32768,
  ReadMessageHistory: 65536,
  MentionEveryone: 131072,
  ManageMessages: 8192,
  ManageRoles: 268435456,
  ManageWebhooks: 536870912,
  UseApplicationCommands: 2147483648
}

const ApplicationCommandType = {
  ChatInput: 1,
  User: 2,
  Message: 3
}

const ApplicationCommandOptionType = {
  Subcommand: 1,
  SubcommandGroup: 2,
  String: 3,
  Integer: 4,
  Boolean: 5,
  User: 6,
  Channel: 7,
  Role: 8,
  Mentionable: 9,
  Number: 10,
  Attachment: 11
}

const InteractionResponseType = {
  Pong: 1,
  ChannelMessageWithSource: 4,
  DeferredChannelMessageWithSource: 5,
  DeferredUpdateMessage: 6,
  UpdateMessage: 7,
  ApplicationCommandAutocompleteResult: 8,
  Modal: 9
}

const PermissionOverwriteType = {
  Role: 0,
  Member: 1
}

function encode(value) {
  return encodeURIComponent(String(value || ""))
}

function clone(value) {
  const output = {}
  for (const key in value || {}) {
    output[key] = value[key]
  }
  return output
}

function list(a, b, c, d, e, f, g, h, i, j, k, l) {
  const output = []
  if (a !== undefined) output.push(a)
  if (b !== undefined) output.push(b)
  if (c !== undefined) output.push(c)
  if (d !== undefined) output.push(d)
  if (e !== undefined) output.push(e)
  if (f !== undefined) output.push(f)
  if (g !== undefined) output.push(g)
  if (h !== undefined) output.push(h)
  if (i !== undefined) output.push(i)
  if (j !== undefined) output.push(j)
  if (k !== undefined) output.push(k)
  if (l !== undefined) output.push(l)
  return output
}

function arrayOrEmpty(values) {
  return values || list()
}

function Intents(a, b, c, d, e, f, g, h, i, j, k, l) {
  return list(a, b, c, d, e, f, g, h, i, j, k, l)
}

function toJSON(value) {
  if (value && typeof value.toJSON === "function") {
    return value.toJSON()
  }
  return value
}

function arrayToJSON(values) {
  const output = []
  for (const value of arrayOrEmpty(values)) {
    output.push(toJSON(value))
  }
  return output
}

function normalizePayload(payload) {
  let body = { content: String(payload || "") }
  if (typeof payload === "object" && payload) body = clone(payload)
  if (body.embeds) body.embeds = arrayToJSON(body.embeds)
  if (body.components) body.components = arrayToJSON(body.components)
  if (body.embed) {
    body.embeds = list(toJSON(body.embed))
    body.embed = null
  }
  return body
}

function userIds(users) {
  const ids = []
  for (const user of arrayOrEmpty(users)) {
    if (user && user.id) ids.push(String(user.id))
  }
  return ids
}

function mentionText(users) {
  const mentions = []
  for (const id of userIds(users)) {
    mentions.push("<@" + String(id) + ">")
  }
  return mentions.join(" ")
}

function joinText(a, b, c, d, e, f, g, h) {
  const parts = []
  for (const item of list(a, b, c, d, e, f, g, h)) {
    const value = String(item || "")
    if (value !== "") parts.push(value)
  }
  return parts.join(" ")
}

function pickNonBotUsersFromMessages(messages, limit) {
  const picked = []
  const seen = {}
  const max = Number(limit || 2)
  for (const message of arrayOrEmpty(messages)) {
    const author = message && message.author
    if (author && author.id && !author.bot && !seen[author.id]) {
      seen[author.id] = true
      picked.push(author)
    }
    if (picked.length >= max) return picked
  }
  return picked
}

function parse(value) {
  if (value == null || String(value) === "") return null
  return JSON.parse(String(value))
}

function Collection() {
  const self = { map: {} }
  self.set = function(key, value) {
    self.map[String(key)] = value
    return self
  }
  self.get = function(key) {
    return self.map[String(key)]
  }
  self.has = function(key) {
    return self.map[String(key)] !== undefined
  }
  self.delete = function(key) {
    self.map[String(key)] = undefined
    return true
  }
  self.values = function() {
    const values = []
    for (const key in self.map) {
      if (self.map[key] !== undefined) values.push(self.map[key])
    }
    return values
  }
  self.toJSON = function() {
    return self.values()
  }
  return self
}
Collection.new = Collection

function EventEmitter() {
  const self = { listeners: {} }
  self.on = function(name, callback) {
    self.listeners[name] = self.listeners[name] || list()
    self.listeners[name].push(callback)
    return self
  }
  self.once = function(name, callback) {
    const wrapper = function(a, b, c, d, e) {
      self.off(name, wrapper)
      return callback(a, b, c, d, e)
    }
    return self.on(name, wrapper)
  }
  self.off = function(name, callback) {
    const next = []
    for (const current of arrayOrEmpty(self.listeners[name])) {
      if (current !== callback) next.push(current)
    }
    self.listeners[name] = next
    return self
  }
  self.emit = function(name, a, b, c, d, e) {
    for (const callback of arrayOrEmpty(self.listeners[name])) callback(a, b, c, d, e)
    return true
  }
  return self
}
EventEmitter.new = EventEmitter

function REST(options) {
  let api = DEFAULT_API
  if (options && options.api) api = options.api
  const self = {
    token: "",
    api: api
  }
  self.setToken = function(token) {
    self.token = String(token || "")
    return self
  }
  self.request = function(method, route, options) {
    let body = options && options.body
    if (options && options.json !== undefined) body = JSON.stringify(options.json)
    const headers = clone(options && options.headers)
    headers["Content-Type"] = headers["Content-Type"] || "application/json"
    if (self.token !== "") headers.Authorization = "Bot " + self.token
    const response = http.request({
      Url: self.api + route,
      Method: method,
      Headers: headers,
      Body: body
    })
    const text = response.text()
    if (!response.ok) {
      throw new Error("Discord REST " + String(response.statusCode) + ": " + text)
    }
    if (text === "") return {}
    return JSON.parse(text)
  }
  self.get = function(route, options) { return self.request("GET", route, options || {}) }
  self.post = function(route, options) { return self.request("POST", route, options || {}) }
  self.put = function(route, options) { return self.request("PUT", route, options || {}) }
  self.patch = function(route, options) { return self.request("PATCH", route, options || {}) }
  self.delete = function(route, options) { return self.request("DELETE", route, options || {}) }
  return self
}
REST.new = REST

const Routes = {
  channel: function(channelId) { return "/channels/" + encode(channelId) },
  channelMessages: function(channelId) { return "/channels/" + encode(channelId) + "/messages" },
  channelMessage: function(channelId, messageId) { return "/channels/" + encode(channelId) + "/messages/" + encode(messageId) },
  guild: function(guildId) { return "/guilds/" + encode(guildId) },
  guildMembers: function(guildId) { return "/guilds/" + encode(guildId) + "/members" },
  guildMember: function(guildId, userId) { return "/guilds/" + encode(guildId) + "/members/" + encode(userId) },
  applicationCommands: function(applicationId) { return "/applications/" + encode(applicationId) + "/commands" },
  applicationGuildCommands: function(applicationId, guildId) {
    return "/applications/" + encode(applicationId) + "/guilds/" + encode(guildId) + "/commands"
  },
  interactionCallback: function(interactionId, token) {
    return "/interactions/" + encode(interactionId) + "/" + encode(token) + "/callback"
  },
  webhook: function(webhookId, token) { return "/webhooks/" + encode(webhookId) + "/" + encode(token) }
}

function makeBuilder(initial) {
  const self = { data: clone(initial || {}) }
  self.setTitle = function(value) { self.data.title = value; return self }
  self.setDescription = function(value) { self.data.description = value; return self }
  self.setColor = function(value) { self.data.color = value; return self }
  self.setURL = function(value) { self.data.url = value; return self }
  self.setTimestamp = function(value) { self.data.timestamp = value || String(Date.now()); return self }
  self.setFooter = function(value) { self.data.footer = toJSON(value); return self }
  self.setAuthor = function(value) { self.data.author = toJSON(value); return self }
  self.addFields = function(a, b, c, d, e, f, g, h) {
    self.data.fields = self.data.fields || list()
    for (const item of list(a, b, c, d, e, f, g, h)) self.data.fields.push(toJSON(item))
    return self
  }
  self.setName = function(value) { self.data.name = value; return self }
  self.setValue = function(value) { self.data.value = value; return self }
  self.setStyle = function(value) { self.data.style = value; return self }
  self.setLabel = function(value) { self.data.label = value; return self }
  self.setCustomId = function(value) { self.data.custom_id = value; return self }
  self.setPlaceholder = function(value) { self.data.placeholder = value; return self }
  self.setRequired = function(value) { self.data.required = value; return self }
  self.setMinLength = function(value) { self.data.min_length = value; return self }
  self.setMaxLength = function(value) { self.data.max_length = value; return self }
  self.setMinValues = function(value) { self.data.min_values = value; return self }
  self.setMaxValues = function(value) { self.data.max_values = value; return self }
  self.addOptions = function(a, b, c, d, e, f, g, h) {
    self.data.options = self.data.options || list()
    for (const item of list(a, b, c, d, e, f, g, h)) self.data.options.push(toJSON(item))
    return self
  }
  self.addComponents = function(a, b, c, d, e, f, g, h) {
    self.data.components = self.data.components || list()
    for (const item of list(a, b, c, d, e, f, g, h)) self.data.components.push(toJSON(item))
    return self
  }
  self.toJSON = function() { return clone(self.data) }
  return self
}

function EmbedBuilder(data) { return makeBuilder(data) }
EmbedBuilder.new = EmbedBuilder

function ButtonBuilder(data) {
  const self = makeBuilder(data)
  self.data.type = ComponentType.Button
  return self
}
ButtonBuilder.new = ButtonBuilder

function ActionRowBuilder(data) {
  const self = makeBuilder(data)
  self.data.type = ComponentType.ActionRow
  return self
}
ActionRowBuilder.new = ActionRowBuilder

function StringSelectMenuBuilder(data) {
  const self = makeBuilder(data)
  self.data.type = ComponentType.StringSelect
  return self
}
StringSelectMenuBuilder.new = StringSelectMenuBuilder

function TextInputBuilder(data) {
  const self = makeBuilder(data)
  self.data.type = ComponentType.TextInput
  return self
}
TextInputBuilder.new = TextInputBuilder

function ModalBuilder(data) {
  const self = makeBuilder(data)
  self.data.components = self.data.components || list()
  return self
}
ModalBuilder.new = ModalBuilder

function SlashCommandBuilder() {
  const self = makeBuilder({ type: ApplicationCommandType.ChatInput, options: list() })
  self.setDMPermission = function(value) { self.data.dm_permission = value; return self }
  self.addStringOption = function(callback) {
    const option = makeBuilder({ type: ApplicationCommandOptionType.String })
    callback(option)
    self.data.options.push(option.toJSON())
    return self
  }
  self.addIntegerOption = function(callback) {
    const option = makeBuilder({ type: ApplicationCommandOptionType.Integer })
    callback(option)
    self.data.options.push(option.toJSON())
    return self
  }
  self.addBooleanOption = function(callback) {
    const option = makeBuilder({ type: ApplicationCommandOptionType.Boolean })
    callback(option)
    self.data.options.push(option.toJSON())
    return self
  }
  return self
}
SlashCommandBuilder.new = SlashCommandBuilder

function AttachmentBuilder(path, options) {
  let name = path
  if (options && options.name) name = options.name
  return { path: path, name: name, description: options && options.description }
}
AttachmentBuilder.new = AttachmentBuilder

function User(client, raw) {
  const self = clone(raw || {})
  self.client = client
  self.toString = function() { return "<@" + String(self.id) + ">" }
  return self
}
User.new = User

function Message(client, raw) {
  const self = clone(raw || {})
  self.client = client
  self.author = null
  if (raw && raw.author) self.author = User(client, raw.author)
  self.reply = function(payload) {
    const body = normalizePayload(payload)
    body.message_reference = { message_id: self.id, channel_id: self.channel_id }
    return client.rest.post(Routes.channelMessages(self.channel_id), { json: body })
  }
  self.edit = function(payload) {
    return client.rest.patch(Routes.channelMessage(self.channel_id, self.id), { json: normalizePayload(payload) })
  }
  self.delete = function() {
    return client.rest.delete(Routes.channelMessage(self.channel_id, self.id))
  }
  return self
}
Message.new = Message

function TextChannel(client, raw) {
  const self = clone(raw || {})
  self.client = client
  self.send = function(payload) {
    const sent = client.rest.post(Routes.channelMessages(self.id), { json: normalizePayload(payload) })
    return Message(client, sent)
  }
  self.messages = function() {
    return {
      fetch: function(options) {
        let limit = 50
        if (options && options.limit) limit = options.limit
        const data = client.rest.get(Routes.channelMessages(self.id) + "?limit=" + encode(limit))
        const output = []
        for (const item of arrayOrEmpty(data)) output.push(Message(client, item))
        return output
      }
    }
  }
  return self
}
TextChannel.new = TextChannel

function Guild(client, raw) {
  const self = clone(raw || {})
  self.client = client
  self.channels = {
    fetch: function(channelId) { return client.fetchChannel(channelId) }
  }
  self.members = {
    fetch: function(options) {
      let limit = 100
      if (options && options.limit) limit = options.limit
      return client.fetchMembers(self.id, limit)
    }
  }
  return self
}
Guild.new = Guild

function GuildMember(client, raw) {
  const self = clone(raw || {})
  self.client = client
  self.user = null
  if (raw && raw.user) self.user = User(client, raw.user)
  return self
}
GuildMember.new = GuildMember

function Role(client, raw) {
  const self = clone(raw || {})
  self.client = client
  return self
}
Role.new = Role

function Interaction(client, raw) {
  const self = clone(raw || {})
  self.client = client
  self.reply = function(payload) {
    return client.rest.post(Routes.interactionCallback(self.id, self.token), {
      json: {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: normalizePayload(payload)
      }
    })
  }
  return self
}
Interaction.new = Interaction

function WebhookClient(options) {
  const self = { id: options && options.id, token: options && options.token, rest: REST() }
  self.send = function(payload) {
    return self.rest.post(Routes.webhook(self.id, self.token), { json: normalizePayload(payload) })
  }
  return self
}
WebhookClient.new = WebhookClient

function pickNonBotUsers(client, channel, limit) {
  let messages = list()
  if (channel && channel.messages) messages = channel.messages().fetch({ limit: 50 })
  return pickNonBotUsersFromMessages(messages, limit || 2)
}

function Client(options) {
  const self = EventEmitter()
  self.options = options || {}
  self.rest = REST()
  self.channels = Collection()
  self.guilds = Collection()
  self.users = Collection()
  self.seq = null
  self.sessionId = null
  self.user = null
  self.token = null

  self.debug = function(message) { return self.emit(Events.Debug, message) }
  self.handleDispatch = function(name, data) {
    self.emit(Events.Raw, { t: name, d: data })
    if (name === "READY") {
      self.user = User(self, data.user)
      self.sessionId = data.session_id
      self.emit(Events.ClientReady, self)
    } else if (name === "MESSAGE_CREATE") {
      self.emit(Events.MessageCreate, Message(self, data))
    } else if (name === "MESSAGE_UPDATE") {
      self.emit(Events.MessageUpdate, Message(self, data))
    } else if (name === "MESSAGE_DELETE") {
      self.emit(Events.MessageDelete, data)
    } else if (name === "INTERACTION_CREATE") {
      self.emit(Events.InteractionCreate, Interaction(self, data))
    } else if (name === "GUILD_CREATE") {
      self.emit(Events.GuildCreate, Guild(self, data))
    }
  }
  self.identify = function() {
    const intents = self.options.intents || GatewayIntentBits.Guilds
    self.ws.send(JSON.stringify({
      op: 2,
      d: {
        token: self.token,
        intents: intents,
        properties: { os: "roblox", browser: "rterminal", device: "rterminal" }
      }
    }))
  }
  self.startHeartbeat = function(interval) {
    if (self.heartbeatCancel) self.heartbeatCancel()
    self.heartbeatCancel = setInterval(function() {
      if (self.ws) self.ws.send(JSON.stringify({ op: 1, d: self.seq }))
    }, interval || 41250)
  }
  self.handleGatewayMessage = function(message) {
    const payload = parse(message)
    if (!payload) return
    if (payload.s !== undefined) self.seq = payload.s
    if (payload.op === 10) {
      self.startHeartbeat(payload.d && payload.d.heartbeat_interval || 41250)
      self.identify()
    } else if (payload.op === 0) {
      self.handleDispatch(payload.t, payload.d)
    } else if (payload.op === 11) {
      self.emit("heartbeatAck")
    }
  }
  self.login = function(token) {
    self.token = token || self.token || process.env.DISCORD_TOKEN
    if (!self.token || String(self.token) === "") throw new Error("DISCORD_TOKEN missing")
    self.rest.setToken(self.token)
    self.ws = ws.connect(GATEWAY)
    self.ws.on("message", function(message) {
      try {
        self.handleGatewayMessage(message)
      } catch (err) {
        self.emit(Events.Error, err)
      }
    })
    self.ws.on("close", function() { self.emit(Events.Close) })
    self.ws.on("error", function(err) { self.emit(Events.Error, err) })
    return self.token
  }
  self.destroy = function() {
    if (self.heartbeatCancel) clearInterval(self.heartbeatCancel)
    if (self.ws) self.ws.close()
    self.ws = null
    return true
  }
  self.fetchChannel = function(channelId) {
    const channel = TextChannel(self, self.rest.get(Routes.channel(channelId)))
    self.channels.set(channelId, channel)
    return channel
  }
  self.send = function(channelId, payload) {
    const channel = self.channels.get(channelId) || TextChannel(self, { id: channelId })
    self.channels.set(channelId, channel)
    return channel.send(payload)
  }
  self.fetchGuild = function(guildId) {
    const guild = Guild(self, self.rest.get(Routes.guild(guildId)))
    self.guilds.set(guildId, guild)
    return guild
  }
  self.fetchMembers = function(guildId, limit) {
    const data = self.rest.get(Routes.guildMembers(guildId) + "?limit=" + encode(limit || 100))
    const output = []
    for (const item of arrayOrEmpty(data)) output.push(GuildMember(self, item))
    return output
  }
  self.fetchUser = function(userId) {
    return User(self, self.rest.get("/users/" + encode(userId)))
  }
  self.registerGlobalCommands = function(applicationId, commands) {
    return self.rest.put(Routes.applicationCommands(applicationId || self.user && self.user.id), { json: arrayToJSON(commands) })
  }
  self.registerGuildCommands = function(applicationId, guildId, commands) {
    return self.rest.put(Routes.applicationGuildCommands(applicationId || self.user && self.user.id, guildId), { json: arrayToJSON(commands) })
  }
  return self
}
Client.new = Client

module.exports = {
  version: "rterminal-discord.js-0.4.0-js",
  API_VERSION: API_VERSION,
  list: list,
  Intents: Intents,
  userIds: userIds,
  mentionText: mentionText,
  joinText: joinText,
  pickNonBotUsersFromMessages: pickNonBotUsersFromMessages,
  pickNonBotUsers: pickNonBotUsers,
  Client: Client,
  Collection: Collection,
  REST: REST,
  Routes: Routes,
  Events: Events,
  GatewayIntentBits: GatewayIntentBits,
  Partials: Partials,
  ChannelType: ChannelType,
  MessageFlags: MessageFlags,
  ComponentType: ComponentType,
  ButtonStyle: ButtonStyle,
  TextInputStyle: TextInputStyle,
  PermissionFlagsBits: PermissionFlagsBits,
  PermissionOverwriteType: PermissionOverwriteType,
  ApplicationCommandType: ApplicationCommandType,
  ApplicationCommandOptionType: ApplicationCommandOptionType,
  InteractionResponseType: InteractionResponseType,
  EmbedBuilder: EmbedBuilder,
  ButtonBuilder: ButtonBuilder,
  ActionRowBuilder: ActionRowBuilder,
  StringSelectMenuBuilder: StringSelectMenuBuilder,
  TextInputBuilder: TextInputBuilder,
  ModalBuilder: ModalBuilder,
  SlashCommandBuilder: SlashCommandBuilder,
  AttachmentBuilder: AttachmentBuilder,
  WebhookClient: WebhookClient,
  User: User,
  Guild: Guild,
  GuildMember: GuildMember,
  Role: Role,
  Message: Message,
  Interaction: Interaction,
  TextChannel: TextChannel
}
