import { Collection, Guild } from 'discord.js';
import { Command } from './Command';
import glob from 'glob';
import { Bot } from '../client/Client';
import { DBModGuild } from '../database/models/ModGuild';
import { Setable } from './Setable';

/**
 * Class for every module
 * Extend this class to create a module.
 * Setable means that you can set the module's settings in the database.
 * Its a bad name... I know.
 */
abstract class BotModule extends Setable {
	public readonly name: string;
	public readonly displyName: string;
	public info: string;
	public commands: Collection<string, Command>;
	private dirname: string;

	public async enable(bot: Bot, guild: Guild): Promise<void> {
		await this.setStatus(bot, guild.id, true);
		bot.logger.info(
			`Enabled module ${this.displyName} for guild ${guild.name}`
		);
	}
	public async disable(bot: Bot, guild: Guild): Promise<void> {
		await this.setStatus(bot, guild.id, false);
		bot.logger.info(
			`Disabled module ${this.displyName} for guild ${guild.name}`
		);
	}

	public constructor(name: string, dirname: string) {
		super();
		this.name = name;
		this.dirname = dirname;
		this.displyName = name.charAt(0).toUpperCase() + name.slice(1);
		this.info = `The ${this.displyName} Module`;
		this.commands = this.getCommands();
	}

	private getCommands(): Collection<string, Command> {
		const commands: Collection<string, Command> = new Collection();
		const commandFiles = glob.sync(`${this.dirname}/commands/*{.ts,.js}`);
		commandFiles.forEach(async (file: string) => {
			Bot.getInstance().logger.trace(file);
			const command: Command = new (require(file).default)(this);
			commands.set(command.name, command);
		});
		return commands;
	}

	protected async setStatus(
		client: Bot,
		guildId: string,
		status: boolean
	): Promise<void> {
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild = await ModGuildSchema.findOne({ guildId });
		if (!ModGuild) return;
		const module = ModGuild.modules.find((m) => m.name === this.name);
		if (!module) return;
		module.enabled = status;
		await ModGuild.save();
		if (!status)
			await this.disableCommands(client, client.guilds.cache.get(guildId));
	}

	protected async disableCommands(client: Bot, guild: Guild): Promise<void> {
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: guild.id,
		});
		await Promise.allSettled(
			this.commands.map(async (command) => {
				if (ModGuild.getCommand(this.name, command.name)?.enabled)
					await command.disable(client, guild);
			})
		);
	}

	public async isEnabled(client: Bot, guild: Guild): Promise<boolean> {
		const ModGuildSchema = client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: guild.id,
		});
		if (!ModGuild) return false;
		const module = ModGuild.getModule(this.name);
		if (!module) return false;
		return module.enabled;
	}

	public async resetModule(client: Bot, guild: Guild): Promise<void> {
		return client.logger.trace(`Resetting module ${this.name}`);
	}
}

export { BotModule };
