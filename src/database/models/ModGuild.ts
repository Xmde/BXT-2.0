import { model, Schema } from 'mongoose';

// Sets up the Module Guild Schema Model for the database
// The ModGuild Model nestes diffrent schemas for modules and commands.

interface ModGuild {
	guildId: string;
	modules: [Module];
}

interface Module {
	name: string;
	commands: [Command];
	enabled: boolean;
}

interface Command {
	name: string;
	permission: string;
	enabled: boolean;
}

const CommandSchema = new Schema<Command>({
	name: { type: String, required: true },
	permission: { type: String, required: true, default: '' },
	enabled: { type: Boolean, required: true, default: false },
});

const ModuleSchema = new Schema<Module>({
	name: { type: String, required: true },
	commands: { type: [CommandSchema], required: true },
	enabled: { type: Boolean, required: true, default: false },
});

const ModGuildSchema = new Schema<ModGuild>({
	guildId: { type: String, required: true },
	modules: { type: [ModuleSchema], required: true },
});

export const Model = model<ModGuild>('modguild', ModGuildSchema);
export const name: string = 'modguild';
