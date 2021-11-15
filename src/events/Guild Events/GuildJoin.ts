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

export const run: RunFunction = async (client, guild: Guild) => {
	const ownerTag = (await guild.fetchOwner()).user?.tag;
	client.logger.info(
		`Joined new Guild | Name(${guild.name}) | Owner(${ownerTag})`
	);

	setUpGuild(client, guild.id);
};

// Function that gets exposed setting up a Guild with the database
// Takes in a Client and a guildId
// CAN be run on previosuly set up guilds.

export async function setUpGuild(client: Bot, guildId: string): Promise<void> {
	const ModGuildSchema = client.db.load('modguild');
	let ModGuild: DBModGuild = await ModGuildSchema.findOne({ guildId });
	if (!ModGuild) {
		ModGuild = await ModGuildSchema.create({ guildId, modules: [] });
	}
	client.logger.trace(`Setting up guild | ${guildId}`);

	client.modules.forEach((module: BotModule) => {
		if (ModGuild.getModule(module.name)) return;
		ModGuild.modules.push({
			name: module.name,
			commands: [],
			enabled: false,
			settings: module.defaultSettings.map((value, key) => ({ key, value })),
		});
	});

	client.modules.forEach((module: BotModule) => {
		module.commands.forEach((command) => {
			if (ModGuild.getCommand(module.name, command.name)) return;
			ModGuild.getModule(module.name)?.commands.push({
				name: command.name,
				permissions: command.permissions,
				enabled: false,
				settings: command.defaultSettings.map((value, key) => ({ key, value })),
				commandId: '',
			});
		});
	});

	ModGuild.save();
}
