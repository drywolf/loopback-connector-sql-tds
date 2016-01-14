import { Connection, Request, ConnectionConfig } from 'tedious';
import ConnectionPool = require('tedious-connection-pool');
import { PoolConfig } from 'tedious-connection-pool';

import { SqlConnector, ParameterizedSQL, PropertyDefinition } from 'loopback-connector';

import { SqlQueryBuilder } from './QueryBuilder';
import { DebugFlags, debugOption, DEBUG_ID } from './SqlTdsDebug';

var debug_log = require('debug')(DEBUG_ID);

export class ConnectorSettings
{
    
}

export const name: string = 'tds-sql';

export class SqlTdsConnector extends SqlConnector
{
    pool: ConnectionPool;
    //connection: Connection;
    
    constructor(settings: ConnectorSettings)
    {
        super(name, settings);
    }
        
    debug(flag: DebugFlags, message: string, ...args: any[]): void
    {
        if (!debugOption(this.settings.options, flag))
            return;
            
        debug_log(message, ...args);
    }
    
    connect(cb): void
    {
        var poolConfig: PoolConfig = 
        {
            min: 2,
            max: 4,
            log: (message) => this.debug(DebugFlags.Pool, message)
        };
        
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
        
        this.pool = new ConnectionPool(poolConfig, config);        
        this.pool.on('error', (err) =>
        {
            this.debug(DebugFlags.Pool, "Connection-Pool-Error", err);
        });
        
        cb(null, this.pool);
        this.debug(DebugFlags.General, 'Connection established to: ', this.settings.host);
        
        /*var connection = new Connection(config);
        
        connection.on('infoMessage', this.tdsInfo);
        connection.on('errorMessage', this.tdsError);
        connection.on('end', this.tdsEnd);
        connection.on('debug', this.tdsDebug);
        
        connection.on('connect', err =>
        {
            if (err)
            {
                debug('Connection Error: ', err);
                cb(err, null);
            }
            else
            {
                debug('Connection established to: ', this.settings.host);
                this.connection = connection;
                cb(err, connection);
            }
        });*/
    }

    disconnect(cb): void
    {
        if (this.pool)
        {
            this.pool.drain(() => 
            {
                console.log("Pool drained");
                cb();
            });
            
            this.pool = null;
        }        
    }

    ping(cb: Function): void
    {
        this.execute('SELECT 1 AS result', cb);
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

        var db = this.settings.database;
        
        if (typeof callback !== 'function')
            throw new Error('callback should be a function');

        this.debug(DebugFlags.SQL, 'SQL: %s, params: %j', sql, params);

        if (Array.isArray(params) && params.length > 0)
        {
            sql = SqlQueryBuilder.formatSqlParams(sql, params, this);
            this.debug(DebugFlags.SQL, 'Formatted SQL: %s', sql);
        }
                
        /*var transaction = options.transaction;
        if (transaction && transaction.connector === this && transaction.connection)
        {
            debug('Execute SQL in a transaction');
            client = transaction.connection;
        }*/
        
        var result: any[];
                
        this.pool.acquire(function (err, connection)
        {
            if (err)
                this.debug(DebugFlags.Pool, "Pool-Acquire-Error", err);
              
            // TODO: move to connection creation  
            connection.on('infoMessage', info => self.debug(DebugFlags.TDSInfo, info));
            connection.on('errorMessage', err => self.debug(DebugFlags.TDSError, err));
            connection.on('debug', err => self.debug(DebugFlags.TDSDebug, err));
            //connection.on('end', );

            //use the connection as normal
            var request = new Request(sql, (err, count) => 
            {
                if (err)
                {
                    self.debug(DebugFlags.General, "Request-Error", err);
                    callback && callback(err, undefined);
                }
                else
                    callback && callback(undefined, result);
                
                //release the connection back to the pool when finished
                connection.release();
                
                // TODO: move to pool shutdown / connection drain
                connection.removeAllListeners();
            });

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

            connection.execSql(request);
        });
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
