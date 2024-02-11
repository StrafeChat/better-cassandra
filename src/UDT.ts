import { Client } from "./Client";
import { FieldTypeMap, FrozenType, SchemaOptionsField, UDTSchema, UDTSchemaDefinition, UDTSchemaOptionsField } from "./Schema";

/**
 * A class used to perform actions on user defined types in Cassandra.
 */
export class UDT<T> {

    /**
     * An instance of the Better Cassandra Client
     */
    public client!: Client;

    /**
     * 
     * @param name The name of the user defined type.
     * @param schema The schema that tells Better Cassandra what the user defined type should look like and function.
     */
    constructor(public readonly name: string, public readonly schema: UDTSchema<T>) { };

    private async getColumnDefinition(fieldName: string, fieldOptions: UDTSchemaOptionsField<T>) {
        const typeMapping: Partial<Record<keyof FieldTypeMap<T>, string>> = {
            ascii: 'ascii',
            bigint: 'bigint',
            blob: 'blob',
            boolean: 'boolean',
            counter: 'counter',
            date: 'date',
            decimal: 'decimal',
            double: 'double',
            duration: 'duration',
            float: 'float',
            inet: 'inet',
            int: 'int',
            smallint: 'smallint',
            text: 'text',
            time: 'time',
            timestamp: 'timestamp',
            timeuuid: 'timeuuid',
            tinyint: 'tinyint',
            uuid: 'uuid',
            varchar: 'varchar',
            varint: 'varint',
        };

        const fieldType = fieldOptions.type as keyof Partial<Record<keyof FieldTypeMap<T>, string>> | FrozenType;

        if (fieldType instanceof FrozenType) {
            let startPos = fieldType.udt.indexOf("<") + 1;
            let endPos = fieldType.udt.indexOf(">");

            const type = this.client.types.get(fieldType.udt) || this.client.types.get(fieldType.udt.substring(startPos, endPos));
            
            if (!type) throw new Error(`Type "${this.name}" requires the "${fieldType.udt}" user defined type which was not found!`);
            
            await type.load();
            return `${fieldName} frozen<${fieldType.udt}>`
        } else if (typeMapping[fieldType]) {
            return `${fieldName} ${typeMapping[fieldType]}`;
        } else {
            throw new Error(`Unsupported field type: ${fieldType}`);
        }
    }

    /**
     * Removes the type from the database if it exists.
     */
    public async drop() {
        await this.client.cassandara.execute(`DROP TYPE IF EXISTS ${this.client.cassandara.keyspace}.${this.name}`);
        this.client.types.delete(this.name);
        this.client.logging.success(`Successfully dropped the table: "${this.name}"`);
    }

    /**
     * Initializes the type before it is loaded. You shouldn't need to call this.
     * @param client Instance of the Better Cassandra client.
     */
    public async init(client: Client) {
        try {
            this.client = client;
            this.client.types.set(this.name, this);
        } catch (err) {
            client.logging.error(`Failed to initialize user defined type "${this.name}": ${err}`)
        }
    }

    /**
     * Create a user defined type if it does not exist already. Better Cassandra already does this for you when a model requires a frozen type. 
     * You still need to provide the typesPath for Better Cassandra to find the user defined types.
     */
    public async load() {
        const entries = Object.entries(this.schema.definition) as [string, SchemaOptionsField<T>][];
        const columns: string[] = [];

        // Add columns for each entry in the schema.options
        for (const [key, value] of entries) {
            columns.push(await this.getColumnDefinition(key, value));
        }

        await this.client.cassandara.execute(`CREATE TYPE IF NOT EXISTS ${this.client.cassandara.keyspace}.${this.name} (${columns.join(", ")});`);
        this.client.logging.success(`Loaded user defined type \`${this.name}\``);
    }
}