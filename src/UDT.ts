import { Client } from "./Client";
import { FieldTypeMap, FrozenType, SchemaOptionsField, UDTSchema, UDTSchemaOptions, UDTSchemaOptionsField } from "./Schema";

export class UDT<T> {

    public client!: Client;

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
            const type = this.client.types.get(fieldType.udt);
            if (!type) throw new Error(`Type "${this.name}" requires the "${fieldName}" user defined type which was not found!`);
            await type.load();
            return `${fieldName} frozen<${fieldType.udt}>`
        } else if (typeMapping[fieldType]) {
            return `${fieldName} ${typeMapping[fieldType]}`;
        } else {
            throw new Error(`Unsupported field type: ${fieldType}`);
        }
    }

    public async drop() {
        await this.client.cassandara.execute(`DROP TYPE IF EXISTS ${this.client.cassandara.keyspace}.${this.name}`);
        this.client.types.delete(this.name);
        this.client.logging.success(`Successfully dropped the table: "${this.name}"`);
    }

    public async init(client: Client) {
        try {
            this.client = client;
            this.client.types.set(this.name, this);
        } catch (err) {
            client.logging.error(`Failed to initialize user defined type "${this.name}": ${err}`)
        }
    }

    public async load() {
        const entries = Object.entries(this.schema.options) as [string, SchemaOptionsField<T>][];
        const columns: string[] = [];

        // Add columns for each entry in the schema.options
        for (const [key, value] of entries) {
            // Skip "edited_at" as it will be added separately
            if (key !== "edited_at") {
                columns.push(await this.getColumnDefinition(key, value));
            }
        }

        await this.client.cassandara.execute(`CREATE TYPE IF NOT EXISTS ${this.client.cassandara.keyspace}.${this.name} (${columns.join(", ")});`);
        this.client.logging.success(`Loaded user defined type \`${this.name}\``);
    }
}