import { Document, model, Schema } from 'mongoose';

// Sets up the Module Guild Schema Model for the database
// The ModGuild Model nestes diffrent schemas for modules and commands.

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

export interface DBSetting {
	key: string;
	value: any;
}
export interface DBModule {
	name: string;
	commands: DBCommand[];
	enabled: boolean;
	settings: DBSetting[];
}

export interface DBCommand {
	name: string;
	permissions: DBPermission[];
	enabled: boolean;
	settings: DBSetting[];
	commandId: string;
}

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

ModGuildSchema.methods.getModule = function (
	name: string
): DBModule | undefined {
	return this.modules.find((m) => m.name === name);
};

ModGuildSchema.methods.getCommand = function (
	moduleName: string,
	name: string
): DBCommand | undefined {
	const module = this.getModule(moduleName);
	if (!module) return undefined;
	return module.commands.find((c) => c.name === name);
};

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
