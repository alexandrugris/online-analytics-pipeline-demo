#!/usr/local/bin/node

const child_process = require('child_process');

const cmds = {
    'topics' : ['confluentinc/cp-kafka','kafka-topics', '--zookeeper', 'zookeeper:2181'],
    'produce' : ['confluentinc/cp-kafka','kafka-console-producer', '--broker-list', 'kafka:9092'],
    'consume' : ['confluentinc/cp-kafka','kafka-console-consumer', '--bootstrap-server', 'kafka:9092'],
    'ksql' : ['confluentinc/cp-ksql-cli', 'http://ksql_server:8088/']
}

let params = null;

process.argv.forEach((arg) => {

    // first with command
    if (params == null && cmds[arg] != null) {
        let cmd = cmds[arg];
        params = ['run', '--net=oda', '--rm', '-it', ...cmd]
    }
    // add the rest
    else if (params != null){
        params.push(arg);
    }
});

if (params != null){
    
    const docker = child_process.spawn('docker', params, {stdio: 'inherit'});

    docker.on('error', (err) => {
        console.log('Failed to start docker');
    });

    docker.on('close', (code) => {
        console.log(`Child process exited with code ${code}`);
    });
}
else {
    console.log("Invalid parameters." );
}
