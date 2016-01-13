import { Connection, Request } from 'tedious';
import { ConnectionConfig } from 'tedious';
import { SqlConnector, ParameterizedSQL, PropertyDefinition } from 'loopback-connector';
import { SqlQueryBuilder } from './QueryBuilder';
import { DEBUG_ID } from './Constants';

var debug = require('debug')(DEBUG_ID);

export class ConnectorSettings
{
    
}

export const name: string = 'tds-sql';

export class SqlTdsConnector extends SqlConnector
{
    connection: Connection;
    
    constructor(settings: ConnectorSettings)
    {
        super(name, settings);
    }
    
    tdsInfo(info): void
    {
        //debug('INFO: ', info);
    }
    
    tdsError(err): void
    {
        //debug('ERROR: ', err);
    }
    
    tdsEnd(): void
    {
        
    }
    
    tdsDebug(message: string): void
    {
        //debug('DEBUG: ', message);
    }

    connect(cb): void
    {
        var config:ConnectionConfig = {};
        config.options = {};
        
        // hardcoded options
        // do not build data after a request, we do it ourselves
        config.options.rowCollectionOnDone = false
        config.options.rowCollectionOnRequestCompletion = false
        config.options.useColumnNames = false
        
        // connection options
        config.server = this.settings.host || this.settings.hostname;
        config.userName = this.settings.user || this.settings.username;
        config.password = this.settings.password;
        
        // db options
        config.options.database = this.settings.database;
        
        var connection = new Connection(config);
        
        connection.on('infoMessage', this.tdsInfo);
        connection.on('errorMessage', this.tdsError);
        connection.on('end', this.tdsEnd);
        connection.on('debug', this.tdsDebug);
        
        connection.on('connect', err =>
        {
            if (err)
            {
                cb(err, null);
            }
            else
            {
                debug('Connection established to: ', this.settings.host);
                this.connection = connection;
                cb(err, connection);
            }
        });
    }

    disconnect(cb): void
    {
        if (this.connection)
        {
            this.connection.close();
            this.connection = null;
        }

        cb();
    }

    ping(cb: Function): void
    {
        debug('Ping');
        //this.execute('SELECT 1 AS result', cb);
        var request = new Request('SELECT 1 AS result', (err, count, rows) => 
        {
            cb();
        });
        
        this.connection.execSql(request);
    }

    toColumnValue(propertyDef: PropertyDefinition, value: any): ParameterizedSQL | any
    {
        if (value == null)
            return null;

        if (propertyDef.type === String)
            return String(value);

        if (propertyDef.type === Number)
        {
            if (isNaN(value))
                return null;

            return value;
        }

        if (propertyDef.type === Date || propertyDef.type.name === 'Timestamp')
        {
            if (!value.toUTCString)
                value = new Date(value);

            return SqlQueryBuilder.jsDateToMsSqlDate(value);
        }

        if (propertyDef.type === Boolean)
            return (!!value);

        return this.serializeObject(value);
    }
    
    fromColumnValue(propertyDef: PropertyDefinition, value: any): any
    {
        if (value == null)
            return value;

        var type = propertyDef && propertyDef.type;
        
        if (type === Boolean)
            value = !!value;

        if (type === Date && !(value instanceof Date))
            value = new Date(value.toString());

        return value;
    }
    
    escapeName(name: string): string
    {
        return '[' + name.replace(/\./g, '_') + ']';
    }
    
    escapeValue(value: string): any
    {
        
    }
    
    getPlaceholderForIdentifier(key: string): string
    {
        return null;
    }
    
    getPlaceholderForValue(key: string): string
    {
        return '(?)';
    }
    
    applyPagination(model: string, stmt: ParameterizedSQL, filter)
    {
        var limit_clause = SqlQueryBuilder.buildLimit(model, filter.limit, filter.offset || filter.skip);
        return stmt.merge(limit_clause);
    }
    
    getCountForAffectedRows(model: string, info): any
    {
        
    }
    
    getInsertedId(model: string, info)
    {
        
    }
        
    executeSQL(sql: string, params: any[], options, callback: Function): void
    {
        var self = this;
        var client = this.connection;
        var debugEnabled = debug.enabled;
        var db = this.settings.database;
        
        if (typeof callback !== 'function')
            throw new Error('callback should be a function');

        if (debugEnabled)
            debug('SQL: %s, params: %j', sql, params);

        if (Array.isArray(params) && params.length > 0)
        {
            sql = SqlQueryBuilder.formatSqlParams(sql, params, this);
            debug('Formatted SQL: %s', sql);
        }
                
        var transaction = options.transaction;
        if (transaction && transaction.connector === this && transaction.connection)
        {
            debug('Execute SQL in a transaction');
            client = transaction.connection;
        }
        
        var result: any[];
                
        var request = new Request(sql, (err, count) => 
        {
            if (err)
                callback && callback(err, null);
        });
        
        /*request.on('columnMetadata', this.onColumnMetadata);
        request.on('row', this.onRequestData);
        request.on('done', this.onRequestDone);
        request.on('doneProc', this.onRequestDoneProc);
        request.on('doneInProc', this.onRequestDoneInProc);*/
        
        request.on('columnMetadata', (meta_data) => 
        {
            result = [];
        });
        
        request.on('row', (columns) => 
        {
            var obj = {};

            columns.forEach((column) => 
            {
                if (column.metadata && column.metadata.colName)
                    obj[column.metadata.colName] = column.value;
            });

            result.push(obj);
        });
        
        request.on('doneInProc', (rowCount, more) => 
        {
            callback && callback(null, result);
        });
        
        client.execSql(request);
    }
    
    /// @override
    getDefaultSchemaName(): string
    {
        return 'dbo';
    }
    
    tableEscaped(model_name: string): string
    {
        return this.escapeName(this.schema(model_name)) + '.' + this.escapeName(this.table(model_name));
    }
}
