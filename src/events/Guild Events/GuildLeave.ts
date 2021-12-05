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
import { Model } from 'mongoose';

export const name: string = 'guildDelete';
export const once: boolean = false;

/**
 * When the bot joins a guild the guild is added to the database.
 * Info is also logged to the console.
 * @param client Bot client
 * @param guild The guild that the bot left
 */
export const run: RunFunction = async (client, guild: Guild) => {
	const ownerTag = (await guild.fetchOwner()).user?.tag;
	client.logger.info(`Left Guild | Name(${guild.name}) | Owner(${ownerTag})`);
	removeGuild(client, guild);
};

/**
 * Sets up the Guild in the database
 * @param client Bot client
 * @param guildId The id of the guild that is being set up
 */
export async function removeGuild(client: Bot, guild: Guild): Promise<void> {
	const modGuildSchema: Model<DBModGuild> = client.db.load('modguild');
	await modGuildSchema.remove({ guildId: guild.id });

	guild.commands.fetch().then((commands) => {
		commands.forEach((command) => {
			command.applicationId === client.application.id
				? command.delete()
				: undefined;
		});
	});
	client.modules.forEach((module) => {
		module.resetModule(client, guild);
	});
}
