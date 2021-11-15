import { Document, model, Schema } from 'mongoose';

// Sets up the Error Schema Model for the database
// Is used to store errors that occured in the bot.

export interface DBError extends Document {
	timestamp: Date;
	error: any;
}

const ErrorSchema = new Schema<DBError>({
	timestamp: { type: Date, default: new Date(Date.now()) },
	error: { type: Schema.Types.Mixed, required: true },
});

export const Model = model<DBError>('error', ErrorSchema);
export const name: string = 'error';
