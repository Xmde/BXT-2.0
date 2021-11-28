import { CommandInteraction, CacheType, Guild } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { BotModule } from '../../../interfaces/Module';
import { DBNotification } from '../../../database/models/Notification';
import { Model } from 'mongoose';
import NotificationModule from '../NotificaionModule';
import { stringify } from 'querystring';
import { DBModGuild } from '../../../database/models/ModGuild';

export default class NotificationChannels extends Command {
	private NotificationSchema: Model<DBNotification>;
	private ModGuildSchema: Model<DBModGuild>;

	constructor(module: BotModule) {
		super({
			name: 'notificationinfo',
			help: 'Displays info regarding the Notificaion Module',
			info: 'Shows info about the Notificaion Module',
			module,
		});
		this.NotificationSchema = Bot.getInstance().db.load('notification');
		this.ModGuildSchema = Bot.getInstance().db.load('modguild');
	}

	/**
	 * Finds all the channels the user is getting notifications for
	 * Sends them in a message with an embed.
	 */
	public async run(
		client: Bot,
		interaction: CommandInteraction<CacheType>
	): Promise<void> {
		if (!(this.module instanceof NotificationModule))
			throw new Error('Notification Module is not loaded');
		const twitchChannels = await this.NotificationSchema.find({
			guilds: interaction.guild.id,
			platform: 'TWITCH',
		});
		const youtubeChannels = await this.NotificationSchema.find({
			guilds: interaction.guild.id,
			platform: 'YOUTUBE',
		});

		const embed = Bot.embed(
			{
				title: 'Channels Subscribed to',
			},
			interaction
		);

		embed.addField(
			'Twitch Channels',
			twitchChannels.map((c) => c.channel).join(', ')
		);

		const ytChannels = (
			await Promise.all(
				youtubeChannels.map(async (c) => {
					return `${await (this.module as NotificationModule).getNameFromId(
						c.channel
					)} (${c.channel})`;
				})
			)
		).join(', ');
		embed.addField('Youtube Channels', ytChannels);

		await this.ModGuildSchema.findOne({ guildId: interaction.guild.id }).then(
			async (guild) => {
				const mod = guild.getModule('notification');
				if (!mod) return;
				const channel = interaction.guild.channels.cache.get(
					(
						await this.ModGuildSchema.findOne({ guildId: interaction.guild.id })
					).getModuleSettings('notification', 'channel')?.value?.value
				);
				if (!channel) return;
				embed.addField(
					'Notification Channel',
					`#${channel.name} (${channel.id})`
				);
			}
		);

		// Then adds the role as a field to the embed.
		await this.ModGuildSchema.findOne({ guildId: interaction.guild.id }).then(
			async (guild) => {
				const mod = guild.getModule('notification');
				if (!mod) return;
				const role = interaction.guild.roles.cache.get(
					(
						await this.ModGuildSchema.findOne({ guildId: interaction.guild.id })
					).getModuleSettings('notification', 'role')?.value?.value
				);
				if (!role) return;
				embed.addField('Notification Role', `@${role.name} (${role.id})`);
			}
		);

		interaction.reply({
			embeds: [embed],
			ephemeral: true,
		});
	}
}
