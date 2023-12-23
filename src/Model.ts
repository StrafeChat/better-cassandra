import { Client } from "./Client";
import { FieldTypeMap, FrozenType, Schema, SchemaOptionsField } from "./Schema";

/**
 * A class used to perform actions on tables in Cassandra.
 */
export class Model<T> {

    /**
     * Instance of the Better Cassandra Client.
     */
    public client!: Client;

    /**
     * 
     * @param name The name of the model.
     * @param schema The schema that tells cassandra what the data should be.
     */
    constructor(public readonly name: string, public readonly schema: Schema<T>) { };

    private async getColumnDefinition(fieldName: string, fieldOptions: SchemaOptionsField<T>): Promise<string> {
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
        const primaryKey = fieldOptions.primaryKey ? 'PRIMARY KEY' : '';

        if (fieldType instanceof FrozenType) {
            const type = this.client.types.get(fieldType.udt);
            if (!type) throw new Error(`Model "${this.name}" requires the "${fieldName}" user defined type which was not found!`);
            await type.load();
            return `${fieldName} frozen<${fieldType.udt}>`
        } else if (typeMapping[fieldType]) {
            return `${fieldName} ${typeMapping[fieldType]} ${primaryKey}`;
        } else {
            throw new Error(`Unsupported field type: ${fieldType}`);
        }
    }

    /**
     * Removes the table from the database if it does exist.
     */
    public async drop() {
        try {
            await this.client.cassandara.execute(`DROP TABLE IF EXISTS ${this.client.cassandara.keyspace}.${this.name};`);
            this.client.models.delete(this.name);
            this.client.logging.success(`Successfully dropped the table: "${this.name}"`);
        } catch (err) {
            this.client.logging.error(`Failed to drop table "${this.name}": ${err}`);
        }
    }

    /**
     * Create the table if it does not exist already. Better Cassandra already does this for you when you provide a `modelsPath`. 
     * So there is no need to call this function unless neccessary.
     * @param client Better Cassandra Client.
     */
    public async load(client: Client) {
        try {
            this.client = client;
            const entries = Object.entries(this.schema.options) as [string, SchemaOptionsField<T>][];
            const columns: string[] = [];

            // Add columns for each entry in the schema.options
            for (const [key, value] of entries) {
                // Skip "edited_at" as it will be added separately
                if (key !== "edited_at") {
                    columns.push(await this.getColumnDefinition(key, value));
                }
            }

            if (!this.schema.options.created_at && this.schema.options.created_at != null) columns.push(await this.getColumnDefinition("created_at", {
                "primaryKey": true,
                "type": "timestamp"
            }));

            columns.push(await this.getColumnDefinition("edited_at", {
                "primaryKey": false,
                type: "timestamp"
            }));

            if (!this.schema.options.id && !this.schema.options.id != null) columns.push(await this.getColumnDefinition("id", {
                "primaryKey": true,
                "type": "uuid"
            }));

            await client.cassandara.execute(`CREATE TABLE IF NOT EXISTS ${client.cassandara.keyspace}.${this.name} (${columns.join(", ")});`);
            client.models.set(this.name, this);
            client.logging.success(`Loaded model \`${this.name}\``);
        } catch (err) {
            client.logging.error(`Failed to load model "${this.name}": ${err}`);
        }
    }
}