import mongoose from 'mongoose';
import config from '../config/config.js';
import MediaModel from './Schemas/Media.js';
import UserFolderModel from './Schemas/UserFolder.js';



let isReconnecting = false;
const reconnectInterval = 5000; // 5 seconds


const mongoConfig = {
  retryWrites: true,
  minPoolSize: 2,
}

export const disconnectFromMongoDB = async () => {
  try {
    await mongoose.disconnect();
  }
  catch (err: any) {
    console.log(`Failure to disconnect from MongoDB: ${err.message}`);
  }
};

export const connectToMongoDB = async (): Promise<void> => {
    try {
        await mongoose.connect(config.mongoURI, mongoConfig);


        // mongoose.set('debug', true);

        console.log('Connected to MongoDB!');

        // Handle disconnections and reconnections
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected!');

            if (!isReconnecting) {
                isReconnecting = true;
                console.log('Attempting to reconnect...');
            
                setTimeout(() => {
                  mongoose.connect(config.mongoURI, mongoConfig)
                    .then(() => {
                      console.log('Successfully reconnected to MongoDB');
                      isReconnecting = false;
                    })
                    .catch(error => {
                      console.error('Reconnection failed:', error);
                      isReconnecting = false; // Reset to allow future reconnection attempts
                    });
                }, reconnectInterval);
              }
            // You might want to implement reconnection logic here.
            // Be careful to avoid infinite reconnect loops.
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected!');
        });

        // ... rest of your server startup code (e.g., Express app setup)
    } catch (error: any) {
        console.error('Error connecting to MongoDB:', error);
        
        console.error("Error processing:", error.message);
        if (error.name === 'MongoNetworkError' && error.cause) {
          console.error("Root cause:", error.cause); // Log the cause
        }
        // Exit the application if the initial connection fails
        process.exit(1);
    }
}

const models = {
  media: MediaModel,
  userFolder: UserFolderModel
}

export default models;