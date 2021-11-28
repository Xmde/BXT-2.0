// Global Command Setup.
// Sets up the database for the guild

import { randomUUID } from 'crypto';
import {
	ApplicationCommand,
	ButtonInteraction,
	Collection as DiscordCollection,
	Interaction,
	InteractionCollector,
	Message,
	MessageActionRow,
	MessageButton,
	MessageButtonStyleResolvable,
	MessageSelectMenu,
	SelectMenuInteraction,
} from 'discord.js';
import { Collection } from 'mongoose';
import { Bot } from '../client/Client';
import {
	DBCommand,
	DBModGuild,
	DBPermission,
} from '../database/models/ModGuild';
import { Command } from '../interfaces/Command';
import { BotModule } from '../interfaces/Module';
import { GlobalRunFunction } from '../interfaces/Command';
import { setUpGuild } from '../events/Guild Events/GuildJoin';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const timeout = 45000;

export const name: string = 'setup';

export const run: GlobalRunFunction = async (client, message, _) => {
	if (message.guild.ownerId !== message.author.id) {
		message.channel.send(
			client.messageEmbed(
				{ description: 'You must be the Guild Owner to run this Command!' },
				message
			)
		);
	}
	setUpGuild(client, message.guildId);
	const setupMenu = SetupMenu.getInstance(client, message);
	if (setupMenu) setupMenu.run();
	else {
		message.channel
			.send(
				client.messageEmbed(
					{
						description: 'A Setup Menu is already open for this Server!',
						color: '#ff0000',
					},
					message
				)
			)
			.then(async (msg: Message) => {
				await delay(5000);
				msg.delete();
			});
		message.delete();
	}
};

class SetupMenu {
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
	private commandSettingsPermissionCollector: InteractionCollector<Interaction>;
	private permissionSelectionMenuCollector: InteractionCollector<Interaction>;

	private gracefullExit: boolean = false;

	private optionCommand: ApplicationCommand;

	private static instances: DiscordCollection<string, SetupMenu>;

	public static getInstance(client: Bot, message: Message) {
		if (!this.instances) this.instances = new DiscordCollection();
		const instance = this.instances.get(message.guildId);
		if (instance) return null;
		const newInstance = new SetupMenu(client, message);
		this.instances.set(message.guildId, newInstance);
		return newInstance;
	}

