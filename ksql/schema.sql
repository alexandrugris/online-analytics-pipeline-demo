-- Process all data that currently exists in topic, as well as future data
SET 'auto.offset.reset' = 'earliest';

-- Declare source stream
CREATE STREAM RandomWalk (Number STRING) WITH (KAFKA_TOPIC='RandomWalkSrc', VALUE_FORMAT='DELIMITED');

-- workaround: at this moment there are no functions like Average implemented 
-- and one needs to add a dummy column to the dataset to be able to do group by tumbling windows
CREATE STREAM RandomWalk_WA WITH (VALUE_FORMAT='DELIMITED', PARTITIONS=2) AS \
    SELECT 1 As Foo, CAST (Number as DOUBLE) as Number from RandomWalk;

-- Now we can do continuour queries as below:
SELECT Foo, SUM(Number) / COUNT(*) as Average From RandomWalk_WA WINDOW TUMBLING (SIZE 3 SECONDS) GROUP BY Foo;



