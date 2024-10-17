import * as dotenv from 'dotenv';

dotenv.config();


interface Config {
  mongoURI: string;
  PORT: number;
}

const config: Config = {
  mongoURI: process.env.MONGODB_URI || '',
  PORT: parseInt(process.env.PORT || '8080', 10)
}

export default config;