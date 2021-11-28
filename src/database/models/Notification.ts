import { Document, model, Schema } from 'mongoose';

// Sets up the Error Schema Model for the database
// Is used to store errors that occured in the bot.

export interface DBNotification extends Document {
	channel: string;
	platform: 'TWITCH' | 'YOUTUBE';
	guilds: string[];
	removeGuild: (guildId: string) => Promise<void>;
	addGuild: (guildId: string) => Promise<void>;
}

const NotificationSchema = new Schema<DBNotification>({
	channel: { type: String, required: true },
	platform: { type: String, required: true, enum: ['TWITCH', 'YOUTUBE'] },
	guilds: { type: [String], required: true, default: [] },
});

NotificationSchema.methods.removeGuild = async function (guildId: string) {
	this.guilds = this.guilds.filter((guild) => guild !== guildId);
	await this.save();
	if (this.guilds.length === 0) await this.remove();
};

NotificationSchema.methods.addGuild = async function (guildId: string) {
	if (this.guilds.includes(guildId)) return;
	this.guilds.push(guildId);
	await this.save();
};

export const Model = model<DBNotification>('notification', NotificationSchema);
export const name: string = 'notification';
