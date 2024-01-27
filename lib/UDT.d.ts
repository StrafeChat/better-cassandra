import { Client } from "./Client";
import { UDTSchema } from "./Schema";
/**
 * A class used to perform actions on user defined types in Cassandra.
 */
export declare class UDT<T> {
    readonly name: string;
    readonly schema: UDTSchema<T>;
    /**
     * An instance of the Better Cassandra Client
     */
    client: Client;
    /**
     *
     * @param name The name of the user defined type.
     * @param schema The schema that tells Better Cassandra what the user defined type should look like and function.
     */
    constructor(name: string, schema: UDTSchema<T>);
    private getColumnDefinition;
    /**
     * Removes the type from the database if it exists.
     */
    drop(): Promise<void>;
    /**
     * Initializes the type before it is loaded. You shouldn't need to call this.
     * @param client Instance of the Better Cassandra client.
     */
    init(client: Client): Promise<void>;
    /**
     * Create a user defined type if it does not exist already. Better Cassandra already does this for you when a model requires a frozen type.
     * You still need to provide the typesPath for Better Cassandra to find the user defined types.
     */
    load(): Promise<void>;
}
