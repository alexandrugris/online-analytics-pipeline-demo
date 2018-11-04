const KafkaRest = require('kafka-rest');

const kafka = new KafkaRest({ 'url': 'http://localhost:8082' });

// make sure the topic is created before
const target = kafka.topic('matches');

// consider N matches concurrently running
let concurrentMatches = 3;
let values = new Array(3); values.fill(0);

setInterval(()=> {

    let match = Math.floor(Math.random() * Math.floor(concurrentMatches));
    let v = values[match]++;

    let matchmsg = {
      orderid: v,
      message: "A dummy message so we transmit smth"
    }

    let kafkamsg = {
      'key' : `${match}`,
      'value' : JSON.stringify(matchmsg)
    }
    // very basic produce
    target.produce( kafkamsg );
}, 1000);
