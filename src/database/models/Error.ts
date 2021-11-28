/**
 * Error Schema used for storing error logs in the database
 */

import { Document, model, Schema } from 'mongoose';

/**
 * Error interface used for storing error logs in the database
 */
export interface DBError extends Document {
	timestamp: Date;
	error: any;
}

/**
 * Error schema used for storing error logs in the database
 */
const ErrorSchema = new Schema<DBError>({
	timestamp: { type: Date, default: new Date(Date.now()) },
	error: { type: Schema.Types.Mixed, required: true },
});

export const Model = model<DBError>('error', ErrorSchema);
export const name: string = 'error';
