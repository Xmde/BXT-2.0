// Interface for modules
import { Collection } from 'discord.js';
import { Command } from './Command';

export interface Module {
	name: string;
	displyName: string;
	info: string;
	commands: Promise<Collection<string, Command>>;
}
