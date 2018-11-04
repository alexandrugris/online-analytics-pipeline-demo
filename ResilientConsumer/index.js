
const cluster = require('cluster');

if (cluster.isMaster) {

  console.log(`Master ${process.pid} is running`);
  const numCPUs = require('os').cpus().length;

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);

    cluster.fork();

  });

  // TODO: kill workers gracefully

} else {

  console.log(`Worker ${process.pid} started`);

  // wait for signal to start processing
  process.on('SIGUSR1', () => {
    // register consumer from kafka queue
    console.log(`Consuming started ${process.pid} started`);
    require('./consumer').process();
  });
}
