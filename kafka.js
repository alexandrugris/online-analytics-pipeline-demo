#!/usr/local/bin/node

let child_process = require('child_process');

let cmds = {
    'topics' : ['kafka-topics', '--zookeeper', 'zookeeper:2181'],
    'produce' : ['kafka-console-producer', '--broker-list', 'kafka:9092'],
    'consume' : ['kafka-console-consumer', '--bootstrap-server', 'kafka:9092']
}

let params = null;

process.argv.forEach((arg) => {

    // first with command
    if (params == null && cmds[arg] != null) {
        let cmd = cmds[arg];
        params = ['run', '--net=oda', '--rm', '-it', 'confluentinc/cp-kafka', ...cmd]
    }
    
    // add the rest
    if (params != null){
        params.push(arg);
    }
});

let docker = child_process.spawn('docker', params, {stdio: 'inherit'});

docker.on('error', (err) => {
    console.log('Failed to start docker');
});

docker.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
});