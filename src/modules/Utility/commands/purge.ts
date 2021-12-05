import {
	SlashCommandBooleanOption,
	SlashCommandBuilder,
} from '@discordjs/builders';
import { CommandInteraction, CacheType, Guild, TextChannel } from 'discord.js';
import { Bot } from '../../../client/Client';
import { Command } from '../../../interfaces/Command';
import { BotModule } from '../../../interfaces/Module';

export default class PingCommand extends Command {
	constructor(module: BotModule) {
		super({
			name: 'purge',
			help: 'Deletes the last X Messages',
			info: 'Purge Command',
			module,
		});
		(this.data as SlashCommandBuilder).addIntegerOption((amount) => {
			return amount
				.setName('amount')
				.setDescription('The amount of messages to delete')
				.setRequired(true);
		});
	}

	public async run(
		client: Bot,
		interaction: CommandInteraction<CacheType>
	): Promise<void> {
		const amount = Math.min(interaction.options.getInteger('amount'), 99);
		const channel = interaction.channel as TextChannel;
		const messages = await interaction.channel.messages.fetch({
			limit: amount,
		});

		channel.bulkDelete(
			messages.filter(
				(msg) =>
					(Date.now() - msg.createdAt.getTime()) / (1000 * 60 * 60 * 24) < 13.5
			)
		);

		messages
			.filter(
				(msg) =>
					(Date.now() - msg.createdAt.getTime()) / (1000 * 60 * 60 * 24) > 13.5
			)
			.each((msg) => msg.delete());

		interaction.reply({
			ephemeral: true,
			embeds: [
				Bot.embed(
					{
						description: `${amount} messages successfully deleted!`,
						fields:
							messages.filter(
								(msg) =>
									(Date.now() - msg.createdAt.getTime()) /
										(1000 * 60 * 60 * 24) >
									13.5
							).size > 0
								? [
										{
											name: 'Note',
											value: 'Older messages might take some time to remove',
										},
								  ]
								: [],
					},
					interaction
				),
			],
		});
	}
}
