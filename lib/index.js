const GPS = require('gps');

const { serialDeviceHandel } = require('./serialDeviceHandel.V6.cjs');

const serialDevice = new serialDeviceHandel();
const gps = new GPS;

module.exports = class Gps {
    gps_port;
    gps_baudrate;

    constructor(gps_port, gps_baudrate) {
        this.gps_port = gps_port;
        this.gps_baudrate = gps_baudrate;
    }


    open(callback) {

        serialDevice.onReceive((data) => {
            //console.log(data);
            //gps.updatePartial(data);
            gps.update(data);
            
        });

        gps.state.bearing = 0;
        let prev = { lat: null, lon: null };

        gps.on('data', (data) => {
            //console.log('data:',data);

            if (prev.lat !== null && prev.lon !== null) {
                gps.state.bearing = GPS.Heading(prev.lat, prev.lon, gps.state.lat, gps.state.lon);
            }
            prev.lat = gps.state.lat;
            prev.lon = gps.state.lon;
            callback({ data, state: gps.state });
        })

        return serialDevice.open(this.gps_port, this.gps_baudrate);
    }

    close() {
        return serialDevice.close();
    }

}