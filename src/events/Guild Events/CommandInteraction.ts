// Event that runs when the bot is ready.
// Prints out a ready command to the console.

import { CommandInteraction, Interaction } from 'discord.js';
import { DBModGuild } from '../../database/models/ModGuild';
import { Command } from '../../interfaces/Command';
import { RunFunction } from '../../interfaces/Event';
import { BotModule } from '../../interfaces/Module';

export const name: string = 'interactionCreate';
export const once: boolean = false;

export const run: RunFunction = async (client, interaction: Interaction) => {
	if (!interaction.isCommand()) return;
	interaction as CommandInteraction;
	const command: Command = Command.getCommand(client, interaction.commandName);
	const module: BotModule = command.module;
	const ModGuildSchema = client.db.load('modguild');
	const ModGuild: DBModGuild = await ModGuildSchema.findOne({
		guildID: interaction.guild.id,
	});
	client.logger.log(
		`${interaction.user.tag} ran ${interaction.commandName} in ${interaction.guild.name}`
	);
	if (!ModGuild.getModule(module.name).enabled) {
		module.disable(client, interaction.guild);
		interaction.reply({
			ephemeral: true,
			embeds: [
				client.embed(
					{
						description: 'This module is disabled in this server.',
						color: 'RED',
					},
					interaction
				),
			],
		});
	}
	if (!ModGuild.getCommand(module.name, command.name).enabled) {
		command.disable(client, interaction.guild);
		interaction.reply({
			ephemeral: true,
			embeds: [
				client.embed(
					{
						description: 'This command is disabled in this server.',
						color: 'RED',
					},
					interaction
				),
			],
		});
	}
	command.run(client, interaction);
};
