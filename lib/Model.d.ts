import { Client } from "./Client";
import { Query, Schema, SchemaDefinition, SchemaOptionsFieldType } from "./Schema";
import { WhereClause } from "./types";
/**
 * A class used to perform actions on tables in Cassandra.
 */
export declare class Model<T> {
    readonly name: string;
    readonly schema: Schema<T>;
    /**
     * Instance of the Better Cassandra Client.
     */
    client: Client;
    primaryKey: [string[], string[]];
    /**
     *
     * @param name The name of the model.
     * @param schema The schema that tells Better Cassandra what the table should look like and function.
     */
    constructor(name: string, schema: Schema<T>);
    private getColumnDefinition;
    /**
     * Modify the structure of a Cassandra table by performing alterations such as changing column types,
     * adding new columns, dropping columns, and renaming columns.
     *
     * @param {Object} options - The alteration options.
     * @param {Object} options.$alter - Object containing alteration details.
     *   @property {Query<T>} column - The column to alter.
     *   @property {SchemaOptionsFieldType<T>} type - The new type for the column.
     * @param {Array<Object>} options.$add - Array of objects representing columns to add.
     *   Each object should have a single property representing the column name and its partial schema definition.
     * @param {Array<Query<T>>} options.$drop - Array of columns to drop from the table.
     * @param {Array<[Query<T>, string]>} options.$rename - Array used to rename a single column.
     *
     * @throws {Error} Throws an error if the alteration fails.
     *
     * @example
     * // Alter column type
     * await model.alter({ $alter: { column: 'column_name', type: 'new_column_type' } });
     *
     * // Add new columns
     * await model.alter({ $add: [{ new_column: { type: 'text' } }, { another_column: { type: 'int' } }] });
     *
     * // Drop columns
     * await model.alter({ $drop: ['column_to_drop', 'another_column_to_drop'] });
     *
     * // Rename columns
     * await model.alter({ $rename: ['old_column_name', 'new_column_name'] });
     *
     */
    alter({ $alter, $add, $drop, $rename, }: {
        /**
         * Object containing alteration details.
         * @property {Query<T>} column - The column to alter.
         * @property {SchemaOptionsFieldType<T>} type - The new type for the column.
         * @deprecated - Cassandra dropped support for altering column types in Cassandra 3.10
         */
        $alter?: {
            column: Query<T>;
            type: SchemaOptionsFieldType<T>;
        };
        $add?: Partial<SchemaDefinition<T>>[];
        $drop?: Query<T>[];
        $rename?: [Query<T>, string];
    }): Promise<void>;
    /**
     * Count the number of records in the Cassandra table based on specified conditions.
     *
     * @async
     * @param {Object} params - Parameters for counting records.
     * @param {WhereClause[]} params.$where - An array of conditions specifying how to filter records.
     * @param {number} [params.$limit] - The maximum number of records to count. If provided, it is used in the LIMIT clause.
     * @param {boolean} [params.$prepare] - Indicates whether to prepare the statement. Defaults to `false`.
     * @returns {Promise<number>} - A Promise that resolves to the count of records based on the specified conditions.
     * @throws {Error} Throws an error if the execution fails or if invalid parameters are provided.
     *
     * @typedef {Object} WhereClause
     * @property {string} equals - Equals operator. Example: { equals: ['columnName', 'value'] }
     * @property {string} notEquals - Not equals operator. Example: { notEquals: ['columnName', 'value'] }
     * @property {string} in - In operator. Example: { in: ['columnName', ['value1', 'value2']] }
     * @property {string} notIn - Not in operator. Example: { notIn: ['columnName', ['value1', 'value2']] }
     * @property {string} greaterThanOrEqual - Greater than or equal operator. Example: { greaterThanOrEqual: ['columnName', 'value'] }
     * @property {string} lessThanOrEqual - Less than or equal operator. Example: { lessThanOrEqual: ['columnName', 'value'] }
     * @property {string} contains - Contains operator. Example: { contains: ['columnName', 'value'] }
     * @property {string} notContains - Does not contain operator. Example: { notContains: ['columnName', 'value'] }
     */
    count({ $where, $limit, $prepare }: {
        $where: WhereClause<T>[];
        $limit?: number;
        $prepare?: boolean;
    }): Promise<number>;
    /**
     * Performs a DELETE operation on the Cassandra table based on specified conditions.
     *
     * @async
     * @param {Object} params - Parameters for the DELETE operation.
     * @param {WhereClause<T>[]} params.$where - An array of conditions specifying how to filter records.
     * @param {number} [params.$limit] - The maximum number of records to delete. If provided, it is used in the LIMIT clause.
     * @param {boolean} [params.$prepare] - Indicates whether to prepare the statement. Defaults to `false`.
     * @throws {Error} Throws an error if the execution fails or if invalid parameters are provided.
     *
     * @typedef {Object} WhereClause
     * @property {string} equals - Equals operator. Example: { equals: ['columnName', 'value'] }
     * @property {string} notEquals - Not equals operator. Example: { notEquals: ['columnName', 'value'] }
     * @property {string} in - In operator. Example: { in: ['columnName', ['value1', 'value2']] }
     * @property {string} notIn - Not in operator. Example: { notIn: ['columnName', ['value1', 'value2']] }
     * @property {string} greaterThanOrEqual - Greater than or equal operator. Example: { greaterThanOrEqual: ['columnName', 'value'] }
     * @property {string} lessThanOrEqual - Less than or equal operator. Example: { lessThanOrEqual: ['columnName', 'value'] }
     * @property {string} contains - Contains operator. Example: { contains: ['columnName', 'value'] }
     * @property {string} notContains - Does not contain operator. Example: { notContains: ['columnName', 'value'] }
     */
    delete({ $where, $limit, $prepare }: {
        $where: WhereClause<T>[];
        $limit?: number;
        $prepare?: boolean;
    }): Promise<void>;
    /**
     * Removes the table from the database if it exists.
     */
    drop(): Promise<void>;
    /**
     * Select data from the table
     *
     * @param {Object} options - Options for the SELECT query.
     * @param {Array.<string>} options.$include - Optional array of columns to include in the SELECT query.
     * @param {Array.<Object>} options.$where - Array of conditions for the WHERE clause.
     * @param {number} options.$limit - Optional limit for the number of results to retrieve.
     * @param {boolean} options.$prepare - Optional flag indicating whether to prepare the statement (default: true).
     *
     * @throws {Error} If the SELECT query execution fails.
     *
     * @example
     * const result = await myTable.select({
     *   $include: ['column1', 'column2'],
     *   $where: [
     *     { equals: ['column3', 'value'] },
     *     { greaterThanOrEqual: ['column4', 42] },
     *     { in: ['column5', [1, 2, 3]] },
     *   ],
     *   $limit: 10,
     *   $prepare: true,
     * });
     */
    select({ $include, $where, $limit, $prepare }: {
        $include?: (keyof T)[];
        $where: WhereClause<T>[];
        $limit?: number;
        $prepare?: boolean;
    }): Promise<Partial<T>[]>;
    /**
     * Retrieves all rows from the database table associated with the model,
     * based on optional conditions and included columns.
     *
     * @param {Object} options - The options for the selection.
     * @param {Array<keyof T>} [options.$include] - Optional. An array of columns to include in the result.
     * @param {Array<WhereClause<T>>} options.$where - An array of conditions to filter the results.
     * @param {boolean} [options.$prepare] - Optional. Indicates whether to prepare the query.
     *
     * @returns {Promise<Array<T | Partial<T>>> | null} A Promise that resolves to an array of retrieved rows,
     * or null if no rows match the specified conditions.
     * The result type dynamically adjusts based on the presence of $include.
     *
     * @throws {Error} If the selection operation fails, an error is logged.
     *
     * @example
     * const results = await myTable.select({
     *   $include: ['column1', 'column2'],
     *   $where: [
     *     { equals: ['column3', 'value'] },
     *     { greaterThanOrEqual: ['column4', 42] },
     *     { in: ['column5', [1, 2, 3]] },
     *   ],
     *   $prepare: true,
     * });
     */
    selectAll({ $include, $where, $prepare }: {
        $include?: (keyof T)[];
        $where: WhereClause<T>[];
        $prepare?: boolean;
    }): Promise<Partial<T>[] | null>;
    /**
     * Updates records in a Cassandra database table based on specified criteria.
     *
     * @param {Object} options - The options object containing update parameters.
     * @param {Partial<Record<keyof T, T[keyof T]>>} options.$set - The fields to be updated along with their new values.
     * @param {WhereClause<T>[]} options.$where - The conditions that records must meet to be updated.
     * @param {boolean} [options.$prepare] - Indicates whether to prepare the statement. Default is undefined.
     *
     * @throws {Error} Throws an error if the Cassandra update query execution fails.
     *
     * @example// Update user data where id is 1, setting the name to 'John' and age to 30
     * await update({
     *    $set: { name: 'John', age: 30 },
     *    $where: [{ equals: { id: 1 } }]
     *    $prepare: true
     * });
     */
    update({ $set, $where, $prepare }: {
        $set: Partial<Record<keyof T, T[keyof T]>>;
        $where: WhereClause<T>[];
        $prepare?: boolean;
    }): Promise<void>;
    /**
     * Inserts data into the Cassandra table represented by this instance.
     *
     * @param {Partial<Record<keyof T, T[keyof T]>>} data - The data to be inserted, where keys are column names and values are corresponding values.
     * @returns {Promise<void>} - A promise that resolves when the insertion is successful and rejects on failure.
     * @throws {Error} If the insertion fails, an error is thrown with details.
     *
     * @example
     * const dataToInsert = {
     *   columnName1: value1,
     *   columnName2: value2,
     *   // ...
     * };
     * await yourInstance.insert(dataToInsert);
     */
    insert(data: Partial<Record<keyof T, T[keyof T]>>, { prepare }: {
        prepare?: boolean;
    }): Promise<void>;
    /**
     * Create the table if it does not exist already. Better Cassandra already does this for you when you provide a `modelsPath`.
     * So there is no need to call this function unless neccessary.
     * @param client Better Cassandra Client.
     */
    load(client: Client): Promise<void>;
}
