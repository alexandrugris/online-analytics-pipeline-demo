package alexandrugris;


import org.apache.storm.task.OutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.topology.base.BaseRichBolt;
import org.apache.storm.tuple.Tuple;
import org.apache.storm.tuple.Values;

import java.util.Map;

/**
 * Created by alexandrugris on 10/21/18.
 */
public class RandomWalkProcessor extends BaseRichBolt{

    private OutputCollector __collector = null;

    @Override
    public void prepare(Map stormConf, TopologyContext context, OutputCollector collector) {
        __collector = collector;
    }

    @Override
    public void execute(Tuple input) {

        // pass through for now
        __collector.emit (input, new Values (input.getMessageId ()));
        __collector.ack (input);
    }

    @Override
    public void declareOutputFields(OutputFieldsDeclarer declarer) {

    }
}
