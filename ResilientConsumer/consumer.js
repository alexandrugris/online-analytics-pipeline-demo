"use strict"

const KafkaRest = require('kafka-rest');
const uuidv1 = require('uuid/v1');

// delete existing topics matches before
// ../kafka.js topics --delete --topic matches
// ../kafka.js topics --delete --topic matches_ipc

// create the ipc queue with compaction
// ../kafka.js topics --create --partitions 1 --replication-factor 1 --topic matches_ipc --config cleanup.policy=compact
// ../kafka.js topics --create --partitions 5 --replication-factor 1 --topic matches
// some match object to store
function Match(){

  this.state = {};

  // events not yet processed
  this.processedEvents = [];

  // the number of events per match should be in the order of 10s
  // not hundreds
  this.pendingEvents = [];
}

Match.prototype.evolveState = function(msg){

}

Match.prototype.addEvent = function(evt){

  /*let matchmsg = {
    orderid: v, // v is a number (double, timestamp)
    message: "A dummy message so we transmit smth"
  }*/

  this.pendingEvents.push(evt);
}


function cmpEvt(a, b){
  return a.orderid - b.orderid;
}

function sortByEventOrder(array){
  array.sort(cmpEvt);
}

function mergeSortedArrays(a, b, cmp){
  // merge the two arrays while removing duplicates
  let tmp = [];
  let i = 0;
  let j = 0;

  while (i < a.length || j < b.length){

    while(i < a.length && (b.length == j || cmp(a[i], b[j]) < 0)){
      tmp.push(a[i]);
      i++;
    }

    while(i < a.length && j < b.length && cmp(a[i], b[j]) == 0){
      tmp.push(a[i]);
      i++; j ++;
    }

    while(j < b.length && (a.length == i || cmp(a[i], b[j]) > 0)){
      tmp.push(b[j]);
      j ++;
    }
  }
  return tmp;
}


Match.prototype.processBatch = function(evt){

  if(this.pendingEvents.length == 0){
    return;
  }

  sortByEventOrder(this.pendingEvents);

  if(this.processedEvents.length > 0 && 
    this.pendingEvents.length == this.processedEvents.length &&
    this.pendingEvents[0].orderid == this.processedEvents[0].orderid &&
    this.pendingEvents[this.pendingEvents.length - 1].orderid == this.processedEvents[this.processedEvents.length - 1].orderid
    ){
      // it is just a rearrangement of events, I have everything I need
      console.log("NO NEED TO DO PROCESSING - ALL DATA AVAILABLE")
  }
  else if(this.processedEvents.length > 0 && this.processedEvents[this.processedEvents.length - 1].orderid > this.pendingEvents[0].orderid){

    console.log("FULL REPROCESS, OUT OF ORDER");

    // TODO: optimization: not in all cases I need to reset state to 0

    // reprocessing is needed
    this.processedEvents = mergeSortedArrays(this.processedEvents, this.pendingEvents, cmpEvt);

    this.state = {};
    this.processedEvents.forEach((v) => this.evolveState(v));
  }
  else{

    // just add to the current state
    console.log("APPEND-ONLY PROCESSING");

    this.pendingEvents.forEach((v) => this.evolveState(v));
    this.processedEvents = this.processedEvents.concat(this.pendingEvents);
  }

  console.log(this.processedEvents.length)

  // new batch to process
  this.pendingEvents = [];
}

function MatchCollection(){

  this.matches = new Map();

}

MatchCollection.prototype.getOrCreateMatch = function(key){

  let ret = this.matches.get(key);

  if( ret == undefined){
    ret = new Match(key);
    this.matches.set(key, ret);
  }

  return ret;
}

MatchCollection.prototype.processBatch = function(){
  this.matches.forEach((v, k, m) => v.processBatch())
}

function logShutdown(err) {
    if (err)
        console.log("Error while shutting down: " + err);
    else
        console.log("Shutdown cleanly.");
}

function addEverythingElse(stream, instance){

  stream.on('error', function(err) {
      console.log("Consumer instance reported an error: " + err);
      console.log("Attempting to shut down consumer instance...");
      instance.shutdown(logShutdown);
  });
  stream.on('end', function() {
      console.log("Consumer stream closed.");
  });

  // Events are also emitted by the parent consumer_instance, so you can either consume individual streams separately
  // or multiple streams with one callback. Here we'll just demonstrate the 'end' event.
  instance.on('end', function() {
      console.log("Consumer instance closed.");
  });

  // Also trigger clean shutdown on Ctrl-C
  process.on('SIGINT', function() {
      console.log("Attempting to shut down consumer instance...");
      instance.shutdown(logShutdown);
  });
}


function processMessages(){

  const kafka = new KafkaRest({ 'url': 'http://localhost:8082' });
  const ipc = kafka.topic('matches_ipc');
  const ipcConsumersState = new Map();
  let ipcMsgCount = 0;

  // start reading from the beginning
  let consumerConfig = {
    'auto.offset.reset' : 'smallest'
  };

  let matchCollection = new MatchCollection();

  let pid = process.pid;


  // subscribe also to the IPC stream
  // consumer group name is a hack because the rest client is incomplete
  // creates a consumer group for every new instance of this process
  // to read all messages from ipc topic
  kafka.consumer(uuidv1()).join(consumerConfig, function(err, instance){

    if (err) return console.log("Failed to create instance in consumer group: " + err);

    const stream = instance.subscribe("matches_ipc");

    stream.on('data', function (msgs){
      for(var i = 0; i < msgs.length; i++) {

          /// NOT FINISHED BELOW:

          let key = msgs[i].key.toString('utf8');
          let message = JSON.parse(msgs[i].value.toString('utf8'));
          ipcConsumersState[key] = message;

          // key should be more complex, something like processid - timestamp_process_start - machine
          if(key === `${process.id}`){ 

          }

          console.log(message);

          }

      });

    addEverythingElse(stream, instance);

  });


  // join the consumer group on the matches topic
  kafka.consumer("consumer-group-matches").join(consumerConfig, function(err, instance) {
      if (err) return console.log("Failed to create instance in consumer group: " + err);

      console.log("Consumer instance initialized: " + instance.toString());
      const stream = instance.subscribe("matches");

      stream.on('data', function(msgs) {

          for(var i = 0; i < msgs.length; i++) {
              let key = msgs[i].key.toString('utf8');
              let value = msgs[i].value.toString('utf8');
              console.log(`[${pid}] ${key} : ${value}`);

              matchCollection.getOrCreateMatch(key).addEvent(JSON.parse(value));

          }
          matchCollection.processBatch();

      });

      addEverythingElse(stream, instance);

  });

  function sendConsumerState () {

    let consumerState = {
      matches : Array.from(matchCollection.matches).map(([key, value]) => {
        // this should never be 0 as it is created when event occurs
        let lstProcEvt = value.processedEvents[value.processedEvents.length-1]; 

        return {
          match: key, 
          lastIdxRead: lstProcEvt.orderid
        };
      }), 
      msgCount: ipcMsgCount++
    };

    ipc.produce( {
      'key': `${process.id}`, // this will be compacted, the topic is compacted; it sends the full state
      'value': JSON.stringify(consumerState)
    });
  }

  setTimeout(()=> {
    sendConsumerState();
  }, 2000);
}

if (require.main === module) {
    processMessages();
}

module.exports.process = processMessages;
