// Event for on Guild Join
// Sets up the Guild in the database
// For modulized command handeling.

import { Guild } from 'discord.js';
import { RunFunction } from '../../interfaces/Event';
import { BotModule } from '../../interfaces/Module';
import { Bot } from '../../client/Client';
import {
	DBCommand,
	DBModGuild,
	DBPermission,
} from '../../database/models/ModGuild';

export const name: string = 'guildCreate';
export const once: boolean = false;

/**
 * When the bot joins a guild the guild is added to the database.
 * Info is also logged to the console.
 * @param client Bot client
 * @param guild The guild that was joined
 */
export const run: RunFunction = async (client, guild: Guild) => {
	const ownerTag = (await guild.fetchOwner()).user?.tag;
	client.logger.info(
		`Joined new Guild | Name(${guild.name}) | Owner(${ownerTag})`
	);

	setUpGuild(client, guild.id);
};

/**
 * Sets up the Guild in the database
 * @param client Bot client
 * @param guildId The id of the guild that is being set up
 */
export async function setUpGuild(client: Bot, guildId: string): Promise<void> {
	const ModGuildSchema = client.db.load('modguild');
	let ModGuild: DBModGuild = await ModGuildSchema.findOne({ guildId });

	// Creates the Guild if it doesnt exist.
	if (!ModGuild) {
		ModGuild = await ModGuildSchema.create({ guildId, modules: [] });
	}
	client.logger.trace(`Setting up guild | ${guildId}`);

	// Goes through all the modules and sets them up.
	client.modules.forEach((module: BotModule) => {
		if (ModGuild.getModule(module.name)) return;
		ModGuild.modules.push({
			name: module.name,
			commands: [],
			enabled: false,
			settings: module
				.getDefaultSettings()
				.map((value, key) => ({ key, value: { name: key, type: '', value } })),
		});
	});

	// Goes thorugh all the commands and sets them up.
	client.modules.forEach((module: BotModule) => {
		module.commands.forEach((command) => {
			if (ModGuild.getCommand(module.name, command.name)) return;
			ModGuild.getModule(module.name)?.commands.push({
				name: command.name,
				permissions: command.permissions,
				enabled: false,
				settings: command.getDefaultSettings().map((value, key) => ({
					key,
					value: { name: key, type: '', value },
				})),
				commandId: '',
			});
		});
	});

	ModGuild.save();
}
