declare module 'loopback-connector'
{
    export interface PropertyDefinition
    {
        type;
    }
    
    export abstract class SqlConnector
    {
        constructor(connector_id: string, settings: any);
        
        abstract toColumnValue(propertyDef: PropertyDefinition, value: any): ParameterizedSQL | any;
        abstract fromColumnValue(propertyDef: PropertyDefinition, value: any): any;
        
        abstract escapeName(name: string): string;
        abstract escapeValue(value: string): any;
        
        abstract getPlaceholderForIdentifier(key: string): string;
        abstract getPlaceholderForValue(key: string): string;
        
        abstract applyPagination(model: string, stmt, filter);
        abstract getCountForAffectedRows(model: string, info);
        
        abstract getInsertedId(model: string, info): any;
        
        abstract executeSQL(sql: string, params, options, callback: Function);
        
        serializeObject(obj: Object): any;
        
        schema(model_name: string): string;
        table(model_name: string): string;
        column(model_name: string, property_name: string): string;
        
        name: string;
        settings: any;
	}
    
    export interface ParameterizedSQL
    {
        merge(ps: Object | Object[], separator?: string): ParameterizedSQL;
        toJSON(): string;
        append(currentStmt: Object, stmt: Object, separator: string): any;
        join(sqls: Object[], separator: string): ParameterizedSQL;
    }
}
