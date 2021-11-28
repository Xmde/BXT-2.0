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
	Interaction,
} from 'discord.js';
import glob from 'glob';
import { promisify } from 'util';
import { Event } from '../interfaces/Event';
import { Config } from '../interfaces/config';
import { GlobalCommand } from '../interfaces/Command';
import { Database } from '../database/Database';
import { BotModule } from '../interfaces/Module';

// Allows to use glob with async/await
const globPromise = promisify(glob);

class Bot extends Client {
	public logger: Consola = consola;
	public events: Collection<string, Event> = new Collection();
	public modules: Collection<string, BotModule> = new Collection();
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
		this.initLogger();
		this.config = config;
		this.login(this.config.token);

		// Sets up the database
		this.db = new Database(this.config.mongoURI);
		await this.db.init();

		// Sets the the global command handler
		// Global commands include bxt!setup
		// Global commands are NOT modulized commands
		const globalCommands: string[] = await globPromise(
			`${__dirname}/../global commands/*{.ts,.js}`
		);
		this.logger.info(`Loading ${globalCommands.length} global commands`);
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
		// Sets up Modules and adds them to the modules collection
		const moduleFiles: string[] = await globPromise(
			`${__dirname}/../modules/*/*Module{.js,.ts}`
		);
		moduleFiles.forEach(async (value: string) => {
			const module: BotModule = new (await import(value)).default(this);
			this.modules.set(module.name, module);
		});
	}

	// Function to allow easier embeding messages.
	public embed(
		options: MessageEmbedOptions,
		message: Message | Interaction
	): MessageEmbed {
		if (message instanceof Interaction) {
			return new MessageEmbed({ color: 'RANDOM', ...options })
				.setFooter(
					`${message.user.tag} | ${this.user.username} | Developed by Xmde#1337`,
					message.user.displayAvatarURL({ format: 'png', dynamic: true })
				)
				.setTimestamp(Date.now());
		}
		if (message instanceof Message) {
			return new MessageEmbed({ color: 'RANDOM', ...options })
				.setFooter(
					`${message.author.tag} | ${this.user.username} | Developed by Xmde#1337`,
					message.author.displayAvatarURL({ format: 'png', dynamic: true })
				)
				.setTimestamp(Date.now());
		}
	}

	// Function that allows it to be inserted directly into a message
	// Ex. channel.send(messageEmbed({ description: 'Test' }, message))
	public messageEmbed(
		options: MessageEmbedOptions,
		message: Message
	): MessageOptions {
		return { embeds: [this.embed(options, message)], components: [] };
	}

	private initLogger(): void {
		process.on('uncaughtException', (error) => {
			const ErrorSchema = this.db.load('error');
			ErrorSchema.create({ error });
			this.logger.error(error);
		});
		process.on('unhandledRejection', (error) => {
			throw error;
		});
	}
}

export { Bot };
