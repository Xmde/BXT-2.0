// Event that runs when the bot is ready.
// Prints out a ready command to the console.

import { CommandInteraction, Interaction } from 'discord.js';
import { DBModGuild } from '../../database/models/ModGuild';
import { Command } from '../../interfaces/Command';
import { RunFunction } from '../../interfaces/Event';
import { BotModule } from '../../interfaces/Module';

export const name: string = 'interactionCreate';
export const once: boolean = false;

/**
 * Handles command handeling
 * Auto runs the correct run function if there is a command
 * @param client Bot client
 * @param interaction The interaction that was created
 * @returns None
 */
export const run: RunFunction = async (client, interaction: Interaction) => {
	// If the Interaction is not a command than we dont care
	if (!interaction.isCommand()) return;

	// Makes sure the interaction is a command interaction
	interaction as CommandInteraction;

	// The Setting Command is handeled seperatly because it is used in bxt!setup
	if (interaction.commandName === 'setting') return;

	// Pulls info from the Database
	const command: Command = Command.getCommand(client, interaction.commandName);
	const module: BotModule = command.module;
	const ModGuildSchema = client.db.load('modguild');
	const ModGuild: DBModGuild = await ModGuildSchema.findOne({
		guildID: interaction.guild.id,
	});

	client.logger.log(
		`${interaction.user.tag} ran ${interaction.commandName} in ${interaction.guild.name}`
	);

	// Checks to see if the module and command is enabled.
	// If not then sends a message to the user and removes the /command from discord.
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

	// Runs the command.
	command.run(client, interaction);
};
