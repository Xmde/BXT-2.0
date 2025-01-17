// Module for Notifications
import { Model } from 'mongoose';
import { Bot } from '../../client/Client';
import { DBNotification } from '../../database/models/Notification';
import { BotModule } from '../../interfaces/Module';
import TwitchApi from 'node-twitch';
import { APIStreamResponse } from 'node-twitch/dist/types/responses';
import { DBModGuild } from '../../database/models/ModGuild';
import { Guild, NewsChannel, TextChannel } from 'discord.js';
import pubSubHubbub from 'pubsubhubbub';
import xml2js from 'xml2js';
import { google } from 'googleapis';

export default class NotificationModule extends BotModule {
	private NotifSchema: Model<DBNotification>;
	private ModGuildSchema: Model<DBModGuild>;
	private twitchApi: TwitchApi;
	private youtubeApi;
	private client: Bot;
	private pubSubSubscriber;

	public constructor(client: Bot) {
		super('notification', __dirname);
		this.client = client;
		client.logger.info(`Initializing module ${this.displyName}`);
		this.addSetting('channel', '').addChannelOption((opt) =>
			opt
				.setName('channel')
				.setDescription('The channel to send notifications to')
				.setRequired(true)
				.addChannelTypes([0, 5])
		);
		this.addSetting('role', '').addRoleOption((opt) =>
			opt
				.setName('role')
				.setDescription('The role to mention')
				.setRequired(true)
		);
		this.NotifSchema = client.db.load('notification');
		this.ModGuildSchema = client.db.load('modguild');
		this.twitchApi = new TwitchApi({
			client_id: client.config.twitch.clientID,
			client_secret: client.config.twitch.clientSecret,
		});
		this.youtubeApi = google.youtube({
			version: 'v3',
			auth: client.config.youtube.apiKey,
		});
		this.pubSubSubscriber = pubSubHubbub.createServer({
			callbackUrl: client.config.youtube.callbackurl,
		});
		this.pubSubSubscriber.listen(client.config.youtube.callbackport);
		this.init();
	}

	private async init() {
		this.twitchInit();
		this.initYoutube();
	}

	// Gets streams from twitch api and segments them into blocks of 90.
	// Gets data from database.
	// Returns any active streams
	private async getStreams() {
		const channels = (await this.NotifSchema.find({ platform: 'TWITCH' })).map(
			(val) => val.channel
		);
		if (channels.length === 0) return null;
		const streams: APIStreamResponse = {
			data: [],
		};
		while (channels.length) {
			let usernames = channels.splice(0, 90);
			const data = (
				await this.twitchApi.getStreams({
					channels: usernames,
					first: 100,
				})
			).data;
			streams.data = [...streams.data, ...data];
		}
		return streams.data;
	}

	private async twitchInit() {
		let oldStreams: string[] = [];
		setInterval(async () => {
			const streams = await this.getStreams();
			if (!streams || streams.length === 0) return;
			for (const stream of streams) {
				if (oldStreams.includes(stream.id)) continue;
				const notif = await this.NotifSchema.findOne({
					channel: stream.user_name.toLowerCase(),
					platform: 'TWITCH',
				});
				if (!notif) continue;
				for (const guildId of notif.guilds) {
					const guild = this.client.guilds.cache.get(guildId);
					if (!guild) continue;
					const channel = guild.channels.cache.get(
						(await this.ModGuildSchema.findOne({ guildId })).getModuleSettings(
							'notification',
							'channel'
						)?.value?.value
					);
					if (!channel) continue;
					const role = (
						await this.ModGuildSchema.findOne({ guildId })
					).getModuleSettings('notification', 'role')?.value?.value;
					if (!role) continue;
					if (guild.roles.everyone.id === role) {
						(channel as TextChannel | NewsChannel).send(`@everyone ${
							stream.user_name
						} is live on twitch! Go check out their stream!
https://twitch.tv/${stream.user_name.toLowerCase()}`);
					} else {
						(channel as TextChannel | NewsChannel).send(`<@&${role}> ${
							stream.user_name
						} is live on twitch! Go check out their stream!
https://twitch.tv/${stream.user_name.toLowerCase()}`);
					}
				}
			}
			oldStreams = [];
			for (const stream of streams) {
				oldStreams.push(stream.id);
			}
		}, 60 * 1000);
	}

	public subscribe(channel: string) {
		this.pubSubSubscriber.subscribe(
			`https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channel}`,
			'https://pubsubhubbub.appspot.com/',
			this.client.config.youtube.callbackurl,
			(err) => {
				if (err) {
					this.client.logger.error(err);
				}
			}
		);
	}

	private initYoutube() {
		this.pubSubSubscriber.on('feed', async (feed) => {
			const data = await xml2js.parseStringPromise(feed.feed.toString(), {
				mergeAttrs: true,
			});
			if (!data.feed.entry) return;

			const notif = await this.NotifSchema.findOne({
				channel: data.feed.entry[0]['yt:channelId'][0],
				platform: 'YOUTUBE',
			});
			if (!notif) return;
			for (const guildId of notif.guilds) {
				const guild = this.client.guilds.cache.get(guildId);
				if (!guild) continue;
				const channel = guild.channels.cache.get(
					(await this.ModGuildSchema.findOne({ guildId })).getModuleSettings(
						'notification',
						'channel'
					)?.value?.value
				);
				if (!channel) continue;
				const role = (
					await this.ModGuildSchema.findOne({ guildId })
				).getModuleSettings('notification', 'role')?.value?.value;
				if (!role) continue;
				if (guild.roles.everyone.id === role) {
					(channel as TextChannel | NewsChannel).send(
						`@everyone ${data.feed.entry[0].author[0].name} just uploaded a YouTube video! Go check out their video!\n${data.feed.entry[0].link[0].href}/`
					);
				} else {
					(channel as TextChannel | NewsChannel).send(
						`<@&${role}> ${data.feed.entry[0].author[0].name} just uploaded a YouTube video! Go check out their video!\n${data.feed.entry[0].link[0].href}`
					);
				}
			}
		});
		setInterval(() => {
			this.NotifSchema.find({ platform: 'YOUTUBE' }).then((channels) => {
				channels.forEach((channel) => {
					this.subscribe(channel.channel);
				});
			});
		}, 1000 * 60 * 60 * 24 * 2);
	}

	/**
	 * @param id The id of the channel
	 * @returns The Name of the Channel
	 */
	public async getNameFromId(id: string): Promise<string> {
		const data = await this.youtubeApi.channels.list({
			id: id,
			part: 'snippet',
		});
		return data.data.items[0].snippet.title;
	}

	/**
	 *
	 * @param channel The Channel Which we are looking for
	 * @param platform The Platform the channel resides on
	 * @returns True if the channel is valid, false if otherwise
	 */
	public async validateChannel(
		channel: string,
		platform: string
	): Promise<boolean> {
		if (platform === 'TWITCH') {
			const data = await this.twitchApi.getUsers(channel);
			if (!data.data[0]) return false;
			return true;
		} else if (platform === 'YOUTUBE') {
			const data = await this.youtubeApi.channels.list({
				id: channel,
				part: 'snippet',
			});
			if (!data?.data?.items) return false;
			return true;
		}
		return false;
	}

	public async resetModule(client: Bot, guild: Guild): Promise<void> {
		client.logger.trace(`Resetting Notification Module for ${guild.name}`);
		const notifs = await this.NotifSchema.find({ guilds: guild.id });
		for (const notif of notifs) {
			notif.removeGuild(guild.id);
		}
	}
}
