/**
 * Sets up the MOdule Guild Schema Model for the database
 * The ModGuild Model nests different schemsa for modules and commands.
 * Each Module has a collection of commands.
 * Modules and Commands can both be enabled and disabled by server owners.
 */

import { Document, model, Schema } from 'mongoose';

/**
 * Interface for the ModGuild Schema
 * Has a guildId and a collection of modules.
 * Also has some utility commands for easier access to modules and commands.
 */
export interface DBModGuild extends Document {
	guildId: string;
	modules: DBModule[];
	getModule: (moduleName: string) => DBModule | undefined;
	getCommand: (
		moduleName: string,
		commandName: string
	) => DBCommand | undefined;
	getModuleSettings: (name: string, key: string) => DBSetting | undefined;
	getCommandSettings: (
		moduleName: string,
		commandName: string,
		key: string
	) => DBSetting | undefined;
}

/**
 * Interface for Settings stored in the database
 */
export interface DBSetting {
	key: string;
	value: any;
}

/**
 * Interface for the Module Schema
 */
export interface DBModule {
	name: string;
	commands: DBCommand[];
	enabled: boolean;
	settings: DBSetting[];
}

/**
 * Interface for the Command Schema
 */
export interface DBCommand {
	name: string;
	permissions: DBPermission[];
	enabled: boolean;
	settings: DBSetting[];
	commandId: string;
}

/**
 * Interface for the Permission Schema
 */
export interface DBPermission {
	type: 'USER' | 'ROLE';
	id: string;
	permission: boolean;
}

const SettingSchema = new Schema<DBSetting>({
	key: { type: String, required: true },
	value: { type: Schema.Types.Mixed, required: true },
});

const PermissionSchema = new Schema<DBPermission>({
	type: { type: String, required: true },
	id: { type: String, required: true },
	permission: { type: Boolean, required: true, default: true },
});

const CommandSchema = new Schema<DBCommand>({
	name: { type: String, required: true },
	permissions: { type: [PermissionSchema], required: true },
	enabled: { type: Boolean, required: true, default: false },
	settings: { type: [SettingSchema], required: true, default: [] },
	commandId: String,
});

const ModuleSchema = new Schema<DBModule>({
	name: { type: String, required: true },
	commands: { type: [CommandSchema], required: true },
	enabled: { type: Boolean, required: true, default: false },
	settings: { type: [SettingSchema], required: true, default: [] },
});

const ModGuildSchema = new Schema<DBModGuild>({
	guildId: { type: String, required: true },
	modules: { type: [ModuleSchema], required: true },
});

/**
 *
 * @param name The name of the module to get
 * @returns {DBModule | undefined} The module if it exists, undefined otherwise
 */
ModGuildSchema.methods.getModule = function (
	name: string
): DBModule | undefined {
	return this.modules.find((m) => m.name === name);
};

/**
 *
 * @param moduleName The name of the parrent module for the command
 * @param name The name of the command
 * @returns {DBCommand | undefined} The Command if it exists, undefined otherwise
 */
ModGuildSchema.methods.getCommand = function (
	moduleName: string,
	name: string
): DBCommand | undefined {
	const module = this.getModule(moduleName);
	if (!module) return undefined;
	return module.commands.find((c) => c.name === name);
};

/**
 *
 * @param moduleNmae The name of the module to get settings for
 * @param key The key of the setting to get
 * @returns The setting if it exists, undefined otherwise
 */
ModGuildSchema.methods.getModuleSettings = function (
	moduleNmae: string,
	key: string
): any {
	const module = this.getModule(moduleNmae);
	if (!module) return undefined;
	const setting = module.settings.find((s) => s.key === key);
	if (!setting) return undefined;
	return setting;
};

/**
 *
 * @param moduleName The name of the module to get settings for
 * @param commandName The name of the command to get settings for
 * @param key The key of the setting to get
 * @returns The setting if it exists, undefined otherwise
 */
ModGuildSchema.methods.getCommandSettings = function (
	moduleName: string,
	commandName: string,
	key: string
): any {
	const command = this.getCommand(moduleName, commandName);
	if (!command) return undefined;
	const setting = command.settings.find((s) => s.key === key);
	if (!setting) return undefined;
	return setting;
};

export const Model = model<DBModGuild>('modguild', ModGuildSchema);
export const name: string = 'modguild';
