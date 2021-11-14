import { randomUUID } from 'crypto';
import {
	ButtonInteraction,
	CacheType,
	Interaction,
	InteractionCollector,
	Message,
	MessageActionRow,
	MessageButton,
	MessageButtonStyleResolvable,
	MessageSelectMenu,
	SelectMenuInteraction,
} from 'discord.js';
import { Bot } from '../client/Client';
import { DBModGuild } from '../database/models/ModGuild';
import { Command } from './Command';
import { BotModule } from './module';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const timeout = 10000;

export class SetupMenu {
	private client: Bot;
	private userMessage: Message;
	private user: string;
	private message: Message;
	private module: BotModule;
	private command: Command;

	private moduleActionRow: MessageActionRow;
	private moduleSettingsButtons: MessageActionRow;
	private commandActionRow: MessageActionRow;
	private commandSettingsButtons: MessageActionRow;

	private timeoutCollector: InteractionCollector<Interaction>;
	private moduleActionRowCollector: InteractionCollector<Interaction>;
	private moduleSettingsButtonsCollector: InteractionCollector<Interaction>;
	private commandActionRowCollector: InteractionCollector<Interaction>;
	private commandSettingsButtonsCollector: InteractionCollector<Interaction>;

	constructor(client: Bot, message: Message) {
		this.client = client;
		this.userMessage = message;
		this.user = message.author.id;
		this.moduleActionRow = this.createModuleActionRow('');
	}

	public async run() {
		this.message = await this.userMessage.reply({
			content: 'BXT SETUP MENU',
			components: [this.moduleActionRow],
		});
		this.initCollectors();
		this.startListenerModuleActionRow();
		this.startModuleEnabledButonListener();
		this.startListenerCommandActionRow();
		this.startListenerCommandEnable();
	}

	private initCollectors() {
		this.moduleActionRowCollector =
			this.message.createMessageComponentCollector({
				filter: this.createFilter({ customId: 'module-select-menu' }),
				idle: timeout,
			});
		this.moduleSettingsButtonsCollector =
			this.message.createMessageComponentCollector({
				filter: this.createFilter({ customId: 'module-enabled-button' }),
				idle: timeout,
			});
		this.commandActionRowCollector =
			this.message.createMessageComponentCollector({
				filter: this.createFilter({ customId: 'command-select-menu' }),
				idle: timeout,
			});
		this.commandSettingsButtonsCollector =
			this.message.createMessageComponentCollector({
				filter: this.createFilter({ customId: 'command-enabled-button' }),
				idle: timeout,
			});
		this.timeoutCollector = this.message.createMessageComponentCollector({
			filter: this.createFilter(),
			idle: timeout,
		});
		this.timeoutCollector.on('collect', async () => {
			this.moduleActionRowCollector.resetTimer();
			this.moduleSettingsButtonsCollector.resetTimer();
			this.commandActionRowCollector.resetTimer();
			this.commandSettingsButtonsCollector.resetTimer();
			this.timeoutCollector.resetTimer();
		});
		this.timeoutCollector.on('end', async () => {
			this.message.edit({
				content: 'BXT SETUP MENU TIMED OUT',
				components: [],
			});
			this.message.edit(
				this.client.messageEmbed(
					{
						title: 'BXT SETUP MENU TIMED OUT',
						description: "THIS MENU WILL AUTOMATICLY DELETE IT'S SELF",
						color: '#FF0000',
					},
					this.message
				)
			);
			await delay(10000);
			this.message.delete();
			this.userMessage.delete();
		});
	}

	private createFilter({ customId = null } = {}) {
		if (customId)
			return (i: ButtonInteraction | SelectMenuInteraction) =>
				i.customId === customId && i.user.id === this.user;
		return (i: ButtonInteraction | SelectMenuInteraction) =>
			i.user.id === this.user;
	}

	private startListenerModuleActionRow() {
		this.moduleActionRowCollector.on(
			'collect',
			async (i: SelectMenuInteraction) => {
				const module = this.client.modules.find((m) => m.name === i.values[0]);
				if (!module) return;
				this.module = module;
				this.moduleActionRow = this.createModuleActionRow(module.name);
				this.commandActionRow = this.createCommandActionRow();
				this.commandSettingsButtons = null;
				this.moduleSettingsButtons = this.createButtonOptions([
					{
						customId: 'module-enabled-button',
						style: (await this.moduleEnabled()) ? 'SUCCESS' : 'DANGER',
						label: (await this.moduleEnabled()) ? 'ENABLED' : 'DISABLED',
						disabled: false,
					},
				]);
				this.message.edit({
					content: 'BXT SETUP MENU',
					components: [
						this.moduleActionRow,
						this.moduleSettingsButtons,
						this.commandActionRow,
					],
				});
				i.deferUpdate();
			}
		);
	}

	private startModuleEnabledButonListener() {
		this.moduleSettingsButtonsCollector.on(
			'collect',
			async (i: ButtonInteraction) => {
				if (await this.moduleEnabled())
					await this.module.disable(this.client, this.userMessage.guild);
				else await this.module.enable(this.client, this.userMessage.guild);

				this.moduleSettingsButtons = this.createButtonOptions([
					{
						customId: 'module-enabled-button',
						style: (await this.moduleEnabled()) ? 'SUCCESS' : 'DANGER',
						label: (await this.moduleEnabled()) ? 'ENABLED' : 'DISABLED',
						disabled: false,
					},
				]);
				if (this.commandSettingsButtons) {
					this.commandSettingsButtons = this.createButtonOptions([
						{
							customId: 'command-enabled-button',
							style: (await this.commandEnabled()) ? 'SUCCESS' : 'DANGER',
							label: (await this.commandEnabled()) ? 'ENABLED' : 'DISABLED',
							disabled: false,
						},
						{
							customId: 'command-permission-button',
							style: 'PRIMARY',
							label: 'PERMISSIONS',
							disabled: false,
						},
					]);
					this.message.edit({
						content: 'BXT SETUP MENU',
						components: [
							this.moduleActionRow,
							this.moduleSettingsButtons,
							this.commandActionRow,
							this.commandSettingsButtons,
						],
					});
				} else {
					this.message.edit({
						content: 'BXT SETUP MENU',
						components: [
							this.moduleActionRow,
							this.moduleSettingsButtons,
							this.commandActionRow,
						],
					});
				}
				i.deferUpdate();
			}
		);
	}

