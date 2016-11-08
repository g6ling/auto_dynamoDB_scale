module.exports = {
    region : 'ap-northeast-1',
    timeframeMin : 15, // evaluation timeframe (minute)
    tables :
        [
            {
            tableName : 'scaleDynamoTest', // table name
            reads_upper_threshold : 50, // read incrase threshold (%)
            reads_lower_threshold : 30, // read decrase threshold (%)
            increase_reads_with : 50, // read incrase amount (%)
            decrease_reads_with : 50, // read decrase amount (%)
            base_reads : 1,          // minimum read Capacity
            writes_upper_threshold : 90, // write incrase amount (%)
            writes_lower_threshold : 40, // write decrase amount (%)
            increase_writes_with : 90, // write incrase amount (%)
            decrease_writes_with : 30, // write incrase amount (%)
            base_writes : 1          // minimum write Capacity
            }

            //...
        ]
};