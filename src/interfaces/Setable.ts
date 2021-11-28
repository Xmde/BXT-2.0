import { SlashCommandBuilder } from '@discordjs/builders';
import { Collection } from 'discord.js';

/**
 * Allows things have settings/options in the database
 * Used by Command and Modules.
 */
export abstract class Setable {
	private defaultSettings: Collection<string, any> = new Collection();
	private settingCommands: Collection<string, SlashCommandBuilder> =
		new Collection();

	protected addSetting(key: string, defualt: any) {
		this.defaultSettings.set(key, defualt);
		this.settingCommands.set(
			key,
			new SlashCommandBuilder()
				.setName('setting')
				.setDescription('Change a Setting')
				.setDefaultPermission(false)
		);
		return this.settingCommands.get(key);
	}

	public getDefaultSettings() {
		return this.defaultSettings;
	}

	public getSettingCommands() {
		return this.settingCommands;
	}

	public constructor() {}
}
