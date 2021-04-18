var socket = io();
var chat_area = document.getElementById("chat")

function setUsername() {
   if (!username){
    socket.emit('setUsername', document.getElementById('name').value);
    var username = document.getElementById('name').value //Set local variable username to the value of div named "name"
   } else {
      socket.emit('setUsername', username);
   }
 };

 function update_ttno(tn){
   var to_dsplay = document.getElementById("total-online");
   to_dsplay.innerHTML = `Total Online - ${tn}`
 }

 

socket.on('userExists', function(data) {
   //Fired if the server tells that the username the user tried to register with a username that already exists!
   error_div = document.getElementById("error")
   var text = data.fontcolor("red");
   error_div.style.fontSize = "20px";
   error_div = document.getElementById("error")
   if (!error_div.innerHTML.value){ //If value of "error" div is not empty, would not be empty if user already got a error warning.
      error_div.innerHTML = text;
      error_div.style.backgroundColor = "lightblue"
   }
    
})

/*Server fires after setting the username*/
socket.on('userSet', function(data) {
   /*After server setting usernme, hide the login div and show
   the main chat area */
   var login_div = document.getElementById("login");
   login_div.style.display = "none";

   var chat_area = document.getElementById("chat");
   chat_area.style.display = "block";
   document.body.style.backgroundColor = "white";
   addlistener()

   tn_user = data.tn_user
   update_ttno(tn_user)
 });

 socket.on('ChatHistory', function(data) {
      for (var x in data){
         document.getElementById('message-container').innerHTML += data[x]
      }
      console.log("Loaded history!")
 });

 function sendMessage(message) {
       socket.emit('msg', message);
 }

 function systemMessage(data) {
   var div = document.createElement('div');
   div.className = "system_message"
   div.innerHTML += data.text
   div.style.color = data.color
   document.getElementById('message-container').appendChild(div)
 }

 socket.on('newmsg', function(data) {
    if(user) {
       document.getElementById('message-container').innerHTML += '<div id = "messages"><b>' + 
          data.author + '</b>: ' + data.message + '</div>'

   var messageBody = document.querySelector('#border');
   messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
}});

socket.on('newUser', function(data) {
    user = data.username;
    text = '<div class = system_message><b>' + user + '</b> ' + "Joined the chat!" + '</div>'
    systemMessage({text : text , color : "green"})
    update_ttno(tn_user++)
 });

 socket.on('dc', function(data) {
   user = data.username;
   text = '<div class = system_message><b>' + user + '</b>: ' + "left the chat!" + '</div>'
   systemMessage({text : text , color : "red"})
   update_ttno(tn_user -= 1)
 });

 socket.on('disconnect', () => {
      //Fired when the client dcs from the server
      var dc_mes = document.getElementById("connecting-message"); //Get the div with id "connecting-message"
      dc_mes.style.display = "block"; //Change its display to block (meaning show)

      chat_area.style.filter = "blur(2px)"
      chat_area.style.pointerEvents = "None"
 });

 socket.io.on('reconnect', () => {
      //Fired when the client reconnects 
      setUsername()
      var dc_mes = document.getElementById("connecting-message");
      dc_mes.style.display = "none";

      chat_area.style.filter = "None"
      chat_area.style.pointerEvents = "all"
 });

function addlistener(){
 document.querySelector('.input-div').addEventListener('keyup', function (e) {
    var msgcont = document.getElementById('chat-box').value;
   if (e.key == "Enter" && msgcont.trim() != ""){
      sendMessage(msgcont);
      document.getElementById('chat-box').value = ""
   }
 })};