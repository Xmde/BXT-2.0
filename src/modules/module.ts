import { Collection } from 'discord.js';
import { Command } from '../interfaces/Command';
import glob from 'glob';
import { promisify } from 'util';
import { Module } from '../interfaces/Module';
import { dir } from 'console';

const globPromise = promisify(glob);

// Class for BotModlues.
// Will grab the commands in the commands folder.
class BotModule implements Module {
	public readonly name: string;
	public readonly displyName: string;
	public info: string;
	public commands: Promise<Collection<string, Command>>;
	private dirname: string;

	public constructor(name: string, dirname: string) {
		this.name = name;
		this.displyName = name.charAt(0).toUpperCase() + name.slice(1);
		this.info = `The ${this.displyName} Module`;
		this.commands = this.getCommands();
		this.dirname = dirname;
	}

	private async getCommands(): Promise<Collection<string, Command>> {
		const commands: Collection<string, Command> = new Collection();
		const commandFiles = await globPromise(
			`${this.dirname}/commands/*{.ts,.js}`
		);
		commandFiles.forEach(async (file: string) => {
			const command: Command = await import(file);
			commands.set(command.name, command);
		});
		return commands;
	}
}

export { BotModule };
