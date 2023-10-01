const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const Gps=require('../lib/index.js');

const gps_link='/dev/serial0';
const gps_buadRate=9600;
const gps_server_port=3000;

const neo6_gps=new Gps(gps_link,gps_buadRate);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/dashboard.html');
});

//start server
http.listen(gps_server_port,() =>{
    console.log(`GPS Server started *:${gps_server_port}`);

    neo6_gps.open((data)=>{
        //console.log(data);

        io.emit('state', data.state);

    });

});

