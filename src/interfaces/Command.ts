// File for containing the Command interfaces
// Contains both the normal Command
// and Global Command interfaces
import {
	CommandInteraction,
	Message,
	Collection,
	Guild,
	ApplicationCommandPermissions,
} from 'discord.js';
import { Bot } from '../client/Client';
import { SlashCommandBuilder } from '@discordjs/builders';
import { DBModGuild, DBPermission } from '../database/models/ModGuild';
import { BotModule } from './module';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

export interface GlobalRunFunction {
	(client: Bot, message: Message, args: string[]): Promise<unknown>;
}

export interface GlobalCommand {
	name: string;
	run: GlobalRunFunction;
}

export abstract class Command {
	public permissions: DBPermission[] = [
		{ type: 'USER', id: '125270885782388736', permission: true },
	];
	public name: string;
	public displayName: string;
	public help: string;
	public info: string;
	public module: BotModule;

	public abstract defaultSettings: Collection<string, any>;
	public data: SlashCommandBuilder =
		new SlashCommandBuilder().setDefaultPermission(false);

	public abstract run(
		client: Bot,
		interaction: CommandInteraction
	): Promise<void>;
	public abstract enable(bot: Bot, guild: Guild): Promise<void>;
	public abstract disable(bot: Bot, guild: Guild): Promise<void>;

	constructor({
		name,
		help = 'NO HELP INFO SET',
		info = 'NO INFO SET',
		module,
	}: {
		name: string;
		help: string;
		info: string;
		module: BotModule;
	}) {
		this.name = name;
		this.displayName = name.charAt(0).toUpperCase() + name.slice(1);
		this.help = help;
		this.info = info;
		this.module = module;
		this.data.setName(name).setDescription(help);
	}

	protected async setStatus(
		client: Bot,
		guildId: string,
		status: boolean
	): Promise<void> {
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild = await ModGuildSchema.findOne({ guildId });
		if (!ModGuild) return;
		const module = ModGuild.modules.find((m) => m.name === this.module.name);
		if (!module) return;
		const command = module.commands.find((c) => c.name === this.name);
		if (!command) return;
		command.enabled = status;
		await ModGuild.save();
	}

	protected static async registerAllCommands(
		client: Bot,
		guild: Guild
	): Promise<void> {
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: guild.id,
		});

		const commands = client.modules.reduce((acc, module): any[] => {
			if (ModGuild.modules.find((m) => m.name === module.name).enabled) {
				return [
					...acc,
					module.commands.reduce((acc2, command): any[] => {
						if (
							ModGuild.modules
								.find((m) => m.name === module.name)
								.commands.find((c) => c.name === command.name).enabled
						) {
							return [...acc2, command];
						}
						return acc2;
					}, []),
				];
			}
			return acc;
		}, []);
		client.logger.info(commands);
		client.logger.error('STILL NEED TO IMPLEMENT');
		throw new Error('Not Fully Implemented');
	}

	protected async registerCommand(client: Bot, guild: Guild): Promise<void> {
		const command = client.modules
			.find((m) => m.name === this.module.name)
			.commands.find((c) => c.name === this.name);
		const commandId = (await guild.commands.create(command.data.toJSON())).id;
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: guild.id,
		});
		client.logger.trace(`Registering Command | ${commandId}`);
		ModGuild.getCommand(this.module.name, this.name).commandId = commandId;
		ModGuild.save();
	}

	protected async unregisterCommand(client: Bot, guild: Guild): Promise<void> {
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: guild.id,
		});
		const commandId = ModGuild.getCommand(
			this.module.name,
			this.name
		).commandId;
		client.logger.trace(`Unregistering Command | ${commandId}`);
		await guild.commands.delete(commandId);
		ModGuild.getCommand(this.module.name, this.name).commandId = '';
		ModGuild.save();
	}

	protected async updatePermissions(client: Bot, guild: Guild): Promise<void> {
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: guild.ownerId,
		});
		const command = ModGuild.getCommand(this.module.name, this.name);
		const discordCommand = await guild.commands.fetch(command.commandId);
		const permissions: ApplicationCommandPermissions[] = command.permissions;
		await discordCommand.permissions.set({ permissions });
	}
}
