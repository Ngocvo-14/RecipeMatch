import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  recipeId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

const HistorySchema = new Schema<IHistory>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe', required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Fast lookups by user sorted by time
HistorySchema.index({ userId: 1, viewedAt: -1 });
// Upsert key — one entry per user+recipe
HistorySchema.index({ userId: 1, recipeId: 1 }, { unique: true });

const History: Model<IHistory> =
  mongoose.models.History || mongoose.model<IHistory>('History', HistorySchema);

export default History;
