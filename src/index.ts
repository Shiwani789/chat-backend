import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { registerSocketHandlers } from './modules/socket/socket.handlers';

dotenv.config();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
