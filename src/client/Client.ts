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

/**
 * Custom class that entends the default discord.js Client
 * Is a singleton class and only has one instance.
 */
class Bot extends Client {
	private static instance: Bot;
	private rateLimits: { global: boolean; route: string }[] = [];

	public logger: Consola = consola;
	public events: Collection<string, Event> = new Collection();
	public modules: Collection<string, BotModule> = new Collection();
	public globalCommands: Collection<string, GlobalCommand> = new Collection();
	public db: Database;
	public config: Config;

	public static delay = async (ms: number) =>
		new Promise((resolve) => setTimeout(resolve, ms));

	/**
	 * The bot class is a singleton class.
	 * This method returns the instance of the bot class
	 * @param config The config file. This is only used once to start the bot. If the bot is already running, this parameter is ignored.
	 * @returns The instance of the bot
	 */
	public static getInstance(config: Config = null): Bot {
		if (!this.instance) {
			this.instance = new Bot(config);
		}
		return this.instance;
	}

	//Sets up the discord bot
	private constructor(config: Config) {
		if (!config) throw new Error('No config file provided');
		super({
			intents: [
				Intents.FLAGS.GUILDS,
				Intents.FLAGS.GUILD_VOICE_STATES,
				Intents.FLAGS.GUILD_MESSAGES,
				Intents.FLAGS.DIRECT_MESSAGES,
			],
			partials: ['CHANNEL'],
		});
		this.config = config;
		this.db = new Database(this.config.mongoURI);
		this.start();
		this.login(this.config.token);
	}

	/**
	 * Starts the bot and inits the global command and event handler
	 * Also inits the database
	 * @param config The config file
	 */
	private async start(): Promise<void> {
		// Sets up the database
		await this.db.init();

		// Sets up the logger
		this.initLogger();

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

	/**
	 * Makes an embed with a default layout
	 * @param options The options for the embed
	 * @param message The message that the embed is replying to.
	 * @returns {MessageEmbed} A message Embed object
	 */
	public static embed(
		options: MessageEmbedOptions,
		message: Message | Interaction
	): MessageEmbed {
		if (message instanceof Interaction) {
			return new MessageEmbed({ color: 'RANDOM', ...options })
				.setFooter(
					`${message.user.tag} | ${
						Bot.getInstance().user.username
					} | Developed by Xmde#1337`,
					message.user.displayAvatarURL({ format: 'png', dynamic: true })
				)
				.setTimestamp(Date.now());
		}
		if (message instanceof Message) {
			return new MessageEmbed({ color: 'RANDOM', ...options })
				.setFooter(
					`${message.author.tag} | ${
						Bot.getInstance().user.username
					} | Developed by Xmde#1337`,
					message.author.displayAvatarURL({ format: 'png', dynamic: true })
				)
				.setTimestamp(Date.now());
		}
	}

	/**
	 *
	 * @param options The options for the embed
	 * @param message The message that the embed is replying to
	 * @returns A message Embed object which can be passed straight into channel.send
	 */
	public static messageEmbed(
		options: MessageEmbedOptions,
		message: Message
	): MessageOptions {
		return { embeds: [Bot.embed(options, message)], components: [] };
	}

	/**
	 * Inits the global logger/error handler
	 * Stores all errors in the database
	 */
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

	public isRateLimited(route: string = ''): boolean {
		const global = route === '' ? true : false;
		if (global) {
			return this.rateLimits.some((val) => val.global === true);
		}
		return (
			this.rateLimits.some((val) => val.route === route) ||
			this.rateLimits.some((val) => val.global === true)
		);
	}

	public rateLimit(timeout: number, route: string = ''): void {
		const global = route === '' ? true : false;
		this.rateLimits.push({ global, route });
		this.logger.trace(
			`Rate Limit Added ${timeout}ms | ${route} | ${JSON.stringify(
				this.rateLimits
			)}`
		);
		setTimeout(() => {
			this.rateLimits = this.rateLimits.filter(
				(value) => !(value.global === global && value.route === route)
			);
			this.logger.trace(
				`Rate Limit Removed | ${route} | ${JSON.stringify(this.rateLimits)}`
			);
		}, timeout);
	}
}

export { Bot };
