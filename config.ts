import * as dotenv from 'dotenv';

dotenv.config();

export default {
  mongoURI: process.env.MONGODB_URI
}