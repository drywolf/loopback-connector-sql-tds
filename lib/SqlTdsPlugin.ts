import { SqlTdsConnector } from './SqlTdsConnector';
import { DEBUG_ID } from './Constants';

var debug = require('debug')(DEBUG_ID);

export class SqlTdsPlugin
{
    static initialize(dataSource, callback):void
    {
        var settings = dataSource.settings || {};
        debug('Settings: %j', settings);

        var connector = new SqlTdsConnector(settings);
        dataSource.connector = connector;

        connector.connect(
            (err, connection) =>
            {
                dataSource.client = connection;
                dataSource.connector.dataSource = dataSource;
                dataSource.connector.tableNameID = dataSource.settings.tableNameID;
                callback && callback(err, connection);
            });
    }
}