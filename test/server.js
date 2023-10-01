const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
var Sylvester = require('sylvester');
var Kalman = require('kalman').KF;

const Gps=require('../lib/index.js');



const gps_link='/dev/serial0';
const gps_buadRate=9600;
const gps_server_port=3000;

const neo6_gps=new Gps(gps_link,gps_buadRate);



// Simple Kalman Filter set up
var A = Sylvester.Matrix.I(2);
var B = Sylvester.Matrix.Zero(2, 2);
var H = Sylvester.Matrix.I(2);
var C = Sylvester.Matrix.I(2);
var Q = Sylvester.Matrix.I(2).multiply(1e-11);
var R = Sylvester.Matrix.I(2).multiply(0.00001);

// Measure
var u = $V([0, 0]);

var filter = new Kalman($V([0, 0]), $M([[1, 0], [0, 1]]));


app.get('/', function(req, res) {
    res.sendFile(__dirname + '/maps.html');
});

app.get('/info', function(req, res) {
    res.sendFile(__dirname + '/dashboard.html');
});

//start server
http.listen(gps_server_port,() =>{
    console.log(`GPS Server started *:${gps_server_port}`);

    neo6_gps.open(({data,state})=>{
        //console.log(data);
        if (data.lat && data.lon) {

            filter.update({
              A: A,
              B: B,
              C: C,
              H: H,
              R: R,
              Q: Q,
              u: u,
              y: $V([data.lat, data.lon])
            });
        
            state.position = {
              cov: filter.P.elements,
              pos: filter.x.elements
            };
          }
        
        io.emit('position',state);
        io.emit('state',state);
    });

});

