const Gps=require('../lib/index.js');

const gps_link='/dev/serial0';
const gps_buadRate=9600;

const neo6_gps=new Gps(gps_link,gps_buadRate);

neo6_gps.open((data)=>{
    console.log(data);
});

console.log('GPS test');