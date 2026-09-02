import mongoose from "mongoose";
import dns from "dns";

function applyDnsFix() {
  try {
    if (dns.setDefaultResultOrder) {
      dns.setDefaultResultOrder("ipv4first");
    }
    dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
  } catch {
    // Ignore if dns override fails
  }
}

// Apply DNS fix at module load time
applyDnsFix();

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const g = global as typeof globalThis & { _mongoose?: MongooseCache };
if (!g._mongoose) g._mongoose = { conn: null, promise: null };
const cache = g._mongoose;

export async function dbConnect(): Promise<typeof mongoose> {
  applyDnsFix();

  let uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fxpertise";
  // Auto-correct Atlas connection strings if mongodb:// is used instead of mongodb+srv://
  if (uri.startsWith("mongodb://") && uri.includes(".mongodb.net") && !uri.includes(",")) {
    uri = uri.replace("mongodb://", "mongodb+srv://");
  }

  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .catch((err) => {
        cache.promise = null;
        console.error("[dbConnect] MongoDB connection error:", err.message);
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

