// File for containing the Command interfaces
// Contains both the normal Command
// and Global Command interfaces
import { CommandInteraction, Message } from 'discord.js';
import { BotModule } from '../modules/module';
import { Bot } from '../client/Client';

export interface RunFunction {
	(client: Bot, message: CommandInteraction): Promise<unknown>;
}

export interface Command {
	name: string;
	module: BotModule;
	run: RunFunction;
}

export interface GlobalRunFunction {
	(client: Bot, message: Message, args: string[]): Promise<unknown>;
}

export interface GlobalCommand {
	name: string;
	run: GlobalRunFunction;
}
