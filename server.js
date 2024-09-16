const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/chat', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Esquema de los mensajes
const messageSchema = new mongoose.Schema({
    user: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Servir archivos estáticos de la carpeta 'public'
app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado');

    // Enviar los mensajes guardados en la base de datos cuando un usuario se conecta
    Message.find().sort({ timestamp: 1 }).then(messages => {
        socket.emit('previousMessages', messages);
    });

    // Guardar y enviar los nuevos mensajes
    socket.on('sendMessage', (data) => {
        const newMessage = new Message({ user: data.user, message: data.message });
        newMessage.save().then(() => {
            io.emit('receiveMessage', data);
        });
    });

    socket.on('disconnect', () => {
        console.log('Un usuario se ha desconectado');
    });
});

server.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
