// File for containing the Command interfaces
// Contains both the normal Command
// and Global Command interfaces
import {
	CommandInteraction,
	Message,
	Collection,
	Guild,
	ApplicationCommandPermissions,
	ContextMenuInteraction,
} from 'discord.js';
import { Bot } from '../client/Client';
import {
	ContextMenuCommandBuilder,
	SlashCommandBuilder,
} from '@discordjs/builders';
import { DBModGuild, DBPermission } from '../database/models/ModGuild';
import { BotModule } from './Module';
import consolaGlobalInstance from 'consola';
import { Setable } from './Setable';

export interface GlobalRunFunction {
	(client: Bot, message: Message, args: string[]): Promise<unknown>;
}

export interface GlobalCommand {
	name: string;
	run: GlobalRunFunction;
}

/**
 * Commands are setable because it means they have options
 * I know setable is a bad name but I couldn't think of a better one
 * I'm sorry
 * Is an abstract class used to making commands.
 */
export abstract class Command extends Setable {
	public permissions: DBPermission[] = [
		{ type: 'USER', id: '125270885782388736', permission: true },
	];
	public name: string;
	public displayName: string;
	public help: string;
	public info: string;
	public module: BotModule;
	protected contextMenu: boolean;

	public data: SlashCommandBuilder | ContextMenuCommandBuilder =
		new SlashCommandBuilder().setDefaultPermission(false);

	public abstract run(
		client: Bot,
		interaction: CommandInteraction | ContextMenuInteraction
	): Promise<any> | any;

	public async enable(bot: Bot, guild: Guild): Promise<void> {
		await this.setStatus(bot, guild.id, true);
		this.registerCommand(bot, guild);
	}
	public async disable(bot: Bot, guild: Guild): Promise<void> {
		await this.setStatus(bot, guild.id, false);
		this.unregisterCommand(bot, guild);
	}

	constructor({
		name,
		help = 'NO HELP INFO SET',
		info = 'NO INFO SET',
		module,
		contextMenu = false,
	}: {
		name: string;
		help: string;
		info: string;
		module: BotModule;
		contextMenu?: boolean;
	}) {
		super();
		this.name = name;
		this.displayName = name.charAt(0).toUpperCase() + name.slice(1);
		this.help = help;
		this.info = info;
		this.module = module;
		this.contextMenu = contextMenu;
		if (!contextMenu) {
			(this.data as SlashCommandBuilder).setName(name).setDescription(help);
		}
		consolaGlobalInstance.info(`Initializing Command | ${this.name}`);
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
		const commandId = (await guild.commands.create(this.data.toJSON())).id;
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
		if (!commandId) return;
		client.logger.trace(`Unregistering Command | ${commandId}`);
		await guild.commands.delete(commandId);
		ModGuild.getCommand(this.module.name, this.name).commandId = '';
		ModGuild.save();
	}

	public async updatePermissions(client: Bot, guild: Guild): Promise<void> {
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: guild.id,
		});
		const command = ModGuild.getCommand(this.module.name, this.name);
		const discordCommand = await guild.commands.fetch(command.commandId);
		const permissions: ApplicationCommandPermissions[] = command.permissions;
		await discordCommand.permissions.set({ permissions });
	}

	public static getCommand(client: Bot, name: string) {
		if (!client.modules.some((m) => m.commands.some((c) => c.name === name)))
			return null;
		return client.modules
			.filter((m) => (m.commands.get(name) ? true : false))
			.first()
			.commands?.get(name);
	}

	public async isEnabled(client: Bot, guild: Guild): Promise<boolean> {
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: guild.id,
		});
		if (!ModGuild) return false;
		const command = ModGuild.getCommand(this.module.name, this.name);
		if (!command) return false;
		return command.enabled;
	}
}
