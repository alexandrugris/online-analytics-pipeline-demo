const KafkaRest = require('kafka-rest'); 

const kafka = new KafkaRest({ 'url': 'http://localhost:8082' });

kafka.topics.list((tpcs) => {

    for(t in tpcs){
        console.log(t.toString());
    }

});