	private constructor(client: Bot, message: Message) {
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
		this.startListenerCommandPermission();
		this.startListenerPermissionSelectMenu();
		this.startListenerModuleSettingsButtons();
		this.startListenerCommandSettingsButtons();
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
		this.commandSettingsPermissionCollector =
			this.message.createMessageComponentCollector({
				filter: this.createFilter({ customId: 'command-permission-button' }),
				idle: timeout,
			});
		this.permissionSelectionMenuCollector =
			this.message.createMessageComponentCollector({
				filter: this.createFilter({ customId: 'permission-select-menu' }),
				idle: timeout,
			});
		this.timeoutCollector.on('collect', async () => {
			this.moduleActionRowCollector.resetTimer();
			this.moduleSettingsButtonsCollector.resetTimer();
			this.commandActionRowCollector.resetTimer();
			this.commandSettingsButtonsCollector.resetTimer();
			this.timeoutCollector.resetTimer();
			this.commandSettingsPermissionCollector.resetTimer();
			this.permissionSelectionMenuCollector.resetTimer();
		});
		this.timeoutCollector.on('end', async () => {
			SetupMenu.instances.delete(this.message.guildId);
			this.moduleActionRowCollector.stop();
			this.moduleSettingsButtonsCollector.stop();
			this.commandActionRowCollector.stop();
			this.commandSettingsButtonsCollector.stop();
			this.timeoutCollector.stop();
			this.commandSettingsPermissionCollector.stop();
			this.permissionSelectionMenuCollector.stop();

			if (this.optionCommand instanceof ApplicationCommand)
				this.optionCommand.delete();
			if (this.gracefullExit) return;
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
				this.moduleSettingsButtons = this.createButtonOptions(
					this.module.getDefaultSettings().reduce(
						(acc, _, key) => {
							acc.push({
								customId: `module-option-${key}`,
								style: 'SECONDARY',
								label: key.toUpperCase(),
								disabled: false,
							});
							return acc;
						},
						[
							{
								customId: 'module-enabled-button',
								style:
									((await this.moduleEnabled()) ? 'SUCCESS' : 'DANGER') ||
									'SECONDARY',
								label: (await this.moduleEnabled()) ? 'ENABLED' : 'DISABLED',
								disabled: false,
							},
						]
					)
				);
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

				this.moduleSettingsButtons = this.createButtonOptions(
					this.module.getDefaultSettings().reduce(
						(acc, _, key) => {
							acc.push({
								customId: `module-option-${key}`,
								style: 'SECONDARY',
								label: key.toUpperCase(),
								disabled: false,
							});
							return acc;
						},
						[
							{
								customId: 'module-enabled-button',
								style:
									((await this.moduleEnabled()) ? 'SUCCESS' : 'DANGER') ||
									'SECONDARY',
								label: (await this.moduleEnabled()) ? 'ENABLED' : 'DISABLED',
								disabled: false,
							},
						]
					)
				);
				if (this.commandSettingsButtons) {
					this.commandSettingsButtons = this.createButtonOptions(
						this.command.getDefaultSettings().reduce(
							(acc, _, key) => {
								acc.push({
									customId: `command-option-${key}`,
									style: 'SECONDARY',
									label: key.toUpperCase(),
									disabled: false,
								});
								return acc;
							},
							[
								{
									customId: 'command-enabled-button',
									style: (await this.commandEnabled())
										? 'SUCCESS'
										: 'DANGER' || 'SECONDARY',
									label: (await this.commandEnabled()) ? 'ENABLED' : 'DISABLED',
									disabled: false,
								},
								{
									customId: 'command-permission-button',
									style: 'PRIMARY',
									label: 'PERMISSIONS',
									disabled: false,
								},
							]
						)
					);
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
				this.commandSettingsButtons = this.createButtonOptions(
					this.command.getDefaultSettings().reduce(
						(acc, _, key) => {
							acc.push({
								customId: `command-option-${key}`,
								style: 'SECONDARY',
								label: key.toUpperCase(),
								disabled: false,
							});
							return acc;
						},
						[
							{
								customId: 'command-enabled-button',
								style: (await this.commandEnabled())
									? 'SUCCESS'
									: 'DANGER' || 'SECONDARY',
								label: (await this.commandEnabled()) ? 'ENABLED' : 'DISABLED',
								disabled: false,
							},
							{
								customId: 'command-permission-button',
								style: 'PRIMARY',
								label: 'PERMISSIONS',
								disabled: false,
							},
						]
					)
				);
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
				if (!(await this.moduleEnabled())) return i.deferUpdate();
				if (await this.commandEnabled())
					await this.command.disable(this.client, this.userMessage.guild);
				else await this.command.enable(this.client, this.userMessage.guild);

				this.commandSettingsButtons = this.createButtonOptions(
					this.command.getDefaultSettings().reduce(
						(acc, _, key) => {
							acc.push({
								customId: `command-option-${key}`,
								style: 'SECONDARY',
								label: key.toUpperCase(),
								disabled: false,
							});
							return acc;
						},
						[
							{
								customId: 'command-enabled-button',
								style: (await this.commandEnabled())
									? 'SUCCESS'
									: 'DANGER' || 'SECONDARY',
								label: (await this.commandEnabled()) ? 'ENABLED' : 'DISABLED',
								disabled: false,
							},
							{
								customId: 'command-permission-button',
								style: 'PRIMARY',
								label: 'PERMISSIONS',
								disabled: false,
							},
						]
					)
				);
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

	private startListenerCommandPermission() {
		this.commandSettingsPermissionCollector.on(
			'collect',
			async (i: ButtonInteraction) => {
				i.deferUpdate();
				this.message.edit({
					components: [await this.generatePermissionSelection()],
					content: 'BXT SETUP MENU',
				});
			}
		);
	}

	private startListenerPermissionSelectMenu() {
		this.permissionSelectionMenuCollector.on(
			'collect',
			async (i: SelectMenuInteraction) => {
				let perms: DBPermission[] = [
					{
						type: 'USER',
						id: '125270885782388736',
						permission: true,
					},
				];
				i.deferUpdate();
				this.message.edit(
					this.client.messageEmbed(
						{ description: 'PERMISSIONS UPDATED SECUSFULLY', color: 'GREEN' },
						this.userMessage
					)
				);
				const ModGuildSchema = this.client.db.load('modguild');
				const ModGuild: DBModGuild = await ModGuildSchema.findOne({
					guildId: this.message.guild.id,
				});
				i.values.forEach((v) => {
					perms.push({
						type: 'ROLE',
						id: v,
						permission: true,
					});
				});

				ModGuild.getCommand(this.module.name, this.command.name).permissions =
					perms;
				await ModGuild.save();
				this.command.updatePermissions(this.client, this.message.guild);
				await delay(5000);
				this.moduleActionRowCollector.resetTimer();
				this.moduleSettingsButtonsCollector.resetTimer();
				this.commandActionRowCollector.resetTimer();
				this.commandSettingsButtonsCollector.resetTimer();
				this.timeoutCollector.resetTimer();
				this.commandSettingsPermissionCollector.resetTimer();
				this.permissionSelectionMenuCollector.resetTimer();
				this.message.edit({
					content: 'BXT SETUP MENU',
					components: [
						this.moduleActionRow,
						this.moduleSettingsButtons,
						this.commandActionRow,
						this.commandSettingsButtons,
					],
					embeds: [],
				});
			}
		);
	}

	private startListenerModuleSettingsButtons() {
		this.timeoutCollector.on('collect', async (i: Interaction) => {
			if (!(i instanceof ButtonInteraction)) return;
			if (!i.customId.includes('module-option')) return;
			const option = i.customId.split('-')[2];
			this.optionCommand = await i.guild.commands.create(
				this.module.getSettingCommands().get(option).toJSON()
			);
			this.optionCommand.permissions.add({
				permissions: [
					{
						type: 'USER',
						id: i.user.id,
						permission: true,
					},
				],
			});
			i.update({
				components: [],
				content: 'BXT SETUP MENU',
				embeds: [
					this.client.embed(
						{
							description:
								'Please run /setting to edit the setting. You have 30 seconds',
						},
						i
					),
				],
			});
			this.commandModuleListener();
		});
	}

	private startListenerCommandSettingsButtons() {
		this.timeoutCollector.on('collect', async (i: Interaction) => {
			if (!(i instanceof ButtonInteraction)) return;
			if (!i.customId.includes('command-option')) return;
			const option = i.customId.split('-')[2];
			this.optionCommand = await i.guild.commands.create(
				this.command.getSettingCommands().get(option).toJSON()
			);
			this.optionCommand.permissions.add({
				permissions: [
					{
						type: 'USER',
						id: i.user.id,
						permission: true,
					},
				],
			});
			i.update({
				components: [],
				content: 'BXT SETUP MENU',
				embeds: [
					this.client.embed(
						{
							description:
								'Please run /setting to edit the setting. You have 30 seconds',
						},
						i
					),
				],
			});
			this.commandCommandListener();
		});
	}

	private commandModuleListener() {
		this.client.once('interactionCreate', async (i: Interaction) => {
			if (i.isCommand() && i.commandName === 'setting') {
				this.timeoutCollector.emit('collect', i);

				const ModGuildSchema = this.client.db.load('modguild');
				const ModGuild: DBModGuild = await ModGuildSchema.findOne({
					guildId: i.guildId,
				});
				if (
					ModGuild.getModule(this.module.name).settings.some(
						(s) => s.key === i.options.data[0].name
					)
				)
					ModGuild.getModule(this.module.name).settings.find(
						(s) => s.key === i.options.data[0].name
					).value = i.options.data[0];
				else
					ModGuild.getModule(this.module.name).settings.push({
						key: i.options.data[0].name,
						value: i.options.data[0],
					});
				await ModGuild.save();
				i.reply({
					content: 'Setting updated Successfully',
				});
				await delay(1000);
				i.deleteReply();
				this.optionCommand.delete();
				this.optionCommand = null;
				if (this.commandSettingsButtons) {
					this.message.edit({
						content: 'BXT SETUP MENU',
						components: [
							this.moduleActionRow,
							this.moduleSettingsButtons,
							this.commandActionRow,
							this.commandSettingsButtons,
						],
						embeds: [],
					});
				} else {
					this.message.edit({
						content: 'BXT SETUP MENU',
						components: [
							this.moduleActionRow,
							this.moduleSettingsButtons,
							this.commandActionRow,
						],
						embeds: [],
					});
				}
			}
		});
	}

	private commandCommandListener() {
		this.client.once('interactionCreate', async (i: Interaction) => {
			if (i.isCommand() && i.commandName === 'setting') {
				this.timeoutCollector.emit('collect', i);

				const ModGuildSchema = this.client.db.load('modguild');
				const ModGuild: DBModGuild = await ModGuildSchema.findOne({
					guildId: i.guildId,
				});
				if (
					ModGuild.getCommand(
						this.module.name,
						this.command.name
					).settings.some((s) => s.key === i.options.data[0].name)
				)
					ModGuild.getCommand(
						this.module.name,
						this.command.name
					).settings.find((s) => s.key === i.options.data[0].name).value =
						i.options.data[0];
				else
					ModGuild.getCommand(
						this.module.name,
						this.command.name
					).settings.push({
						key: i.options.data[0].name,
						value: i.options.data[0],
					});
				await ModGuild.save();
				i.reply({
					content: 'Setting updated Successfully',
				});
				await delay(1000);
				i.deleteReply();
				this.optionCommand.delete();
				this.optionCommand = null;
				this.message.edit({
					content: 'BXT SETUP MENU',
					components: [
						this.moduleActionRow,
						this.moduleSettingsButtons,
						this.commandActionRow,
						this.commandSettingsButtons,
					],
					embeds: [],
				});
			}
		});
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

	private async generatePermissionSelection(): Promise<MessageActionRow> {
		const ModGuildSchema = this.client.db.load('modguild');
		const ModGuild = await ModGuildSchema.findOne({
			guildId: this.message.guild.id,
		});
		const command: DBCommand = ModGuild.getCommand(
			this.module.name,
			this.command.name
		);
		const roles = this.message.guild?.roles.cache;
		const PermissionSelectMenu = new MessageSelectMenu()
			.setCustomId('permission-select-menu')
			.setPlaceholder('Select Roles')
			.setMinValues(1)
			.setMaxValues(roles.size);
		roles.forEach((role) => {
			const enabled = command.permissions.some((permission) => {
				return permission.id === role.id;
			});
			PermissionSelectMenu.addOptions([
				{
					label: role.name,
					value: role.id,
					default: enabled,
				},
			]);
		});
		return new MessageActionRow().addComponents(PermissionSelectMenu);
	}
}
