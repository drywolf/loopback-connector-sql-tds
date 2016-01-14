import { SqlTdsConnector } from './SqlTdsConnector';
import { DebugFlags, debugOption, DEBUG_ID } from './SqlTdsDebug';

var debug_log = require('debug')(DEBUG_ID);

export class SqlTdsPlugin
{
    static debug(dataSource, flag: DebugFlags, message: string, ...args: any[]): void
    {
        if (!debugOption(dataSource.settings.options, flag))
            return;
            
        debug_log(message, ...args);
    }
    
    static initialize(dataSource, callback):void
    {
        var settings = dataSource.settings || {};
        SqlTdsPlugin.debug(dataSource, DebugFlags.General, 'Settings: %j', settings);

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