const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

users = [];
chatHistory = [];
tn_user = 0;
io.on('connection', function(socket) {
   console.log('A user connected');
   socket.on('setUsername', function(data) {
      if(users.includes(data)) {
         return socket.emit('userExists', `username "${data}" is already taken! Try some other username.`); //Tells the client that username is taken.
      } else {
         console.log(`New user registered! ${data}`)
         tn_user ++
         socket.username = data
         users.push(socket.username)
         socket.emit('userSet', {username: data , tn_user: tn_user});
         socket.emit('ChatHistory' , chatHistory)
         io.sockets.emit('newUser' , {username: data})
         chatHistoryManager(`<div class = system_message><p style="color:green"><b>${data}</b> joined the chat! </p></div>`)
      }
   })
   socket.on('msg', function(data) {
      io.sockets.emit('newmsg', {message:data, author:socket.username });
      chatHistoryManager(`<b>${socket.username}:</b> ${data}`)
   })

   socket.on('disconnect', function(data) {
      if (users.includes(socket.username)){
         tn_user --
         chatHistoryManager(`<div class = system_message><p style="color:red"><b>${socket.username}</b> left the chat! </p></div>`)
         io.sockets.emit('dc' , {username: socket.username})
         users.splice(users.indexOf(socket.username), 1);
         console.log(`User ${socket.username} left!`)
      } else {
         console.log("Someone outside of chat exited")
      }
   });
});

function chatHistoryManager(data){
   if (chatHistory.length === 50){
      chatHistory.shift()
      chatHistory.push(data)
   } else{
      chatHistory.push(data)
   }
}

http.listen(3000, function() {
   console.log('listening on localhost:3000');
});