	private startListenerCommandActionRow() {
		this.commandActionRowCollector.on(
			'collect',
			async (i: SelectMenuInteraction) => {
				const command = this.module.commands.find(
					(c) => c.name === i.values[0]
				);
				if (!command) return;
				this.command = command;
				this.commandActionRow = this.createCommandActionRow(command.name);
				this.commandSettingsButtons = this.createButtonOptions([
					{
						customId: 'command-enabled-button',
						style: (await this.commandEnabled()) ? 'SUCCESS' : 'DANGER',
						label: (await this.commandEnabled()) ? 'ENABLED' : 'DISABLED',
						disabled: false,
					},
					{
						customId: 'command-permission-button',
						style: 'PRIMARY',
						label: 'PERMISSIONS',
						disabled: false,
					},
				]);
				this.message.edit({
					content: 'BXT SETUP MENU',
					components: [
						this.moduleActionRow,
						this.moduleSettingsButtons,
						this.commandActionRow,
						this.commandSettingsButtons,
					],
				});
				i.deferUpdate();
			}
		);
	}

	private startListenerCommandEnable() {
		this.commandSettingsButtonsCollector.on(
			'collect',
			async (i: ButtonInteraction) => {
				if (await this.commandEnabled())
					await this.command.disable(this.client, this.userMessage.guild);
				else await this.command.enable(this.client, this.userMessage.guild);

				this.commandSettingsButtons = this.createButtonOptions([
					{
						customId: 'command-enabled-button',
						style: (await this.commandEnabled()) ? 'SUCCESS' : 'DANGER',
						label: (await this.commandEnabled()) ? 'ENABLED' : 'DISABLED',
						disabled: false,
					},
					{
						customId: 'command-permission-button',
						style: 'PRIMARY',
						label: 'PERMISSIONS',
						disabled: false,
					},
				]);
				this.message.edit({
					content: 'BXT SETUP MENU',
					components: [
						this.moduleActionRow,
						this.moduleSettingsButtons,
						this.commandActionRow,
						this.commandSettingsButtons,
					],
				});
				i.deferUpdate();
			}
		);
	}

	private createModuleActionRow(
		defaultOption: string | null = null
	): MessageActionRow {
		const selectMenu = new MessageSelectMenu()
			.setCustomId('module-select-menu')
			.setPlaceholder('Please Select a Module');
		this.client.modules.forEach((module) => {
			selectMenu.addOptions([
				{
					label: module.displyName,
					value: module.name,
					description: module.info,
				},
			]);
		});
		if (defaultOption) {
			selectMenu.options.forEach((option) => {
				if (option.value === defaultOption) {
					option.default = true;
				}
			});
		}
		return new MessageActionRow().addComponents(selectMenu);
	}

	private createButtonOptions(
		buttons: {
			customId: string;
			style: MessageButtonStyleResolvable;
			label: string;
			disabled: boolean;
		}[]
	) {
		const actionRow = new MessageActionRow();
		buttons.forEach((button) => {
			actionRow.addComponents(
				new MessageButton()
					.setCustomId(button.customId)
					.setStyle(button.style)
					.setLabel(button.label)
					.setDisabled(button.disabled)
			);
		});
		for (let i = 0; i < 5 - buttons.length; i++) {
			actionRow.addComponents(
				new MessageButton()
					.setDisabled(true)
					.setStyle('SECONDARY')
					.setLabel('    ')
					.setCustomId(`${randomUUID()}`)
			);
		}

		return actionRow;
	}

	private async moduleEnabled(): Promise<boolean> {
		const ModGuildSchema = this.client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: this.userMessage.guild.id,
		});
		if (!ModGuild) return false;
		const module = ModGuild.getModule(this.module.name);
		if (!module) return false;
		return module.enabled;
	}

	private async commandEnabled(): Promise<boolean> {
		const ModGuildSchema = this.client.db.load('modguild');
		const ModGuild: DBModGuild = await ModGuildSchema.findOne({
			guildId: this.userMessage.guild.id,
		});
		if (!ModGuild) return false;
		const command = ModGuild.getCommand(this.module.name, this.command.name);
		if (!command) return false;
		return command.enabled;
	}

	private createCommandActionRow(
		defaultOption: string | null = null
	): MessageActionRow {
		const selectMenu = new MessageSelectMenu()
			.setCustomId('command-select-menu')
			.setPlaceholder('Please Select a Command');
		this.client.modules.get(this.module.name).commands.forEach((command) => {
			selectMenu.addOptions([
				{
					label: command.displayName,
					value: command.name,
					description: command.info,
				},
			]);
		});
		if (defaultOption) {
			selectMenu.options.forEach((option) => {
				if (option.value === defaultOption) {
					option.default = true;
				}
			});
		}
		return new MessageActionRow().addComponents(selectMenu);
	}
}
