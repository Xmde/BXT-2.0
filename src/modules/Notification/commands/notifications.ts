import { CommandInteraction, CacheType, Guild } from 'discord.js';
import { Bot } from '../../../client/Client';
import { DBModGuild } from '../../../database/models/ModGuild';
import { DBNotification } from '../../../database/models/Notification';
import { Command } from '../../../interfaces/Command';
import { BotModule } from '../../../interfaces/Module';
import NotificationModule from '../NotificaionModule';

export default class PingCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'notification',
			help: 'Adds a channel to be checked for notifiations (Twitch/YT)',
			info: 'Used for notifications on video uploads',
			module,
		});
		this.data.addStringOption((opt) =>
			opt
				.addChoices([
					['add', 'add'],
					['remove', 'remove'],
				])
				.setName('action')
				.setDescription('The action to perform')
				.setRequired(true)
		);
		this.data.addStringOption((opt) =>
			opt
				.addChoices([
					['twitch', 'TWITCH'],
					['youtube', 'YOUTUBE'],
				])
				.setName('platform')
				.setDescription('The platform to check for notifications')
				.setRequired(true)
		);
		this.data.addStringOption((opt) =>
			opt
				.setName('channel')
				.setDescription('The channel to check for notifications')
				.setRequired(true)
		);
	}

	public async run(
		client: Bot,
		interaction: CommandInteraction<CacheType>
	): Promise<void> {
		if (!(this.module instanceof NotificationModule)) throw new Error();
		const ModGuildSchema = await client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: interaction.guild.id,
		});

		const discordChannel = ModGuild.getModuleSettings(
			this.module.name,
			'channel'
		)?.value?.value;
		const role = ModGuild.getModuleSettings(this.module.name, 'role')?.value
			?.value;

		if (!discordChannel || discordChannel === '' || !role || role === '') {
			interaction.reply({
				embeds: [
					Bot.embed(
						{
							description:
								'You must configue this module first! Run bxt!setup and naviagate to the notification module',
						},
						interaction
					),
				],
				ephemeral: true,
			});
		}

		const action = interaction.options.getString('action');
		const platform = interaction.options.getString('platform');
		const channel = interaction.options.getString('channel');
		const NotificationSchema = client.db.load('notification');
		if (!(await this.module.validateChannel(channel, platform))) {
			return interaction.reply({
				embeds: [
					Bot.embed(
						{
							description:
								'That is not a valid Twitch or Youtube Channel. Please Enter a Valid Channel',
							color: 'RED',
						},
						interaction
					),
				],
				ephemeral: true,
			});
		}

		let Notification: DBNotification = await NotificationSchema.findOne({
			channel,
		});
		if (!Notification) {
			Notification = await NotificationSchema.create({
				channel,
				platform,
			});
		}
		if (action === 'add') {
			await Notification.addGuild(interaction.guild.id);
			interaction.reply({
				embeds: [
					Bot.embed({ description: 'Channel Successfully Added' }, interaction),
				],
				ephemeral: true,
			});
			if (platform === 'YOUTUBE') {
				this.module.subscribe(channel);
			}
		} else if (action === 'remove') {
			await Notification.removeGuild(interaction.guild.id);
			interaction.reply({
				embeds: [
					Bot.embed(
						{ description: 'Channel Successfully Removed' },
						interaction
					),
				],
				ephemeral: true,
			});
		}
	}
}
