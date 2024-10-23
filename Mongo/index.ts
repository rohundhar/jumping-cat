import mongoose from 'mongoose';
import config from '../config/config.js';
import MediaModel from './Schemas/Media.js';



let isReconnecting = false;
const reconnectInterval = 5000; // 5 seconds


export const connectToMongoDB = async (): Promise<void> => {
    try {
        await mongoose.connect(config.mongoURI, {
            // These options are important for production stability:
            // autoIndex: false, // Don't build indexes at startup
            minPoolSize: 2, // Maintain at least 2 open connections
            maxPoolSize: 10, // Maximum number of connections in the pool
            // serverSelectionTimeoutMS: 5000, // Keep trying to connect
            // socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            // family: 4 // Use IPv4, or 6 if you prefer
        });


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
                  mongoose.connect(config.mongoURI, { // Or your connection string
                    minPoolSize: 2, // Maintain at least 2 open connections
                    maxPoolSize: 10, // Maximum number of connections in the pool
                    // ... other options ...
                  })
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

export default {
  media: MediaModel
}