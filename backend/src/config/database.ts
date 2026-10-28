// src/config/database.ts
import mongoose from "mongoose";


const connectDB = async (): Promise<void> => {
  try {
    const mongoURI: string = process.env.MONGODB_URI || "";

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(mongoURI);
    console.log("MongoDB connected successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("MongoDB connection failed:", message);
    process.exit(1);
  }
};

export default connectDB;