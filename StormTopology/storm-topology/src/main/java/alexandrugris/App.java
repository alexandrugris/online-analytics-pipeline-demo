package alexandrugris;

import org.apache.storm.Config;
import org.apache.storm.StormSubmitter;
import org.apache.storm.generated.AlreadyAliveException;
import org.apache.storm.generated.AuthorizationException;
import org.apache.storm.generated.InvalidTopologyException;
import org.apache.storm.kafka.*;
import org.apache.storm.topology.TopologyBuilder;

/**
 * Hello world!
 */
public final class App {

    private App() {
    }

    private static SpoutConfig getKafkaSpoutConfig(){

        String zk = System.getenv("ZOOKEEPER");
        String topic = System.getenv("TOPIC_NAME");

        SpoutConfig cfg = new SpoutConfig(new ZkHosts(zk), topic, "/" + topic, "kafkaSpout");
        cfg.startOffsetTime = 0; // start from the beginning

        return cfg;
    }

    public static void buildTopology(){

        TopologyBuilder builder = new TopologyBuilder();
        builder.setSpout("KafkaSpout", new KafkaSpout(getKafkaSpoutConfig()));

        // tell storm to distribute the load from the upstream kafka spout in a random way to each of our bolt instances
        builder.setBolt ("InputProcessor", new RandomWalkProcessor ()).shuffleGrouping ("KafkaSpout");

        Config cluster = new Config ();
        cluster.setNumWorkers (4);
        cluster.setMessageTimeoutSecs (20);

        try {
            StormSubmitter.submitTopology ("DockerCluster", cluster, builder.createTopology ());
        } catch (AlreadyAliveException e) {
            e.printStackTrace ();
        } catch (InvalidTopologyException e) {
            e.printStackTrace ();
        } catch (AuthorizationException e) {
            e.printStackTrace ();
        }

    }

    /**
     * Says hello to the world.
     * @param args The arguments of the program.
     */
    public static void main(String[] args) {


    }
}
