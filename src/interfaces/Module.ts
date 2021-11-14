import { Collection, Guild } from 'discord.js';
import { Command } from './Command';
import glob from 'glob';
import { Bot } from '../client/Client';
import { DBModGuild } from '../database/models/ModGuild';

// Class for BotModlues.
// Will grab the commands in the commands folder.
abstract class BotModule {
	public readonly name: string;
	public readonly displyName: string;
	public info: string;
	public commands: Collection<string, Command>;
	private dirname: string;

	public abstract enable(bot: Bot, guild: Guild): Promise<void>;
	public abstract disable(bot: Bot, guild: Guild): Promise<void>;
	public abstract defaultSettings: Collection<string, any>;

	public constructor(name: string, dirname: string) {
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
}

export { BotModule };
