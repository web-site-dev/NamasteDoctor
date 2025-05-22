const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname)); // Serves static files

let patients = {}; // patientSocketId => { locked: false, doctorId: null }
let availableQuestions = {}; // patientSocketId => latest question

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Patient sends message
  socket.on('patient-message', (data) => {
    console.log(`Patient (${socket.id}): ${data.message}`);

    if (!patients[socket.id]) {
      patients[socket.id] = { locked: false, doctorId: null };
    }

    if (!patients[socket.id].locked) {
      availableQuestions[socket.id] = data.message;
      io.emit('new-question', { patientId: socket.id, message: data.message });
    }

    const assignedDoctor = patients[socket.id].doctorId;
    if (assignedDoctor) {
      io.to(assignedDoctor).emit('patient-message', { message: data.message });
    }
  });

  // Doctor accepts a question
  socket.on('accept-question', ({ patientId }) => {
    if (patients[patientId] && !patients[patientId].locked) {
      patients[patientId].locked = true;
      patients[patientId].doctorId = socket.id;

      socket.join(patientId);
      io.to(patientId).emit('system-message', "A doctor has joined the chat.");
      io.to(socket.id).emit('question-accepted', {
        patientId,
        message: availableQuestions[patientId]
      });

      socket.broadcast.emit('remove-question', { patientId });
    }
  });

  // Doctor replies
  socket.on('doctor-message', ({ patientId, message }) => {
    io.to(patientId).emit('doctor-reply', { message });
  });

  // Disconnect logic
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);

    // Doctor disconnects
    Object.entries(patients).forEach(([pid, info]) => {
      if (info.doctorId === socket.id) {
        patients[pid].locked = false;
        patients[pid].doctorId = null;
        io.emit('new-question', { patientId: pid, message: availableQuestions[pid] });
        console.log(`Doctor disconnected from patient ${pid}`);
      }

      // Patient disconnects
      if (pid === socket.id) {
        delete availableQuestions[pid];
        delete patients[pid];
        io.emit('remove-question', { patientId: pid });
        console.log(`Patient ${pid} disconnected`);
      }
    });
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
