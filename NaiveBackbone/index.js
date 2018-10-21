const socket = require('socket.io-client')('http://localhost:8080');

const processor = function(){

    let values = [];
    let sigma   = null;
    let avg = null;

    return {
        append(v){
            values.push(v);
        },

        clear(){
            values = [];
        },

        processAndReset(){
            avg = 0;
            values.forEach(v => {
                avg += v / values.length; // avoid overflow
            });
            values.forEach(v => {
                sigma += (v - avg) * (v - avg) / values.length;
            });
            sigma = Math.sqrt(sigma);
            values = [];
            return avg;
        },

        isAnomaly(v){
            if(sigma == null)
                return false;
            return Math.abs(v - avg) > 4 * sigma;
        }
    }
}();

socket.on('connect', () => {
    console.log("Connected");

    processor.timer = setInterval(() => {
    
        let avg = processor.processAndReset();
        console.log(`Moving average: ${avg}`);
    
    }, 2000);
    
    processor.clear();
});

socket.on('walk', (value) => {

    if(processor.isAnomaly(value)){
        console.log(`Anomaly detected. ${value}`);
    }
    processor.append(value);
});

socket.on('disconnect', () => {
    console.log("Disconnected");

    if (processor.hasOwnProperty('timer') && processor.timer !== null){
        clearInterval(processor.timer);
        delete processor.timer;
    } 
});
