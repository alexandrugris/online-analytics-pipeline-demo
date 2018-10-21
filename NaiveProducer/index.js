
const app = require('http').createServer( (req, resp) => {});
const io = require('socket.io')(app);
const rnd = require('random');

let cron = null;
let connectedClients = 0;

let prevStep = 0;
let dir = 0;

function clamp(v, min, max){
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

function randomWalk(){

    dir = clamp(rnd.normal(dir, 1)(), -0.75, 0.75);
    prevStep += dir;

    io.emit('walk', prevStep);
}

io.on('connect', (client) => {
    console.log("Client connected");
    
    if(cron == null){
        cron = setInterval(randomWalk, 10); // flood this thing!
        connectedClients ++;
    }

});

io.on('disconnect', (client) => {

    connectedClients --;
    
    if(connectedClients <= 0 && cron != null){
        clearInterval(cron);
        cron = null;
    }

})

app.listen(8080);