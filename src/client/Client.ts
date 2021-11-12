import consola, { Consola } from 'consola';
import {
	Client,
	MessageEmbedOptions,
	Message,
	Intents,
	Collection,
	MessageEmbed,
	MessageOptions,
	Guild,
} from 'discord.js';
import glob from 'glob';
import { promisify } from 'util';
import { Event } from '../interfaces/Event';
import { Config } from '../interfaces/config';
import { GlobalCommand } from '../interfaces/Command';
import { Database } from '../database/Database';

// Allows to use glob with async/await
const globPromise = promisify(glob);

class Bot extends Client {
	public logger: Consola = consola;
	public events: Collection<string, Event> = new Collection();
	public globalCommands: Collection<string, GlobalCommand> = new Collection();
	public db: Database;
	public config: Config;

	//Sets up the discord bot
	public constructor() {
		super({
			intents: [
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_VOICE_STATES,
				Intents.FLAGS.GUILD_MESSAGES,
			],
		});
	}

	// Function that starts the bot.
	// Also inits the global command and event handler
	// As well as the database
	public async start(config: Config): Promise<void> {
		this.config = config;
		this.login(this.config.token);

		// Sets the the global command handler
		// Global commands include bxt!setup
		// Global commands are NOT modulized commands
		const globalCommands: string[] = await globPromise(
			`${__dirname}/../global commands/*{.ts,.js}`
		);
		globalCommands.forEach(async (value: string) => {
			const file: GlobalCommand = await import(value);
			this.globalCommands.set(file.name, file);
			this.logger.trace(`Registered new Global Command | ${file.name}`);
		});

		// Sets up the event handler
		// Events are stored in two different folders.
		// One for Client Events and one for Guild Events
		const eventFiles: string[] = await globPromise(
			`${__dirname}/../events/**/*{.ts,.js}`
		);
		eventFiles.forEach(async (value: string) => {
			const file: Event = await import(value);
			this.events.set(file.name, file);
			if (file.once) this.once(file.name, file.run.bind(null, this));
			else this.on(file.name, file.run.bind(null, this));
			this.logger.trace(
				`Registered new Event | ${file.name} | Once?${file.once}`
			);
		});

		this.db = new Database(this.config.mongoURI);
	}

	// Function to allow easier embeding messages.
	public embed(options: MessageEmbedOptions, message: Message): MessageEmbed {
		return new MessageEmbed({ ...options, color: 'RANDOM' }).setFooter(
			`${message.author.tag} | ${this.user.username} | Developed by Xmde#1337`,
			message.author.displayAvatarURL({ format: 'png', dynamic: true })
		);
	}

	// Function that allows it to be inserted directly into a message
	// Ex. channel.send(messageEmbed({ description: 'Test' }, message))
	public messageEmbed(
		options: MessageEmbedOptions,
		message: Message
	): MessageOptions {
		return { embeds: [this.embed(options, message)] };
	}
}

export { Bot };
