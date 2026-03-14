import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  preferences: {
    diet?: string;
    equipment?: string[];
  };
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: false, unique: true, sparse: true, trim: true, minlength: 3, maxlength: 20 },
    passwordHash: { type: String, required: true },
    preferences: {
      diet: { type: String, default: '' },
      equipment: [{ type: String }],
    },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
