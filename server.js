const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
require('dotenv').config();
const axios = require('axios');

app.use(express.static(__dirname)); 
app.use(express.json());

let patients = {};
let availableQuestions = {}; 

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

 
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

  
  socket.on('doctor-message', ({ patientId, message }) => {
    io.to(patientId).emit('doctor-reply', { message });
  });

  
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);

   
    Object.entries(patients).forEach(([pid, info]) => {
      if (info.doctorId === socket.id) {
        patients[pid].locked = false;
        patients[pid].doctorId = null;
        io.emit('new-question', { patientId: pid, message: availableQuestions[pid] });
        console.log(`Doctor disconnected from patient ${pid}`);
      }

      
      if (pid === socket.id) {
        delete availableQuestions[pid];
        delete patients[pid];
        io.emit('remove-question', { patientId: pid });
        console.log(`Patient ${pid} disconnected`);
      }
    });
  });
});

const GEMINI_MODEL = 'gemini-1.5-flash-latest'; // Gemini 2.5 Flash

app.post('/api/gemini', async (req, res) => {
  const userQuery = req.body.query;
  if (!userQuery) return res.status(400).json({ error: 'Missing query' });

  const prompt = `Please provide a concise (7-15 sentences), evidence-based, and professional response to the following sexual health query. Use short paragraphs and bullet points if helpful. Format your answer using markdown for clarity (bold, lists, etc). Avoid long-winded explanations.Offer suggestions for seeking professional help if necessary.\n\nQuery: ${userQuery}`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        params: { key: process.env.GEMINI_API_KEY },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    const answer = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    res.json({ answer });
  } catch (err) {
    console.error('Gemini API error:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Failed to get response from Gemini API', details: err.message, data: err.response?.data });
  }
});

app.get('/html/chatbot', (req, res) => {
  res.sendFile(__dirname + '/html/chatbot.html');
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
