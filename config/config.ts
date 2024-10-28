import * as dotenv from 'dotenv';

dotenv.config();


interface Config {
  mongoURI: string;
  clerkSecretKey: string;
  PORT: number;
}

const config: Config = {
  mongoURI: process.env.MONGODB_URI || '',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
  PORT: parseInt(process.env.PORT || '8080', 10)
}

export default config;