// Event for on Guild Join
// Sets up the Guild in the database
// For modulized command handeling.

import { Guild } from 'discord.js';
import { RunFunction } from '../../interfaces/Event';
import glob from 'glob';
import { promisify } from 'util';
import { Module } from '../../interfaces/Module';
import { Bot } from '../../client/Client';

const globPromise = promisify(glob);

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
	const modules = [];

	client.logger.debug(`Setting up guild | ${guildId}`);

	const moduleFiles = await globPromise(
		`${__dirname}/../modules/*/*Module{.ts,.js}`
	);
	client.logger.trace(`Module Files | ${moduleFiles}`);

	await Promise.all(
		moduleFiles.map(async (value: string) => {
			const module: Module = await import(value);
			const commands = await module.commands;
			const commandArray = [];
			commands.forEach((value) => {
				commandArray.push({ name: value.name });
			});
			modules.push({
				name: module.name,
				commands: commandArray,
			});
		})
	);
	if (await ModGuildSchema.findOne({ guildId }))
		ModGuildSchema.updateOne({ guildId }, { guildId, modules });
	else ModGuildSchema.create({ guildId, modules });
}
