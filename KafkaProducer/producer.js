const KafkaRest = require('kafka-rest'); 

const kafka = new KafkaRest({ 'url': 'http://localhost:8082' });

// make sure the topic is created before
const target = kafka.topic('RandomWalkSrc');

const randWalker = function(){

    function clamp(v, min, max){
        if (v < min) return min;
        if (v > max) return max;
        return v;
    }

    let dir = 0;
    let prevStep = 0;
    const rnd = require('random');

    return { 
        randomWalk(){
            dir = clamp(rnd.normal(dir, 1)(), -0.75, 0.75);
            prevStep += dir;
            return prevStep;
        }
    }
}();

setInterval(()=> {
    // very basic produce
    target.produce( randWalker.randomWalk().toFixed(4) );
}, 1000); 