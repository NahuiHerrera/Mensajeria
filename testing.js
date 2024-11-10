const { expect } = require('chai');
const mongoose = require('mongoose');
const io = require('socket.io-client');
const { Message } = require('../server'); // Importar el modelo de mensajes

// Configura la URL del servidor de pruebas
const SERVER_URL = "http://localhost:3000";

describe("Servidor de chat con Socket.io", function() {
  let clientSocket;

  before((done) => {
    // Conecta a la base de datos de pruebas
    mongoose.connect('mongodb://localhost:27017/chat_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then(() => done());
  });

  after((done) => {
    // Elimina todos los mensajes de la base de datos
    Message.deleteMany({}, () => mongoose.disconnect(done));
  });

  beforeEach((done) => {
    // Crea un cliente de Socket.io antes de cada prueba
    clientSocket = io(SERVER_URL);
    clientSocket.on("connect", done);
  });

  afterEach(() => {
    // Desconecta el cliente después de cada prueba
    if (clientSocket.connected) clientSocket.disconnect();
  });

  it("Debería guardar y enviar un mensaje", (done) => {
    const messageData = {
      content: "Hola, ¿qué tal?",
      from: "Usuario 1",
      to: "Usuario 2"
    };

    clientSocket.emit("sendMessage", messageData);

    clientSocket.on("receiveMessage", (message) => {
      expect(message).to.have.property("content", "Hola, ¿qué tal?");
      expect(message).to.have.property("from", "Usuario 1");
      expect(message).to.have.property("to", "Usuario 2");

      // Confirma que el mensaje se haya guardado en la base de datos
      Message.findOne({ content: "Hola, ¿qué tal?" }).then((savedMessage) => {
        expect(savedMessage).to.not.be.null;
        expect(savedMessage.content).to.equal("Hola, ¿qué tal?");
        done();
      }).catch(done);
    });
  });

  it("Debería cargar el historial de mensajes", (done) => {
    // Prepara mensajes de prueba en la base de datos
    const messageHistory = [
      { content: "Hola", from: "Usuario 1", to: "Usuario 2" },
      { content: "¿Cómo estás?", from: "Usuario 2", to: "Usuario 1" }
    ];

    Message.insertMany(messageHistory).then(() => {
      clientSocket.emit("requestMessageHistory", { from: "Usuario 1", to: "Usuario 2" });

      clientSocket.on("loadMessageHistory", (messages) => {
        expect(messages).to.have.lengthOf(2);
        expect(messages[0].content).to.equal("Hola");
        expect(messages[1].content).to.equal("¿Cómo estás?");
        done();
      });
    }).catch(done);
  });
});
