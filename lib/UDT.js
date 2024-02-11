"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UDT = void 0;
const Schema_1 = require("./Schema");
/**
 * A class used to perform actions on user defined types in Cassandra.
 */
class UDT {
    /**
     *
     * @param name The name of the user defined type.
     * @param schema The schema that tells Better Cassandra what the user defined type should look like and function.
     */
    constructor(name, schema) {
        this.name = name;
        this.schema = schema;
    }
    ;
    getColumnDefinition(fieldName, fieldOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const typeMapping = {
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
            const fieldType = fieldOptions.type;
            if (fieldType instanceof Schema_1.FrozenType) {
                let startPos = fieldType.udt.indexOf("<") + 1;
                let endPos = fieldType.udt.indexOf(">");
                const type = this.client.types.get(fieldType.udt) || this.client.types.get(fieldType.udt.substring(startPos, endPos));
                if (!type)
                    throw new Error(`Type "${this.name}" requires the "${fieldType.udt}" user defined type which was not found!`);
                yield type.load();
                return `${fieldName} frozen<${fieldType.udt}>`;
            }
            else if (typeMapping[fieldType]) {
                return `${fieldName} ${typeMapping[fieldType]}`;
            }
            else {
                throw new Error(`Unsupported field type: ${fieldType}`);
            }
        });
    }
    /**
     * Removes the type from the database if it exists.
     */
    drop() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.cassandara.execute(`DROP TYPE IF EXISTS ${this.client.cassandara.keyspace}.${this.name}`);
            this.client.types.delete(this.name);
            this.client.logging.success(`Successfully dropped the table: "${this.name}"`);
        });
    }
    /**
     * Initializes the type before it is loaded. You shouldn't need to call this.
     * @param client Instance of the Better Cassandra client.
     */
    init(client) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.client = client;
                this.client.types.set(this.name, this);
            }
            catch (err) {
                client.logging.error(`Failed to initialize user defined type "${this.name}": ${err}`);
            }
        });
    }
    /**
     * Create a user defined type if it does not exist already. Better Cassandra already does this for you when a model requires a frozen type.
     * You still need to provide the typesPath for Better Cassandra to find the user defined types.
     */
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = Object.entries(this.schema.definition);
            const columns = [];
            // Add columns for each entry in the schema.options
            for (const [key, value] of entries) {
                columns.push(yield this.getColumnDefinition(key, value));
            }
            yield this.client.cassandara.execute(`CREATE TYPE IF NOT EXISTS ${this.client.cassandara.keyspace}.${this.name} (${columns.join(", ")});`);
            this.client.logging.success(`Loaded user defined type \`${this.name}\``);
        });
    }
}
exports.UDT = UDT;
