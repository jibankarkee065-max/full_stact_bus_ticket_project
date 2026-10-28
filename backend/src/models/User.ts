// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

// A "transporter" owns trucks and accepts loads.
// A "shipper" has cargo and books trucks.
export type UserRole = "transporter" | "shipper";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be under 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned by a normal query
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["transporter", "shipper"],
      default: "shipper",
    },
    // Set by the OTP email-verification flow. Existing users default to
    // false, which is what we want -- nobody is verified retroactively.
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;